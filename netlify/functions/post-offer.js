// netlify/functions/post-offer.js

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
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const { Resend } = await import("resend");

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    const payload = JSON.parse(event.body || "{}");

    const jobPublicId = normalize(payload.job_public_id);
    const businessName = normalize(payload.business_name);
    const phone = normalize(payload.phone);
    const message = normalize(payload.message);
    const email = normalize(payload.pro_email); // 👈 نستخدمه لكن نحفظه باسم email

    if (!jobPublicId || !businessName || !phone || !email || !message) {
      return json(400, {
        ok: false,
        error: "Missing required fields",
      });
    }

    // جلب المشروع
    const { data: jobRow, error: jobErr } = await supabase
      .from("homeowner_jobs")
      .select("id, public_id, title, project_title, category, city, state, name, email")
      .eq("public_id", jobPublicId)
      .single();

    if (jobErr || !jobRow) {
      return json(404, { ok: false, error: "Job not found" });
    }

    // 💥 هنا التعديل المهم
    const insertPayload = {
  job_id: jobRow.id,
  job_public_id: jobRow.public_id, // 🔥 هذا هو المفتاح

  business_name: businessName,
  message,
  phone,
  email,

  status: "pending",
};
    const { data: inserted, error: insertErr } = await supabase
      .from("pro_offers")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      console.error(insertErr);
      return json(500, { ok: false, error: insertErr.message });
    }

    // إرسال إيميل
    if (jobRow.email && RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);

      await resend.emails.send({
        from: "ProBuildZone <onboarding@resend.dev>",
        to: jobRow.email,
        subject: `New message from ${businessName}`,
        html: `
          <h2>New Request</h2>
          <p><strong>${businessName}</strong> sent you a message:</p>
          <p>${message}</p>
          <p>Phone: ${phone}</p>
          <p>Email: ${email}</p>
        `,
      });
    }

    return json(200, { ok: true, data: inserted });
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, error: err.message });
  }
};
