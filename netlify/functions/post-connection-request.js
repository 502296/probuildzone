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
      job_public_id,
      business_name,
      pro_email,
      phone,
      message,
    } = payload;

    if (!job_public_id || !business_name || !pro_email || !phone || !message) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields: job_public_id, business_name, pro_email, phone, message",
        }),
      };
    }

    const { data: jobRow, error: jobErr } = await supabase
      .from("homeowners_jobs")
      .select("id, project_title, short_summary, city, state, contact_name, phone, email, full_address, full_description, category, created_at")
      .eq("id", job_id || "")
      .eq("id", job_id || "")
      .maybeSingle();

    let resolvedJob = jobRow;
    let resolvedJobErr = jobErr;

    if ((!resolvedJob || resolvedJobErr) && job_public_id) {
      const retry = await supabase
        .from("homeowners_jobs")
        .select("id, project_title, short_summary, city, state, contact_name, phone, email, full_address, full_description, category, created_at")
        .ilike("id", String(job_public_id).trim());

      if (!resolvedJob && !resolvedJobErr && retry?.data?.length === 1) {
        resolvedJob = retry.data[0];
      }
    }

    if (!resolvedJob) {
      const byFields = await supabase
        .from("homeowners_jobs")
        .select("id, project_title, short_summary, city, state, contact_name, phone, email, full_address, full_description, category, created_at")
        .or(`project_title.eq.${String(job_public_id).trim()},short_summary.eq.${String(job_public_id).trim()}`);

      if (byFields?.data?.length === 1) {
        resolvedJob = byFields.data[0];
      }
    }

    if (resolvedJobErr && !resolvedJob) {
      console.error("Error fetching homeowners_jobs:", resolvedJobErr);
    }

    if (!resolvedJob) {
      const byId = await supabase
        .from("homeowners_jobs")
        .select("id, project_title, short_summary, city, state, contact_name, phone, email, full_address, full_description, category, created_at")
        .eq("id", String(job_id || "").trim())
        .maybeSingle();

      if (byId.data) resolvedJob = byId.data;
    }

    if (!resolvedJob) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Job not found in homeowners_jobs",
        }),
      };
    }

    const homeownerEmail = resolvedJob.email || null;
    const homeownerName = resolvedJob.contact_name || "Homeowner";
    const jobTitle =
      resolvedJob.project_title ||
      resolvedJob.category ||
      "your project";

    const insertPayload = {
      job_id: resolvedJob.id,
      job_public_id: job_public_id ? String(job_public_id).trim() : null,
      business_name: String(business_name).trim(),
      pro_email: String(pro_email).trim(),
      phone: String(phone).trim(),
      message: String(message).trim(),
      status: "pending",
    };

    const { data: insertedRequest, error: insErr } = await supabase
      .from("connection_requests")
      .insert(insertPayload)
      .select("id, job_id, job_public_id, business_name, pro_email, phone, message, status, created_at")
      .maybeSingle();

    if (insErr) {
      console.error("Insert connection_requests error:", insErr);
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

        const locationText = [resolvedJob.city, resolvedJob.state].filter(Boolean).join(", ");

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
              <li><strong>Email:</strong> ${insertPayload.pro_email}</li>
              <li><strong>Phone:</strong> ${insertPayload.phone}</li>
              ${locationText ? `<li><strong>Project location:</strong> ${locationText}</li>` : ""}
            </ul>

            <h3 style="margin-top: 1.5rem;">Message</h3>
            <p>${insertPayload.message.replace(/\n/g, "<br/>")}</p>

            <p style="margin-top: 1.5rem;">
              You can reply directly to this email to continue the conversation with the builder.
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
