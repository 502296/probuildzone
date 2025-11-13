// netlify/functions/send-accept-email.js



import { Resend } from 'resend';



export default async function handler(event, context) {

  try {

    const resend = new Resend(process.env.RESEND_API_KEY);



    const { proEmail, homeownerName, jobId, offerAmount, proName } = JSON.parse(event.body);



    const response = await resend.emails.send({

      from: "ProBuildZone <noreply@resend.dev>",

      to: proEmail,

      subject: `Your offer was accepted for Job ${jobId}`,

      html: `

        <h2>Good news, ${proName}!</h2>

        <p>The homeowner <strong>${homeownerName}</strong> has accepted your offer.</p>

        <p><strong>Job ID:</strong> ${jobId}</p>

        <p><strong>Offer Amount:</strong> $${offerAmount}</p>

        <br>

        <p>They will contact you soon to schedule the work.</p>

        <br>

        <p>— ProBuildZone Team</p>

      `

    });



    return {

      statusCode: 200,

      body: JSON.stringify({ success: true, response })

    };



  } catch (error) {

    return {

      statusCode: 500,

      body: JSON.stringify({ success: false, error: error.message })

    };

  }

}
