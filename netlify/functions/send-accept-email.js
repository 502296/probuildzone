// netlify/functions/send-accept-email.js



const { Resend } = require('resend');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    const proEmail       = body.proEmail;

    const proName        = body.proName || 'Pro';

    const homeownerName  = body.homeownerName || 'Homeowner';

    const jobId          = body.jobId || '';

    const offerAmount    = body.offerAmount || '';



    if (!proEmail) {

      return {

        statusCode: 400,

        body: JSON.stringify({ ok: false, error: 'Missing proEmail' }),

      };

    }



    const resend = new Resend(process.env.RESEND_API_KEY);



    const fromAddress =

      process.env.PROBUILDZONE_FROM_EMAIL || 'ProBuildZone <noreply@probuildzone.com>';



    const subject = `You have been selected for job ${jobId} on ProBuildZone`;



    const html = `

      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #0F2A43;">

        <h2>Hi ${proName},</h2>

        <p><strong>${homeownerName}</strong> accepted your offer on ProBuildZone.</p>

        <p>

          <strong>Job ID:</strong> ${jobId}<br/>

          <strong>Accepted amount:</strong> $${offerAmount}

        </p>

        <p>You can now contact the homeowner using the phone number shown in your ProBuildZone dashboard.</p>

        <p style="margin-top: 24px;">Best regards,<br/>ProBuildZone Team</p>

      </div>

    `;



    const result = await resend.emails.send({

      from: fromAddress,

      to: proEmail,

      subject,

      html,

    });



    console.log('Resend response:', JSON.stringify(result));



    if (result.error) {

      throw new Error(result.error.message || 'Resend error');

    }



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true }),

    };

  } catch (err) {

    console.error('send-accept-email error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message || 'Unknown error' }),

    };

  }

};
