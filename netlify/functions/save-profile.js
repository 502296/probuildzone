// netlify/functions/save-profile.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: 'Method Not Allowed',

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    const supabase = createClient(

      process.env.SUPABASE_URL,

      process.env.SUPABASE_SERVICE_ROLE

    );



    const { error } = await supabase.from('pros').insert([

      {

        full_name: body.name || null,

        email: body.email || null,

        phone: body.phone || null,

        company_address: body.address || null,

        license_no: body.license || null,

        insurance_no: body.insurance || null,

        notes: body.notes || null,

        stripe_status: 'pending',

      },

    ]);



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

    console.error('save-profile error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
