// netlify/functions/test-supa.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async () => {

  const supabaseUrl = process.env.SUPABASE_URL;

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;



  if (!supabaseUrl || !supabaseKey) {

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE on Netlify',

      }),

    };

  }



  const supabase = createClient(supabaseUrl, supabaseKey);



  const { data, error } = await supabase

    .from('pros_signups')

    .select('*')

    .limit(5);



  if (error) {

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: error.message }),

    };

  }



  return {

    statusCode: 200,

    body: JSON.stringify({ ok: true, rows: data }),

  };

};
