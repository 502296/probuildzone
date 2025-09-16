/* app.umd.js */



const SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";   // عدّل لاحقًا

const SUPABASE_ANON = "YOUR-ANON-KEY";                      // عدّل لاحقًا

const BUCKET = "projects";



const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);



let currentUserId = null;

(async () => {

  try {

    const { data: { user } } = await supa.auth.getUser();

    if (user) currentUserId = user.id;

  } catch(e) { console.warn("Auth not set, using demo user"); }

  if (!currentUserId) currentUserId = "demo-user-id";

})();



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



if (openDoor) openDoor.onclick = () => modal.style.display = "flex";

if (closeDoor) closeDoor.onclick = () => { modal.style.display="none"; uploaderArea.style.display="none"; fileList.innerHTML=""; };



let activeCategory = null;



categories.forEach(c => {

  const div = document.createElement("div");

  div.className = "icon";

  div.innerHTML = `<div class="emoji">${c.emoji}</div><span>${c.label}</span>`;

  div.onclick = () => { activeCategory = c; uploaderArea.style.display = "block"; catTitle.textContent = `الفئة المختارة: ${c.label}`; };

  grid.appendChild(div);

});



fileInput && fileInput.addEventListener("change", async (e) => {

  if (!activeCategory) return alert("اختر فئة أولًا");

  const files = Array.from(e.target.files);

  for (const f of files) await uploadOne(f);

});



let jobId = sessionStorage.getItem("jobId");

if (!jobId) { jobId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())); sessionStorage.setItem("jobId", jobId); }



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

  prog.value = 100;

}
