// assets/checkout.js



// التحقق من الإعدادات الآتية من pros.html

const { PUBLISHABLE_KEY, PRICE_ID_YEARLY, API_BASE } = window.PBZ_STRIPE || {};

if (!PUBLISHABLE_KEY) console.warn("⚠️ Missing Stripe publishable key");

if (!PRICE_ID_YEARLY) console.warn("⚠️ Missing Stripe yearly price id");



const stripe = Stripe(PUBLISHABLE_KEY);



// مساعد لقراءة قيمة حقل

const val = (id) => (document.getElementById(id)?.value || "").trim();

const msg = document.getElementById("proMsg");



// دالة إنشاء Session والانتقال لصفحة الدفع

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

    site: val("site")

  };



  // تحقّق بسيط

  if (!data.biz || !data.name || !data.email || !data.phone || !data.license) {

    msg.textContent = "Please fill all required fields.";

    return;

  }



  try {

    // 1) خزّن البروفايل (Endpoint تجريبي من السيرفر)

    await fetch(`${API_BASE}/api/pros/create`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(data)

    });



    // 2) أنشئ Checkout Session

    const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        price_id: PRICE_ID_YEARLY,

        // تمرير بيانات مفيدة إلى Stripe (تظهر في الـ metadata)

        metadata: { biz: data.biz, email: data.email, phone: data.phone },

        // لإظهار البريد داخل Checkout ولربط الزبون

        customer_email: data.email,

        // للتجربة المجانية (0 أو 30)

        trial_days: trialDays

      })

    });



    const j = await res.json();

    if (!res.ok || !j.id) throw new Error(j.error || "Failed to create session");



    // 3) تحويل الزبون إلى Stripe Checkout

    const { error } = await stripe.redirectToCheckout({ sessionId: j.id });

    if (error) throw error;

  } catch (e) {

    console.error(e);

    msg.textContent = "Error: " + (e.message || "checkout failed");

  }

}



// ربط الأزرار

document.getElementById("startTrialBtn")?.addEventListener("click", (e) => {

  e.preventDefault();

  createCheckout({ trialDays: 30 }); // 30 يوم مجانًا

});



document.getElementById("payYearlyBtn")?.addEventListener("click", (e) => {

  e.preventDefault();

  createCheckout({ trialDays: 0 }); // دفع مباشر

});
