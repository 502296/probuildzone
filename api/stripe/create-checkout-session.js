import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });



export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).json({ error:'Method not allowed' });



  try {

    const { form } = req.body || {};

    const SITE_URL = process.env.SITE_URL;

    const PRICE_ID = process.env.STRIPE_PRICE_YEARLY;

    if (!SITE_URL || !PRICE_ID) return res.status(500).json({ error:'Missing SITE_URL or STRIPE_PRICE_YEARLY' });



    const metadata = {

      business_category: form?.businessCategory || '',

      business_license: form?.businessLicense || '',

      full_name: form?.fullName || '',

      phone: form?.phone || '',

      address: form?.address || '',

      service_areas: form?.serviceAreas || '',

      insurance_carrier: form?.insuranceCarrier || '',

      policy_number: form?.policyNumber || '',

      carries_insurance: form?.carriesInsurance ? 'yes' : 'no'

    };



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [{ price: PRICE_ID, quantity: 1 }],

      subscription_data: { trial_period_days: 30, metadata },

      success_url: `${SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${SITE_URL}/cancel.html`,

      customer_email: form?.email || undefined,

      metadata,

      allow_promotion_codes: true

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    return res.status(500).json({ error: err?.message || 'Stripe error' });

  }

}
