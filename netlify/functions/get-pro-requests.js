// netlify/functions/get-pro-requests.js

const { createClient } = require("@supabase/supabase-js");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_ANON_KEY;

function buildClient() {
  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: "Method not allowed",
      }),
    };
  }

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: "Missing Supabase env vars",
      }),
    };
  }

  try {
    const supabase = buildClient();

    const params = event.queryStringParameters || {};
    const email = String(params.email || "").trim().toLowerCase();

    if (!email) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing pro email",
        }),
      };
    }

    const { data: requestsRaw, error: reqError } = await supabase
      .from("pro_offers")
      .select("id, job_id, business_name, pro_email, phone, amount, message, status, created_at")
      .ilike("pro_email", email)
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("get-pro-requests query error:", reqError);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: reqError.message || "Failed to load pro requests",
        }),
      };
    }

    const requests = Array.isArray(requestsRaw) ? requestsRaw : [];
    const jobIds = [...new Set(requests.map(item => item.job_id).filter(Boolean))];

    let jobsMap = new Map();

    if (jobIds.length) {
      const { data: jobsRaw, error: jobsError } = await supabase
        .from("homeowner_jobs")
        .select("id, public_id, title, project_title, category, city, state")
        .in("id", jobIds);

      if (jobsError) {
        console.error("get-pro-requests jobs lookup error:", jobsError);
        return {
          statusCode: 500,
          headers: HEADERS,
          body: JSON.stringify({
            ok: false,
            error: jobsError.message || "Failed to load related jobs",
          }),
        };
      }

      jobsMap = new Map((jobsRaw || []).map(job => [job.id, job]));
    }

    const normalized = requests.map((item) => {
      const job = jobsMap.get(item.job_id) || {};

      return {
        id: item.id,
        job_id: item.job_id || null,
        job_public_id: job.public_id || null,
        job_title: job.title || job.project_title || "Untitled job",
        category: job.category || null,
        city: job.city || null,
        state: job.state || null,
        business_name: item.business_name || "Pro",
        pro_email: item.pro_email || null,
        phone: item.phone || null,
        amount: item.amount ?? null,
        message: item.message || "",
        status: item.status || "pending",
        created_at: item.created_at || null,
      };
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        requests: normalized,
      }),
    };
  } catch (err) {
    console.error("get-pro-requests unexpected error:", err);
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
