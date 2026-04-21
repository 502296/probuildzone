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
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "ProBuildZone <onboarding@resend.dev>";

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

function shortText(value, max = 500) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trim() + "..." : text;
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

    const { data: existingRequest, error: existingError } = await supabase
      .from("pro_offers")
      .select(`
        id,
        job_id,
        business_name,
        email,
        phone,
        message,
        status,
        created_at
      `)
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

    const { data: updatedRequest, error: updateError } = await supabase
      .from("pro_offers")
      .update({ status: nextStatus })
      .eq("id", requestId)
      .select(`
        id,
        job_id,
        business_name,
        email,
        phone,
        message,
        status,
        created_at
      `)
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

    let jobRow = null;

    if (updatedRequest.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from("homeowner_jobs")
        .select(`
          id,
          public_id,
          project_title,
          title,
          short_summary,
          summary,
          full_description,
          description,
          category,
          city,
          state,
          contact_name,
          name,
          email,
          phone,
          full_address,
          address,
          created_at
        `)
        .eq("id", updatedRequest.job_id)
        .maybeSingle();

      if (jobError) {
        console.error("update-request-status job lookup error:", jobError);
      } else {
        jobRow = jobData || null;
      }
    }

    let emailSent = false;
    let emailError = null;

    if (nextStatus === "approved") {
      if (!updatedRequest.email) {
        emailError = "Missing builder email";
        console.error("update-request-status email skipped: missing builder email");
      } else if (!RESEND_API_KEY) {
        emailError = "Missing RESEND_API_KEY";
        console.error("update-request-status email skipped: missing RESEND_API_KEY");
      } else {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(RESEND_API_KEY);

          const jobTitle =
            (jobRow && (jobRow.project_title || jobRow.title || jobRow.category)) ||
            "your project";

          const homeownerName =
            (jobRow && (jobRow.contact_name || jobRow.name)) ||
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

          const projectSummary = shortText(
            (jobRow && (
              jobRow.short_summary ||
              jobRow.summary ||
              jobRow.full_description ||
              jobRow.description
            )) || "",
            400
          );

          const safeMessage = updatedRequest.message
            ? escapeHtml(updatedRequest.message).replace(/\n/g, "<br/>")
            : "";

          const subject = `Your ProBuildZone request was approved for "${jobTitle}"`;

          const html = `
            <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
              <h2 style="margin-bottom: 10px;">Your request was approved on ProBuildZone</h2>

              <p>Hi ${escapeHtml(updatedRequest.business_name || "Builder")},</p>

              <p>
                A homeowner approved your connection request for
                <strong>${escapeHtml(jobTitle)}</strong>.
              </p>

              <h3 style="margin-top: 22px; margin-bottom: 10px;">Project</h3>
              <ul style="padding-left: 18px;">
                <li><strong>Title:</strong> ${escapeHtml(jobTitle)}</li>
                ${jobRow && jobRow.public_id ? `<li><strong>Project ID:</strong> ${escapeHtml(jobRow.public_id)}</li>` : ""}
                ${locationText ? `<li><strong>Location:</strong> ${escapeHtml(locationText)}</li>` : ""}
                ${projectSummary ? `<li><strong>Summary:</strong> ${escapeHtml(projectSummary)}</li>` : ""}
              </ul>

              <h3 style="margin-top: 22px; margin-bottom: 10px;">Homeowner Contact</h3>
              <ul style="padding-left: 18px;">
                <li><strong>Name:</strong> ${escapeHtml(homeownerName)}</li>
                ${homeownerEmail ? `<li><strong>Email:</strong> ${escapeHtml(homeownerEmail)}</li>` : ""}
                ${homeownerPhone ? `<li><strong>Phone:</strong> ${escapeHtml(homeownerPhone)}</li>` : ""}
              </ul>

              ${
                safeMessage
                  ? `
                    <h3 style="margin-top: 22px; margin-bottom: 10px;">Your Original Message</h3>
                    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:12px;">
                      ${safeMessage}
                    </div>
                  `
                  : ""
              }

              <p style="margin-top: 22px;">
                You may now contact the homeowner professionally to discuss timeline, pricing, and next steps.
              </p>
            </div>
          `;

          const resendResponse = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: updatedRequest.email,
            subject,
            html,
            reply_to: homeownerEmail || undefined,
          });

          console.log("update-request-status resend success:", resendResponse);
          emailSent = true;
        } catch (emailErr) {
          emailError = emailErr?.message || "Failed to send email";
          console.error("update-request-status approval email error:", emailErr);
        }
      }
    }

    return json(200, {
      ok: true,
      request: updatedRequest,
      project: jobRow
        ? {
            id: jobRow.id || null,
            public_id: jobRow.public_id || null,
            title: jobRow.project_title || jobRow.title || jobRow.category || "Untitled project",
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
              pro_email: updatedRequest.email || null,
              phone: updatedRequest.phone || null,
              status: updatedRequest.status || "approved",
            }
          : null,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (err) {
    console.error("update-request-status unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
