// /public/js/pros-trial.js

const $ = (s, p=document) => p.querySelector(s);



function openModal(){ $("#trialModal").hidden = false; }

function closeModal(){ $("#trialModal").hidden = true; }



function serializeForm(form){

  const data = new FormData(form);

  return Object.fromEntries([...data.entries()].map(([k,v])=>[k, v.trim()]));

}



async function postJSON(url, payload){

  const res = await fetch(url, {

    method: "POST",

    headers: {"Content-Type": "application/json"},

    body: JSON.stringify(payload)

  });

  if(!res.ok){

    const text = await res.text().catch(()=> "");

    throw new Error(text || `Request failed: ${res.status}`);

  }

  return res.json();

}



function setLoading(loading){

  $("#submitTrial").disabled = loading;

  $("#startTrialBtn")?.setAttribute("aria-busy", loading ? "true" : "false");

}



document.addEventListener("DOMContentLoaded", () => {

  $("#startTrialBtn")?.addEventListener("click", () => {

    openModal();

    $("#trialMsg").textContent = "";

  });



  $("#cancelTrial")?.addEventListener("click", () => {

    closeModal();

  });



  $("#trialModal")?.addEventListener("click",(e)=>{

    if(e.target.id === "trialModal") closeModal();

  });



  $("#trialForm")?.addEventListener("submit", async (e) => {

    e.preventDefault();

    $("#trialMsg").textContent = "";

    setLoading(true);

    try{

      const payload = serializeForm(e.currentTarget);

      // (اختياري) احفظه في قاعدة بياناتك لاحقاً:

      // await postJSON("/api/pros/create", payload);



      const { checkoutUrl } = await postJSON("/api/stripe/create-checkout-session", payload);

      window.location.href = checkoutUrl;

    }catch(err){

      console.error(err);

      $("#trialMsg").textContent = "Something went wrong. Please try again.";

    }finally{

      setLoading(false);

    }

  });

});
