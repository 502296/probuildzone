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

    const rawId = String(
      params.id ||
      params.jobId ||
      params.job ||
      params.code ||
      ""
    ).trim();

    const rawPublicId = String(
      params.public_id || ""
    ).trim();

    const identifier = rawId || rawPublicId;

    if (!identifier) {
      return json(400, {
        ok: false,
        error: "Missing job identifier",
      });
    }

    const selectFields = `
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
    `;

    let data = null;
    let error = null;

    if (rawPublicId) {
      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("public_id", rawPublicId)
        .maybeSingle();

      data = result.data;
      error = result.error;
    }

    if (!data && rawId) {
      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("id", rawId)
        .maybeSingle();

      if (!result.error && result.data) {
        data = result.data;
        error = null;
      } else if (result.error) {
        error = result.error;
      }
    }

    if (!data && /^PBZ-/i.test(identifier)) {
      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("public_id", identifier)
        .maybeSingle();

      if (!result.error && result.data) {
        data = result.data;
        error = null;
      } else if (result.error) {
        error = result.error;
      }
    }

    if (!data && /^\d+$/.test(identifier)) {
      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("id", Number(identifier))
        .maybeSingle();

      if (!result.error && result.data) {
        data = result.data;
        error = null;
      } else if (result.error) {
        error = result.error;
      }
    }

    if (error) {
      console.error("get-job error:", error);
      return json(500, {
        ok: false,
        error: error.message || "Failed to load job",
      });
    }

    if (!data) {
      return json(404, {
        ok: false,
        error: "Job not found",
      });
    }

    return json(200, {
      ok: true,
      job: data,
    });
  } catch (err) {
    console.error("get-job unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
