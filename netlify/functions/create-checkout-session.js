const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const CORS = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
// 1) CORS preflight
if (event.httpMethod === 'OPTIONS') {
return { statusCode: 200, headers: CORS, body: 'ok' };
}

// 2) امنع أي ميثود غير POST
if (event.httpMethod !== 'POST') {
return {
statusCode: 405,
headers: { ...CORS, Allow: 'POST' },
body: JSON.stringify({ ok: false, error: 'Method Not Allowed. Use POST.' })
};
}

try {
const priceId =
process.env.STRIPE_PRICE_MONTHLY || // price_... (لو تريد الشهري $25)
process.env.STRIPE_PRICE_YEARLY; // أو السنوي $300

const siteUrl = process.env.SITE_URL; // مثال: https://probuildzone.netlify.app أو دومينك

if (!process.env.STRIPE_SECRET_KEY || !priceId || !siteUrl) {
const msg = `Missing env: STRIPE_SECRET_KEY=${!!process.env.STRIPE_SECRET_KEY}, PRICE=${!!priceId}, SITE_URL=${!!siteUrl}`;
console.error(msg);
return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: msg }) };
}

// 3) تحليل البيانات اللي جاية من الـ form
const body = JSON.parse(event.body || '{}');
const email = body.email || '3lirosi@gmail.com'; // استخدام الإيميل من الـ form أو افتراضي
const customerName = body.name || 'Ali H Kathem'; // افتراضي من الصورة

const session = await stripe.checkout.sessions.create({
mode: 'subscription',
payment_method_types: ['card'],
customer_email: email,
customer_name: customerName, // إضافة الاسم إذا كان موجود
allow_promotion_codes: true,
line_items: [{ price: priceId, quantity: 1 }],
subscription_data: { trial_period_days: 30 }, // تجربة 30 يوم
success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${siteUrl}/pros.html`,
billing_address_collection: 'auto'
});

return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, url: session.url }) };
} catch (err) {
console.error('create-checkout-session error:', err);
return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err.message }) };
}
};
