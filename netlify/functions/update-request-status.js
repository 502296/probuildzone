// netlify/functions/update-request-status.js

const { createClient } = require("@supabase/supabase-js");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body),
  };
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function buildClient() {
  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function normalize(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    return json(500, {
      ok: false,
      error: "Missing Supabase env vars",
    });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, {
      ok: false,
      error: "Invalid JSON body",
    });
  }

  const requestId = normalize(payload.request_id);
  const nextStatus = normalize(payload.status).toLowerCase();

  if (!requestId) {
    return json(400, {
      ok: false,
      error: "Missing request_id",
    });
  }

  if (!["approved", "declined"].includes(nextStatus)) {
    return json(400, {
      ok: false,
      error: "Invalid status. Use approved or declined.",
    });
  }

  try {
    const supabase = buildClient();

    if (!supabase) {
      return json(500, {
        ok: false,
        error: "Failed to initialize Supabase client",
      });
    }

    // 1) Load existing connection request
    const { data: existingRequest, error: existingError } = await supabase
      .from("connection_requests")
      .select("id, job_id, business_name, pro_email, phone, message, status, created_at")
      .eq("id", requestId)
      .maybeSingle();

    if (existingError) {
      console.error("update-request-status existing request error:", existingError);
      return json(500, {
        ok: false,
        error: existingError.message || "Failed to load request",
      });
    }

    if (!existingRequest) {
      return json(404, {
        ok: false,
        error: "Request not found",
      });
    }

    // 2) Update request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from("connection_requests")
      .update({ status: nextStatus })
      .eq("id", requestId)
      .select("id, job_id, business_name, pro_email, phone, message, status, created_at")
      .maybeSingle();

    if (updateError) {
      console.error("update-request-status update error:", updateError);
      return json(500, {
        ok: false,
        error: updateError.message || "Failed to update request status",
      });
    }

    if (!updatedRequest) {
      return json(404, {
        ok: false,
        error: "Request not found after update",
      });
    }

    // 3) Load related homeowner project
    let jobRow = null;

    if (updatedRequest.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from("homeowner_jobs")
        .select("id, project_title, short_summary, full_description, category, city, state, contact_name, email, phone, full_address, created_at")
        .eq("id", updatedRequest.job_id)
        .maybeSingle();

      if (jobError) {
        console.error("update-request-status job lookup error:", jobError);
      } else {
        jobRow = jobData || null;
      }
    }

    let emailSent = false;

    // 4) If approved, send email to builder with homeowner contact info
    if (nextStatus === "approved" && updatedRequest.pro_email && RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(RESEND_API_KEY);

        const jobTitle =
          (jobRow && (jobRow.project_title || jobRow.category)) ||
          "your project";

        const homeownerName =
          (jobRow && jobRow.contact_name) ||
          "Homeowner";

        const homeownerEmail =
          (jobRow && jobRow.email) ||
          null;

        const homeownerPhone =
          (jobRow && jobRow.phone) ||
          null;

        const locationText = jobRow
          ? [jobRow.city, jobRow.state].filter(Boolean).join(", ")
          : "";

        const safeMessage = updatedRequest.message
          ? escapeHtml(updatedRequest.message).replace(/\n/g, "<br/>")
          : "";

        const subject = `Your ProBuildZone request was approved for "${jobTitle}"`;

        const html = `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 0.5rem;">Your request was approved on ProBuildZone</h2>

            <p>Hi ${escapeHtml(updatedRequest.business_name || "Builder")},</p>

            <p>
              Good news. A homeowner approved your connection request for:
              <strong>${escapeHtml(jobTitle)}</strong>.
            </p>

            <h3 style="margin-top: 1.5rem;">Project details</h3>
            <ul>
              <li><strong>Project:</strong> ${escapeHtml(jobTitle)}</li>
              ${locationText ? `<li><strong>Location:</strong> ${escapeHtml(locationText)}</li>` : ""}
            </ul>

            <h3 style="margin-top: 1.5rem;">Homeowner contact</h3>
            <ul>
              <li><strong>Name:</strong> ${escapeHtml(homeownerName)}</li>
              ${homeownerEmail ? `<li><strong>Email:</strong> ${escapeHtml(homeownerEmail)}</li>` : ""}
              ${homeownerPhone ? `<li><strong>Phone:</strong> ${escapeHtml(homeownerPhone)}</li>` : ""}
            </ul>

            ${
              safeMessage
                ? `
            <h3 style="margin-top: 1.5rem;">Your original message</h3>
            <p>${safeMessage}</p>
            `
                : ""
            }

            <p style="margin-top: 1.5rem;">
              <strong>Next step:</strong> you may now contact the homeowner professionally to discuss the project,
              timing, visit details, pricing, and next steps.
            </p>

            <p style="font-size: 0.875rem; color: #6B7280; margin-top: 1.5rem;">
              ProBuildZone connects homeowners with local builders.
              Final agreements, pricing, and project terms are handled directly between both sides.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: "ProBuildZone <onboarding@resend.dev>",
          to: updatedRequest.pro_email,
          subject,
          html,
          reply_to: homeownerEmail || undefined,
        });

        emailSent = true;
      } catch (emailErr) {
        console.error("update-request-status approval email error:", emailErr);
        // Do not fail the status update if email sending fails
      }
    }

    return json(200, {
      ok: true,
      request: updatedRequest,
      project: jobRow
        ? {
            id: jobRow.id || null,
            title: jobRow.project_title || jobRow.category || "Untitled project",
            category: jobRow.category || null,
            city: jobRow.city || null,
            state: jobRow.state || null,
          }
        : null,
      approved_builder:
        nextStatus === "approved"
          ? {
              request_id: updatedRequest.id || null,
              business_name: updatedRequest.business_name || "Builder",
              pro_email: updatedRequest.pro_email || null,
              phone: updatedRequest.phone || null,
              status: updatedRequest.status || "approved",
            }
          : null,
      email_sent: emailSent,
    });
  } catch (err) {
    console.error("update-request-status unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
