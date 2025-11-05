// netlify/functions/save-profile.js

const { createClient } = require('@supabase/supabase-js');



const corsHeaders = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

  'Access-Control-Allow-Headers': 'Content-Type',

};



exports.handler = async (event) => {

  // preflight

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

    const data = JSON.parse(event.body || '{}');



    // تحقق بسيط

    if (!data.email && !data.name) {

      return {

        statusCode: 400,

        headers: corsHeaders,

        body: JSON.stringify({ ok: false, error: 'No data to save' }),

      };

    }



    // Supabase client (من المتغيرات اللي حطيناها في Netlify)

    const supabase = createClient(

      process.env.SUPABASE_URL,

      process.env.SUPABASE_SERVICE_ROLE

    );



    const { error } = await supabase.from('pros').insert([

      {

        full_name: data.name || null,

        email: data.email || null,

        phone: data.phone || null,

        company_address: data.address || null,

        license_no: data.license || null,

        insurance_no: data.insurance || null,

        notes: data.notes || null,

        // بما إن المستخدم رجع من صفحة success نخليه active

        stripe_status: 'active',

      },

    ]);



    if (error) {

      console.error('Supabase insert error:', error);

      return {

        statusCode: 500,

        headers: corsHeaders,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      headers: corsHeaders,

      body: JSON.stringify({ ok: true, message: 'Saved to Supabase' }),

    };

  } catch (err) {

    console.error(err);

    return {

      statusCode: 500,

      headers: corsHeaders,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
