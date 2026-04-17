// netlify/functions/get-jobs.js

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

function json(statusCode, body) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body),
  };
}

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

  const supabase = buildClient();

  if (!supabase) {
    return json(500, {
      ok: false,
      error: "Failed to initialize Supabase client",
    });
  }

  try {
    const params = event.queryStringParameters || {};

    const category = normalize(params.category);
    const city = normalize(params.city);
    const state = normalize(params.state);

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
        city,
        state,
        zip,
        address,
        full_address,
        created_at,
        name,
        email,
        phone
      `)
      .order("created_at", { ascending: false })
      .limit(30);

    if (category) {
      query = query.eq("category", category);
    }

    if (city) {
      query = query.ilike("city", city);
    }

    if (state) {
      query = query.ilike("state", state);
    }

    const { data, error } = await query;

    if (error) {
      console.error("get-jobs error:", error);
      return json(500, {
        ok: false,
        error: error.message || "Failed to load jobs",
      });
    }

    return json(200, {
      ok: true,
      jobs: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    console.error("get-jobs unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
