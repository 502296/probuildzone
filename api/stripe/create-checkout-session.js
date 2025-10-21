// /api/stripe/create-checkout-session.js

const Stripe = require('stripe');



module.exports = async (req, res) => {

  try {

    if (req.method !== 'POST') {

      res.status(405).json({ error: 'Method Not Allowed' });

      return;

    }



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const {

      company_name,

      full_name,

      email,

      phone,

      address,

      license,

      has_insurance, // true/false

      notes

    } = req.body || {};



    // يدعم طريقتين:

    // 1) سعر سنوي واحد فيه ترايل من داخل Stripe: STRIPE_PRICE_YEARLY

    // 2) أو تحديد أيام التجربة من البيئة TRIAL_DAYS (إن لم يكن السعر يحتوي ترايل)

    const priceId = process.env.STRIPE_PRICE_YEARLY; // price_...

    const trialDays = process.env.TRIAL_DAYS ? parseInt(process.env.TRIAL_DAYS, 10) : undefined;



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: priceId, quantity: 1 }],

      allow_promotion_codes: true,

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`,

      automatic_tax: { enabled: true },

      customer_email: email || undefined,

      subscription_data: {

        trial_period_days: trialDays, // يُتجاهل تلقائياً إذا كان السعر مُعدّ بترال من Stripe

        metadata: {

          company_name: company_name || '',

          full_name: full_name || '',

          phone: phone || '',

          address: address || '',

          business_license: license || '',

          has_insurance: String(has_insurance || false),

          notes: notes || ''

        }

      },

      metadata: {

        source: 'probuildzone-pros',

        company_name: company_name || ''

      }

    });



    res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('create-checkout-session error:', err);

    res.status(500).json({ error: 'Internal Server Error' });

  }

};
