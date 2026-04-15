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
    const email = String(params.email || "").trim().toLowerCase();

    console.log("get-homeowner-requests email:", email);

    if (!email) {
      return json(400, {
        ok: false,
        error: "Missing homeowner email",
      });
    }

    // 1) Load homeowner projects by email
    const { data: jobsRaw, error: jobsError } = await supabase
      .from("homeowner_jobs")
      .select(`
        id,
        public_id,
        category,
        project_title,
        short_summary,
        full_description,
        city,
        state,
        contact_name,
        phone,
        email,
        full_address,
        created_at
      `)
      .ilike("email", email)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("homeowner_jobs query error:", jobsError);
      return json(500, {
        ok: false,
        error: jobsError.message || "Failed to load homeowner projects",
      });
    }

    const jobs = Array.isArray(jobsRaw) ? jobsRaw : [];
    console.log("projects found:", jobs.length);

    if (!jobs.length) {
      return json(200, {
        ok: true,
        projects: [],
      });
    }

    const jobIds = jobs.map((job) => job.id).filter(Boolean);
    console.log("jobIds:", jobIds);

    // 2) Load connection requests for those jobs
    const { data: requestsRaw, error: requestsError } = await supabase
      .from("connection_requests")
      .select(`
        id,
        job_id,
        business_name,
        pro_email,
        phone,
        message,
        status,
        created_at
      `)
      .in("job_id", jobIds)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("connection_requests query error:", requestsError);
      return json(500, {
        ok: false,
        error: requestsError.message || "Failed to load incoming requests",
      });
    }

    const requests = Array.isArray(requestsRaw) ? requestsRaw : [];
    console.log("requests found:", requests.length);

    const grouped = new Map();

    for (const req of requests) {
      const arr = grouped.get(req.job_id) || [];
      arr.push({
        id: req.id || null,
        business_name: req.business_name || "Builder",
        pro_email: req.pro_email || null,
        phone: req.phone || null,
        message: req.message || "",
        status: req.status || "pending",
        created_at: req.created_at || null,
      });
      grouped.set(req.job_id, arr);
    }

    const projects = jobs.map((job) => ({
      id: job.id || null,
      public_id: job.public_id || null,
      category: job.category || null,
      project_title: job.project_title || "Untitled project",
      short_summary: job.short_summary || null,
      full_description: job.full_description || null,
      city: job.city || null,
      state: job.state || null,
      contact_name: job.contact_name || null,
      phone: job.phone || null,
      email: job.email || null,
      full_address: job.full_address || null,
      created_at: job.created_at || null,
      requests: grouped.get(job.id) || [],
    }));

    return json(200, {
      ok: true,
      projects,
    });
  } catch (err) {
    console.error("get-homeowner-requests unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
