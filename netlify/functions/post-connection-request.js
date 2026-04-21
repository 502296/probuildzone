// netlify/functions/post-connection-request.js

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

function buildDashboardUrl(siteUrl) {
  const base = normalize(siteUrl);
  if (!base) return "https://probuildzone.com/homeowner-dashboard.html";

  try {
    const url = new URL(base);
    return `${url.origin}/homeowner-dashboard.html`;
  } catch {
    return "https://probuildzone.com/homeowner-dashboard.html";
  }
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
      error: "Method Not Allowed",
    });
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
    const PROBUILDZONE_FROM_EMAIL =
      process.env.PROBUILDZONE_FROM_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      "ProBuildZone <notifications@probuildzone.com>";

    const SITE_URL = process.env.SITE_URL || "https://probuildzone.com";

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return json(500, {
        ok: false,
        error: "Server not configured (Supabase)",
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, {
        ok: false,
        error: "Invalid JSON body",
      });
    }

    const {
      job_id,
      business_name,
      pro_email,
      phone,
      message,
    } = payload;

    if (!job_id || !business_name || !pro_email || !phone || !message) {
      return json(400, {
        ok: false,
        error: "Missing required fields: job_id, business_name, pro_email, phone, message",
      });
    }

    const normalizedJobId = normalize(job_id);
    const normalizedBusinessName = normalize(business_name);
    const normalizedProEmail = normalize(pro_email).toLowerCase();
    const normalizedPhone = normalize(phone);
    const normalizedMessage = normalize(message);

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
      return json(500, {
        ok: false,
        error: jobErr.message || "Failed to load job",
      });
    }

    if (!jobRow) {
      return json(404, {
        ok: false,
        error: "Job not found",
      });
    }

    const homeownerEmail = normalize(jobRow.email) || null;
    const homeownerName =
      normalize(jobRow.contact_name) ||
      normalize(jobRow.name) ||
      "Homeowner";

    const jobTitle =
      normalize(jobRow.project_title) ||
      normalize(jobRow.title) ||
      normalize(jobRow.category) ||
      "your project";

    const projectSummary = shortText(
      jobRow.short_summary ||
      jobRow.summary ||
      jobRow.full_description ||
      jobRow.description ||
      "",
      400
    );

    const locationText = [jobRow.city, jobRow.state].filter(Boolean).join(", ");
    const dashboardUrl = buildDashboardUrl(SITE_URL);

    // IMPORTANT:
    // pro_offers uses "email", not "pro_email"
    const insertPayload = {
      job_id: jobRow.id,
      business_name: normalizedBusinessName,
      email: normalizedProEmail,
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
        email,
        phone,
        message,
        status,
        created_at
      `)
      .maybeSingle();

    if (insErr) {
      console.error("Insert pro_offers error:", insErr);
      return json(500, {
        ok: false,
        error: insErr.message || "Failed to save connection request",
      });
    }

    let emailSent = false;
    let emailError = null;

    if (homeownerEmail && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);

        const safeMessage = escapeHtml(normalizedMessage).replace(/\n/g, "<br/>");
        const subject = `New builder request for "${jobTitle}"`;

        const html = `
          <div style="font-family: Inter, Arial, sans-serif; line-height: 1.65; color: #0f172a; background: #f8fafc; padding: 24px;">
            <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
              
              <div style="padding: 24px 24px 10px 24px; background: #0F2A43; color: #ffffff;">
                <div style="font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .85; font-weight: 700;">
                  ProBuildZone
                </div>
                <h1 style="margin: 10px 0 0 0; font-size: 28px; line-height: 1.2; color: #ffffff;">
                  A builder is interested in your project
                </h1>
              </div>

              <div style="padding: 24px;">
                <p style="margin-top: 0;">Hi ${escapeHtml(homeownerName)},</p>

                <p>
                  <strong>${escapeHtml(normalizedBusinessName)}</strong> sent a new connection request for your project
                  <strong>${escapeHtml(jobTitle)}</strong>.
                </p>

                <div style="margin: 22px 0; padding: 18px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px;">
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 700; margin-bottom: 10px;">
                    Project
                  </div>
                  <div style="margin-bottom: 8px;"><strong>Title:</strong> ${escapeHtml(jobTitle)}</div>
                  ${jobRow.public_id ? `<div style="margin-bottom: 8px;"><strong>Project ID:</strong> ${escapeHtml(jobRow.public_id)}</div>` : ""}
                  ${locationText ? `<div style="margin-bottom: 8px;"><strong>Location:</strong> ${escapeHtml(locationText)}</div>` : ""}
                  ${projectSummary ? `<div><strong>Summary:</strong> ${escapeHtml(projectSummary)}</div>` : ""}
                </div>

                <div style="margin: 22px 0; padding: 18px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 14px;">
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 700; margin-bottom: 10px;">
                    Builder Details
                  </div>
                  <div style="margin-bottom: 8px;"><strong>Business:</strong> ${escapeHtml(normalizedBusinessName)}</div>
                  <div style="margin-bottom: 8px;"><strong>Email:</strong> ${escapeHtml(normalizedProEmail)}</div>
                  <div><strong>Phone:</strong> ${escapeHtml(normalizedPhone)}</div>
                </div>

                <div style="margin: 22px 0;">
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 700; margin-bottom: 10px;">
                    Message
                  </div>
                  <div style="padding: 16px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 14px;">
                    ${safeMessage}
                  </div>
                </div>

                <div style="margin: 28px 0 18px 0;">
                  <a href="${dashboardUrl}" style="display: inline-block; background: #D4AF37; color: #111827; text-decoration: none; font-weight: 800; padding: 14px 18px; border-radius: 12px;">
                    Review Request in Dashboard
                  </a>
                </div>

                <p style="margin-bottom: 0; color: #475569;">
                  You can review, approve, or decline this request inside your Homeowner Dashboard.
                </p>
              </div>
            </div>
          </div>
        `;

        const resendResult = await resend.emails.send({
          from: PROBUILDZONE_FROM_EMAIL,
          to: homeownerEmail,
          subject,
          html,
          reply_to: normalizedProEmail,
        });

        if (resendResult?.error) {
          throw new Error(
            resendResult.error.message || "Failed to send homeowner email"
          );
        }

        emailSent = true;
      } catch (emailErr) {
        emailError = emailErr?.message || "Failed to send homeowner email";
        console.error("Error sending homeowner email:", emailErr);
      }
    } else if (!homeownerEmail) {
      emailError = "Missing homeowner email";
      console.error("Homeowner email missing for job:", jobRow.id);
    } else if (!RESEND_API_KEY) {
      emailError = "Missing RESEND_API_KEY";
      console.error("Missing RESEND_API_KEY");
    }

    return json(200, {
      ok: true,
      request: insertedRequest || null,
      email_sent: emailSent,
      email_error: emailError,
    });
  } catch (e) {
    console.error("post-connection-request error:", e);
    return json(500, {
      ok: false,
      error: e.message || "Server error",
    });
  }
};
