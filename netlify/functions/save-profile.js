// netlify/functions/save-profile.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method Not Allowed' }),

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    const supabaseUrl = process.env.SUPABASE_URL;

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;



    if (!supabaseUrl || !supabaseKey) {

      return {

        statusCode: 500,

        body: JSON.stringify({ ok: false, error: 'Supabase env vars missing' }),

      };

    }



    const supabase = createClient(supabaseUrl, supabaseKey);



    const row = {

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



    const { error } = await supabase.from('pros_signups').insert([row]);



    if (error) {

      console.error('Supabase insert error:', error);

      return {

        statusCode: 500,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true }),

    };

  } catch (err) {

    console.error('General error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
