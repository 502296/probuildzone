// netlify/functions/accept-offer.js



const { createClient } = require('@supabase/supabase-js');



const supabaseUrl =

  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;



const RESEND_API_KEY = process.env.RESEND_API_KEY;



const supabase = createClient(supabaseUrl, supabaseKey, {

  auth: { persistSession: false },

});



const headers = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

  'Access-Control-Allow-Headers': 'Content-Type',

};



exports.handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {

    return { statusCode: 200, headers, body: '' };

  }



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  let body;

  try {

    body = JSON.parse(event.body || '{}');

  } catch (e) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),

    };

  }



  const offerId = body.offer_id;

  if (!offerId) {

    return {

      statusCode: 400,

      headers,

      body: JSON.stringify({ ok: false, error: 'Missing offer_id' }),

    };

  }



  try {

    // 1) فعّل هذا العرض (accepted) ورجّع البيانات كلها

    const { data: offer, error: offerError } = await supabase

      .from('pro_offers')

      .update({ status: 'accepted' })

      .eq('id', offerId)

      .select('*')

      .maybeSingle();



    if (offerError || !offer) {

      console.error('accept-offer: update pro_offers error', offerError);

      return {

        statusCode: 500,

        headers,

        body: JSON.stringify({

          ok: false,

          error: offerError?.message || 'Offer not found',

        }),

      };

    }



    // 2) حوّل باقي العروض لنفس الـ job إلى not_selected (اختياري لكنه جميل)

    if (offer.job_id) {

      await supabase

        .from('pro_offers')

        .update({ status: 'not_selected' })

        .eq('job_id', offer.job_id)

        .neq('id', offerId);

    }



    // 3) جيب بيانات الـ job حتى نرسل تفاصيل واضحة للبناء

    let job = null;

    if (offer.job_id) {

      const { data: jobRow, error: jobError } = await supabase

        .from('homeowner_jobs')

        .select(

          'id, public_id, name, email, city, state, project_title, short_summary'

        )

        .eq('id', offer.job_id)

        .maybeSingle();



      if (jobError) {

        console.error('accept-offer: load job error', jobError);

      } else {

        job = jobRow;

      }

    }



    // 4) إرسال الإيميل للـ pro (إذا عندنا API key وإيميل)

    if (RESEND_API_KEY && offer.email) {

      const jobPublicId = job?.public_id || 'your project on ProBuildZone';

      const homeownerName = job?.name || 'the homeowner';

      const locationText =

        job?.city && job?.state ? `${job.city}, ${job.state}` : '';



      const subject = `✅ Your offer was accepted for job ${jobPublicId}`;



      const html = `

        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0F2A43;">

          <h2>Good news from ProBuildZone 🎉</h2>

          <p>Hi ${offer.pro_name || offer.business_name || 'Pro'},</p>

          <p>

            Your offer for <strong>${jobPublicId}</strong>${

        locationText ? ` in <strong>${locationText}</strong>` : ''

      } has been <strong>accepted</strong> by ${homeownerName}.

          </p>

          <p>

            <strong>Offer details:</strong><br/>

            Business: ${offer.business_name || '-'}<br/>

            Amount: $${offer.amount || '-'}<br/>

            Message you sent: ${offer.message || '-'}

          </p>

          <p>

            Please reply directly to the homeowner at: 

            <strong>${job?.email || 'their preferred contact method'}</strong>

            to schedule the work and finalize details.

          </p>

          <hr/>

          <p style="font-size: 13px; color:#6b7a8c;">

            This email was sent automatically by ProBuildZone when the homeowner accepted your offer.

          </p>

        </div>

      `;



      try {

        await fetch('https://api.resend.com/emails', {

          method: 'POST',

          headers: {

            Authorization: `Bearer ${RESEND_API_KEY}`,

            'Content-Type': 'application/json',

          },

          body: JSON.stringify({

            from: 'ProBuildZone <no-reply@probuildzone.com>',

            to: [offer.email],

            subject,

            html,

          }),

        });

      } catch (emailErr) {

        console.error('accept-offer: email send error', emailErr);

        // ما نرجّع خطأ للـ frontend حتى لو الإيميل فشل، المهم الحالة تتغيّر

      }

    } else {

      console.log(

        'accept-offer: skip email, missing RESEND_API_KEY or offer.email'

      );

    }



    return {

      statusCode: 200,

      headers,

      body: JSON.stringify({ ok: true }),

    };

  } catch (err) {

    console.error('accept-offer: unexpected error', err);

    return {

      statusCode: 500,

      headers,

      body: JSON.stringify({ ok: false, error: 'Unexpected error' }),

    };

  }

};
