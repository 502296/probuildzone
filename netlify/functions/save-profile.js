// netlify/functions/save-pro.js

const { createClient } = require('@supabase/supabase-js');



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'Content-Type',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};



exports.handler = async (event) => {

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

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  try {

    const SUPABASE_URL = process.env.SUPABASE_URL;

    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;



    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

      return {

        statusCode: 500,

        headers: corsHeaders,

        body: JSON.stringify({ ok: false, error: 'Supabase env vars missing' }),

      };

    }



    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);



    const payload = JSON.parse(event.body || '{}');



    // نتأكد ما يكون فاضي

    if (!payload.email) {

      return {

        statusCode: 400,

        headers: corsHeaders,

        body: JSON.stringify({ ok: false, error: 'Missing email in payload' }),

      };

    }



    const { data, error } = await supabase

      .from('pros_signups')

      .insert([{

        name: payload.name || null,

        email: payload.email || null,

        phone: payload.phone || null,

        address: payload.address || null,

        license: payload.license || null,

        insurance: payload.insurance || null,

        notes: payload.notes || null,

        stripe_customer_id: payload.stripe_customer_id || null,

        stripe_subscription_id: payload.stripe_subscription_id || null,

      }])

      .select()

      .single();



    if (error) {

      return {

        statusCode: 500,

        headers: corsHeaders,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      headers: corsHeaders,

      body: JSON.stringify({ ok: true, data }),

    };

  } catch (err) {

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
