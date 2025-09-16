/* app.umd.js — One Door + 12 Icons (UMD) */

/* ====== Supabase config (put your real keys) ====== */

const SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";

const SUPABASE_ANON = "YOUR-ANON-KEY";

const BUCKET = "projects";

/* ================================================== */



const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);



/* Try to read logged-in user; fall back to demo id */

let currentUserId = null;

(async () => {

  try {

    const { data: { user } } = await supa.auth.getUser();

    if (user) currentUserId = user.id;

  } catch (e) {

    console.warn("Auth not set, using demo user id");

  }

  if (!currentUserId) currentUserId = "demo-user-id";

})();



/* === Keep the same keys; only labels are English & ordered like your services === */

const categories = [

  { key: "blueprints",    label: "General Home Repairs", emoji: "🛠️" },

  { key: "photos_before", label: "Electrical",           emoji: "⚡"  },

  { key: "photos_after",  label: "Plumbing",             emoji: "🚰"  },

  { key: "permits",       label: "Roofing & Gutters",    emoji: "🏠"  },



  { key: "invoices",      label: "Painting",             emoji: "🎨"  },

  { key: "contracts",     label: "Flooring",             emoji: "🧱"  },

  { key: "materials",     label: "Landscaping",          emoji: "🌿"  },

  { key: "designs",       label: "HVAC",                 emoji: "❄️"  },



  { key: "measurements",  label: "Basement",             emoji: "🏚️"  },

  { key: "videos",        label: "Carpentry",            emoji: "🔨"  },

  { key: "voice_notes",   label: "Windows & Doors",      emoji: "🚪"  },

  { key: "other",         label: "Appliances",           emoji: "🔌"  },

];



/* ====== UI refs ====== */

const modal        = document.getElementById("modal");

const grid         = document.getElementById("iconGrid");

const openDoor     = document.getElementById("openDoor");

const closeDoor    = document.getElementById("closeDoor");

const uploaderArea = document.getElementById("uploaderArea");

const catTitle     = document.getElementById("catTitle");

const fileInput    = document.getElementById("fileInput");

const fileList     = document.getElementById("fileList");



/* Open/close modal */

if (openDoor) openDoor.onclick = () => (modal.style.display = "flex");

if (closeDoor) closeDoor.onclick = () => {

  modal.style.display = "none";

  uploaderArea.style.display = "none";

  fileList.innerHTML = "";

};



/* Render 12 icons */

let activeCategory = null;

categories.forEach((c) => {

  const div = document.createElement("div");

  div.className = "icon";

  div.innerHTML = `<div class="emoji">${c.emoji}</div><span>${c.label}</span>`;

  div.onclick = () =>

    ((activeCategory = c),

    (uploaderArea.style.display = "block"),

    (catTitle.textContent = `Selected: ${c.label}`));

  grid.appendChild(div);

});



/* File input handler */

fileInput &&

  fileInput.addEventListener("change", async (e) => {

    if (!activeCategory) return alert("Choose a category first");

    const files = Array.from(e.target.files || []);

    for (const f of files) await uploadOne(f);

  });



/* Job id per session */

let jobId = sessionStorage.getItem("jobId");

if (!jobId) {

  jobId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

  sessionStorage.setItem("jobId", jobId);

}



/* Upload one file to Supabase Storage */

async function uploadOne(file) {

  const row = document.createElement("div");

  row.className = "row";

  row.innerHTML = `<div>${file.name} <small>(${Math.round(

    file.size / 1024

  )} KB)</small></div><progress max="100" value="0"></progress>`;

  fileList.appendChild(row);

  const prog = row.querySelector("progress");



  const path = `${currentUserId}/${jobId}/${activeCategory.key}/original/${Date.now()}-${file.name}`;



  prog.value = 20;

  const { error } = await supa.storage.from(BUCKET).upload(path, file, {

    cacheControl: "3600",

    upsert: false,

    contentType: file.type || "application/octet-stream",

  });

  if (error) {

    prog.value = 0;

    row.style.color = "#ff7b7b";

    row.title = error.message;

    return;

  }



  // Optional: record metadata via your API

  // await fetch("/api/record-upload", {

  //   method: "POST",

  //   headers: { "Content-Type": "application/json" },

  //   body: JSON.stringify({

  //     job_id: jobId,

  //     owner: currentUserId,

  //     category: activeCategory.key,

  //     storage_path: path,

  //     mime_type: file.type,

  //     size_bytes: file.size

  //   }),

  // });



  prog.value = 100;

}
