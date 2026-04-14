// netlify/functions/get-job.js

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
    const rawId =
      params.id ||
      params.jobId ||
      params.job ||
      params.code ||
      params.public_id ||
      "";

    const identifier = String(rawId).trim();

    if (!identifier) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing job identifier",
        }),
      };
    }

    let query = supabase
      .from("homeowner_jobs")
      .select(`
        id,
        public_id,
        category,
        title,
        project_title,
        summary,
        short_summary,
        description,
        full_description,
        details,
        city,
        state,
        zip,
        address,
        full_address,
        created_at
      `);

    // يدعم public_id مثل PBZ-12345
    // ويدعم id الرقمي أيضاً إذا احتجناه لاحقاً
    if (/^\d+$/.test(identifier)) {
      query = query.eq("id", Number(identifier));
    } else {
      query = query.eq("public_id", identifier);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("get-job error:", error);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: error.message || "Failed to load job",
        }),
      };
    }

    if (!data) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Job not found",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        job: data,
      }),
    };
  } catch (err) {
    console.error("get-job unexpected error:", err);
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
