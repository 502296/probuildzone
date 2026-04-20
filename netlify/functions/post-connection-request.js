// netlify/functions/post-connection-request.js

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
      job_id,
      business_name,
      pro_email,
      phone,
      message,
    } = payload;

    if (!job_id || !business_name || !pro_email || !phone || !message) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields: job_id, business_name, pro_email, phone, message",
        }),
      };
    }

    const normalizedJobId = String(job_id).trim();
    const normalizedBusinessName = String(business_name).trim();
    const normalizedProEmail = String(pro_email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const normalizedMessage = String(message).trim();

    const { data: jobRow, error: jobErr } = await supabase
      .from("homeowner_jobs")
      .select(`
        id,
        public_id,
        project_title,
        title,
        short_summary,
        summary,
        city,
        state,
        contact_name,
        name,
        phone,
        email,
        full_address,
        address,
        full_description,
        description,
        category,
        created_at
      `)
      .eq("id", normalizedJobId)
      .maybeSingle();

    if (jobErr) {
      console.error("Error fetching homeowner_jobs:", jobErr);
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
    const homeownerName =
      jobRow.contact_name ||
      jobRow.name ||
      "Homeowner";

    const jobTitle =
      jobRow.project_title ||
      jobRow.title ||
      jobRow.category ||
      "your project";

    const insertPayload = {
      job_id: jobRow.id,
      business_name: normalizedBusinessName,
      pro_email: normalizedProEmail,
      phone: normalizedPhone,
      message: normalizedMessage,
      status: "pending",
    };

    const { data: insertedRequest, error: insErr } = await supabase
      .from("pro_offers")
      .insert(insertPayload)
      .select(`
        id,
        job_id,
        business_name,
        pro_email,
        phone,
        message,
        status,
        created_at
      `)
      .maybeSingle();

    if (insErr) {
      console.error("Insert pro_offers error:", insErr);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: insErr.message || "Failed to save connection request",
        }),
      };
    }

    if (homeownerEmail && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);

        const locationText = [jobRow.city, jobRow.state].filter(Boolean).join(", ");
        const safeMessage = normalizedMessage
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>");

        const subject = `New builder message for "${jobTitle}"`;

        const html = `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 0.5rem;">You received a new message on ProBuildZone</h2>

            <p>Hi ${homeownerName},</p>

            <p>
              <strong>${normalizedBusinessName}</strong> is interested in your project:
              <strong>${jobTitle}</strong>.
            </p>

            <h3 style="margin-top: 1.5rem;">Builder details</h3>
            <ul>
              <li><strong>Business / Pro:</strong> ${normalizedBusinessName}</li>
              <li><strong>Email:</strong> ${normalizedProEmail}</li>
              <li><strong>Phone:</strong> ${normalizedPhone}</li>
              ${locationText ? `<li><strong>Project location:</strong> ${locationText}</li>` : ""}
              ${jobRow.public_id ? `<li><strong>Project ID:</strong> ${jobRow.public_id}</li>` : ""}
            </ul>

            <h3 style="margin-top: 1.5rem;">Message</h3>
            <p>${safeMessage}</p>

            <p style="margin-top: 1.5rem;">
              You can now review this request inside your Homeowner Dashboard on ProBuildZone.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: "ProBuildZone <onboarding@resend.dev>",
          to: homeownerEmail,
          subject,
          html,
          reply_to: normalizedProEmail,
        });
      } catch (emailErr) {
        console.error("Error sending homeowner email:", emailErr);
      }
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        request: insertedRequest || null,
      }),
    };
  } catch (e) {
    console.error("post-connection-request error:", e);
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
