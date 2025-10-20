// /api/stripe/create-checkout-session.js

import Stripe from "stripe";



export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({ error: "Method Not Allowed" });

  }



  try {

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      line_items: [

        {

          price: process.env.STRIPE_PRICE_ID,

          quantity: 1

        }

      ],

      subscription_data: {

        trial_period_days: 30

      },

      allow_promotion_codes: true,

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error("Stripe error:", err);

    return res

      .status(500)

      .json({ error: "Stripe error", details: err.message });

  }

}
