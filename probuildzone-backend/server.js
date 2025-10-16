// server.js

// npm i express stripe cors body-parser dotenv

import express from 'express';

import cors from 'cors';

import bodyParser from 'body-parser';

import dotenv from 'dotenv';

import Stripe from 'stripe';



dotenv.config();

const app = express();

app.use(cors());

app.use(bodyParser.json({ limit: '10mb' })); // JSON

app.use(bodyParser.raw({ type: 'application/json', limit: '1mb' })); // للويبهوك



// Stripe

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



// ذاكرة مؤقتة للتجربة (بدل قاعدة بيانات)

const DB = {

  pros: {},     // pro_id -> profile

  leads: [

    { job_id:'PBZ-90123', title:'Replace leaking roof', category:'Roofing', city:'Louisville', state:'KY', budget_min:2000, budget_max:4500 },

    { job_id:'PBZ-90124', title:'Install kitchen backsplash', category:'Kitchens', city:'Louisville', state:'KY', budget_min:800, budget_max:1500 }

  ],

  sessions: {}   // اختياري: لحفظ جلسات Stripe

};



// ============ Stripe: إنشاء Checkout Session ============

app.post('/api/stripe/create-checkout-session', async (req, res) => {

  try {

    const { price_id, metadata } = req.body || {};

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: price_id || process.env.STRIPE_PRICE_ID_YEARLY, quantity: 1 }],

      success_url: process.env.DASHBOARD_SUCCESS_URL,

      cancel_url: process.env.DASHBOARD_CANCEL_URL,

      metadata: metadata || {},

      allow_promotion_codes: true

    });

    // احفظ لو حبيت

    DB.sessions[session.id] = { status: 'created' };

    res.json({ id: session.id });

  } catch (e) {

    res.status(400).json({ error: e.message });

  }

});



// ============ Stripe: بوابة إدارة الفوترة (Customer Portal) ============

app.post('/api/stripe/customer-portal', async (req, res) => {

  try {

    // عادةً تحتاج customer_id من قاعدة بياناتك. هنا مجرد مثال.

    // لو عندك customer_id: const portal = await stripe.billingPortal.sessions.create({ customer, return_url: 'https://probuildzone.com/pros-dashboard.html' });

    return res.json({ url: 'https://billing.stripe.com/p/login/test_xxx' });

  } catch (e) {

    res.status(400).json({ error: e.message });

  }

});



// ============ Stripe: حالة الاشتراك ============

app.get('/api/stripe/subscription-status', async (req, res) => {

  // في الحقيقة: رجّع الحالة من قاعدة بياناتك بناءً على المستخدم الحالي

  res.json({ ok: true, status: 'active' });

});



// ============ Stripe Webhook (اختياري لكن مهم للإنتاج) ============

app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {

  try {

    // ملاحظة: في الإنتاج تحقّق من التوقيع:

    // const sig = req.headers['stripe-signature'];

    // const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    const event = JSON.parse(req.body.toString());



    if (event.type === 'checkout.session.completed') {

      const session = event.data.object;

      DB.sessions[session.id] = { status: 'completed' };

      // TODO: حدّث pro.status='active' في DB حسب customer/reference

    }

    if (event.type === 'customer.subscription.updated' || event.type === 'invoice.paid') {

      // TODO: مزامنة حالة الاشتراك

    }

    res.json({ received: true });

  } catch (err) {

    res.status(400).send(`Webhook Error: ${err.message}`);

  }

});



// ============ Pros: إنشاء ملف منشئ ============

app.post('/api/pros/create', (req, res) => {

  const { biz, name, email, phone, license, insurance, primary, zips, site } = req.body || {};

  if (!biz || !name || !email || !phone || !license || !primary) {

    return res.status(400).json({ ok: false, error: 'Missing fields' });

  }

  const pro_id = 'pr_' + Math.random().toString(36).slice(2, 9);

  DB.pros[pro_id] = { pro_id, biz, name, email, phone, license, insurance, primary, zips, site, status: 'trialing' };



  // TODO: أرسل بريد ترحيب هنا (استخدم مزوّد بريدك)

  return res.json({ ok: true, pro_id });

});



// ============ Pros: جلب الملف الشخصي ============

app.get('/api/pros/me', (req, res) => {

  // في الإنتاج: تعرّف المستخدم من الجلسة أو الـJWT

  const any = Object.values(DB.pros)[0];

  if (!any) return res.json({ ok: true, profile: {} });

  return res.json({ ok: true, profile: any });

});



// ============ Pros: تحديث الملف ============

app.post('/api/pros/update', (req, res) => {

  const anyId = Object.keys(DB.pros)[0];

  if (!anyId) return res.json({ ok: false, error: 'No pro yet' });

  DB.pros[anyId] = { ...DB.pros[anyId], ...req.body };

  return res.json({ ok: true });

});



// ============ Pros: قائمة العروض (Leads) ============

app.get('/api/pros/leads', (req, res) => {

  const { status } = req.query;

  // status غير مُستخدم هنا – فقط عينة

  res.json({ ok: true, items: DB.leads });

});



// ============ Pros: إجراء على عرض ============

app.post('/api/pros/lead-action', (req, res) => {

  const { job_id, action } = req.body || {};

  // TODO: سجّل الإجراء (accept/dismiss) للـpro الحالي

  return res.json({ ok: true });

});



// ===== تشغيل السيرفر =====

const port = process.env.PORT || 8080;

app.listen(port, () => console.log(`PBZ API listening on http://localhost:${port}`));
