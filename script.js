import { logic } from './logic.js';
import { generateOverallFortune, generateGroupFortune } from './fortune.js';

// ===== 1) องค์ประกอบ HTML =====
const video = document.getElementById('video');
const snapBtn = document.getElementById('snapBtn');
const saveBtn = document.getElementById('saveBtn');
const titleOut = document.getElementById('titleOut');
const textOut = document.getElementById('textOut');
const statusEl = document.getElementById('status');
const modelStatus = document.getElementById("modelStatus");
const snapshotBox = document.getElementById('snapshotBox');

// ⭐️ [เพิ่มใหม่] สร้างปุ่ม "ฟัง" ด้วย JS =====
const speakBtn = document.createElement('button');
speakBtn.id = 'speakBtn';
speakBtn.textContent = '🔊 ฟังคำทำนาย';
speakBtn.style.cssText = `
  padding: 6px 12px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  border-radius: 20px;
  background: #a88bff;
  color: white;
  cursor: pointer;
  margin-left: 10px;
  vertical-align: middle;
  transition: all 0.2s;
`;

speakBtn.onmouseover = () => { if (!speakBtn.disabled) speakBtn.style.background = '#c59cff'; };
speakBtn.onmouseout = () => { if (!speakBtn.disabled) speakBtn.style.background = '#a88bff'; };
// แทรกปุ่มหลัง Title
titleOut.parentNode.insertBefore(speakBtn, titleOut.nextSibling);
// ⭐️ [จบส่วนเพิ่มใหม่] =====

let currentLandmarks = [];           // ✅ เก็บเป็น array เสมอ (รองรับหลายหน้า)
let lastAnalysisResult = "";         // ข้อความคำทำนายล่าสุด (ไว้เซฟไปบอร์ด)
let lastSnapshotURL = null;          // dataURL ของ snapshot

// ⭐️ [เพิ่มใหม่] ตั้งค่าการอ่านออกเสียง (SpeechSynthesis) =====
let synth;
let thaiVoice = null;

if ('speechSynthesis' in window) {
  synth = window.speechSynthesis;

  // ฟังก์ชันค้นหาเสียงไทย (จะถูกเรียกเมื่อเสียงพร้อม)
  function loadVoices() {
    const voices = synth.getVoices();
    thaiVoice = voices.find(voice => voice.lang === 'th-TH' || voice.lang.startsWith('th_'));
    // console.log("พบเสียงไทย:", thaiVoice ? thaiVoice.name : "ไม่พบ");
  }

  // โหลดเสียงครั้งแรก
  loadVoices();
  // ถ้าเสียงยังโหลดไม่เสร็จ ให้รอ event 'voiceschanged'
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }

  // การทำงานของปุ่ม "ฟัง"
  speakBtn.onclick = () => {
    if (!lastAnalysisResult) return;

    if (synth.speaking) {
      synth.cancel(); // ถ้ากำลังพูดอยู่ กดอีกครั้งเพื่อหยุด
      return;
    }

    // ทำความสะอาด text เล็กน้อย (เอา 【】 ออก)
    const textToSpeak = lastAnalysisResult.replace(/【/g, '').replace(/】/g, ' ');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'th-TH';
    
    if (thaiVoice) {
      utterance.voice = thaiVoice; // ใช้เสียงไทยที่หาเจอ
    }
    
    utterance.rate = 2.0; // ความเร็วในการพูด
    utterance.pitch = 1.0; // ระดับเสียง
    
    synth.speak(utterance);
  };

} else {
  // ถ้าบราวเซอร์ไม่รองรับ ก็ซ่อนปุ่มนี้ไปเลย
  speakBtn.style.display = 'none';
  console.log("บราวเซอร์นี้ไม่รองรับการอ่านออกเสียง (Web Speech API)");
}
// ⭐️ [จบส่วนเพิ่มใหม่] =====


// ===== 4) โหลด MediaPipe FaceMesh =====
modelStatus.textContent = "⏳ กำลังโหลดโมเดล MediaPipe...";
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 5,            // ✅ รองรับหลายหน้า
  refineLandmarks: false,     // เร็วลื่น (ถ้าอยากละเอียดมากขึ้นค่อยเปลี่ยนเป็น true)
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults((results) => {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    currentLandmarks = results.multiFaceLandmarks; // ✅ เก็บเป็น array เสมอ
    // console.log("🎯 พบใบหน้า:", currentLandmarks.length);
  } else {
    currentLandmarks = [];
  }
});
modelStatus.textContent = "โหลด MediaPipe สำเร็จ! พร้อมทำนายแล้วค่ะ";

// ===== 5) เปิดกล้อง (9:16) =====
statusEl.textContent = "กำลังเปิดกล้อง...";
const camera = new Camera(video, {
  onFrame: async () => { await faceMesh.send({ image: video }); },
  width: 720,
  height: 1280, // ✅ แนวตั้ง 9:16
  facingMode: 'user'
});
camera.start();
statusEl.textContent = "กล้องพร้อมแล้ว! 👁‍🗨";
saveBtn.disabled = true;
speakBtn.disabled = true; // ⭐️ [เพิ่มใหม่] ปิดปุ่มฟังตอนเริ่ม
speakBtn.style.opacity = '0.5'; // ⭐️ [เพิ่มใหม่] ทำให้ปุ่มซีด

// ===== 6) ปุ่ม “ทำนายตอนนี้” (หลายหน้า + โหลดเอฟเฟกต์) =====
snapBtn.onclick = async () => {
  if (synth && synth.speaking) { synth.cancel(); } // ⭐️ [เพิ่มใหม่] หยุดพูด ถ้ากดทำนายใหม่

  if (!Array.isArray(currentLandmarks) || currentLandmarks.length === 0) {
    titleOut.textContent = "อ๊ะ!";
    textOut.textContent = "แม่หมอมองไม่เห็นหน้าเลยลูก 😭 ลองขยับเข้ามาอีกหน่อย";
    snapshotBox.innerHTML = `
      <div id="snapshot-placeholder" style="text-align:center;color:#aab0d4;padding:30px 0;">
        <p style="font-size:3rem;margin:0;">📜</p>
        <p>ลักษณะใบหน้าจะมาอยู่ที่นี่</p>
      </div>`;
    speakBtn.disabled = true; // ⭐️ [เพิ่มใหม่]
    speakBtn.style.opacity = '0.5'; // ⭐️ [เพิ่มใหม่]
    return;
  }
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    titleOut.textContent = "อ๊ะ!";
    textOut.textContent = "กล้องยังไม่พร้อมเลย! 📸 รอแป๊บนึงนะลูก";
    
    // เปิดปุ่มกลับให้กดใหม่ได้ (สำคัญ)
    snapBtn.disabled = false; 
    
    return; // ยังไม่ให้ไปต่อ
  }

  // เอฟเฟกต์ลุ้น
  titleOut.textContent = "แม่หมอกำลังเพ่งพลัง...";
  textOut.innerHTML = `กำลังอ่านพลังโหงวเฮ้ง...`;
  snapshotBox.innerHTML = `
    <div style="text-align:center; color:#aab0d4; padding:40px 0;">
      <div style="
        width:30px;height:30px;border:3px solid #a88bff;border-top-color:transparent;border-radius:50%;
        margin:0 auto 10px;animation:spin 1s linear infinite"></div>
      <p>แม่หมอกำลังอ่านโหงวเฮ้งอยู่...</p>
    </div>
    <style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
  `;
  snapBtn.disabled = true;
  saveBtn.disabled = true;
  speakBtn.disabled = true; // ⭐️ [เพิ่มใหม่]
  speakBtn.style.opacity = '0.5'; // ⭐️ [เพิ่มใหม่]

  setTimeout(() => {
    const faces = currentLandmarks;              // array ของทุกหน้า
    const faceCount = faces.length;

    let listHTMLAllFaces = "";                   // ✅ ใช้แสดงเฉพาะ "ลิสต์ลักษณะใบหน้า" บนกล่องบน
    let groupGood = [], groupBad = [];
    const perFaceFortunes = [];                  // เก็บคำทำนายรายหน้าไว้ “ล่าง”

    // วิเคราะห์ทีละหน้า
    faces.forEach((face, index) => {
      const landmarks_px = face.map(p => ({
        x: p.x * video.videoWidth,
        y: p.y * video.videoHeight,
        z: p.z
      }));

      let all_good = [], all_bad = [];
      Object.values(logic).forEach(fn => {
        const { good, bad } = fn(landmarks_px);
        all_good.push(...good);
        all_bad.push(...bad);
      });

      groupGood.push(...all_good);
      groupBad.push(...all_bad);

      // ✅ กล่องบน: แสดง "เฉพาะลิสต์ลักษณะ" ต่อหน้า
      const listHTML = `
        <ul style="margin:8px 0 0 0;padding-left:18px;line-height:1.45;text-align:left;">
          ${all_good.map(s => `<li style="color:#70ffba">✅ ${s}</li>`).join('')}
          ${(!all_good.length && !all_bad.length) ? `<li style="color:#cfd2ff">(ไม่พบลักษณะเด่น)</li>` : ""}
        </ul>`;

      listHTMLAllFaces += `
        <div class="face-result" style="margin-bottom:16px;background:#181a3b;border:1px solid #2c2f58;border-radius:12px;padding:12px;">
          <h3 style="margin:0 0 6px 0;">หน้า ${index + 1}</h3>
          ${listHTML}
        </div>`;

      // ✅ กล่องล่าง: เก็บ “คำทำนายรายหน้า” ไว้ใช้แสดงด้านล่างเท่านั้น
      perFaceFortunes.push(generateOverallFortune(all_good, all_bad));
    });

    // ถ่าย snapshot ไว้เซฟ
    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = video.videoWidth / 3;
    saveCanvas.height = video.videoHeight / 3;
    const ctxSave = saveCanvas.getContext('2d');
    ctxSave.translate(saveCanvas.width, 0); // mirror
    ctxSave.scale(-1, 1);
    ctxSave.drawImage(video, 0, 0, saveCanvas.width, saveCanvas.height);
    lastSnapshotURL = saveCanvas.toDataURL('image/jpeg', 0.5);

    // ✅ กล่องบน: ใส่เฉพาะ "ลิสต์ลักษณะใบหน้า"
    snapshotBox.innerHTML = listHTMLAllFaces;

    // ✅ กล่องล่าง: แสดง “คำทำนายภาพรวม”
    if (faceCount === 1) {
      titleOut.textContent = "คำทำนายของแม่หมอ";
      textOut.innerHTML = `<pre style="white-space:pre-wrap;margin:0;font-family:inherit">${perFaceFortunes[0]}</pre>`;
      lastAnalysisResult = perFaceFortunes[0];
    } else {
      const groupFortune = generateGroupFortune(groupGood, groupBad, faceCount);
      titleOut.textContent = (faceCount === 2) ? "คำทำนายโหมดคู่" : `คำทำนายรวมของกลุ่ม (${faceCount} คน)`;
      // โชว์ภาพรวมกลุ่ม + สรุปย่อรายหน้า (ถ้าอยาก)
      const perFaceSummary = perFaceFortunes
        .map((f, i) => `— ใบหน้า ${i+1}\n${f}`)
        .join("\n\n");
      textOut.innerHTML = `<pre style="white-space:pre-wrap;margin:0;font-family:inherit">${groupFortune}\n\n${perFaceSummary}</pre>`;
      lastAnalysisResult = `${groupFortune}\n\n${perFaceSummary}`;
    }

    saveBtn.disabled = false;
    snapBtn.disabled = false;
    speakBtn.disabled = false; // ⭐️ [เพิ่มใหม่] เปิดปุ่มฟังเมื่อทำนายเสร็จ
    speakBtn.style.opacity = '1'; // ⭐️ [เพิ่มใหม่]
  }, 1200); // หน่วงน้อย ๆ ให้ได้ฟีลลุ้น
};

// ===== 7) ปุ่มบันทึกลงบอร์ด (ใส่แคปชันเอง) =====
saveBtn.onclick = () => {
  if (synth && synth.speaking) { synth.cancel(); } // ⭐️ [เพิ่มใหม่] หยุดพูด ถ้ากดเซฟ

  if (!lastSnapshotURL) {
    alert("คุณต้องกด 'ทำนาย' เพื่อถ่ายรูปก่อน 💫");
    return;
  }

  // popup caption (สร้างครั้งเดียว)
  let popup = document.getElementById("captionPopup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "captionPopup";
    popup.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,.6);
      display: flex; justify-content: center; align-items: center; z-index: 999;`;
    popup.innerHTML = `
      <div style="background:#1c1e3b;color:#fff;padding:24px;border-radius:16px;width:90%;max-width:360px;text-align:center;box-shadow:0 0 25px rgba(168,139,255,.6);">
        <h3 style="margin:0;">ใส่แคปชันสำหรับรูปนี้</h3>
        <textarea id="captionInput" rows="3" placeholder="พิมพ์แคปชันที่อยากใส่..." style="width:100%;padding:10px;border-radius:10px;border:none;resize:none;font-size:1rem;margin-top:10px;font-family:inherit;"></textarea>
        <div style="margin-top:16px;display:flex;justify-content:center;gap:10px;">
          <button id="cancelCaption" style="background:#444;color:#ccc;border:none;border-radius:10px;padding:8px 16px;cursor:pointer;">ยกเลิก</button>
          <button id="saveCaption" style="background:linear-gradient(135deg,#a88bff,#7f69ff,#c59cff);border:none;color:#fff;font-weight:700;border-radius:10px;padding:8px 16px;cursor:pointer;">บันทึก</button>
        </div>
      </div>`;
    document.body.appendChild(popup);
  }

  popup.style.display = "flex";
  const captionInput = document.getElementById("captionInput");
  captionInput.value = "";
  captionInput.focus();

  document.getElementById("cancelCaption").onclick = () => {
    popup.style.display = "none";
  };

  document.getElementById("saveCaption").onclick = () => {
    const caption = captionInput.value.trim();
    if (!caption) { alert("พิมพ์แคปชันก่อนนะ 💬"); return; }

    const img = lastSnapshotURL;
    let data = JSON.parse(localStorage.getItem("polaroids") || "[]");
    if (data.length >= 100) data = data.slice(data.length - 99);
    data.push({ img, text: caption, fortune: lastAnalysisResult });
    localStorage.setItem("polaroids", JSON.stringify(data));

    let toast = document.getElementById("saveToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "saveToast";
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(60,255,120,.15); color: #b7ffb7; padding: 8px 16px; border-radius: 20px;
        font-size: .9rem; font-weight: 600; opacity: 0; transition: opacity .5s; z-index: 1000;`;
      document.body.appendChild(toast);
    }
    toast.textContent = "บันทึกเรียบร้อยแล้ว!";
    toast.style.opacity = "1";
    setTimeout(() => (toast.style.opacity = "0"), 2500);


    popup.style.display = "none";
  };

  
};