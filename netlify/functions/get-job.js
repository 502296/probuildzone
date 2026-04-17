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

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isPublicId(value) {
  return /^PBZ-\d+$/i.test(value);
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

    const rawId = normalize(
      params.id ||
      params.jobId ||
      params.job ||
      ""
    );

    const rawPublicId = normalize(
      params.public_id ||
      params.publicId ||
      ""
    );

    let id = rawId;
    let publicId = rawPublicId;

    if (!id && !publicId) {
      return json(400, {
        ok: false,
        error: "Missing job identifier",
      });
    }

    if (!publicId && isPublicId(id)) {
      publicId = id;
      id = "";
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

    if (publicId) {
      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("public_id", publicId)
        .maybeSingle();

      if (result.error) {
        error = result.error;
      } else if (result.data) {
        data = result.data;
      }
    }

    if (!data && id) {
      let queryValue = id;

      if (/^\d+$/.test(id)) {
        queryValue = Number(id);
      }

      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("id", queryValue)
        .maybeSingle();

      if (result.error) {
        error = result.error;
      } else if (result.data) {
        data = result.data;
      }
    }

    if (!data && rawId && isUuidLike(rawId) && rawId !== id) {
      const result = await supabase
        .from("homeowner_jobs")
        .select(selectFields)
        .eq("id", rawId)
        .maybeSingle();

      if (result.error) {
        error = result.error;
      } else if (result.data) {
        data = result.data;
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
