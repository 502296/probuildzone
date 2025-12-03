// netlify/functions/post-offer.js



exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {

    return { statusCode: 405, body: "Method Not Allowed" };

  }



  try {

    const { createClient } = await import("@supabase/supabase-js");

    const { Resend } = await import("resend");



    const SUPABASE_URL = process.env.SUPABASE_URL;

    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;



    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {

      console.error("Missing Supabase env vars");

      return {

        statusCode: 500,

        body: JSON.stringify({ error: "Server not configured (Supabase)" }),

      };

    }



    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



    const payload = JSON.parse(event.body || "{}");



    // نستقبل نفس الحقول القديمة + حقل جديد اختياري pro_email

    const {

      job_public_id,

      business_name,

      amount,

      phone,

      message,

      pro_email, // جديد (اختياري)

    } = payload;



    if (!job_public_id || !business_name) {

      return {

        statusCode: 400,

        body: JSON.stringify({ error: "Missing fields" }),

      };

    }



    // 1) جلب بيانات الـ job من الـ public_id

    const { data: jobRow, error: jobErr } = await supabase

      .from("homeowner_jobs")

      .select("id, public_id, title, name, homeowner_name, email, homeowner_email")

      .eq("public_id", job_public_id)

      .maybeSingle();



    if (jobErr || !jobRow) {

      console.error("Job not found or error:", jobErr);

      return {

        statusCode: 404,

        body: JSON.stringify({ error: "Job not found" }),

      };

    }



    const homeownerEmail =

      jobRow.homeowner_email || jobRow.email || null;

    const homeownerName =

      jobRow.homeowner_name || jobRow.name || "Homeowner";

    const jobTitle = jobRow.title || "your project";



    // 2) إدخال العرض في جدول pro_offers

    const insert = {

      job_id: jobRow.id,

      business_name,

      message: message || "",

      amount: amount ? Number(amount) : null,

      phone: phone || null,

      status: "pending",

      pro_email: pro_email || null,

    };



    const { error: insErr } = await supabase

      .from("pro_offers")

      .insert(insert);



    if (insErr) {

      console.error("Insert pro_offers error:", insErr);

      return {

        statusCode: 500,

        body: JSON.stringify({ error: insErr.message }),

      };

    }



    // 3) إرسال الإيميل لصاحب المشروع (إن توفّر الإيميل + مفتاح Resend)

    if (homeownerEmail && RESEND_API_KEY) {

      try {

        const resend = new Resend(RESEND_API_KEY);



        const safeAmount = amount ? `$${Number(amount).toFixed(2)}` : "Not specified";



        const subject = `New offer from ${business_name} for "${jobTitle}"`;



        const html = `

          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">

            <h2 style="margin-bottom: 0.5rem;">You received a new offer on ProBuildZone 🎉</h2>

            <p>Hi ${homeownerName},</p>

            <p>

              <strong>${business_name}</strong> just sent you an offer for your project:

              <strong>${jobTitle}</strong>.

            </p>



            <h3 style="margin-top: 1.5rem;">Offer summary</h3>

            <ul>

              <li><strong>Pro / Business:</strong> ${business_name}</li>

              <li><strong>Estimated price:</strong> ${safeAmount}</li>

              ${

                phone

                  ? `<li><strong>Phone:</strong> ${phone}</li>`

                  : ""

              }

            </ul>



            ${

              message

                ? `

            <h3 style="margin-top: 1.5rem;">Message from the Pro</h3>

            <p>${String(message).replace(/\n/g, "<br/>")}</p>

            `

                : ""

            }



            <p style="margin-top: 1.5rem;">

              <strong>Next step:</strong> If this offer feels like a good fit,

              we encourage you to contact <strong>${business_name}</strong> directly

              by ${pro_email ? "email or" : ""} phone to discuss details,

              schedule a visit, and confirm the final agreement.

            </p>



            ${

              pro_email

                ? `<p>You can reply directly to this email to reach the Pro.</p>`

                : ""

            }



            <p style="font-size: 0.875rem; color: #6B7280; margin-top: 1.5rem;">

              ProBuildZone simply connects homeowners and local Pros.

              All project details, payments, and agreements are handled directly between you and the Pro.

            </p>

          </div>

        `;



        await resend.emails.send({

          from: "ProBuildZone <onboarding@resend.dev>", // تقدر تغيّرها لاحقاً

          to: homeownerEmail,

          subject,

          html,

          ...(pro_email ? { reply_to: pro_email } : {}),

        });



      } catch (emailErr) {

        console.error("Error sending email to homeowner:", emailErr);

        // ما نوقف الطلب بسبب فشل الإيميل – نرجّع OK لأن العرض محفوظ

      }

    } else {

      console.warn(

        "Skipping email: missing homeownerEmail or RESEND_API_KEY",

        { homeownerEmail, hasResendKey: !!RESEND_API_KEY }

      );

    }



    // 4) رجوع ناجح

    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true }),

    };



  } catch (e) {

    console.error("post-offer error:", e);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: e.message }),

    };

  }

};
