// app.js

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";



/* === ضع مفاتيحك هنا عند الربط الحقيقي === */

export const SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";

export const SUPABASE_ANON = "YOUR-ANON-KEY";

export const BUCKET = "projects";

/* ======================================== */



const supa = createClient(SUPABASE_URL, SUPABASE_ANON);



let currentUserId = null;

try {

  const { data: { user } } = await supa.auth.getUser();

  if (user) currentUserId = user.id;

}catch(e){ console.warn("Auth not set, using demo user"); }

if (!currentUserId) currentUserId = "demo-user-id";



/* يمكنك تغيير أسماء الفئات كما تريد */

const categories = [

  {key:"blueprints",     label:"المخططات",     emoji:"📐"},

  {key:"photos_before",  label:"صور قبل",      emoji:"📷"},

  {key:"photos_after",   label:"صور بعد",      emoji:"✨"},

  {key:"permits",        label:"تصاريح",       emoji:"📄"},

  {key:"invoices",       label:"فواتير",       emoji:"🧾"},

  {key:"contracts",      label:"عقود",         emoji:"✍️"},

  {key:"materials",      label:"مواد",         emoji:"🏗️"},

  {key:"designs",        label:"تصاميم",       emoji:"🎨"},

  {key:"measurements",   label:"قياسات",       emoji:"📏"},

  {key:"videos",         label:"فيديوهات",     emoji:"🎬"},

  {key:"voice_notes",    label:"ملاحظات صوت",  emoji:"🎙️"},

  {key:"other",          label:"أخرى",         emoji:"🗂️"},

];



const modal = document.getElementById("modal");

const grid = document.getElementById("iconGrid");

const openDoor = document.getElementById("openDoor");

const closeDoor = document.getElementById("closeDoor");

const uploaderArea = document.getElementById("uploaderArea");

const catTitle = document.getElementById("catTitle");

const fileInput = document.getElementById("fileInput");

const fileList = document.getElementById("fileList");



openDoor.onclick = () => modal.style.display = "flex";

closeDoor.onclick = () => { modal.style.display="none"; uploaderArea.style.display="none"; fileList.innerHTML=""; };



let activeCategory = null;



// ارسم الأيقونات

categories.forEach(c => {

  const div = document.createElement("div");

  div.className = "icon";

  div.innerHTML = `<div class="emoji">${c.emoji}</div><span>${c.label}</span>`;

  div.onclick = () => { activeCategory = c; uploaderArea.style.display = "block"; catTitle.textContent = `الفئة المختارة: ${c.label}`; };

  grid.appendChild(div);

});



// رفع الملفات

fileInput.addEventListener("change", async (e) => {

  if (!activeCategory) return alert("اختر فئة أولًا");

  const files = Array.from(e.target.files);

  for (const f of files) await uploadOne(f);

});



let jobId = sessionStorage.getItem("jobId");

if (!jobId) { jobId = crypto.randomUUID(); sessionStorage.setItem("jobId", jobId); }



async function uploadOne(file){

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = `<div>${file.name} <small>(${Math.round(file.size/1024)} KB)</small></div><progress max="100" value="0"></progress>`;

  fileList.appendChild(row);

  const prog = row.querySelector("progress");



  const path = `${currentUserId}/${jobId}/${activeCategory.key}/original/${Date.now()}-${file.name}`;



  prog.value = 20;

  const { error } = await supa.storage.from(BUCKET).upload(path, file, {

    cacheControl: "3600",

    upsert: false,

    contentType: file.type || "application/octet-stream"

  });

  if (error) { prog.value = 0; row.style.color = "#ff7b7b"; row.title = error.message; return; }



  // (اختياري) سجل ميتاداتا في Postgres عبر endpoint خاص بك

  // await fetch("/api/record-upload", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ job_id: jobId, owner: currentUserId, category: activeCategory.key, storage_path: path, mime_type: file.type, size_bytes: file.size }) });



  prog.value = 100;

}
