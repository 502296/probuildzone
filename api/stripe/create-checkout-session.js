// /api/stripe/create-checkout-session.js

import Stripe from "stripe";



export default async function handler(req, res){

  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");



  try{

    const { company="", name="", email="", phone="", address="" } = req.body || {};

    if(!email || !name) return res.status(400).send("Missing name or email");



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



    // ابحث عن عميل موجود بنفس الإيميل أو أنشئ عميل جديد

    const found = await stripe.customers.list({ email, limit: 1 });

    const customer = found.data[0] || await stripe.customers.create({

      name, email, phone,

      address: address ? { line1: address } : undefined,

      metadata: { company }

    });



    // أنشئ جلسة اشتراك سنوي مع 30 يوم تجربة

    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      customer: customer.id,

      line_items: [

        { price: process.env.STRIPE_PRICE_YEARLY, quantity: 1 }

      ],

      subscription_data: {

        trial_period_days: 30,

        metadata: { company, name, phone, address }

      },

      allow_promotion_codes: true,

      billing_address_collection: "required",

      automatic_tax: { enabled: true },

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancelled.html`,

      client_reference_id: company || email

    });



    return res.status(200).json({ checkoutUrl: session.url });

  }catch(err){

    console.error("Stripe error:", err);

    return res.status(500).send(err?.message || "Stripe error");

  }

}
