// netlify/functions/accept-offer.js

const { createClient } = require("@supabase/supabase-js");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: "Server missing Supabase env vars",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
    };
  }

  const offerId = body.offer_id ? String(body.offer_id).trim() : "";
  if (!offerId) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Missing offer_id" }),
    };
  }

  try {
    // 1) Mark selected offer as accepted
    const { data: offer, error: offerError } = await supabase
      .from("pro_offers")
      .update({ status: "accepted" })
      .eq("id", offerId)
      .select("*")
      .maybeSingle();

    if (offerError) {
      console.error("accept-offer: update pro_offers error", offerError);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: offerError.message || "Failed to update offer",
        }),
      };
    }

    if (!offer) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Offer not found",
        }),
      };
    }

    // 2) Mark all other offers on same job as not_selected
    if (offer.job_id) {
      const { error: othersError } = await supabase
        .from("pro_offers")
        .update({ status: "not_selected" })
        .eq("job_id", offer.job_id)
        .neq("id", offerId);

      if (othersError) {
        console.error("accept-offer: update other offers error", othersError);
      }
    }

    // 3) Load related homeowner job
    let job = null;
    if (offer.job_id) {
      const { data: jobRow, error: jobError } = await supabase
        .from("homeowner_jobs")
        .select(
          "id, public_id, title, project_title, summary, short_summary, name, homeowner_name, email, homeowner_email, city, state"
        )
        .eq("id", offer.job_id)
        .maybeSingle();

      if (jobError) {
        console.error("accept-offer: load job error", jobError);
      } else {
        job = jobRow;
      }
    }

    // 4) Resolve normalized values
    const proEmail = offer.pro_email || offer.email || null;
    const proName = offer.pro_name || offer.business_name || "Pro";
    const homeownerName = job?.homeowner_name || job?.name || "the homeowner";
    const homeownerEmail = job?.homeowner_email || job?.email || null;
    const jobPublicId = job?.public_id || "your project on ProBuildZone";
    const jobTitle = job?.title || job?.project_title || "your project";
    const locationText =
      job?.city && job?.state ? `${job.city}, ${job.state}` : "";

    // 5) Email the pro if possible
    if (RESEND_API_KEY && proEmail) {
      const subject = `✅ Your offer was accepted for job ${jobPublicId}`;

      const safeAmount =
        offer.amount !== null && offer.amount !== undefined
          ? `$${Number(offer.amount).toFixed(2)}`
          : "Not specified";

      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0F2A43;">
          <h2>Good news from ProBuildZone 🎉</h2>

          <p>Hi ${proName},</p>

          <p>
            Your offer for <strong>${jobPublicId}</strong>
            ${locationText ? ` in <strong>${locationText}</strong>` : ""}
            has been <strong>accepted</strong> by ${homeownerName}.
          </p>

          <p>
            <strong>Project:</strong> ${jobTitle}
          </p>

          <p>
            <strong>Offer details:</strong><br/>
            Business: ${offer.business_name || "-"}<br/>
            Amount: ${safeAmount}<br/>
            Phone: ${offer.phone || "-"}<br/>
            Message you sent: ${offer.message || "-"}
          </p>

          <p>
            Please contact the homeowner directly at:
            <strong>${homeownerEmail || "their preferred contact method"}</strong>
            to schedule the work and finalize details.
          </p>

          <hr/>

          <p style="font-size: 13px; color:#6b7a8c;">
            This email was sent automatically by ProBuildZone when the homeowner accepted your offer.
          </p>
        </div>
      `;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ProBuildZone <no-reply@probuildzone.com>",
            to: [proEmail],
            subject,
            html,
          }),
        });
      } catch (emailErr) {
        console.error("accept-offer: email send error", emailErr);
        // Do not fail the main operation if email fails
      }
    } else {
      console.log(
        "accept-offer: skip email, missing RESEND_API_KEY or pro email"
      );
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        accepted_offer: {
          id: offer.id,
          job_id: offer.job_id,
          business_name: offer.business_name || null,
          pro_name: proName,
          pro_email: proEmail,
          phone: offer.phone || null,
          amount: offer.amount ?? null,
          message: offer.message || "",
          status: "accepted",
        },
      }),
    };
  } catch (err) {
    console.error("accept-offer: unexpected error", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: err.message || "Unexpected error",
      }),
    };
  }
};
