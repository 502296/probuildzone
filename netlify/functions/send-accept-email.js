import { Resend } from 'resend';



export async function handler(event) {

  try {

    const body = JSON.parse(event.body || "{}");



    const {

      proEmail,

      proName,

      homeownerName,

      jobId,

      offerAmount

    } = body;



    if (!proEmail) {

      return {

        statusCode: 400,

        body: JSON.stringify({ error: "Missing proEmail" })

      };

    }



    const resend = new Resend(process.env.RESEND_API_KEY);



    const subject = `Your offer was accepted! (Job ${jobId})`;



    const html = `

      <div style="font-family: Inter, Arial; padding: 20px;">

        <h2 style="color: #0F2A43; margin-bottom: 12px;">Great news, ${proName}!</h2>



        <p style="font-size: 16px; margin-bottom: 14px;">

          A homeowner has <strong>accepted your offer</strong> on job:

        </p>



        <p style="font-size: 16px; margin-bottom: 8px;">

          <strong>Job ID:</strong> ${jobId}

        </p>



        <p style="font-size: 16px; margin-bottom: 8px;">

          <strong>Amount:</strong> $${offerAmount}

        </p>



        <p style="font-size: 16px; margin-bottom: 8px;">

          <strong>Homeowner:</strong> ${homeownerName}

        </p>



        <p style="font-size: 16px; margin-top: 20px;">

          You can now contact the homeowner to coordinate the next steps.

        </p>



        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ccc;">



        <p style="font-size: 14px; color: #6b7a8c;">

          ProBuildZone – Connecting homeowners with trusted builders

        </p>

      </div>

    `;



    const data = await resend.emails.send({

      from: 'ProBuildZone <notifications@probuildzone.com>',

      to: proEmail,

      subject,

      html,

    });



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true, data })

    };



  } catch (err) {

    return {

      statusCode: 500,

      body: JSON.stringify({ error: err.message })

    };

  }

}
