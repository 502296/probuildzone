// netlify/functions/get-offers.js

const { createClient } = require('@supabase/supabase-js');



const supabaseUrl =

  process.env.SUPABASE_URL || process.env.SUPABASE_URL_PUBLIC;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;



const supabase = createClient(supabaseUrl, supabaseKey, {

  auth: { persistSession: false },

});



const headers = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'GET, OPTIONS',

  'Access-Control-Allow-Headers': 'Content-Type',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers, body: '' };

  }



  if (event.httpMethod !== 'GET') {

    return {

      statusCode: 405,

      headers,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  const publicId = event.queryStringParameters

    ? event.queryStringParameters.id

    : null;



  if (!publicId) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Missing id' }),

    };

  }



  // 👇 نقرأ من job_offers بالأعمدة الموجودة فعلياً في الجدول

  const { data, error } = await supabase

    .from('job_offers')

    .select(

      'id, job_public_id, business_name, amount, message, phone, status, created_at'

    )

    .eq('job_public_id', publicId)

    .order('created_at', { ascending: false });



  if (error) {

    console.error('get-offers error:', error);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: error.message }),

    };

  }



  return {

    statusCode: 200,

    headers,

    body: JSON.stringify({ ok: true, offers: data || [] }),

  };

};
