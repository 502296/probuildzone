// netlify/functions/post-offer.js
// Transitional architecture:
// Frontend now uses "Send Message" language,
// while backend temporarily keeps compatibility with the existing pro_offers table.

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

    if (!job_public_id || !business_name || !phone || !pro_email || !message) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields: job_public_id, business_name, phone, pro_email, message",
        }),
      };
    }

    let parsedAmount = null;
    if (amount !== undefined && amount !== null && String(amount).trim() !== "") {
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({
            ok: false,
            error: "Invalid amount",
          }),
        };
      }
      parsedAmount = numeric;
    }

    // 1) Fetch the job by public_id
    // Important:
    // Only select columns that are confirmed to exist.
    const { data: jobRow, error: jobErr } = await supabase
      .from("homeowner_jobs")
      .select("id, public_id, title, project_title, category, city, state, name, email")
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

    const homeownerEmail = jobRow.email || null;
    const homeownerName = jobRow.name || "Homeowner";
    const jobTitle =
      jobRow.title ||
      jobRow.project_title ||
      jobRow.category ||
      "your project";

    const locationText = [jobRow.city, jobRow.state].filter(Boolean).join(", ");

    // 2) Insert into pro_offers table temporarily
    // We keep this table for compatibility, but semantically this is now a message / connection request.
    const insertPayload = {
      job_id: jobRow.id,
      business_name: String(business_name).trim(),
      message: String(message).trim(),
      amount: parsedAmount,
      phone: String(phone).trim(),
      status: "pending",
      pro_email: String(pro_email).trim(),
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
          error: insErr.message || "Failed to save message",
        }),
      };
    }

    // 3) Send email to homeowner if available
    if (homeownerEmail && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);

        const subject = `New message from ${insertPayload.business_name} for "${jobTitle}"`;

        const html = `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 0.5rem;">You received a new message on ProBuildZone</h2>

            <p>Hi ${homeownerName},</p>

            <p>
              <strong>${insertPayload.business_name}</strong> is interested in your project:
              <strong>${jobTitle}</strong>.
            </p>

            <h3 style="margin-top: 1.5rem;">Builder details</h3>
            <ul>
              <li><strong>Business / Pro:</strong> ${insertPayload.business_name}</li>
              <li><strong>Phone:</strong> ${insertPayload.phone}</li>
              <li><strong>Email:</strong> ${insertPayload.pro_email}</li>
              ${
                locationText
                  ? `<li><strong>Project location:</strong> ${locationText}</li>`
                  : ""
              }
              ${
                parsedAmount !== null
                  ? `<li><strong>Estimated price:</strong> $${parsedAmount.toFixed(2)}</li>`
                  : ""
              }
            </ul>

            <h3 style="margin-top: 1.5rem;">Message from the Builder</h3>
            <p>${insertPayload.message.replace(/\n/g, "<br/>")}</p>

            <p style="margin-top: 1.5rem;">
              <strong>Next step:</strong> If this builder looks like a good fit,
              you can contact <strong>${insertPayload.business_name}</strong> directly
              to discuss the project, timing, site visit, and next steps.
            </p>

            <p>You can reply directly to this email to reach the builder.</p>

            <p style="font-size: 0.875rem; color: #6B7280; margin-top: 1.5rem;">
              ProBuildZone connects homeowners with local professionals.
              Final scope, pricing, timeline, contracts, and payments are handled directly between both sides.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: "ProBuildZone <onboarding@resend.dev>",
          to: homeownerEmail,
          subject,
          html,
          reply_to: insertPayload.pro_email,
        });
      } catch (emailErr) {
        console.error("Error sending email to homeowner:", emailErr);
        // Do not fail the request if email sending fails
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
        request: insertedOffer || null,
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
