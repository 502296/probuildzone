// netlify/functions/save-to-sheet.js



exports.handler = async (event) => {

  // نسمح بس POST

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  const gsUrl = process.env.GS_WEBAPP_URL; // من env

  if (!gsUrl) {

    return { statusCode: 500, body: 'GS_WEBAPP_URL is missing' };

  }



  try {

    const body = event.body || '{}';



    const res = await fetch(gsUrl, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body

    });



    const text = await res.text(); // نشوفه لو فيه خطأ



    if (!res.ok) {

      console.error('Google Script error:', text);

      return { statusCode: 500, body: text };

    }



    return {

      statusCode: 200,

      body: text

    };

  } catch (err) {

    console.error('save-to-sheet failed:', err);

    return { statusCode: 500, body: err.message };

  }

};
