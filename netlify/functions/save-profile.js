// netlify/functions/save-profile.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  const headers = {

    'Content-Type': 'application/json',

    'Access-Control-Allow-Origin': '*',

  };



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers,

      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    const supabaseUrl = process.env.SUPABASE_URL || "https://hczahffwghbddqabpbmu.supabase.co";

    const supabaseKey =

      process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjemFoZmZ3Z2hiZGRxYWJwYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNDc1ODIsImV4cCI6MjA3NzkyMzU4Mn0.rpPNAFSKYhDRu8FTVRX2HZFHmyfpOgqflaKf3LrxPoU;



    if (!supabaseUrl || !supabaseKey) {

      return {

        statusCode: 500,

        headers,

        body: JSON.stringify({

          ok: false,

          error: 'Supabase env vars missing on Netlify',

        }),

      };

    }



    const supabase = createClient(supabaseUrl, supabaseKey);



    // 👇 هنا نحدد: هل هذي بيانات homeowner أو pro؟

    const formType = body.form_type || body.type || 'pro';



    if (formType === 'homeowner') {

      // نحفظ في جدول homeowners

      const row = {

        full_name: body.full_name || body.name || null,

        phone: body.phone || null,

        address: body.address || body.full_address || null,

        title: body.title || null,

        description: body.description || body.full_description || null,

        created_at: new Date().toISOString(),

      };



      const { error } = await supabase

        .from('homeowner_jobs')

        .insert([row]);



      if (error) {

        console.error('Supabase insert error (homeowner):', error);

        return {

          statusCode: 500,

          headers,

          body: JSON.stringify({ ok: false, error: error.message }),

        };

      }



      return {

        statusCode: 200,

        headers,

        body: JSON.stringify({ ok: true, target: 'homeowner' }),

      };

    }



    // 👇 الجزء القديم للـ pros يبقى كما هو

    const proRow = {

      name: body.name || null,

      email: body.email || null,

      phone: body.phone || null,

      address: body.address || null,

      license: body.license || null,

      insurance: body.insurance || null,

      notes: body.notes || null,

      stripe_customer_id: body.stripe_customer_id || null,

      stripe_subscription_id: body.stripe_subscription_id || null,

    };



    const { error } = await supabase.from('pros_signups').insert([proRow]);



    if (error) {

      console.error('Supabase insert error (pro):', error);

      return {

        statusCode: 500,

        headers,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      headers,

      body: JSON.stringify({ ok: true, target: 'pro' }),

    };

  } catch (err) {

    console.error('General error:', err);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
