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



    // 👑 Royal-style HTML email

    const html = `

      <!doctype html>

      <html>

      <head>

        <meta charset="utf-8" />

        <title>Offer accepted</title>

      </head>

      <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Inter',system-ui,Arial,sans-serif;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0f172a;padding:32px 12px;">

          <tr>

            <td align="center">

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background:#0b1120;border-radius:20px;overflow:hidden;border:1px solid rgba(148,163,184,0.25);box-shadow:0 24px 60px rgba(15,23,42,0.8);">

                <!-- Header -->

                <tr>

                  <td style="padding:22px 28px 18px 28px;border-bottom:1px solid rgba(148,163,184,0.22);background:linear-gradient(135deg,#020617,#0b1120 45%,#111827 80%);">

                    <div style="font-size:13px;color:#e5e7eb;letter-spacing:0.12em;text-transform:uppercase;">

                      ProBuildZone • Offer Update

                    </div>

                    <div style="margin-top:8px;font-size:22px;font-weight:800;color:#f9fafb;letter-spacing:-0.03em;">

                      Your offer was accepted 🎉

                    </div>

                    <div style="margin-top:4px;font-size:14px;color:#cbd5f5;">

                      Job ID: <span style="font-weight:600;color:#e0f2fe;">${jobId}</span>

                    </div>

                  </td>

                </tr>



                <!-- Body -->

                <tr>

                  <td style="padding:24px 28px 8px 28px;background:#020617;">

                    <p style="margin:0 0 14px 0;font-size:16px;color:#e5e7eb;">

                      Hi <strong>${proName}</strong>,

                    </p>

                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">

                      Great news! A homeowner on <strong>ProBuildZone</strong> has

                      <span style="color:#facc15;font-weight:600;">accepted your offer</span>.

                    </p>



                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;margin-bottom:16px;border-collapse:collapse;">

                      <tr>

                        <td style="padding:10px 0;font-size:14px;color:#9ca3af;width:110px;">Homeowner</td>

                        <td style="padding:10px 0;font-size:14px;color:#e5e7eb;font-weight:600;">${homeownerName}</td>

                      </tr>

                      <tr>

                        <td style="padding:6px 0;font-size:14px;color:#9ca3af;">Job ID</td>

                        <td style="padding:6px 0;font-size:14px;color:#e5e7eb;">${jobId}</td>

                      </tr>

                      <tr>

                        <td style="padding:6px 0;font-size:14px;color:#9ca3af;">Accepted amount</td>

                        <td style="padding:6px 0;font-size:14px;color:#bbf7d0;font-weight:700;">

                          $${offerAmount}

                        </td>

                      </tr>

                    </table>



                    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#cbd5e1;">

                      The homeowner is expecting you to reach out and coordinate the next steps

                      (site visit, schedule, contract, and payment method). Please contact them

                      promptly and keep all communication professional.

                    </p>



                    <!-- Call to action button -->

                    <div style="margin:22px 0 4px 0;">

                      <a href="https://probuildzone.com/job.html?id=${encodeURIComponent(jobId)}"

                         style="display:inline-block;padding:11px 22px;border-radius:999px;

                                background:linear-gradient(135deg,#facc15,#eab308);

                                color:#111827;font-size:14px;font-weight:700;

                                text-decoration:none;border:1px solid #f59e0b;">

                        View job details

                      </a>

                    </div>



                    <p style="margin:10px 0 6px 0;font-size:12px;color:#9ca3af;">

                      If the button doesn’t work, open this link in your browser:<br/>

                      <span style="color:#e5e7eb;font-size:11px;">

                        https://probuildzone.com/job.html?id=${encodeURIComponent(jobId)}

                      </span>

                    </p>

                  </td>

                </tr>



                <!-- Footer -->

                <tr>

                  <td style="padding:16px 28px 18px 28px;background:#020617;border-top:1px solid rgba(30,64,175,0.5);">

                    <p style="margin:0 0 4px 0;font-size:13px;color:#9ca3af;">

                      Thank you for building with <strong style="color:#e5e7eb;">ProBuildZone</strong>.

                    </p>

                    <p style="margin:0;font-size:11px;color:#6b7280;">

                      This notification was sent to you because you submitted an offer on ProBuildZone.

                    </p>

                  </td>

                </tr>

              </table>

            </td>

          </tr>

        </table>

      </body>

      </html>

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
