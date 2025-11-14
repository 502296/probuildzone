// netlify/functions/send-accept-email.js

const { Resend } = require('resend');



const resend = new Resend(process.env.RESEND_API_KEY);



exports.handler = async (event) => {

  // نسمح فقط بـ POST

  if (event.httpMethod !== 'POST') {

    console.log('send-accept-email called with method:', event.httpMethod);

    return {

      statusCode: 405,

      body: JSON.stringify({ error: 'Method not allowed' }),

    };

  }



  try {

    const data = JSON.parse(event.body || '{}');



    const {

      proEmail,

      proName,

      homeownerName,

      jobId,

      offerAmount,

    } = data;



    console.log('Incoming payload for send-accept-email:', data);



    if (!proEmail) {

      console.log('Missing proEmail');

      return {

        statusCode: 400,

        body: JSON.stringify({ error: 'Missing proEmail' }),

      };

    }



    const safeProName = proName || 'Pro';

    const safeHomeowner = homeownerName || 'Homeowner';

    const safeJobId = jobId || 'Unknown job';

    const safeAmount = offerAmount ? `$${offerAmount}` : 'the agreed amount';



    const subject = `Your offer was accepted – Job ${safeJobId}`;

    const html = `

      <h2>Good news, ${safeProName}!</h2>

      <p>${safeHomeowner} has <strong>accepted your offer</strong> on job <strong>${safeJobId}</strong>.</p>

      <p><strong>Offer amount:</strong> ${safeAmount}</p>

      <p>You can now contact the homeowner directly using the details you received from ProBuildZone.</p>

      <p style="margin-top:16px;font-size:13px;color:#6b7280">

        This email was sent automatically by ProBuildZone.

      </p>

    `;



    // مبدئياً نستخدم الإيميل التجريبي من Resend

    const fromAddress = 'onboarding@resend.dev'; // يمكنك تغييره لاحقاً إلى domain متحقق



    console.log('Sending email via Resend to:', proEmail);



    const result = await resend.emails.send({

      from: `ProBuildZone <${fromAddress}>`,

      to: proEmail,

      subject,

      html,

    });



    console.log('Resend response:', result);



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true }),

    };

  } catch (err) {

    console.error('Error in send-accept-email:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: 'Failed to send email' }),

    };

  }

};
