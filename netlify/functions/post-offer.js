// netlify/functions/post-offer.js

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
    };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const { Resend } = await import("resend");

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_ANON_KEY;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Missing Supabase env vars");
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Server not configured (Supabase)",
        }),
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Invalid JSON body",
        }),
      };
    }

    const {
      job_public_id,
      business_name,
      amount,
      phone,
      message,
      pro_email,
    } = payload;

    if (!job_public_id || !business_name || !phone || amount === undefined || amount === null || amount === "") {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields: job_public_id, business_name, phone, amount",
        }),
      };
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Invalid amount",
        }),
      };
    }

    // 1) Fetch the job by public_id
    const { data: jobRow, error: jobErr } = await supabase
      .from("homeowner_jobs")
      .select(
        "id, public_id, title, project_title, name, homeowner_name, email, homeowner_email"
      )
      .eq("public_id", String(job_public_id).trim())
      .maybeSingle();

    if (jobErr) {
      console.error("Error fetching job:", jobErr);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: jobErr.message || "Failed to load job",
        }),
      };
    }

    if (!jobRow) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Job not found",
        }),
      };
    }

    const homeownerEmail = jobRow.homeowner_email || jobRow.email || null;
    const homeownerName = jobRow.homeowner_name || jobRow.name || "Homeowner";
    const jobTitle = jobRow.title || jobRow.project_title || "your project";

    // 2) Insert the offer into pro_offers
    const insertPayload = {
      job_id: jobRow.id,
      business_name: String(business_name).trim(),
      message: message ? String(message).trim() : "",
      amount: parsedAmount,
      phone: phone ? String(phone).trim() : null,
      status: "pending",
      pro_email: pro_email ? String(pro_email).trim() : null,
    };

    const { data: insertedOffer, error: insErr } = await supabase
      .from("pro_offers")
      .insert(insertPayload)
      .select("id, job_id, business_name, amount, phone, status, pro_email, created_at")
      .maybeSingle();

    if (insErr) {
      console.error("Insert pro_offers error:", insErr);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: insErr.message || "Failed to save offer",
        }),
      };
    }

    // 3) Send email to homeowner if available
    if (homeownerEmail && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        const safeAmount = `$${parsedAmount.toFixed(2)}`;

        const subject = `New offer from ${insertPayload.business_name} for "${jobTitle}"`;

        const html = `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 0.5rem;">You received a new offer on ProBuildZone 🎉</h2>

            <p>Hi ${homeownerName},</p>

            <p>
              <strong>${insertPayload.business_name}</strong> just sent you an offer for your project:
              <strong>${jobTitle}</strong>.
            </p>

            <h3 style="margin-top: 1.5rem;">Offer summary</h3>
            <ul>
              <li><strong>Pro / Business:</strong> ${insertPayload.business_name}</li>
              <li><strong>Estimated price:</strong> ${safeAmount}</li>
              ${
                insertPayload.phone
                  ? `<li><strong>Phone:</strong> ${insertPayload.phone}</li>`
                  : ""
              }
              ${
                insertPayload.pro_email
                  ? `<li><strong>Email:</strong> ${insertPayload.pro_email}</li>`
                  : ""
              }
            </ul>

            ${
              insertPayload.message
                ? `
            <h3 style="margin-top: 1.5rem;">Message from the Pro</h3>
            <p>${insertPayload.message.replace(/\n/g, "<br/>")}</p>
            `
                : ""
            }

            <p style="margin-top: 1.5rem;">
              <strong>Next step:</strong> If this offer feels like a good fit,
              contact <strong>${insertPayload.business_name}</strong> directly
              ${insertPayload.pro_email ? "by email or phone" : "by phone"}
              to discuss details, schedule a visit, and confirm the final agreement.
            </p>

            ${
              insertPayload.pro_email
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
          from: "ProBuildZone <onboarding@resend.dev>",
          to: homeownerEmail,
          subject,
          html,
          ...(insertPayload.pro_email ? { reply_to: insertPayload.pro_email } : {}),
        });
      } catch (emailErr) {
        console.error("Error sending email to homeowner:", emailErr);
        // Do not fail the offer if email sending fails
      }
    } else {
      console.warn("Skipping email: missing homeownerEmail or RESEND_API_KEY", {
        homeownerEmail,
        hasResendKey: !!RESEND_API_KEY,
      });
    }

    // 4) Success response
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        offer: insertedOffer || null,
      }),
    };
  } catch (e) {
    console.error("post-offer error:", e);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: e.message || "Server error",
      }),
    };
  }
};
