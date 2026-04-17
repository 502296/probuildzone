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

    const email = normalize(params.email);
    const phone = normalize(params.phone);
    const publicId = normalize(params.public_id || params.last_job_id || params.job_id);

    if (!email && !phone && !publicId) {
      return json(400, {
        ok: false,
        error: "Missing homeowner identity",
      });
    }

    let jobs = [];

    if (publicId) {
      const { data, error } = await supabase
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
        .eq("public_id", publicId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests public_id job lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    if (!jobs.length && email) {
      const { data, error } = await supabase
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
        .ilike("email", email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests email job lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    if (!jobs.length && phone) {
      const { data, error } = await supabase
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
        .eq("phone", phone)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("get-homeowner-requests phone job lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner jobs",
        });
      }

      jobs = Array.isArray(data) ? data : [];
    }

    jobs = uniqueBy(jobs, (job) => job.id || job.public_id || JSON.stringify(job));

    if (!jobs.length) {
      return json(200, {
        ok: true,
        projects: [],
        requests: [],
      });
    }

    const jobIds = jobs.map((job) => job.id).filter(Boolean);
    const publicIds = jobs.map((job) => job.public_id).filter(Boolean);

    let requests = [];

    if (jobIds.length || publicIds.length) {
      let query = supabase
        .from("pro_offers")
        .select(`
          id,
          job_id,
          homeowner_job_id,
          public_id,
          job_public_id,
          status,
          message,
          created_at,
          pro_name,
          pro_email,
          pro_phone,
          company_name,
          city,
          state,
          category
        `)
        .order("created_at", { ascending: false });

      if (jobIds.length && publicIds.length) {
        query = query.or(
          `job_id.in.(${jobIds.join(",")}),homeowner_job_id.in.(${jobIds.join(",")}),job_public_id.in.(${publicIds.join(",")})`
        );
      } else if (jobIds.length) {
        query = query.or(
          `job_id.in.(${jobIds.join(",")}),homeowner_job_id.in.(${jobIds.join(",")})`
        );
      } else if (publicIds.length) {
        query = query.in("job_public_id", publicIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("get-homeowner-requests offers lookup error:", error);
        return json(500, {
          ok: false,
          error: error.message || "Failed to load homeowner requests",
        });
      }

      requests = Array.isArray(data) ? data : [];
    }

    const requestsWithJob = requests.map((request) => {
      const match = jobs.find((job) => {
        return (
          String(job.id || "") === String(request.job_id || "") ||
          String(job.id || "") === String(request.homeowner_job_id || "") ||
          String(job.public_id || "") === String(request.job_public_id || "") ||
          String(job.public_id || "") === String(request.public_id || "")
        );
      });

      return {
        ...request,
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
