// /api/stripe/create-checkout-session.js

import Stripe from 'stripe';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});



  const {

    business, name, email, phone, license,

    insurance, service, zips, website, notes, plan

  } = req.body || {};



  try {

    // بإمكانك هنا حفظ بيانات البروفيشنال في قاعدة أو Airtable قبل الدفع



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_types: ['card'],

      customer_email: email,

      line_items: [

        {

          price: process.env.STRIPE_PRICE_YEARLY, // ← Price ID من Stripe

          quantity: 1,

        },

      ],

      metadata: {

        business, name, phone, license, insurance, service, zips, website, notes, plan

      },

      success_url: `${req.headers.origin}/success.html`,

      cancel_url: `${req.headers.origin}/cancel.html`,

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err);

    return res.status(500).json({ error: 'Failed to create checkout session' });

  }

}
