// netlify/functions/get-offers.js



const { createClient } = require('@supabase/supabase-js');



const supabaseUrl =

  process.env.SUPABASE_URL;



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

  // CORS preflight

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



  try {

    // 1) نجيب الـ UUID الداخلي للـ job من homeowner_jobs

    const { data: jobRow, error: jobError } = await supabase

      .from('homeowner_jobs')

      .select('id')

      .eq('public_id', publicId)

      .maybeSingle();



    if (jobError) {

      console.error('get-offers job lookup error:', jobError);

      return {

        statusCode: 500,

        headers,

        body: JSON.stringify({ ok: false, error: jobError.message }),

      };

    }



    if (!jobRow) {

      // لا يوجد job بهذا الـ public_id

      return {

        statusCode: 200,

        headers,

        body: JSON.stringify({ ok: true, offers: [] }),

      };

    }



    const jobUuid = jobRow.id;



    // 2) نجيب العروض من جدول pro_offers على أساس job_id (UUID)

    const { data: offers, error: offersError } = await supabase

      .from('pro_offers')

      .select(

        'id, business_name, pro_name, phone, email, amount, city, message, status, created_at'

      )

      .eq('job_id', jobUuid)

      .order('created_at', { ascending: true });



    if (offersError) {

      console.error('get-offers offers error:', offersError);

      return {

        statusCode: 500,

        headers,

        body: JSON.stringify({ ok: false, error: offersError.message }),

      };

    }



    return {

      statusCode: 200,

      headers,

      body: JSON.stringify({ ok: true, offers: offers || [] }),

    };

  } catch (err) {

    console.error('get-offers unexpected error:', err);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: 'Unexpected error' }),

    };

  }

};
