// ===== 1. ดึงองค์ประกอบ HTML =====
const video = document.getElementById('video');
const snapBtn = document.getElementById('snapBtn');
const saveBtn = document.getElementById('saveBtn');
const titleOut = document.getElementById('titleOut');
const textOut = document.getElementById('textOut');
const statusEl = document.getElementById('status');
const modelStatus = document.getElementById("modelStatus");
const snapshotBox = document.getElementById('snapshotBox');

let currentLandmarks = null;
let lastAnalysisResult = ""; // (จะเก็บ "คำทำนายเริ่ดๆ")
let lastSnapshotURL = null; 

// ===== 2. "แปล" คลังตรรกะ (Python -> JavaScript) =====
const logic = {}; 
const dist = (p1, p2) => {
  if (!p1 || !p2) return 0;
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
};
logic.analyze_face_shape = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const face_height = dist(landmarks_px[10], landmarks_px[152]);
        const forehead_width = dist(landmarks_px[103], landmarks_px[332]);
        const cheekbone_width = dist(landmarks_px[234], landmarks_px[454]);
        const jaw_width = dist(landmarks_px[172], landmarks_px[397]);
        const chin_height = dist(landmarks_px[21], landmarks_px[152]);
        const chin_width = dist(landmarks_px[326], landmarks_px[97]);
        if ([cheekbone_width, jaw_width, forehead_width, chin_width, face_height].includes(0)) return { good, bad };
        const H_W_ratio = face_height / cheekbone_width;
        const Chin_ratio = chin_height / chin_width;
        if (Math.abs(forehead_width - jaw_width) / forehead_width < 0.1 && Math.abs(cheekbone_width - jaw_width) / cheekbone_width < 0.1) {
            good.push("โครงหน้าเหลี่ยม (เป็นผู้นำ, มั่นคง)");
        } else if (H_W_ratio < 1.25 && cheekbone_width > forehead_width && cheekbone_width > jaw_width) {
            good.push("โครงหน้ากลม (เป็นมิตร, สร้างสัมพันธ์เก่ง)");
        } else if (H_W_ratio > 1.5) {
            good.push("โครงหน้ายาว (สุขุม, รอบคอบ)");
        } else if (cheekbone_width > forehead_width && cheekbone_width > jaw_width) {
            good.push("โครงหน้าเพชร (มีเอกลักษณ์, ทะเยอทะยาน)");
        } else if (forehead_width > jaw_width && Chin_ratio > 0.6) {
            good.push("โครงหน้าหัวใจ (สร้างสรรค์, ฉลาด)");
        } else {
            good.push("โครงหน้ารูปไข่ (สมดุล, มีเสน่ห์)");
        }
    } catch (e) {}
    return { good, bad };
};
logic.analyze_eyebrows = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const eye_width = dist(landmarks_px[33], landmarks_px[133]);
        const brow_length = dist(landmarks_px[55], landmarks_px[46]);
        if (eye_width === 0) return { good, bad };
        const brow_ratio = brow_length / eye_width;
        if (brow_ratio > 1.05) good.push("คิ้วยาว (มั่นใจ มีพลัง)");
        else if (brow_ratio < 0.9) bad.push("คิ้วสั้น (ไม่มั่นคง กังวล)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_eyes = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const eye_height = dist(landmarks_px[159], landmarks_px[145]);
        const eye_width = dist(landmarks_px[33], landmarks_px[133]);
        if (eye_width === 0) return { good, bad };
        const open_ratio = eye_height / eye_width;
        if (open_ratio > 0.3) good.push("ตาใหญ่ (จริงใจ เปิดเผย)");
        else if (open_ratio < 0.15) bad.push("ตาเล็ก (คิดมาก ระมัดระวัง)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_nose = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const nose_width = dist(landmarks_px[48], landmarks_px[218]);
        const nose_height = dist(landmarks_px[6], landmarks_px[168]);
        if (nose_height === 0) return { good, bad };
        const nose_ratio = nose_width / nose_height;
        if (nose_ratio > 0.8) bad.push("จมูกแบน (มีปัญหาการเงิน)");
        else if (nose_ratio < 0.7) good.push("จมูกได้สัดส่วน (การเงินดี)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_mouth = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const upper_lip_height = dist(landmarks_px[12], landmarks_px[13]);
        const lower_lip_height = dist(landmarks_px[14], landmarks_px[15]);
        const mouth_width = dist(landmarks_px[61], landmarks_px[291]);
        if (mouth_width === 0) return { good, bad };
        const total_lip_height = upper_lip_height + lower_lip_height;
        const lip_ratio = total_lip_height / mouth_width;
        const left_corner_y = landmarks_px[61].y;
        const right_corner_y = landmarks_px[291].y;
        const lip_skew = Math.abs(left_corner_y - right_corner_y);
        const lip_center_y = (landmarks_px[13].y + landmarks_px[14].y) / 2;
        const corner_center_y = (left_corner_y + right_corner_y) / 2;
        const is_smiling = corner_center_y < lip_center_y;
        if (is_smiling) good.push("มุมปากชี้ขึ้น (จิตใจดี)");
        if (lip_ratio < 0.2) bad.push("ปากบาง (สุขภาพไม่ดี)");
        if (lip_skew > 0.05) bad.push("ปากเบี้ยว (จิตใจไม่ซื่อตรง)");
        if (upper_lip_height < lower_lip_height) bad.push("ปากบนบางกว่าปากล่าง (ขี้บ่น)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_chin = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const chin_width = dist(landmarks_px[326], landmarks_px[97]);
        const chin_height = dist(landmarks_px[21], landmarks_px[152]);
        if (chin_width === 0) return { good, bad };
        const chin_ratio = chin_height / chin_width;
        if (chin_ratio > 0.6) good.push("คางแหลม (สร้างสรรค์, ศิลปิน)");
        else if (chin_ratio < 0.4) good.push("คางกลม (มั่นคง, อดทน)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_cheeks = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const cheekbone_width = dist(landmarks_px[234], landmarks_px[454]);
        const jaw_width = dist(landmarks_px[172], landmarks_px[397]);
        if (cheekbone_width === 0) return { good, bad };
        const cheek_ratio = jaw_width / cheekbone_width;
        if (cheek_ratio < 0.75) bad.push("แก้มตอบ (ชีวิตบั้นปลายเงียบเหงา)");
        else good.push("แก้มอิ่ม (บั้นปลายสุขสบาย)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_forehead = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const forehead_height = dist(landmarks_px[105], landmarks_px[10]);
        const face_height = dist(landmarks_px[10], landmarks_px[152]);
        if (face_height === 0) return { good, bad };
        const forehead_ratio = forehead_height / face_height;
        if (forehead_ratio > 0.3) good.push("หน้าผากสูง/กว้าง (สติปัญญาดี)");
        else if (forehead_ratio < 0.25) bad.push("หน้าผากแคบ (ใจร้อน, วาสนาน้อย)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_eye_distance = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const eye_width = dist(landmarks_px[33], landmarks_px[133]);
        const eye_distance = dist(landmarks_px[133], landmarks_px[362]);
        if (eye_width === 0) return { good, bad };
        const eye_ratio = eye_distance / eye_width;
        if (eye_ratio > 1.1) good.push("ตาห่าง (ใจกว้าง, มองการณ์ไกล)");
        else if (eye_ratio < 0.9) bad.push("ตาชิด (จุกจิก, คิดเล็กคิดน้อย)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_facial_thirds = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const forehead_height = dist(landmarks_px[10], landmarks_px[105]);
        const nose_height = dist(landmarks_px[105], landmarks_px[2]);
        const chin_height = dist(landmarks_px[2], landmarks_px[152]);
        const total_height = forehead_height + nose_height + chin_height;
        if (total_height === 0) return { good, bad };
        const avg_height = total_height / 3.0;
        if (Math.abs(forehead_height - avg_height) / avg_height < 0.15) good.push("สัดส่วน 3 ส่วนสมดุล (ชีวิตราบรื่น)");
        if (forehead_height > nose_height && forehead_height > chin_height) good.push("หน้าผากเด่น (นักคิด, ปัญญาชน)");
        else if (nose_height > forehead_height && nose_height > chin_height) good.push("จมูกเด่น (นักสู้, บ้าพลัง)");
        else if (chin_height > forehead_height && chin_height > nose_height) good.push("คางเด่น (นักกิน, เจ้าสำราญ)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_philtrum = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const philtrum_height = dist(landmarks_px[168], landmarks_px[13]);
        const chin_only_height = dist(landmarks_px[15], landmarks_px[152]);
        if (chin_only_height === 0) return { good, bad };
        const philtrum_ratio = philtrum_height / chin_only_height;
        if (philtrum_ratio > 0.8) good.push("ร่องใต้จมูกยาว (ใจเย็น, สุขภาพดี)");
        else if (philtrum_ratio < 0.5) bad.push("ร่องใต้จมูกสั้น (ใจร้อน, พูดเร็วทำเร็ว)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_symmetry = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const nose_center_pt = landmarks_px[1];
        const nose_left_dist = dist(nose_center_pt, landmarks_px[48]);
        const nose_right_dist = dist(nose_center_pt, landmarks_px[218]);
        const mouth_center_pt = landmarks_px[14];
        const mouth_left_dist = dist(mouth_center_pt, landmarks_px[61]);
        const mouth_right_dist = dist(mouth_center_pt, landmarks_px[291]);
        if (Math.max(nose_left_dist, nose_right_dist) === 0) return { good, bad };
        if (Math.max(mouth_left_dist, mouth_right_dist) === 0) return { good, bad };
        const nose_diff = Math.abs(nose_left_dist - nose_right_dist) / Math.max(nose_left_dist, nose_right_dist);
        const mouth_diff = Math.abs(mouth_left_dist - mouth_right_dist) / Math.max(mouth_left_dist, mouth_right_dist);
        if (nose_diff < 0.1 && mouth_diff < 0.1) good.push("ใบหน้าสมมาตร (มั่นคง, มีระเบียบ)");
        else bad.push("ใบหน้าไม่สมมาตร (ยืดหยุ่น, คาดเดาไม่ได้)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_mouth_eye_ratio = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const mouth_width = dist(landmarks_px[61], landmarks_px[291]);
        const eye_distance = dist(landmarks_px[133], landmarks_px[362]);
        if (eye_distance === 0) return { good, bad };
        const mouth_eye_ratio = mouth_width / eye_distance;
        if (mouth_eye_ratio > 1.8) good.push("ปากกว้างมาก (ชอบเข้าสังคม, พูดจาเกินตัว)");
        else if (mouth_eye_ratio < 1.3) bad.push("ปากแคบ (ช่างเลือก, เก็บตัว)");
    } catch (e) {}
    return { good, bad };
};
logic.analyze_cheekbone_prominence = (landmarks_px) => {
    let good = [], bad = [];
    try {
        const cheekbone_width = dist(landmarks_px[234], landmarks_px[454]);
        const jaw_width = dist(landmarks_px[172], landmarks_px[397]);
        if (jaw_width === 0) return { good, bad };
        const cheek_jaw_ratio = cheekbone_width / jaw_width;
        if (cheek_jaw_ratio > 1.15) good.push("โหนกแก้มเด่น (ทะเยอทะยาน, มีอำนาจ)");
        else good.push("โหนกแก้มไม่เด่น (ถ่อมตน, ไม่ชอบนำ)");
    } catch (e) {}
    return { good, bad };
};
// ===== จบส่วนคลังตรรกะ =====


// ===== 3. ตรรกะใหม่! "คำทำนายเริ่ดๆ" 🔮 =====
// (นี่คือฟังก์ชันที่ "ขาดหายไป" ในรอบที่แล้วครับ)
function generateOverallFortune(goodSigns, badSigns) {
    const fortune = {};
    const goodKeywords = goodSigns.join(' ');
    const badKeywords = badSigns.join(' ');

    // -------------------- การเรียน --------------------
    if (goodKeywords.match(/สติปัญญา|หน้าผากเด่น|หน้าผากสูง/)) {
        fortune.study = "หัวไวแบบไม่ได้โม้ สมองประมวลผลเร็วกว่า Wi-Fi ห้องสมุด แต่ก็อย่าเหลิง เพราะความขี้เกียจคือศัตรูตัวจริง";
    } 
    else if (badKeywords.match(/ตาเล็ก|ตาชิด|วาสนาน้อย/)) {
        fortune.study = "อ่านสามรอบถึงจะเข้าใจหนึ่ง อย่าพึ่งเครียด แค่ต้องพักบ้างแล้วกลับมาลุยใหม่ ไม่งั้นสมองจะช็อต";
    } 
    else if (goodKeywords.match(/สมดุล|รอบคอบ|สุขุม/)) {
        fortune.study = "เรียนได้ทุกวิชา แต่ถ้าไม่รีวิวก่อนสอบ ก็เหมือนเปิดตู้เย็นแล้วลืมว่ามาหาอะไร";
    } 
    else {
        fortune.study = "ดวงการเรียนกลาง ๆ แต่อารมณ์คือไม่อ่านจนวินาทีสุดท้ายก็ไม่เริ่ม แบบนี้แม่หมอยกมือไหว้ละนะ";
    }

    // -------------------- การงาน --------------------
    if (goodKeywords.match(/ผู้นำ|โหนกแก้มเด่น|ทะเยอทะยาน/)) {
        fortune.work = "บอสในร่างพนักงาน แต่อย่าข่มคนอื่นเกินไป เดี๋ยวโดนหมั่นไส้ลับหลัง แม่หมอเตือนด้วยความหวังดี";
    } 
    else if (goodKeywords.match(/เป็นมิตร|เข้าสังคม|ปากกว้าง/)) {
        fortune.work = "คอนเนคชั่นแน่นกว่าเน็ต 5G ใคร ๆ ก็อยากร่วมงาน แต่ระวังพูดมากจนเผลอหลุดข้อมูลลับของบริษัท";
    } 
    else if (badKeywords.match(/ขี้บ่น|ปากเบี้ยว|ไม่สมมาตร/)) {
        fortune.work = "งานก็เยอะ ปากก็ไว คำพูดคุณมีพลังมาก แต่ถ้าไม่กรองก่อนพูด แม่หมอว่าระวังห้อง HR จะโทรหา";
    } 
    else {
        fortune.work = "ทำงานได้ทุกแนว แต่ไม่มีไฟจนกว่าเดดไลน์จะจ่อคอหอย งานออกมาดีเพราะแรงกดดันล้วน ๆ";
    }

    // -------------------- การเงิน --------------------
    if (goodKeywords.match(/การเงินดี|แก้มอิ่ม|จมูกได้สัดส่วน/)) {
        fortune.finance = "เงินเข้าเร็วกว่าเงินออก แต่ใช้ก็เร็วกว่าแสงเช่นกัน เก็บเงินได้นะ แต่ต้องมีเป้าหมายจริง ๆ ถึงจะอยู่";
    } 
    else if (badKeywords.match(/จมูกแบน|สุขภาพไม่ดี|แก้มตอบ/)) {
        fortune.finance = "อยากรวยแต่ไม่อยากเหนื่อยก็ต้องรอหวยเท่านั้น ทำงานก็ได้ผล แต่เหมือนจักรวาลยังไม่ปล่อยเงินให้";
    } 
    else if (goodKeywords.match(/สมดุล|มั่นคง/)) {
        fortune.finance = "เงินไม่ขาดมือ แต่ก็ไม่เหลือถึงสิ้นเดือน แม่หมอแนะให้เลิกซื้อของเพราะ 'มันลดราคา'";
    } 
    else {
        fortune.finance = "รายจ่ายเยอะกว่ารายรับนิดหน่อย แต่ถ้ารู้จักตัดของฟุ่มเฟือยอย่างกาแฟแก้วละร้อย ก็รอดได้";
    }

    // -------------------- ความรัก --------------------
    if (goodKeywords.match(/มุมปากชี้ขึ้น|ตาใหญ่|โหนกแก้มเด่น|เป็นมิตร/)) {
        fortune.love = "เสน่ห์แรงเกินต้าน มีคนแอบส่องแต่ไม่กล้าทัก ถ้าเจ้ามีคู่อยู่แล้ว ระวังมือที่สามเพราะความฮอตของตัวเอง";
    } 
    else if (badKeywords.match(/ขี้บ่น|ปากเบี้ยว|ใจร้อน|ตาชิด/)) {
        fortune.love = "คู่อาจจะรักกันดีแต่ทะเลาะเก่งกว่าใคร ถ้าโสดอยู่ก็ยังไม่ควรรีบ เดี๋ยวเจอคนพูดมากกว่าอีก";
    } 
    else if (goodKeywords.match(/สมดุล|สุขุม/)) {
        fortune.love = "ความรักเรียบง่ายแต่มั่นคง ไม่หวือหวาแต่ยั่งยืน เหมือนปลั๊กโทรศัพท์ที่ชาร์จช้าแต่เต็มแน่";
    } 
    else {
        fortune.love = "ยังไม่มีใครเพราะมาตรฐานสูงกว่าหอไอเฟล ถ้าลดลงมานิด ชีวิตจะไม่เหงาแบบนี้";
    }

    // -------------------- สุขภาพ --------------------
    if (goodKeywords.match(/สุขภาพดี|แก้มอิ่ม|ร่องใต้จมูกยาว/)) {
        fortune.health = "สุขภาพดีระดับแม่หมออิจฉา แต่ก็อย่าหักโหมเกินไป ร่างกายไม่ใช่ Powerbank 30,000 mAh";
    } 
    else if (badKeywords.match(/ปากบาง|แก้มตอบ|สุขภาพไม่ดี/)) {
        fortune.health = "ช่วงนี้พลังตกง่ายกว่าหุ้นเทคโนโลยี ควรนอนให้เพียงพอและดื่มน้ำแทนน้ำตา";
    } 
    else if (goodKeywords.match(/สมดุล|มั่นคง/)) {
        fortune.health = "สุขภาพใช้ได้ แต่ระวังความเครียดจากคนรอบข้าง มันเผาผลาญพลังงานได้มากกว่าคาร์ดิโอ";
    } 
    else {
        fortune.health = "ไม่ป่วยก็จริง แต่พฤติกรรมกินดึกคือนางร้ายตัวจริง ถ้ายังไม่เลิก เดี๋ยวแม่หมอต้องดูให้ในโรงพยาบาล";
    }

    // รวมเป็นข้อความเดียว
    return `
【การเรียน】${fortune.study}
【การงาน】${fortune.work}
【การเงิน】${fortune.finance}
【ความรัก】${fortune.love}
【สุขภาพ】${fortune.health}
`;
}

// ===== จบส่วนตรรกะใหม่ =====


// ===== 4. โหลดโมเดล MediaPipe (เหมือนเดิม) =====
modelStatus.textContent = "⏳ กำลังโหลดโมเดล MediaPipe...";
const faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    },
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});
faceMesh.onResults((results) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
        currentLandmarks = results.multiFaceLandmarks[0];
    } else {
        currentLandmarks = null;
    }
});
modelStatus.textContent = "✅ โหลดโมเดล MediaPipe สำเร็จ!";


// ===== 5. 🔮 เปิดกล้อง (เหมือนเดิม) =====
statusEl.textContent = "กำลังเปิดกล้อง...";
const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 720,
    height: 1280, // ✅ กล้องแนวตั้ง 9:16
    facingMode: 'user'
});

camera.start();
statusEl.textContent = "กล้องพร้อมแล้ว! 👁‍🗨";
saveBtn.disabled = true;


// ===== 6. ✨ ปุ่มทำนาย (แก้ไข: แยกการแสดงผล) =====
snapBtn.onclick = async () => {
  if (!currentLandmarks) {
    titleOut.textContent = "อ๊ะ!";
    textOut.textContent = "แม่หมอมองไม่เห็นหน้าเลยลูก 😭 ลองขยับเข้ามาอีกหน่อย";
    snapshotBox.innerHTML = `
      <div id="snapshot-placeholder">
        <p>📜</p>
        <p>ลักษณะใบหน้าจะมาอยู่ที่นี่</p>
      </div>
    `;
    return;
  }

  // 🔮 เริ่มโหลดโชว์ effect ลุ้น
  titleOut.textContent = "แม่หมอกำลังเพ่งพลัง...";
  textOut.innerHTML = `<span class="loading-dots">🔮</span> กำลังวิเคราะห์โหงวเฮ้งของเจ้า... รอสักครู่`;
  snapshotBox.innerHTML = `
    <div style="text-align:center; color:#aab0d4; padding:40px 0;">
      <div class="loading-circle"></div>
      <p>แม่หมอกำลังอ่านโหงวเฮ้งอยู่...</p>
    </div>
  `;

  snapBtn.disabled = true;
  saveBtn.disabled = true;

  // ⏳ หน่วงเวลาแบบลุ้นๆ 2.5 วินาที
  setTimeout(async () => {
    // === ส่วนวิเคราะห์จริง ===
    const landmarks_px = currentLandmarks.map(landmark => ({
      x: landmark.x * video.videoWidth,
      y: landmark.y * video.videoHeight,
      z: landmark.z
    }));

    let all_good_signs = [];
    let all_bad_signs = [];

    Object.values(logic).forEach(analyzeFunction => {
      const { good, bad } = analyzeFunction(landmarks_px);
      all_good_signs.push(...good);
      all_bad_signs.push(...bad);
    });

    // ถ่ายรูปเก็บไว้
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = video.videoWidth / 3;
    saveCanvas.height = video.videoHeight / 3;
    const ctxSave = saveCanvas.getContext('2d');
    ctxSave.translate(saveCanvas.width, 0);
    ctxSave.scale(-1, 1);
    ctxSave.drawImage(video, 0, 0, saveCanvas.width, saveCanvas.height);
    lastSnapshotURL = saveCanvas.toDataURL('image/jpeg', 0.5);

    // แสดงลักษณะใบหน้า
    let characteristicsHTML = `
      <div class="characteristics-list">
        <p>✨ ลักษณะใบหน้า ✨</p>
        <ul>
    `;
    if (all_good_signs.length > 0)
      all_good_signs.forEach(sign => characteristicsHTML += `<li class="good">✅ ${sign}</li>`);
    if (all_bad_signs.length > 0)
      all_bad_signs.forEach(sign => characteristicsHTML += `<li class="bad">❌ ${sign}</li>`);
    if (!all_good_signs.length && !all_bad_signs.length)
      characteristicsHTML += `<li>(ไม่พบลักษณะเด่น)</li>`;
    characteristicsHTML += `</ul></div>`;
    snapshotBox.innerHTML = characteristicsHTML;

    // สร้างคำทำนาย
    const finalFortune = generateOverallFortune(all_good_signs, all_bad_signs);
    titleOut.textContent = "🔮 คำทำนายของแม่หมอ";
    textOut.innerHTML = finalFortune.replace(/\n/g, "<br>");

    lastAnalysisResult = finalFortune;
    saveBtn.disabled = false;
    snapBtn.disabled = false;
  }, 2500);
};



// ===== 7. 💾 ปุ่มบันทึกลงบอร์ด (เหมือนเดิม) =====
saveBtn.onclick = () => {
  if (!lastSnapshotURL) {
    alert("คุณต้องกด 'ทำนาย' เพื่อถ่ายรูปก่อน 💫");
    return;
  }

  // 🔮 1. สร้าง popup (เฉพาะถ้ายังไม่มี)
  let popup = document.getElementById("captionPopup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "captionPopup";
    popup.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999;
    `;
    popup.innerHTML = `
      <div style="
        background: #1c1e3b;
        color: #fff;
        padding: 24px;
        border-radius: 16px;
        width: 90%;
        max-width: 360px;
        text-align: center;
        box-shadow: 0 0 25px rgba(168,139,255,0.6);
      ">
        <h3 style="margin-top:0;">💬 ใส่แคปชันสำหรับรูปนี้</h3>
        <textarea id="captionInput" rows="3" placeholder="พิมพ์แคปชันที่อยากใส่..." style="
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: none;
          resize: none;
          font-size: 1rem;
          margin-top: 10px;
          font-family: 'Prompt', sans-serif;
        "></textarea>
        <div style="margin-top: 16px; display: flex; justify-content: center; gap: 10px;">
          <button id="cancelCaption" style="
            background: #444; color: #ccc;
            border: none; border-radius: 10px;
            padding: 8px 16px; cursor: pointer;
          ">ยกเลิก</button>
          <button id="saveCaption" style="
            background: linear-gradient(135deg,#a88bff,#7f69ff,#c59cff);
            border: none; color: #fff;
            font-weight: 700;
            border-radius: 10px;
            padding: 8px 16px; cursor: pointer;
          ">บันทึก</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }

  popup.style.display = "flex";
  const captionInput = document.getElementById("captionInput");
  captionInput.value = "";
  captionInput.focus();

  // 🔘 ปุ่มยกเลิก
  document.getElementById("cancelCaption").onclick = () => {
    popup.style.display = "none";
  };

  // ✅ ปุ่มบันทึก
  document.getElementById("saveCaption").onclick = () => {
    const caption = captionInput.value.trim();
    if (!caption) {
      alert("พิมพ์แคปชันก่อนนะ 💬");
      return;
    }

    // 🔮 บันทึกข้อมูล
    const img = lastSnapshotURL;
    let data = JSON.parse(localStorage.getItem("polaroids") || "[]");
    if (data.length >= 100) data = data.slice(data.length - 99);
    data.push({ img, text: caption, fortune: lastAnalysisResult });
    localStorage.setItem("polaroids", JSON.stringify(data));

    // 🔥 Toast แจ้งบันทึกสำเร็จ
    let toast = document.getElementById("saveToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "saveToast";
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(60,255,120,0.15);
        color: #b7ffb7;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        opacity: 0;
        transition: opacity .5s;
        z-index: 1000;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = "✅ บันทึกเรียบร้อยแล้ว!";
    toast.style.opacity = "1";
    setTimeout(() => (toast.style.opacity = "0"), 2500);

    popup.style.display = "none";
  };
};
