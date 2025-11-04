// netlify/functions/save-profile.js



exports.handler = async (event) => {

  // نستقبل فقط POST من الصفحة

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  const gsUrl = process.env.GS_WEBAPP_URL;

  if (!gsUrl) {

    console.error('GS_WEBAPP_URL is missing in Netlify env');

    return { statusCode: 500, body: 'GS url missing' };

  }



  // الداتا اللي جايانا من success.html

  const payload = JSON.parse(event.body || '{}');



  try {

    // نرسلها إلى Google Apps Script

    const resp = await fetch(gsUrl, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(payload),

    });



    const text = await resp.text(); // ناخذ الرد كما هو



    // نرجع نفس الرد للصفحة

    return {

      statusCode: 200,

      headers: {

        'Content-Type': 'application/json',

        'Access-Control-Allow-Origin': '*', // عشان لو فتحته من المتصفح

      },

      body: text,

    };

  } catch (err) {

    console.error('Failed to call Google Script:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message }),

    };

  }

};
