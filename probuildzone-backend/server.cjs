const express = require('express');

const cors = require('cors');

const bodyParser = require('body-parser');

const dotenv = require('dotenv');

const Stripe = require('stripe');



dotenv.config();

const app = express();

app.use(cors());

app.use(bodyParser.json({ limit: '10mb' }));

app.use(bodyParser.raw({ type: 'application/json', limit: '1mb' }));



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const DB = { pros:{}, leads:[{job_id:'PBZ-90123',title:'Replace leaking roof',category:'Roofing',city:'Louisville',state:'KY',budget_min:2000,budget_max:4500}], sessions:{} };



app.post('/api/stripe/create-checkout-session', async (req,res)=>{

  try{

    const { price_id, metadata } = req.body || {};

    const session = await stripe.checkout.sessions.create({

      mode:'subscription',

      line_items:[{ price: price_id || process.env.STRIPE_PRICE_ID_YEARLY, quantity:1 }],

      success_url: process.env.DASHBOARD_SUCCESS_URL,

      cancel_url: process.env.DASHBOARD_CANCEL_URL,

      metadata: metadata || {},

      allow_promotion_codes: true

    });

    DB.sessions[session.id] = { status:'created' };

    res.json({ id: session.id });

  }catch(e){ res.status(400).json({ error: e.message }); }

});



app.post('/api/stripe/customer-portal', async (req,res)=>{

  return res.json({ url: 'https://billing.stripe.com/p/login/test_xxx' });

});



app.get('/api/stripe/subscription-status', (req,res)=> res.json({ ok:true, status:'active' }));



app.post('/api/stripe/webhook', bodyParser.raw({ type:'application/json' }), (req,res)=>{

  try{

    const event = JSON.parse(req.body.toString());

    if(event.type === 'checkout.session.completed'){

      const session = event.data.object;

      DB.sessions[session.id] = { status:'completed' };

    }

    res.json({ received:true });

  }catch(err){ res.status(400).send(`Webhook Error: ${err.message}`); }

});



app.post('/api/pros/create', (req,res)=>{

  const { biz,name,email,phone,license,insurance,primary,zips,site } = req.body || {};

  if(!biz||!name||!email||!phone||!license||!primary) return res.status(400).json({ ok:false, error:'Missing fields' });

  const pro_id = 'pr_'+Math.random().toString(36).slice(2,9);

  DB.pros[pro_id] = { pro_id, biz,name,email,phone,license,insurance,primary,zips,site,status:'trialing' };

  res.json({ ok:true, pro_id });

});



app.get('/api/pros/me', (req,res)=>{

  const any = Object.values(DB.pros)[0];

  if(!any) return res.json({ ok:true, profile:{} });

  res.json({ ok:true, profile:any });

});



app.post('/api/pros/update', (req,res)=>{

  const anyId = Object.keys(DB.pros)[0];

  if(!anyId) return res.json({ ok:false, error:'No pro yet' });

  DB.pros[anyId] = { ...DB.pros[anyId], ...req.body };

  res.json({ ok:true });

});



app.get('/api/pros/leads', (req,res)=> res.json({ ok:true, items: DB.leads }));

app.post('/api/pros/lead-action', (req,res)=> res.json({ ok:true }));



const port = process.env.PORT || 8080;

app.listen(port, ()=> console.log(`PBZ API on http://localhost:${port}`));
