// api/stripe/create-checkout-session.js

const Stripe = require('stripe');



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



module.exports = async (req, res) => {

  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  try{

    const { email, phone, company, full_name, areas, services } = req.body || {};

    if(!email) return res.status(400).json({error:'Email is required'});



    const priceId = process.env.STRIPE_PRICE_YEARLY; // price_...

    if(!priceId) return res.status(500).json({error:'Missing STRIPE_PRICE_YEARLY'});



    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    const successUrl = `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl  = `${baseUrl}/pros.html?canceled=true`;



    // Create Checkout Session for a subscription with a 30-day trial

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      payment_method_collection: 'always', // card now, but charge later after trial

      customer_creation: 'always',

      line_items: [{ price: priceId, quantity: 1 }],

      subscription_data: {

        trial_period_days: 30,

        metadata: { company, full_name, areas, services }

      },

      customer_email: email,

      phone_number_collection: { enabled: true },

      billing_address_collection: 'required',

      allow_promotion_codes: false,

      success_url: successUrl,

      cancel_url: cancelUrl,

      metadata: { company, full_name },

      custom_text: {

        submit: { message: 'No charge today. Your 30-day free trial starts now.' },

        after_submit: { message: 'Thanks! No charge until day 31.' }

      }

    });



    return res.status(200).json({ url: session.url });

  } catch (err){

    return res.status(500).json({error: err.message});

  }

};
