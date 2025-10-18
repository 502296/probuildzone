// api/stripe/webhook.js

const Stripe = require('stripe');

const fetch = require('node-fetch');



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



module.exports = async (req, res) => {

  const sig = req.headers['stripe-signature'];

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!whSecret) return res.status(500).send('Missing STRIPE_WEBHOOK_SECRET');



  let event;

  try {

    const raw = await buffer(req);

    event = stripe.webhooks.constructEvent(raw, sig, whSecret);

  } catch (err) {

    return res.status(400).send(`Webhook Error: ${err.message}`);

  }



  try{

    if (event.type === 'checkout.session.completed') {

      const session = event.data.object;

      // Example: append to Sheets that the checkout was completed

      const GAS_URL = process.env.GAS_SHEETS_WEBAPP_URL;

      if (GAS_URL){

        await fetch(GAS_URL, {

          method:'POST',

          headers:{'Content-Type':'application/json'},

          body: JSON.stringify({

            source:'stripe-webhook',

            created_at: new Date().toISOString(),

            event: event.type,

            email: session.customer_details?.email || session.customer_email,

            subscription: session.subscription,

            customer: session.customer,

            status: 'checkout_completed'

          })

        });

      }

    }

    res.json({received:true});

  }catch(err){

    res.status(200).json({received:true, note:err.message});

  }

};



// Helper to get raw body on Vercel

function buffer(req){

  return new Promise((resolve,reject)=>{

    const chunks=[];

    req.on('data',(c)=>chunks.push(c));

    req.on('end',()=>resolve(Buffer.concat(chunks)));

    req.on('error',reject);

  });

}



module.exports.config = { api: { bodyParser: false } };
