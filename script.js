import { logic } from './logic.js';
import { generateOverallFortune, generateGroupFortune } from './fortune.js';

const video = document.getElementById('video');
const snapBtn = document.getElementById('snapBtn');
const saveBtn = document.getElementById('saveBtn');
const titleOut = document.getElementById('titleOut');
const textOut = document.getElementById('textOut');
const statusEl = document.getElementById('status');
const modelStatus = document.getElementById("modelStatus");
const snapshotBox = document.getElementById('snapshotBox');
const miniBoard = document.getElementById('mini-board'); 

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
titleOut.parentNode.insertBefore(speakBtn, titleOut.nextSibling);

let currentLandmarks = [];
let lastAnalysisResult = "";
let lastSnapshotURL = null;

let synth;
let thaiVoice = null;
if ('speechSynthesis' in window) {
  synth = window.speechSynthesis;
  function loadVoices() {
    const voices = synth.getVoices();
    thaiVoice = voices.find(voice => voice.lang === 'th-TH' || voice.lang.startsWith('th_'));
  }
  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
  speakBtn.onclick = () => {
    if (!lastAnalysisResult) return;
    if (synth.speaking) {
      synth.cancel(); 
      return;
    }
    const textToSpeak = lastAnalysisResult.replace(/【/g, '').replace(/】/g, ' ');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'th-TH';
    if (thaiVoice) {
      utterance.voice = thaiVoice; 
    }
    utterance.rate = 2.0; 
    utterance.pitch = 1.0; 
    synth.speak(utterance);
  };
} else {
  speakBtn.style.display = 'none';
  console.log("บราวเซอร์นี้ไม่รองรับการอ่านออกเสียง (Web Speech API)");
}

modelStatus.textContent = "⏳ กำลังโหลดโมเดล MediaPipe...";
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 5,
  refineLandmarks: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults((results) => {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    currentLandmarks = results.multiFaceLandmarks; 
  } else {
    currentLandmarks = [];
  }
});
modelStatus.textContent = "โหลด MediaPipe สำเร็จ! พร้อมทำนายแล้วค่ะ";


statusEl.textContent = "กำลังเปิดกล้อง...";
const camera = new Camera(video, {
  onFrame: async () => { await faceMesh.send({ image: video }); },
  width: 720,
  height: 1280, 
  facingMode: 'user'
});
camera.start();
statusEl.textContent = "กล้องพร้อมแล้ว! 👁‍🗨";
saveBtn.disabled = true;
speakBtn.disabled = true; 
speakBtn.style.opacity = '0.5'; 


snapBtn.onclick = async () => {
  
  if (synth && synth.speaking) { synth.cancel(); } 
  if (!Array.isArray(currentLandmarks) || currentLandmarks.length === 0) {
    titleOut.textContent = "อ๊ะ!";
    textOut.textContent = "แม่หมอมองไม่เห็นหน้าเลยลูก 😭 ลองขยับเข้ามาอีกหน่อย";
    snapshotBox.innerHTML = `
      <div id="snapshot-placeholder" style="text-align:center;color:#aab0d4;padding:30px 0;">
        <p style="font-size:3rem;margin:0;">📜</p>
        <p>ลักษณะใบหน้าจะมาอยู่ที่นี่</p>
      </div>`;
    speakBtn.disabled = true; 
    speakBtn.style.opacity = '0.5'; 
    return;
  }
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    titleOut.textContent = "อ๊ะ!";
    textOut.textContent = "กล้องยังไม่พร้อมเลย! 📸 รอแป๊บนึงนะลูก";
    snapBtn.disabled = false; 
    return; 
  }


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

  setTimeout(() => {
    
    const faces = currentLandmarks;              
    const faceCount = faces.length;
    let listHTMLAllFaces = "";                   
    let groupGood = [], groupBad = [];
    const perFaceFortunes = [];                  

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


      const listHTML = `
        <ul style="margin:8px 0 0 0;padding-left:18px;line-height:1.45;text-align:left;">
          ${all_good.map(s => `<li style="color:#70ffba">✅ ${s}</li>`).join('')}
          ${(!all_good.length) ? `<li style="color:#cfd2ff">(ไม่พบจุดเด่น)</li>` : ""}
        </ul>`;

      listHTMLAllFaces += `
        <div class="face-result" style="margin-bottom:16px;background:#181a3b;border:1px solid #2c2f58;border-radius:12px;padding:12px;">
          <h3 style="margin:0 0 6px 0;">หน้า ${index + 1}</h3>
          ${listHTML}
        </div>`;
      perFaceFortunes.push(generateOverallFortune(all_good, all_bad));
    });

    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = video.videoWidth / 3;
    saveCanvas.height = video.videoHeight / 3;
    const ctxSave = saveCanvas.getContext('2d');
    ctxSave.translate(saveCanvas.width, 0); 
    ctxSave.scale(-1, 1);
    ctxSave.drawImage(video, 0, 0, saveCanvas.width, saveCanvas.height);
    lastSnapshotURL = saveCanvas.toDataURL('image/jpeg', 0.5);

    snapshotBox.innerHTML = listHTMLAllFaces;

    if (faceCount === 1) {
      titleOut.textContent = "คำทำนายของแม่หมอ";
      textOut.innerHTML = `<pre style="white-space:pre-wrap;margin:0;font-family:inherit">${perFaceFortunes[0]}</pre>`;
      lastAnalysisResult = perFaceFortunes[0];
    } else {
      const groupFortune = generateGroupFortune(groupGood, groupBad, faceCount);
      titleOut.textContent = (faceCount === 2) ? "คำทำนายโหมดคู่" : `คำทำนายรวมของกลุ่ม (${faceCount} คน)`;
      const perFaceSummary = perFaceFortunes
        .map((f, i) => `— ใบหน้า ${i+1}\n${f}`)
        .join("\n\n");
      textOut.innerHTML = `<pre style="white-space:pre-wrap;margin:0;font-family:inherit">${groupFortune}\n\n${perFaceSummary}</pre>`;
      lastAnalysisResult = `${groupFortune}\n\n${perFaceSummary}`;
    }

    saveBtn.disabled = false;
    snapBtn.disabled = false;
    speakBtn.disabled = false; 
    speakBtn.style.opacity = '1'; 
  }, 1200); 
};


saveBtn.onclick = () => {
  if (synth && synth.speaking) { synth.cancel(); } 
  if (!lastSnapshotURL) {
    alert("คุณต้องกด 'ทำนาย' เพื่อถ่ายรูปก่อน 💫");
    return;
  }

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
    

    loadMiniBoard();
  };
};

/* =============================================
 Mini-Board 
============================================= */
function loadMiniBoard() {
  // เช็คก่อนว่ามี miniBoard จริงๆ (กัน error)
  if (!miniBoard) return;

  const data = JSON.parse(localStorage.getItem("polaroids") || "[]").slice().reverse(); // .reverse() เพื่อเอาอันล่าสุด
  miniBoard.innerHTML = ""; // เคลียร์ของเก่า

  if (data.length === 0) {
    miniBoard.innerHTML = "<p style='color: var(--muted); margin: auto;'>ยังไม่มีรูปดูดวงเลย 🥺</p>";
    return;
  }
  
  // [จำกัด] แสดงผลแค่ 10 อันล่าสุด
  const latestData = data.slice(0, 10); 

  latestData.forEach((c) => {
    const card = document.createElement("div");
    card.className = "mini-polaroid"; 
    
    card.innerHTML = `
      <img src="${c.img}" style="width:100%; border-radius: 5px;">
      <div class="caption" style="margin-top: 5px; word-wrap: break-word;">
        ${c.text ? c.text.substring(0, 50) : '(ไม่มีแคปชัน)'}
      </div>
    `;
    
    miniBoard.appendChild(card);
  });
}

loadMiniBoard();