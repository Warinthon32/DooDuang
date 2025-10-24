// ===== 2) Utils & คลังตรรกะวิเคราะห์ (เวอร์ชันอัปเกรด) =====
const dist = (p1, p2) => (!p1 || !p2) ? 0 : Math.hypot(p1.x - p2.x, p1.y - p2.y);

export const logic = {};

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

    // ตรรกะเดิมของคุณ (ปรับเล็กน้อย)
    if (Math.abs(forehead_width - jaw_width) / forehead_width < 0.15 && Math.abs(cheekbone_width - jaw_width) / cheekbone_width < 0.15) {
      good.push("โครงหน้าเหลี่ยม (เป็นผู้นำ, มั่นคง, หนักแน่น)");
    } else if (H_W_ratio < 1.25 && cheekbone_width > forehead_width && cheekbone_width > jaw_width) {
      good.push("โครงหน้ากลม (เป็นมิตร, สร้างสัมพันธ์เก่ง, อัธยาศัยดี)");
    } else if (H_W_ratio > 1.6) { // เพิ่มเกณฑ์
      good.push("โครงหน้ายาว (สุขุม, รอบคอบ, นักวิเคราะห์)");
    } else if (cheekbone_width > forehead_width && cheekbone_width > jaw_width && Chin_ratio > 0.5) { // เพิ่มเช็คคาง
      good.push("โครงหน้าเพชร (มีเอกลักษณ์, ทะเยอทะยาน, มั่นใจสูง)");
    } else if (forehead_width > jaw_width && Chin_ratio > 0.6) {
      good.push("โครงหน้าหัวใจ (สร้างสรรค์, ฉลาด, มีเสน่ห์)");
    } else if (jaw_width > cheekbone_width && jaw_width > forehead_width) {
      good.push("โครงหน้าสามเหลี่ยม (ดื้อรั้น, มุ่งมั่น, พลังเยอะ)");
    } else {
      good.push("โครงหน้ารูปไข่ (สมดุล, มีเสน่ห์, ปรับตัวเก่ง)");
    }

    // เพิ่มจุดด้อย
    if (H_W_ratio < 1.1) {
      bad.push("หน้ากลม/สั้นมาก (ลังเล, ขาดความกระตือรือร้น)");
    }
    if (jaw_width > forehead_width * 1.2) {
      bad.push("กรามเด่นกว่าหน้าผาก (ดื้อรั้น, ไม่ฟังใคร)");
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
    
    // ความยาว (ตรรกะเดิม)
    if (brow_ratio > 1.1) good.push("คิ้วยาว (มั่นใจ มีพลัง, อายุยืน)");
    else if (brow_ratio < 0.9) bad.push("คิ้วสั้น (ไม่มั่นคง กังวล, ใจร้อน)");

    // เพิ่ม: ความโก่ง (เทียบ y)
    const brow_arch_y = landmarks_px[105].y;
    const brow_ends_avg_y = (landmarks_px[55].y + landmarks_px[46].y) / 2;
    const arch_prominence = brow_ends_avg_y - brow_arch_y; // y น้อย = สูง
    
    if (arch_prominence / eye_width > 0.12) good.push("คิ้วโก่ง (มีเสน่ห์, แสดงออกเก่ง)");
    else if (arch_prominence / eye_width < 0.03) good.push("คิ้วตรง (จิตใจแน่วแน่, ตรรกะดี)");

    // เพิ่ม: ความชัน (y หัวคิ้ว vs y หางคิ้ว)
    const brow_slant = landmarks_px[46].y - landmarks_px[55].y; // y หาง - y หัว
    if (brow_slant < -eye_width * 0.05) good.push("หางคิ้วชี้ขึ้น (ทะเยอทะยาน, กระตือรือร้น)");
    else if (brow_slant > eye_width * 0.05) bad.push("หางคิ้วตก (เศร้า, ขาดพลัง, ยอมคน)");

    // เพิ่ม: ระยะห่างระหว่างคิ้ว
    const brow_gap = dist(landmarks_px[55], landmarks_px[285]);
    const eye_dist_inner = dist(landmarks_px[133], landmarks_px[362]);
    if (brow_gap / eye_dist_inner < 0.9) bad.push("คิ้วชิด (ใจแคบ, เครียดง่าย, คิดมาก)");
    else if (brow_gap / eye_dist_inner > 1.2) good.push("คิ้วห่าง (ใจกว้าง, สบายๆ, ไม่จุกจิก)");

  } catch (e) {}
  return { good, bad };
};

logic.analyze_eyes = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const eye_height = dist(landmarks_px[159], landmarks_px[145]); // กลางตาบน-ล่าง
    const eye_width = dist(landmarks_px[33], landmarks_px[133]);
    if (eye_width === 0) return { good, bad };
    
    const open_ratio = eye_height / eye_width;
    
    // ขนาดตา (ตรรกะเดิม)
    if (open_ratio > 0.33) good.push("ตาใหญ่/ตาโต (จริงใจ, เปิดเผย, กล้าแสดงออก)");
    else if (open_ratio < 0.2) bad.push("ตาเล็ก/ตาหรี่ (คิดมาก, ระมัดระวัง, เก็บความรู้สึก)");

    // เพิ่ม: ความชันของตา (y หัวตา vs y หางตา)
    const eye_slant = landmarks_px[133].y - landmarks_px[33].y; // y หาง - y หัว
    if (eye_slant < -eye_width * 0.08) good.push("หางตาชี้ขึ้น (ฉลาด, มีไหวพริบ, ทะเยอทะยาน)");
    else if (eye_slant > eye_width * 0.05) bad.push("หางตาตก (อ่อนไหว, เก็บตัว, ดูเศร้า)");
    else good.push("ตาสมดุล (มีเหตุผล, มั่นคง)");

    // เพิ่ม: ตาดำ (ประมาณ)
    const iris_size = dist(landmarks_px[475], landmarks_px[477]); // ประมาณขนาดม่านตา
    if (iris_size / eye_height > 0.6) good.push("ตาดำใหญ่ (จิตใจดี, อ่อนโยน)");
    if (landmarks_px[159].y > landmarks_px[474].y || landmarks_px[145].y < landmarks_px[476].y) {
         bad.push("ตาขาวลอย (ตาลอย) (สุขภาพไม่ดี, สับสน)");
    }

  } catch (e) {}
  return { good, bad };
};

logic.analyze_nose = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const nose_width = dist(landmarks_px[48], landmarks_px[218]); // ปีกจมูก
    const nose_height = dist(landmarks_px[6], landmarks_px[168]); // สันจมูกถึงกลาง
    const face_height = dist(landmarks_px[10], landmarks_px[152]);
    if (nose_height === 0 || face_height === 0) return { good, bad };
    
    const nose_ratio = nose_width / nose_height;
    const nose_length_ratio = nose_height / face_height;

    // สัดส่วน (ตรรกะเดิม)
    if (nose_ratio > 0.85) bad.push("จมูกบาน/แบน (เก็บเงินไม่อยู่, ใช้เงินเก่ง)");
    else if (nose_ratio < 0.65) good.push("จมูกได้สัดส่วน (การเงินดี, มีวินัย)");

    // เพิ่ม: ความยาวจมูก
    if (nose_length_ratio > 0.34) good.push("จมูกยาว (จริงจัง, วางแผนเก่ง, รอบคอบ)");
    else if (nose_length_ratio < 0.28) bad.push("จมูกสั้น (ใจร้อน, ปรับตัวไวแต่ไม่รอบคอบ)");

    // เพิ่ม: ความโด่ง (เทียบ z)
    const nose_tip_z = landmarks_px[1].z;
    const nose_bridge_z = landmarks_px[6].z;
    if (nose_bridge_z - nose_tip_z > 0.04) { // z ยิ่งลบ = ยิ่งใกล้
        good.push("สันจมูกโด่ง (มั่นใจ, อุดมการณ์สูง)");
    } else if (nose_bridge_z - nose_tip_z < 0.01) {
        bad.push("สันจมูกแบน (ไม่มั่นใจ, ตามคนอื่น)");
    }
    
    // เพิ่ม: ปลายจมูก
    const nose_tip_width = dist(landmarks_px[118], landmarks_px[347]);
    if (nose_tip_width / nose_width > 0.6) bad.push("ปลายจมูกใหญ่ (ใจกว้าง, แต่ขาดรายละเอียด)");


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
    const nose_width = dist(landmarks_px[48], landmarks_px[218]);

    // มุมปาก (ตรรกะเดิม)
    const left_corner_y = landmarks_px[61].y;
    const right_corner_y = landmarks_px[291].y;
    const lip_center_y = (landmarks_px[13].y + landmarks_px[14].y) / 2;
    const corner_center_y = (left_corner_y + right_corner_y) / 2;
    const is_smiling = corner_center_y < lip_center_y - (mouth_width * 0.01);
    
    if (is_smiling) good.push("มุมปากชี้ขึ้น (จิตใจดี, มองโลกในแง่ดี)");
    else if (corner_center_y > lip_center_y + (mouth_width * 0.02)) bad.push("มุมปากตก (มองโลกในแง่ร้าย, ไม่พอใจ)");

    // ความหนา/บาง (ตรรกะเดิม + เพิ่ม)
    if (lip_ratio > 0.4) good.push("ปากอวบอิ่ม (มีเสน่ห์, เจรจาดี, ใจกว้าง)");
    else if (lip_ratio < 0.2) bad.push("ปากบาง (พูดตรง, เก็บความลับไม่เก่ง, จุกจิก)");

    if (upper_lip_height < lower_lip_height * 0.8) bad.push("ปากบนบางกว่าปากล่าง (ขี้บ่น, ช่างต่อรอง)");
    else if (upper_lip_height > lower_lip_height * 1.2) good.push("ปากบนหนากว่า (ใจดี, เอื้อเฟื้อ, ให้ความสำคัญกับผู้อื่น)");
    else good.push("ริมฝีปากสมดุล (มีเหตุผล, พูดจาน่าฟัง)");

    // ความเบี้ยว (ตรรกะเดิม)
    const lip_skew = Math.abs(left_corner_y - right_corner_y) / mouth_width;
    if (lip_skew > 0.05) bad.push("ปากเบี้ยว (จิตใจไม่ซื่อตรง, พูดไม่ตรงกับใจ)");

    // เพิ่ม: ความกว้างปาก
    if (mouth_width / nose_width > 2.6) good.push("ปากกว้าง (ใจกว้าง, กล้าแสดงออก, ชอบเข้าสังคม)");
    else if (mouth_width / nose_width < 1.9) bad.push("ปากแคบ (เก็บตัว, ช่างเลือก, ระมัดระวังคำพูด)");

  } catch (e) {}
  return { good, bad };
};

logic.analyze_chin = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const chin_width = dist(landmarks_px[326], landmarks_px[97]);
    const chin_height = dist(landmarks_px[21], landmarks_px[152]);
    const jaw_width = dist(landmarks_px[172], landmarks_px[397]);
    if (chin_width === 0 || jaw_width === 0) return { good, bad };
    
    const chin_ratio = chin_height / chin_width;

    // รูปคาง (ตรรกะเดิม + เพิ่ม)
    if (chin_ratio > 0.65) good.push("คางแหลม (สร้างสรรค์, ศิลปิน, ฉลาด)");
    else if (chin_ratio < 0.45) good.push("คางกลม (มั่นคง, อดทน, ใจดี)");
    
    if (Math.abs(chin_width - jaw_width) / jaw_width < 0.25) {
        good.push("คางเหลี่ยม (หนักแน่น, อดทนสูง, ผู้นำ)");
    }

    // เพิ่ม: คางยื่น/คางหลบ (เทียบ z)
    const chin_z = landmarks_px[152].z;
    const mouth_z = landmarks_px[14].z;
    if (chin_z > mouth_z + 0.03) { // z คาง > z ปาก (คางอยู่หลังกว่า)
        bad.push("คางหลบ (ไม่มั่นใจ, ลังเล, ขาดพลัง)");
    } else if (chin_z < mouth_z - 0.04) { // z คาง < z ปาก (คางยื่นกว่า)
        good.push("คางยื่น (ดื้อรั้น, มุ่งมั่น, ไม่ยอมแพ้)");
    }

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
    
    // แก้มตอบ/อิ่ม (ตรรกะเดิม)
    if (cheek_ratio < 0.75) bad.push("แก้มตอบ (ชีวิตบั้นปลายเงียบเหงา, เหนื่อยง่าย)");
    else good.push("แก้มอิ่ม (บั้นปลายสุขสบาย, มีวาสนา)");

    // เพิ่ม: โหนกแก้มสูง/ต่ำ (เทียบ y)
    const cheekbone_y = (landmarks_px[234].y + landmarks_px[454].y) / 2;
    const nose_base_y = landmarks_px[2].y;
    const face_height = dist(landmarks_px[10], landmarks_px[152]);
    
    if (cheekbone_y < nose_base_y - (face_height * 0.05)) { // y โหนกแก้ม < y ฐานจมูก (อยู่สูงกว่า)
        good.push("โหนกแก้มสูง (มีอำนาจ, ทะเยอทะยาน, ควบคุมเก่ง)");
    } else if (cheekbone_y > nose_base_y) {
        bad.push("โหนกแก้มต่ำ (ขาดความทะเยอทะยาน, ตามคนอื่น)");
    }

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

    // ความสูง/กว้าง (ตรรกะเดิม)
    if (forehead_ratio > 0.32) good.push("หน้าผากสูง/กว้าง (สติปัญญาดี, วิสัยทัศน์ไกล)");
    else if (forehead_ratio < 0.25) bad.push("หน้าผากแคบ (ใจร้อน, วาสนาน้อย, มองการณ์ใกล้)");

    // เพิ่ม: ความนูน/แบน (เทียบ z)
    const forehead_center_z = landmarks_px[10].z;
    const forehead_side_z = (landmarks_px[103].z + landmarks_px[332].z) / 2;
    
    if (forehead_center_z < forehead_side_z - 0.03) { // z กลาง < z ข้าง (นูนออกมา)
        good.push("หน้าผากนูน (ฉลาด, มีจินตนาการ, ความจำดี)");
    } else if (forehead_center_z > forehead_side_z + 0.01) { // z กลาง > z ข้าง (แบนหรือยุบ)
        bad.push("หน้าผากแบน (นักปฏิบัติ, ขาดจินตนาการ, หัวแข็ง)");
    }
  } catch (e) {}
  return { good, bad };
};

logic.analyze_eye_distance = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const eye_width = dist(landmarks_px[33], landmarks_px[133]);
    const eye_distance = dist(landmarks_px[133], landmarks_px[362]); // ระยะห่างหัวตา
    if (eye_width === 0) return { good, bad };
    
    const eye_ratio = eye_distance / eye_width;

    // ตรรกะเดิม (ปรับเกณฑ์)
    if (eye_ratio > 1.1) good.push("ตาห่าง (ใจกว้าง, มองการณ์ไกล, ไม่จุกจิก)");
    else if (eye_ratio < 0.9) bad.push("ตาชิด (จุกจิก, คิดเล็กคิดน้อย, โฟกัสเก่ง)");
    else if (eye_ratio >= 0.9 && eye_ratio <= 1.1) {
        good.push("ตาสมดุล (มีเหตุผล, สมดุล, ยุติธรรม)");
    }
  } catch (e) {}
  return { good, bad };
};

logic.analyze_facial_thirds = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const forehead_height = dist(landmarks_px[10], landmarks_px[105]); // บน -> คิ้ว
    const nose_height = dist(landmarks_px[105], landmarks_px[2]);     // คิ้ว -> ฐานจมูก
    const chin_height = dist(landmarks_px[2], landmarks_px[152]);      // ฐานจมูก -> คาง
    const total_height = forehead_height + nose_height + chin_height;
    if (total_height === 0) return { good, bad };
    
    const avg_height = total_height / 3.0;
    const f_dev = Math.abs(forehead_height - avg_height) / avg_height;
    const n_dev = Math.abs(nose_height - avg_height) / avg_height;
    const c_dev = Math.abs(chin_height - avg_height) / avg_height;

    // สมดุล (ตรรกะเดิม)
    if (f_dev < 0.15 && n_dev < 0.15 && c_dev < 0.15) {
      good.push("สัดส่วน 3 ส่วนสมดุล (ชีวิตราบรื่น, สมบูรณ์)");
    }

    // เด่น (ตรรกะเดิม)
    if (forehead_height > nose_height && forehead_height > chin_height) {
      good.push("ส่วนบนเด่น (นักคิด, ปัญญาชน, วัยเด็กดี)");
    } else if (nose_height > forehead_height && nose_height > chin_height) {
      good.push("ส่วนกลางเด่น (นักสู้, บ้าพลัง, วัยกลางคนดี)");
    } else if (chin_height > forehead_height && chin_height > nose_height) {
      good.push("ส่วนล่างเด่น (นักกิน, เจ้าสำราญ, วัยชราดี)");
    }

    // เพิ่ม: ด้อย (ไม่สมดุล)
    if (forehead_height / total_height < 0.25) bad.push("ส่วนบนแคบ (วัยเด็กไม่ดี, ใจร้อน)");
    if (nose_height / total_height < 0.25) bad.push("ส่วนกลางสั้น (ขาดความมั่นใจ, ขี้กังวล)");
    if (chin_height / total_height < 0.25) bad.push("ส่วนล่างสั้น (บั้นปลายไม่มั่นคง, ขี้กลัว)");

  } catch (e) {}
  return { good, bad };
};

logic.analyze_philtrum = (landmarks_px) => { // ร่องใต้จมูก
  let good = [], bad = [];
  try {
    const philtrum_height = dist(landmarks_px[168], landmarks_px[13]); // กลางจมูก -> บนปาก
    const chin_only_height = dist(landmarks_px[15], landmarks_px[152]); // ล่างปาก -> คาง
    if (chin_only_height === 0) return { good, bad };
    
    const philtrum_ratio = philtrum_height / chin_only_height;

    // ยาว/สั้น (ตรรกะเดิม)
    if (philtrum_ratio > 0.7) good.push("ร่องใต้จมูกยาว (ใจเย็น, สุขภาพดี, อายุยืน)");
    else if (philtrum_ratio < 0.4) bad.push("ร่องใต้จมูกสั้น (ใจร้อน, พูดเร็วทำเร็ว, สุขภาพไม่ดี)");

    // เพิ่ม: ความชัดลึก (เทียบ z)
    const philtrum_center_z = landmarks_px[168].z;
    const philtrum_ridge_z = (landmarks_px[57].z + landmarks_px[287].z) / 2; // สันร่อง
    
    if (philtrum_ridge_z < philtrum_center_z - 0.01) { // สัน z < ร่อง z (สันนูนกว่า)
        good.push("ร่องใต้จมูกชัด (สุขภาพดี, มีเสน่ห์, ลูกดก)");
    } else if (philtrum_ridge_z > philtrum_center_z) {
        bad.push("ร่องใต้จมูกตื้น (สุขภาพไม่แข็งแรง, เฉื่อยชา, มีลูกยาก)");
    }
  } catch (e) {}
  return { good, bad };
};

logic.analyze_symmetry = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const nose_center_pt = landmarks_px[1];
    const mouth_center_pt = landmarks_px[14];
    
    // จมูก (ตรรกะเดิม)
    const nose_left_dist = dist(nose_center_pt, landmarks_px[48]);
    const nose_right_dist = dist(nose_center_pt, landmarks_px[218]);
    const nose_diff = Math.abs(nose_left_dist - nose_right_dist) / Math.max(nose_left_dist, nose_right_dist);
    
    // ปาก (ตรรกะเดิม)
    const mouth_left_dist = dist(mouth_center_pt, landmarks_px[61]);
    const mouth_right_dist = dist(mouth_center_pt, landmarks_px[291]);
    const mouth_diff = Math.abs(mouth_left_dist - mouth_right_dist) / Math.max(mouth_left_dist, mouth_right_dist);
    
    // เพิ่ม: ตา
    const eye_left_dist = dist(nose_center_pt, landmarks_px[33]);
    const eye_right_dist = dist(nose_center_pt, landmarks_px[263]);
    const eye_diff = Math.abs(eye_left_dist - eye_right_dist) / Math.max(eye_left_dist, eye_right_dist);
    
    // เพิ่ม: โหนกแก้ม
    const cheek_left_dist = dist(nose_center_pt, landmarks_px[234]);
    const cheek_right_dist = dist(nose_center_pt, landmarks_px[454]);
    const cheek_diff = Math.abs(cheek_left_dist - cheek_right_dist) / Math.max(cheek_left_dist, cheek_right_dist);


    if (nose_diff < 0.1 && mouth_diff < 0.1 && eye_diff < 0.1 && cheek_diff < 0.1) {
      good.push("ใบหน้าสมมาตร (มั่นคง, มีระเบียบ, น่าเชื่อถือ)");
    } else {
      bad.push("ใบหน้าไม่สมมาตร (ยืดหยุ่น, คาดเดาไม่ได้, อารมณ์แปรปรวน)");
    }

    if (eye_diff > 0.1) bad.push("ตาสองข้างไม่เท่ากัน (มุมมองไม่สมดุล)");
    if (mouth_diff > 0.1) bad.push("ปากไม่สมมาตร (คำพูดไม่น่าเชื่อถือ)");

  } catch (e) {}
  return { good, bad };
};

logic.analyze_mouth_eye_ratio = (landmarks_px) => {
  let good = [], bad = [];
  try {
    const mouth_width = dist(landmarks_px[61], landmarks_px[291]);
    const eye_distance = dist(landmarks_px[133], landmarks_px[362]); // ระยะห่างหัวตา
    if (eye_distance === 0) return { good, bad };
    
    const mouth_eye_ratio = mouth_width / eye_distance;
    
    // ตรรกะเดิม (ชัดเจนดีแล้ว)
    if (mouth_eye_ratio > 1.8) good.push("ปากกว้างมาก (ชอบเข้าสังคม, พูดจาเกินตัว, กล้าได้กล้าเสีย)");
    else if (mouth_eye_ratio < 1.3) bad.push("ปากแคบ (ช่างเลือก, เก็บตัว, คิดก่อนพูด)");
    else good.push("ปาก-ตาสมดุล (เข้าสังคมพอดี, รู้จักกาลเทศะ)");

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

    // ตรรกะเดิม (ปรับปรุง)
    if (cheek_jaw_ratio > 1.25) {
      bad.push("โหนกแก้มเด่นเกินไป (แข็งกร้าว, ชอบควบคุม, ก้าวร้าว)");
    } else if (cheek_jaw_ratio > 1.1) { // ลดเกณฑ์ลงเล็กน้อย
      good.push("โหนกแก้มเด่น (ทะเยอทะยาน, มีอำนาจ, กล้าตัดสินใจ)");
    } else {
      good.push("โหนกแก้มไม่เด่น (ถ่อมตน, ไม่ชอบนำ, ประนีประนอม)");
    }
  } catch (e) {}
  return { good, bad };
};