const { Resend } = require('resend');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method not allowed' }),

    };

  }



  try {

    const { proEmail, proName, homeownerName, jobId, offerAmount } =

      JSON.parse(event.body || '{}');



    if (!proEmail) {

      return {

        statusCode: 400,

        body: JSON.stringify({ error: 'Missing proEmail' }),

      };

    }



    const resend = new Resend(process.env.RESEND_API_KEY);



    await resend.emails.send({

      from: 'ProBuildZone <onboarding@resend.dev>', // مؤقتاً للاختبار

      to: proEmail,

      subject: `Your offer was accepted for Job ${jobId}`,

      html: `

        <h2>Good news, ${proName || 'Pro'}!</h2>

        <p>Your offer for job <strong>${jobId}</strong> was <strong>accepted</strong> by ${homeownerName}.</p>

        <p><strong>Offer amount:</strong> $${offerAmount || '—'}</p>

        <p>You can now contact the homeowner and schedule the work.</p>

        <p>— ProBuildZone</p>

      `,

    });



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true }),

    };

  } catch (err) {

    console.error('Resend error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: 'Failed to send email' }),

    };

  }

};
