// netlify/functions/save-to-sheet.js



exports.handler = async (event) => {

  // ما نقبل إلا POST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  // رابط الويب آب من النتلايفي env

  const gsUrl = process.env.GS_WEBAPP_URL;



  if (!gsUrl) {

    return {

      statusCode: 500,

      body: 'GS_WEBAPP_URL is missing in Netlify env',

    };

  }



  try {

    // نرسل نفس البودي اللي جا من الفرونت للـ Google Script

    const resp = await fetch(gsUrl, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: event.body || '{}',

    });



    const text = await resp.text(); // ناخذ الرد كنص عشان لو رجع HTML



    // لو جوجل سكربت رجع 200 نرجعها للفرونت

    return {

      statusCode: 200,

      body: text,

    };

  } catch (err) {

    console.error('GS proxy error:', err);

    return {

      statusCode: 500,

      body: 'Failed to talk to Google Script: ' + err.message,

    };

  }

};
