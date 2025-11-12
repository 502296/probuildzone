// netlify/functions/get-job.js

const HEADERS = {

  "Content-Type": "application/json",

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Methods": "GET,OPTIONS",

};



exports.handler = async (event) => {

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };

  if (event.httpMethod !== "GET") {

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };

  }



  const id = (event.queryStringParameters?.id || "").trim();

  if (!id) {

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: "Missing id" }) };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: "Missing server env vars" }) };

  }



  try {

    // 1) جلب الطلب

    const jobRes = await fetch(

      `${SUPABASE_URL}/rest/v1/homeowner_jobs?select=*&id=eq.${encodeURIComponent(id)}`,

      {

        headers: {

          "Content-Type": "application/json",

          apikey: SUPABASE_SERVICE_ROLE,

          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,

        },

      }

    );

    const jobRows = await jobRes.json().catch(() => []);

    if (!jobRes.ok) {

      return { statusCode: jobRes.status, headers: HEADERS, body: JSON.stringify({ ok: false, error: jobRows?.message || "Failed to fetch job" }) };

    }

    const job = Array.isArray(jobRows) ? jobRows[0] : null;

    if (!job) {

      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok: false, error: "Job not found" }) };

    }



    // 2) جلب العروض (اختياري)

    // توقع جدول باسم pro_offers بأعمدة: id, job_id, pro_name, amount, message, created_at

    const offersRes = await fetch(

      `${SUPABASE_URL}/rest/v1/pro_offers?select=id,pro_name,amount,message,created_at&job_id=eq.${encodeURIComponent(id)}&order=created_at.desc`,

      {

        headers: {

          "Content-Type": "application/json",

          apikey: SUPABASE_SERVICE_ROLE,

          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,

        },

      }

    );

    const offers = await offersRes.json().catch(() => []);

    // حتى لو الجدول غير موجود حالياً، لا نفشل الصفحة:

    const safeOffers = Array.isArray(offers) ? offers : [];



    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, job, offers: safeOffers }) };

  } catch (err) {

    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message || "Server error" }) };

  }

};
