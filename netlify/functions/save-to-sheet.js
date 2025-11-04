// netlify/functions/save-to-sheet.js



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  const gsUrl = process.env.GS_WEBAPP_URL; // ← أنت حاطه صح في نتلايفي

  if (!gsUrl) {

    return { statusCode: 500, body: 'GS_WEBAPP_URL is missing' };

  }



  try {

    const payload = event.body || '{}';



    // Netlify (Node 18) عنده fetch جاهز

    const res = await fetch(gsUrl, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: payload,

    });



    const text = await res.text(); // عشان لو Google رجّع نص بس



    if (!res.ok) {

      console.error('GS error:', text);

      return {

        statusCode: 500,

        body: 'Google Script returned non-200: ' + text,

      };

    }



    return {

      statusCode: 200,

      body: text, // أو `{"ok":true}`

    };

  } catch (err) {

    console.error('save-to-sheet error:', err);

    return {

      statusCode: 500,

      body: 'Failed to call Google Script: ' + err.message,

    };

  }

};
