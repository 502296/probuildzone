// server.js (Node 18+)

// npm i express stripe cors body-parser dotenv



import express from 'express';

import cors from 'cors';

import bodyParser from 'body-parser';

import dotenv from 'dotenv';

import Stripe from 'stripe';



dotenv.config();

const app = express();

app.use(cors());

app.use(bodyParser.json({ limit: '10mb' }));

app.use(bodyParser.raw({ type: 'application/json' }));



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



// ===== ذاكرة مؤقتة للتجارب (بدل DB حقيقي مؤقتاً) =====

const DB = {

  pros: {},

  leads: [

    { job_id: 'PBZ-90123', title: 'Replace leaking roof' },

    { job_id: 'PBZ-90124', title: 'Install kitchen floor' }

  ],

  sessions: {}

};



// ===== Stripe: إنشاء Checkout Session (اشتراك) =====

app.post('/api/stripe/create-checkout-session', async (req, res) => {

  try {

    const { price_id, metadata, customer_email, trial_days } = req.body;



    const params = {

      mode: 'subscription',

      payment_method_types: ['card'],

      line_items: [{ price: price_id, quantity: 1 }],

      payment_method_collection: 'always',

      success_url: process.env.DASHBOARD_SUCCESS_URL,

      cancel_url: process.env.DASHBOARD_CANCEL_URL,

      metadata,

    };



    if (customer_email) params.customer_email = customer_email;

    if (Number(trial_days) > 0) {

      params.subscription_data = { trial_period_days: Number(trial_days) };

    }



    const session = await stripe.checkout.sessions.create(params);

    DB.sessions[session.id] = { status: 'created' };

    res.json({ id: session.id });

  } catch (e) {

    res.status(400).json({ error: e.message });

  }

});



// ===== Stripe: إدارة الفوترة (Placeholder) =====

app.post('/api/stripe/customer-portal', async (req, res) => {

  return res.json({ url: 'https://billing.stripe.com/p/login/test_portal' });

});



// ===== Stripe: حالة الاشتراك (Placeholder) =====

app.get('/api/stripe/subscription-status', async (req, res) => {

  res.json({ ok: true, status: 'active' });

});



// ===== Stripe Webhook (لتفعيل الاشتراك مع توقيع) =====

app.post('/api/stripe/webhook', (req, res) => {

  try {

    const event = JSON.parse(req.body.toString());

    if (event.type === 'checkout.session.completed') {

      const session = event.data.object;

      DB.sessions[session.id] = { status: 'completed' };

      // TODO: ربط session.customer مع ملف الـ pro

    }

    res.json({ received: true });

  } catch (err) {

    res.status(400).send(`Webhook Error: ${err.message}`);

  }

});



// ===== Pros API (بسيطة للتجربة) =====

app.post('/api/pros/create', (req, res) => {

  const { biz, name, email, phone, license, insurance } = req.body;

  if (!biz || !name || !email || !phone)

    return res.status(400).json({ ok: false, error: 'Missing fields' });



  const pro_id = 'pr_' + Math.random().toString(36).substring(2, 10);

  DB.pros[pro_id] = { pro_id, biz, name, email, phone, license, insurance };

  res.json({ ok: true, pro_id });

});



app.get('/api/pros/me', (req, res) => {

  const any = Object.values(DB.pros)[0];

  return res.json({ ok: true, profile: any || {} });

});



app.post('/api/pros/update', (req, res) => {

  const anyId = Object.keys(DB.pros)[0];

  if (!anyId) return res.json({ ok: false, error: 'No profile found' });

  DB.pros[anyId] = { ...DB.pros[anyId], ...req.body };

  return res.json({ ok: true });

});



app.get('/api/pros/leads', (req, res) => {

  res.json({ ok: true, items: DB.leads });

});



app.post('/api/pros/lead-action', (req, res) => {

  // accept/dismiss لو رغبت

  res.json({ ok: true });

});



// ===== Start server =====

const port = process.env.PORT || 8080;

app.listen(port, () => console.log(`PBZ API running on port ${port}`));
