// /api/stripe/create-checkout-session.js



// ملاحظة: تأكد من تثبيت stripe في package.json

const Stripe = require('stripe');



// تأكد من ضبط مفاتيح البيئة في Vercel:

// STRIPE_SECRET_KEY        = sk_live_... أو sk_test_...

// STRIPE_PRICE_MONTHLY     = price_...  (سعر $25 للشهر)

// SITE_URL                 = https://your-domain.com

// TRIAL_DAYS               = 30  (اختياري — يمكن تركه فارغ لإلغاء التجربة المجانية)



module.exports = async (req, res) => {

  // CORS + Preflight

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');



  if (req.method === 'OPTIONS') {

    return res.status(200).end();

  }



  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method Not Allowed' });

  }



  try {

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



    // بيانات النموذج القادم من pros.html (اختياري):

    // نتوقع JSON مثل:

    // { email, name, company, phone, address, city, state, zip }

    const {

      email,

      name,

      company,

      phone,

      address,

      city,

      state,

      zip,

    } = req.body || {};



    const priceId = process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {

      return res.status(400).json({ error: 'Missing STRIPE_PRICE_MONTHLY env var' });

    }



    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

    const successUrl = `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl  = `${siteUrl}/cancel.html`;



    // تجربة مجانية (إذا وُجد TRIAL_DAYS رقم صحيح > 0 سنستخدمه)

    const trialDaysEnv = parseInt(process.env.TRIAL_DAYS, 10);

    const useTrial = Number.isInteger(trialDaysEnv) && trialDaysEnv > 0;



    // بناء الميتاداتا من المدخلات

    const metadata = {};

    if (name)    metadata.name    = String(name);

    if (company) metadata.company = String(company);

    if (phone)   metadata.phone   = String(phone);

    if (address) metadata.address = String(address);

    if (city)    metadata.city    = String(city);

    if (state)   metadata.state   = String(state);

    if (zip)     metadata.zip     = String(zip);



    // إنشاء جلسة Checkout

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [

        {

          price: priceId,

          quantity: 1,

        },

      ],

      // يُنصح بإرسال إيميل العميل إن توفر

      customer_email: email || undefined,



      success_url: successUrl,

      cancel_url: cancelUrl,



      allow_promotion_codes: true,



      subscription_data: {

        // إن رغبت بإرفاق البيانات مع الاشتراك

        metadata,

        ...(useTrial ? { trial_period_days: trialDaysEnv } : {}),

      },



      // جمع عنوان العميل (اختياري)

      customer_creation: 'if_required',

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe Checkout Error:', err);

    return res.status(500).json({

      error: 'Failed to create checkout session',

      details: err?.message || 'Unknown error',

    });

  }

};
