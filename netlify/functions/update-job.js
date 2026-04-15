// netlify/functions/update-job.js

const { createClient } = require("@supabase/supabase-js");

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

  if (event.httpMethod !== "POST") {
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

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, {
      ok: false,
      error: "Invalid JSON body",
    });
  }

  const jobId = normalize(payload.job_id);
  const publicId = normalize(payload.public_id);
  const email = normalize(payload.email).toLowerCase();

  const category = normalize(payload.category) || "General";
  const title = normalize(payload.title);
  const summary = normalize(payload.summary) || null;
  const city = normalize(payload.city) || null;
  const state = normalize(payload.state) || null;
  const name = normalize(payload.name);
  const phone = normalize(payload.phone);
  const address = normalize(payload.address);
  const description = normalize(payload.description);

  if (!email) {
    return json(400, {
      ok: false,
      error: "Missing homeowner email",
    });
  }

  if (!jobId && !publicId) {
    return json(400, {
      ok: false,
      error: "Missing job_id or public_id",
    });
  }

  if (!category || !title || !name || !phone || !address || !description) {
    return json(400, {
      ok: false,
      error: "Missing required fields",
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

    // 1) Find target job and confirm ownership
    let jobQuery = supabase
      .from("homeowner_jobs")
      .select("id, public_id, email")
      .ilike("email", email)
      .limit(1);

    if (jobId) {
      jobQuery = jobQuery.eq("id", jobId);
    } else {
      jobQuery = jobQuery.eq("public_id", publicId);
    }

    const { data: jobRow, error: jobLookupError } = await jobQuery.maybeSingle();

    if (jobLookupError) {
      console.error("update-job lookup error:", jobLookupError);
      return json(500, {
        ok: false,
        error: jobLookupError.message || "Failed to load job",
      });
    }

    if (!jobRow) {
      return json(404, {
        ok: false,
        error: "Job not found or you do not have permission to edit it",
      });
    }

    const updatePayload = {
      category,
      title,
      summary,
      city,
      state,
      name,
      email,
      phone,
      address,
      description,
    };

    const { data: updatedRow, error: updateError } = await supabase
      .from("homeowner_jobs")
      .update(updatePayload)
      .eq("id", jobRow.id)
      .select(`
        id,
        public_id,
        category,
        title,
        summary,
        city,
        state,
        name,
        email,
        phone,
        address,
        description,
        created_at
      `)
      .maybeSingle();

    if (updateError) {
      console.error("update-job update error:", updateError);
      return json(500, {
        ok: false,
        error: updateError.message || "Failed to update job",
      });
    }

    return json(200, {
      ok: true,
      job: updatedRow || {
        id: jobRow.id,
        public_id: jobRow.public_id,
        category,
        title,
        summary,
        city,
        state,
        name,
        email,
        phone,
        address,
        description,
      },
    });
  } catch (err) {
    console.error("update-job unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
