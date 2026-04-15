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

  if (!["accepted", "declined"].includes(nextStatus)) {
    return json(400, {
      ok: false,
      error: "Invalid status. Use accepted or declined.",
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

    // 1) Load existing request first
    const { data: existingRequest, error: existingError } = await supabase
      .from("pro_offers")
      .select("id, job_id, business_name, pro_email, phone, message, amount, status, created_at")
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
      .from("pro_offers")
      .update({ status: nextStatus })
      .eq("id", requestId)
      .select("id, job_id, business_name, pro_email, phone, message, amount, status, created_at")
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

    // 3) Load related homeowner job for richer UI response
    let jobRow = null;

    if (updatedRequest.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from("homeowner_jobs")
        .select("id, public_id, title, project_title, category, city, state, name, email, phone")
        .eq("id", updatedRequest.job_id)
        .maybeSingle();

      if (jobError) {
        console.error("update-request-status job lookup error:", jobError);
      } else {
        jobRow = jobData || null;
      }
    }

    let emailSent = false;

    // 4) If accepted, send email to builder
    if (nextStatus === "accepted" && updatedRequest.pro_email && RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(RESEND_API_KEY);

        const jobTitle =
          (jobRow && (jobRow.title || jobRow.project_title || jobRow.category)) ||
          "your project";

        const homeownerName =
          (jobRow && jobRow.name) ||
          "Homeowner";

        const locationText = jobRow
          ? [jobRow.city, jobRow.state].filter(Boolean).join(", ")
          : "";

        const safeAmount =
          updatedRequest.amount !== null && updatedRequest.amount !== undefined
            ? `$${Number(updatedRequest.amount).toFixed(2)}`
            : null;

        const subject = `Your ProBuildZone request was accepted for "${jobTitle}"`;

        const html = `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 0.5rem;">Your request was accepted on ProBuildZone</h2>

            <p>Hi ${updatedRequest.business_name || "Builder"},</p>

            <p>
              Good news. A homeowner accepted your connection request for:
              <strong>${jobTitle}</strong>.
            </p>

            <h3 style="margin-top: 1.5rem;">Project details</h3>
            <ul>
              <li><strong>Project:</strong> ${jobTitle}</li>
              ${
                jobRow && jobRow.public_id
                  ? `<li><strong>Job ID:</strong> ${jobRow.public_id}</li>`
                  : ""
              }
              ${
                locationText
                  ? `<li><strong>Location:</strong> ${locationText}</li>`
                  : ""
              }
              <li><strong>Homeowner:</strong> ${homeownerName}</li>
              ${
                safeAmount
                  ? `<li><strong>Your estimate:</strong> ${safeAmount}</li>`
                  : ""
              }
            </ul>

            ${
              updatedRequest.message
                ? `
            <h3 style="margin-top: 1.5rem;">Your original message</h3>
            <p>${String(updatedRequest.message).replace(/\n/g, "<br/>")}</p>
            `
                : ""
            }

            <p style="margin-top: 1.5rem;">
              <strong>Next step:</strong> you may now follow up professionally and continue discussing project scope,
              timing, visit details, and next steps.
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
        });

        emailSent = true;
      } catch (emailErr) {
        console.error("update-request-status acceptance email error:", emailErr);
        // Do not fail the status update if email sending fails
      }
    }

    return json(200, {
      ok: true,
      request: updatedRequest,
      project: jobRow
        ? {
            id: jobRow.id || null,
            public_id: jobRow.public_id || null,
            title: jobRow.title || jobRow.project_title || jobRow.category || "Untitled job",
            category: jobRow.category || null,
            city: jobRow.city || null,
            state: jobRow.state || null,
          }
        : null,
      approved_builder:
        nextStatus === "accepted"
          ? {
              request_id: updatedRequest.id || null,
              business_name: updatedRequest.business_name || "Builder",
              pro_email: updatedRequest.pro_email || null,
              phone: updatedRequest.phone || null,
              status: updatedRequest.status || "accepted",
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
