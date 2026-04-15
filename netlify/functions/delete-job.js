// netlify/functions/delete-job.js

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

  try {
    const supabase = buildClient();

    if (!supabase) {
      return json(500, {
        ok: false,
        error: "Failed to initialize Supabase client",
      });
    }

    // 1) Find target job and confirm ownership by email
    let jobQuery = supabase
      .from("homeowner_jobs")
      .select("id, public_id, email, title, project_title, category")
      .ilike("email", email)
      .limit(1);

    if (jobId) {
      jobQuery = jobQuery.eq("id", jobId);
    } else {
      jobQuery = jobQuery.eq("public_id", publicId);
    }

    const { data: jobRow, error: jobError } = await jobQuery.maybeSingle();

    if (jobError) {
      console.error("delete-job lookup error:", jobError);
      return json(500, {
        ok: false,
        error: jobError.message || "Failed to load job",
      });
    }

    if (!jobRow) {
      return json(404, {
        ok: false,
        error: "Job not found or you do not have permission to delete it",
      });
    }

    const targetJobId = jobRow.id;

    // 2) Delete related pro requests first
    const { error: offersDeleteError } = await supabase
      .from("pro_offers")
      .delete()
      .eq("job_id", targetJobId);

    if (offersDeleteError) {
      console.error("delete-job pro_offers delete error:", offersDeleteError);
      return json(500, {
        ok: false,
        error: offersDeleteError.message || "Failed to delete related requests",
      });
    }

    // 3) Delete the job itself
    const { error: jobDeleteError } = await supabase
      .from("homeowner_jobs")
      .delete()
      .eq("id", targetJobId);

    if (jobDeleteError) {
      console.error("delete-job homeowner_jobs delete error:", jobDeleteError);
      return json(500, {
        ok: false,
        error: jobDeleteError.message || "Failed to delete job",
      });
    }

    return json(200, {
      ok: true,
      deleted: {
        id: jobRow.id || null,
        public_id: jobRow.public_id || null,
        title: jobRow.title || jobRow.project_title || jobRow.category || "Untitled job",
      },
    });
  } catch (err) {
    console.error("delete-job unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
