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

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Missing Supabase env vars");
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

    const jobPublicId = normalize(payload.job_public_id);
    const businessName = normalize(payload.business_name);
    const phone = normalize(payload.phone);
    const message = normalize(payload.message);
    const proEmail = normalize(payload.pro_email);
    const rawAmount = payload.amount;

    if (!jobPublicId || !businessName || !phone || !proEmail || !message) {
      return json(400, {
        ok: false,
        error: "Missing required fields: job_public_id, business_name, phone, pro_email, message",
      });
    }

    let parsedAmount = null;
    if (rawAmount !== undefined && rawAmount !== null && normalize(rawAmount) !== "") {
      const numeric = Number(rawAmount);

      if (!Number.isFinite(numeric) || numeric < 0) {
        return json(400, {
          ok: false,
          error: "Invalid amount",
        });
      }

      parsedAmount = numeric;
    }

    // 1) Fetch the homeowner job by public_id
    // Only select confirmed columns that we know exist.
    const { data: jobRow, error: jobErr } = await supabase
      .from("homeowner_jobs")
      .select("id, public_id, title, project_title, category, city, state, name, email")
      .eq("public_id", jobPublicId)
      .maybeSingle();

    if (jobErr) {
      console.error("Error fetching job:", jobErr);
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

    const homeownerEmail = normalize(jobRow.email);
    const homeownerName = normalize(jobRow.name) || "Homeowner";
    const jobTitle =
      normalize(jobRow.title) ||
      normalize(jobRow.project_title) ||
      normalize(jobRow.category) ||
      "your project";

    const locationText = [jobRow.city, jobRow.state].filter(Boolean).join(", ");

    // 2) Insert into pro_offers table using only confirmed columns
    const insertPayload = {
      job_id: jobRow.id,
      business_name: businessName,
      message,
      amount: parsedAmount,
      phone,
      status: "pending",
      pro_email: proEmail,
    };

    const { data: insertedOffer, error: insErr } = await supabase
      .from("pro_offers")
      .insert(insertPayload)
      .select("id, job_id, business_name, amount, phone, status, pro_email, created_at")
      .maybeSingle();

    if (insErr) {
      console.error("Insert pro_offers error:", insErr);
      return json(500, {
        ok: false,
        error: insErr.message || "Failed to save message",
      });
    }

    // 3) Send email to homeowner if available
    if (homeownerEmail && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY);

        const subject = `New message from ${businessName} for "${jobTitle}"`;

        const html = `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 0.5rem;">You received a new message on ProBuildZone</h2>

            <p>Hi ${homeownerName},</p>

            <p>
              <strong>${businessName}</strong> is interested in your project:
              <strong>${jobTitle}</strong>.
            </p>

            <h3 style="margin-top: 1.5rem;">Builder details</h3>
            <ul>
              <li><strong>Business / Pro:</strong> ${businessName}</li>
              <li><strong>Phone:</strong> ${phone}</li>
              <li><strong>Email:</strong> ${proEmail}</li>
              ${locationText ? `<li><strong>Project location:</strong> ${locationText}</li>` : ""}
              ${parsedAmount !== null ? `<li><strong>Estimated price:</strong> $${parsedAmount.toFixed(2)}</li>` : ""}
              <li><strong>Project ID:</strong> ${jobPublicId}</li>
            </ul>

            <h3 style="margin-top: 1.5rem;">Message from the Builder</h3>
            <p>${message.replace(/\n/g, "<br/>")}</p>

            <p style="margin-top: 1.5rem;">
              <strong>Next step:</strong> If this builder looks like a good fit,
              you can contact <strong>${businessName}</strong> directly
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
          reply_to: proEmail,
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
    return json(200, {
      ok: true,
      request: insertedOffer
        ? {
            ...insertedOffer,
            job_public_id: jobPublicId,
            project_title: jobTitle,
            homeowner_email: homeownerEmail || null,
          }
        : null,
    });
  } catch (e) {
    console.error("post-offer error:", e);
    return json(500, {
      ok: false,
      error: e.message || "Server error",
    });
  }
};
