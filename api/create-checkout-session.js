// /api/create-checkout-session.js

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export default async function handler(req, res) {

  if (req.method !== "POST") return res.status(405).end();



  const { plan } = req.body;

  const PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY;

  const PRICE_TRIAL = process.env.STRIPE_PRICE_TRIAL;



  try {

    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [

        {

          price: plan === "trial" ? PRICE_TRIAL : PRICE_YEARLY,

          quantity: 1,

        },

      ],

      allow_promotion_codes: true,

      success_url: `${req.headers.origin}/success.html`,

      cancel_url: `${req.headers.origin}/pros.html`,

    });



    res.status(200).json({ url: session.url });

  } catch (error) {

    console.error("Stripe Error:", error);

    res.status(500).json({ error: error.message });

  }

}
