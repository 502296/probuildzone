// assets/checkout.js



// مساعد لقراءة قيمة حقل

const val = (id) => (document.getElementById(id)?.value || "").trim();

const msg = document.getElementById("proMsg");



// دالة إنشاء Session والانتقال لصفحة الدفع عبر Netlify Function

async function createCheckout({ trialDays = 0 }) {

  msg.textContent = "Creating checkout session…";



  // بيانات النموذج

  const data = {

    biz: val("biz"),

    name: val("name"),

    email: val("email"),

    phone: val("phone"),

    license: val("license"),

    insurance: val("insurance"),

    primary: val("primary"),

    zips: val("zips"),

    site: val("site"),

  };



  // تحقّق بسيط

  if (!data.biz || !data.name || !data.email || !data.phone || !data.license) {

    msg.textContent = "Please fill all required fields.";

    return;

  }



  try {

    // 1) (اختياري لاحقًا) حفظ البروفايل في Sheets/Supabase

    // يمكن إضافة Function أخرى لاحقًا مثل: /.netlify/functions/save-pro-profile



    // 2) إنشاء Checkout Session لاشتراك شهري مع فترة تجريبية

    const res = await fetch("/.netlify/functions/create-checkout-session", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        mode: "subscription",

        priceName: "MONTHLY",          // سنقرأه في السيرفر كـ STRIPE_PRICE_MONTHLY

        trial_days: trialDays,         // 30 للتجربة أو 0 للدفع المباشر

        customer_email: data.email,

        metadata: {

          biz: data.biz,

          name: data.name,

          phone: data.phone,

          license: data.license,

          insurance: data.insurance || "",

          primary: data.primary || "",

          zips: data.zips || "",

          site: data.site || ""

        }

      }),

    });



    const j = await res.json();

    if (!res.ok || !j.url) throw new Error(j.error || "Failed to create session");



    // 3) تحويل الزبون إلى Stripe Checkout

    window.location.href = j.url;

  } catch (e) {

    console.error(e);

    msg.textContent = "Error: " + (e.message || "checkout failed");

  }

}



// ربط الأزرار

document.getElementById("startTrialBtn")?.addEventListener("click", (e) => {

  e.preventDefault();

  createCheckout({ trialDays: 30 }); // 30 يوم مجانًا ثم $25/شهر

});



document.getElementById("payMonthlyBtn")?.addEventListener("click", (e) => {

  e.preventDefault();

  createCheckout({ trialDays: 0 });  // دفع مباشر $25/شهر بدون فترة تجريبية

});
