// /api/create-checkout-session.js

import Stripe from "stripe";



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export default async function handler(req, res) {

  if (req.method !== "POST") return res.status(405).end();



  const { plan } = req.body;



  // Define your price IDs (from Stripe Dashboard)

  const PRICE_YEARLY = "price_xxxxxxx";

  const PRICE_TRIAL = "price_xxxxxxx"; // optional



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



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error("Stripe error:", err);

    return res.status(500).json({ error: err.message });

  }

}
