import { createClient } from '@supabase/supabase-js';



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);



export async function handler(event) {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method Not Allowed' }),

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');

    const { full_name, phone, address, title, description, category } = body;



    if (!full_name || !phone) {

      return {

        statusCode: 400,

        body: JSON.stringify({ error: 'Missing required fields: full_name or phone' }),

      };

    }



    // ✅ إدخال البيانات في جدول homeowner_jobs

    const { data, error } = await supabase

      .from('homeowner_jobs')

      .insert([{ full_name, phone, address, title, description, category }])

      .select();



    if (error) {

      console.error('Supabase error:', error.message);

      return {

        statusCode: 500,

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true, data }),

    };

  } catch (err) {

    console.error('Server error:', err.message);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

}
