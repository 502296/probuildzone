// netlify/functions/get-homeowner-requests.js

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

function uniqueBy(items, keyFn) {
  const out = [];
  const seen = new Set();

  for (const item of items || []) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

const JOB_SELECT = `
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

const REQUEST_SELECT = `
  id,
  job_id,
  job_public_id,
  business_name,
  pro_email,
  phone,
  message,
  status,
  created_at
`;

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

    const email = normalize(params.email).toLowerCase();
    const phone = normalize(params.phone);
    const publicId = normalize(params.public_id || params.job_public_id);
    const lastJobId = normalize(params.last_job_id || params.job_id);

    if (!email && !phone && !publicId && !lastJobId) {
      return json(400, {
        ok: false,
        error: "Missing homeowner identity",
      });
    }

    let jobs = [];

    // 1) Try exact public_id first
    if (publicId) {
      const { data, error } = await supabase
        .from("homeowner_jobs")
        .select(JOB_SELECT)
        .eq("public_id", publicId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests public_id job lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs by public_id",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    // 2) If nothing found, try internal job id
    if (!jobs.length && lastJobId) {
      const { data, error } = await supabase
        .from("homeowner_jobs")
        .select(JOB_SELECT)
        .eq("id", lastJobId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests last_job_id lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs by id",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    // 3) If still nothing, try email
    if (!jobs.length && email) {
      const { data, error } = await supabase
        .from("homeowner_jobs")
        .select(JOB_SELECT)
        .ilike("email", email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests email job lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs by email",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    // 4) Finally try phone
    if (!jobs.length && phone) {
      const { data, error } = await supabase
        .from("homeowner_jobs")
        .select(JOB_SELECT)
        .eq("phone", phone)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests phone job lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs by phone",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    jobs = uniqueBy(
      jobs,
      (job) => String(job.id || job.public_id || JSON.stringify(job))
    );

    if (!jobs.length) {
      return json(200, {
        ok: true,
        projects: [],
        requests: [],
      });
    }

    const jobIds = jobs.map((job) => job.id).filter(Boolean);
    const publicIds = jobs.map((job) => job.public_id).filter(Boolean);

    let requestsByJobId = [];
    let requestsByPublicId = [];

    if (jobIds.length) {
      const { data, error } = await supabase
        .from("pro_offers")
        .select(REQUEST_SELECT)
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests offers by job_id lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner requests by job_id",
        });
      }

      requestsByJobId = Array.isArray(data) ? data : [];
    }

    if (publicIds.length) {
      const { data, error } = await supabase
        .from("pro_offers")
        .select(REQUEST_SELECT)
        .in("job_public_id", publicIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests offers by public_id lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner requests by public_id",
        });
      }

      requestsByPublicId = Array.isArray(data) ? data : [];
    }

    let requests = uniqueBy(
      [...requestsByJobId, ...requestsByPublicId],
      (req) => String(req.id || JSON.stringify(req))
    );

    const requestsWithJob = requests.map((request) => {
      const match = jobs.find((job) => {
        return (
          String(job.id || "") === String(request.job_id || "") ||
          String(job.public_id || "") === String(request.job_public_id || "")
        );
      });

      return {
        ...request,
        email: request.pro_email || "",
        job: match || null,
      };
    });

    return json(200, {
      ok: true,
      projects: jobs,
      requests: requestsWithJob,
    });
  } catch (err) {
    console.error("get-homeowner-requests unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
