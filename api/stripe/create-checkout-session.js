// /api/stripe/create-checkout-session.js

import Stripe from "stripe";



export default async function handler(req, res){

  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");



  try{

    const {

      company="", website="", category="",

      business_license="",

      name="", email="", phone="", address="",

      service_areas="",

      has_insurance="", insurance_carrier="", insurance_policy=""

    } = req.body || {};



    if(!email || !name) return res.status(400).send("Missing name or email");



    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



    // ابحث/أنشئ عميل

    const found = await stripe.customers.list({ email, limit: 1 });

    const customer = found.data[0] || await stripe.customers.create({

      name, email, phone,

      address: address ? { line1: address } : undefined,

      metadata: {

        company, website, category,

        business_license,

        service_areas,

        has_insurance: has_insurance ? "yes" : "no",

        insurance_carrier, insurance_policy

      }

    });



    const session = await stripe.checkout.sessions.create({

      mode: "subscription",

      customer: customer.id,

      line_items: [{ price: process.env.STRIPE_PRICE_YEARLY, quantity: 1 }],

      subscription_data: {

        trial_period_days: 30,

        metadata: {

          company, website, category,

          business_license,

          service_areas,

          has_insurance: has_insurance ? "yes" : "no",

          insurance_carrier, insurance_policy

        }

      },



      // ❖ نجعل Stripe يطلب بيانات إضافية في صفحة الدفع

      custom_fields: [

        {

          key: "company_name",

          label: { type: "custom", custom: "Company name" },

          type: "text",

          text: { default_value: company?.slice(0, 120) || "" }

        }

      ],

      tax_id_collection: { enabled: true },        // يتيح إدخال Tax ID إن وُجد

      automatic_tax: { enabled: true },            // احتساب الضرائب تلقائيًا

      billing_address_collection: "required",

      allow_promotion_codes: true,

      // اجعل Stripe يعرض حقل الهاتف في checkout نفسه (إن أردت)

      phone_number_collection: { enabled: true },



      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancelled.html`,

      client_reference_id: company || email

    });



    return res.status(200).json({ checkoutUrl: session.url });

  }catch(err){

    console.error("Stripe error:", err);

    return res.status(500).send(err?.message || "Stripe error");

  }

}
