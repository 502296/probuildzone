// assets/checkout.js



const $ = (id) => document.getElementById(id);

const msg = $("proMsg");



function val(id) {

  return ($(id)?.value || "").trim();

}

function checked(id) {

  return !!$(id)?.checked;

}



async function saveProfile() {

  try {

    const res = await fetch("/.netlify/functions/save-profile", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        biz: val("biz"),                 // Company Name

        name: val("name"),               // Full Name

        email: val("email"),

        phone: val("phone"),

        address: val("address"),         // Business Address (تأكد الـ id=address)

        license: val("license"),

        insurance: checked("insurance") ? "true" : "false",

        notes: val("notes")

      })

    });

    if (!res.ok) throw new Error("save failed");

    return true;

  } catch (e) {

    console.warn("Save profile failed → continue to checkout", e);

    return false;

  }

}



async function createCheckout(trialDays = 0) {

  msg.textContent = "Processing…";



  // تحقق بسيط للحقول المطلوبة

  if (!val("biz") || !val("name") || !val("email") || !val("phone") || !val("license")) {

    msg.textContent = "Please fill all required fields.";

    return;

  }



  // 1) جرّب الحفظ (حتى لو فشل نكمل)

  await saveProfile();



  // 2) أنشئ جلسة Stripe

  try {

    const res = await fetch("/.netlify/functions/create-checkout-session", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        mode: "subscription",

        priceName: "MONTHLY",              // نقرأه من STRIPE_PRICE_MONTHLY على السيرفر

        trial_days: trialDays,             // 30 للتجربة أو 0 للدفع المباشر

        customer_email: val("email"),

        metadata: {

          biz: val("biz"),

          name: val("name"),

          phone: val("phone"),

          address: val("address"),

          license: val("license"),

          insurance: checked("insurance") ? "YES" : "NO",

          notes: val("notes")

        }

      })

    });



    const j = await res.json();

    if (!res.ok || !j.url) throw new Error(j.error || "Failed to create session");



    window.location.href = j.url;

  } catch (e) {

    console.error(e);

    msg.textContent = "Something went wrong. Please try again.";

  }

}



// أزرارك في pros.html لازم تكون بهذه المعرفات:

$("startTrialBtn")?.addEventListener("click", (e) => {

  e.preventDefault();

  createCheckout(30);        // 30 يوم مجانًا ثم $25/شهر

});



$("payMonthlyBtn")?.addEventListener("click", (e) => {

  e.preventDefault();

  createCheckout(0);         // مباشرة $25/شهر

});
