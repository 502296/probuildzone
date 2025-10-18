// /api/stripe/create-checkout-session.js

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  const {

    business, name, email, phone, license,

    insurance, service, zips, website, notes

  } = req.body || {};



  try {

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_collection: 'always', // اجمع البطاقة الآن

      customer_email: email,



      // خلي Stripe يجمع العنوان والتلفون

      billing_address_collection: 'required',

      phone_number_collection: { enabled: true },



      line_items: [{ price: process.env.STRIPE_PRICE_YEARLY, quantity: 1 }],



      // 30 يوم تجربة + لو مافي بطاقة (نحن نجمعها) — احتياطيًا:

      subscription_data: {

        trial_period_days: 30,

        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },

        metadata: { business, name, phone, license, insurance, service, zips, website, notes }

      },



      // لو تحب تضيف حقول مخصصة داخل Checkout (بيتا عند Stripe)

      // custom_fields: [{ key:'business', label:{type:'custom',text:'Business name'}, type:'text' }],



      success_url: `${req.headers.origin}/success.html`,

      cancel_url: `${req.headers.origin}/cancel.html`,

      allow_promotion_codes: true

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err);

    return res.status(500).json({ error: 'Failed to create checkout session' });

  }

}
