// netlify/functions/get-job.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  try {

    const publicId = (event.queryStringParameters && event.queryStringParameters.id) || '';

    if (!publicId) {

      return resp(400, { error: 'Missing id' });

    }



    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);



    // 1) نجيب السجل حسب public_id (مو الـ UUID)

    const { data: job, error: jobErr } = await supabase

      .from('homeowner_jobs')

      .select('id, public_id, title, summary, city, state, homeowner_id, created_at, address')

      .eq('public_id', publicId)

      .maybeSingle();



    if (jobErr) throw jobErr;

    if (!job) return resp(404, { error: 'Job not found' });



    // 2) معلومات صاحب الطلب

    const { data: owner, error: ownerErr } = await supabase

      .from('homeowners')

      .select('name, email, phone, address')

      .eq('id', job.homeowner_id)

      .maybeSingle();

    if (ownerErr) throw ownerErr;



    // 3) العروض المرتبطة (حسب UUID الداخلي job.id)

    const { data: offers, error: offersErr } = await supabase

      .from('job_offers')

      .select('id, amount, message, pro_name, phone, status, created_at')

      .eq('job_id', job.id)

      .order('created_at', { ascending: false });

    if (offersErr) throw offersErr;



    return resp(200, {

      job: {

        public_id: job.public_id,

        title: job.title,

        summary: job.summary,

        address: owner?.address || job.address || null,

        name: owner?.name || null,

        email: owner?.email || null,

        phone: owner?.phone || null,

        created_at: job.created_at,

      },

      offers: offers || [],

    });

  } catch (e) {

    console.error(e);

    return resp(500, { error: e.message || 'Server error' });

  }

};



function resp(statusCode, body) {

  return {

    statusCode,

    headers: {

      'Content-Type': 'application/json',

      'Access-Control-Allow-Origin': '*',

      'Cache-Control': 'no-store',

    },

    body: JSON.stringify(body),

  };

}
