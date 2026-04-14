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

function json(statusCode, body) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body),
  };
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

  try {
    const supabase = buildClient();

    if (!supabase) {
      return json(500, {
        ok: false,
        error: "Failed to initialize Supabase client",
      });
    }

    const params = event.queryStringParameters || {};
    const email = String(params.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return json(400, {
        ok: false,
        error: "Missing pro email",
      });
    }

    // Step 1: Load this Pro's connection requests
    const { data: requestsRaw, error: reqError } = await supabase
      .from("pro_offers")
      .select(
        "id, job_id, business_name, pro_email, phone, amount, message, status, created_at"
      )
      .ilike("pro_email", email)
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("get-pro-requests query error:", reqError);
      return json(500, {
        ok: false,
        error: reqError.message || "Failed to load pro requests",
      });
    }

    const requests = Array.isArray(requestsRaw) ? requestsRaw : [];

    if (!requests.length) {
      return json(200, {
        ok: true,
        requests: [],
      });
    }

    // Step 2: Collect related homeowner job IDs
    const jobIds = [...new Set(requests.map((item) => item.job_id).filter(Boolean))];

    let jobsMap = new Map();

    if (jobIds.length) {
      const { data: jobsRaw, error: jobsError } = await supabase
        .from("homeowner_jobs")
        .select("id, public_id, title, project_title, category, city, state")
        .in("id", jobIds);

      if (jobsError) {
        console.error("get-pro-requests jobs lookup error:", jobsError);
        return json(500, {
          ok: false,
          error: jobsError.message || "Failed to load related jobs",
        });
      }

      jobsMap = new Map((jobsRaw || []).map((job) => [job.id, job]));
    }

    // Step 3: Normalize the response for dashboard use
    const normalized = requests.map((item) => {
      const job = jobsMap.get(item.job_id) || {};

      return {
        id: item.id || null,
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

    return json(200, {
      ok: true,
      requests: normalized,
    });
  } catch (err) {
    console.error("get-pro-requests unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
