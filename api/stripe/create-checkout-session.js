// /api/stripe/create-checkout-session.js

import Stripe from 'stripe';



export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  try {

    const {

      companyName,

      companyWebsite,

      businessCategory,

      businessLicense,

      fullName,

      email,

      phone,

      addressLine1,

      addressLine2,

      city,

      state,

      postalCode,

      country

    } = req.body || {};



    if (!email) return res.status(400).json({ error: 'Missing email' });



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });



    const priceId = process.env.STRIPE_PRICE_YEARLY;

    if (!priceId) return res.status(500).json({ error: 'Missing STRIPE_PRICE_YEARLY' });



    const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl  = process.env.STRIPE_CANCEL_URL  || `${process.env.SITE_URL}/cancel.html`;



    // عميل أو إنشاء عميل جديد

    const customer = await stripe.customers.create({

      email,

      name: fullName || companyName || undefined,

      phone: phone || undefined,

      address: (addressLine1 && city && country) ? {

        line1: addressLine1,

        line2: addressLine2 || null,

        city,

        state,

        postal_code: postalCode || null,

        country

      } : undefined,

      metadata: {

        companyName: companyName || '',

        companyWebsite: companyWebsite || '',

        businessCategory: businessCategory || '',

        businessLicense: businessLicense || '',

      }

    });



    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      customer: customer.id,

      line_items: [{ price: priceId, quantity: 1 }],

      // لو السعر لا يحتوي trial، نفعلها من هنا:

      subscription_data: { trial_period_days: 30,

        metadata: {

          companyName: companyName || '',

          businessLicense: businessLicense || '',

        }

      },

      allow_promotion_codes: true,

      success_url: successUrl,

      cancel_url: cancelUrl,

      metadata: {

        form_fullName: fullName || '',

        form_phone: phone || '',

      }

    });



    return res.status(200).json({ url: session.url });

  } catch (err) {

    console.error('Stripe error:', err);

    return res.status(500).json({ error: err.message || 'Internal Server Error' });

  }

}
