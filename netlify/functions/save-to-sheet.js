// netlify/functions/save-to-sheet.js



exports.handler = async (event) => {

  // نقبل بس POST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  // رابط الويب أب اللي حطّيته في نتلايفي

  const gsUrl = process.env.GS_WEBAPP_URL;



  if (!gsUrl) {

    console.error('GS_WEBAPP_URL is missing');

    return {

      statusCode: 500,

      body: 'GS_WEBAPP_URL is missing in environment variables',

    };

  }



  try {

    const body = event.body || '{}';



    // نبعث نفس الداتا للـ Google Apps Script

    const resp = await fetch(gsUrl, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body,

    });



    if (!resp.ok) {

      const text = await resp.text();

      console.error('GS script error:', text);

      return {

        statusCode: 500,

        body: 'Google Script returned error: ' + text,

      };

    }



    return {

      statusCode: 200,

      body: 'OK',

    };

  } catch (err) {

    console.error('save-to-sheet err:', err);

    return {

      statusCode: 500,

      body: 'Failed to call Google Script: ' + err.message,

    };

  }

};
