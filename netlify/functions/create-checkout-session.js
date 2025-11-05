// netlify/functions/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { createClient } = require('@supabase/supabase-js');



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

  'Access-Control-Allow-Headers': 'Content-Type',

};



exports.handler = async (event) => {

  // ✅ CORS preflight

  if (event.httpMethod === 'OPTIONS') {

    return {

      statusCode: 200,

      headers: corsHeaders,

      body: 'OK',

    };

  }



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    const {

      name,

      email,

      phone,

      address,

      license,

      insurance,

      notes,

    } = body;



    // ✅ إنشاء اتصال مع Supabase

    const supabase = createClient(

      process.env.SUPABASE_URL,

      process.env.SUPABASE_SERVICE_ROLE

    );



    // ✅ حفظ بيانات الـ pro في قاعدة Supabase

    const { data: inserted, error: insertError } = await supabase

      .from('pros')

      .insert([

        {

          full_name: name || null,

          email: email || null,

          phone: phone || null,

          company_address: address || null,

          license_no: license || null,

          insurance_no: insurance || null,

          notes: notes || null,

          stripe_status: 'pending',

        },

      ])

      .select()

      .single();



    if (insertError) {

      console.error('Supabase insert error:', insertError);

      return {

        statusCode: 500,

        headers: corsHeaders,

        body: JSON.stringify({

          ok: false,

          error: 'Could not save pro to Supabase',

          details: insertError.message,

        }),

      };

    }



    // ✅ إنشاء جلسة الدفع في Stripe

    const session = await stripe.checkout.sessions.create({

      mode: 'subscription',

      line_items: [

        {

          price: process.env.STRIPE_PRICE_YEARLY,

          quantity: 1,

        },

      ],

      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.SITE_URL}/cancel.html`,

      customer_email: email,

      subscription_data: {

        trial_period_days: 30,

      },

      metadata: {

        pro_id: inserted.id,

        name: name || '',

        phone: phone || '',

        address: address || '',

      },

    });



    // ✅ رجوع الرابط للواجهة

    return {

      statusCode: 200,

      headers: corsHeaders,

      body: JSON.stringify({

        ok: true,

        url: session.url,

      }),

    };

  } catch (err) {

    console.error('General error:', err);

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({

        ok: false,

        error: err.message || 'Unknown error',

      }),

    };

  }

};
