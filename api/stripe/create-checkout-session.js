import Stripe from "stripe";



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export default async function handler(req, res) {

  try {

    if (req.method !== "POST") {

      return res.status(405).json({ error: "Method Not Allowed" });

    }



    // price Ids من لوحة Stripe (مثل price_...)

    const priceId = process.env.STRIPE_PRICE_YEARLY; // أو جرّب STRIPE_PRICE_TRIAL إن أردت



    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      line_items: [{ price: priceId, quantity: 1 }],

      allow_promotion_codes: true,

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error("Stripe error:", err);

    return res.status(500).json({ error: "Internal Server Error" });

  }

}
