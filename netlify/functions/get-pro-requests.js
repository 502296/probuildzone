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

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
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
    const phone = String(params.phone || "").trim();

    if (!email && !phone) {
      return json(400, {
        ok: false,
        error: "Missing pro email or phone",
      });
    }

    // Step 1: Load this Pro's connection requests using the actual DB columns:
    // email + phone
    let requestsQuery = supabase
      .from("pro_offers")
      .select(
        "id, job_id, business_name, email, phone, amount, message, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (email && phone) {
      requestsQuery = requestsQuery.or(
        `email.ilike.${email},phone.eq.${phone}`
      );
    } else if (email) {
      requestsQuery = requestsQuery.ilike("email", email);
    } else if (phone) {
      requestsQuery = requestsQuery.eq("phone", phone);
    }

    const { data: requestsRaw, error: reqError } = await requestsQuery;

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
    const jobKeys = [
      ...new Set(
        requests
          .map((item) => String(item.job_id || "").trim())
          .filter(Boolean)
      ),
    ];

    const uuidJobIds = jobKeys.filter(isUuidLike);
    const publicJobIds = jobKeys.filter((value) => !isUuidLike(value));

    const jobsMap = new Map();

    if (uuidJobIds.length) {
      const { data: jobsByUuid, error: jobsUuidError } = await supabase
        .from("homeowner_jobs")
        .select("id, public_id, title, project_title, category, city, state")
        .in("id", uuidJobIds);

      if (jobsUuidError) {
        console.error("get-pro-requests jobs UUID lookup error:", jobsUuidError);
        return json(500, {
          ok: false,
          error: jobsUuidError.message || "Failed to load related jobs by id",
        });
      }

      (jobsByUuid || []).forEach((job) => {
        if (job?.id) jobsMap.set(String(job.id), job);
        if (job?.public_id) jobsMap.set(String(job.public_id), job);
      });
    }

    if (publicJobIds.length) {
      const { data: jobsByPublicId, error: jobsPublicError } = await supabase
        .from("homeowner_jobs")
        .select("id, public_id, title, project_title, category, city, state")
        .in("public_id", publicJobIds);

      if (jobsPublicError) {
        console.error("get-pro-requests jobs public_id lookup error:", jobsPublicError);
        return json(500, {
          ok: false,
          error: jobsPublicError.message || "Failed to load related jobs by public_id",
        });
      }

      (jobsByPublicId || []).forEach((job) => {
        if (job?.id) jobsMap.set(String(job.id), job);
        if (job?.public_id) jobsMap.set(String(job.public_id), job);
      });
    }

    // Step 3: Normalize the response for dashboard use
    const normalized = requests.map((item) => {
      const rawJobKey = String(item.job_id || "").trim();
      const job = jobsMap.get(rawJobKey) || {};

      return {
        id: item.id || null,
        job_id: item.job_id || null,
        job_public_id:
          job.public_id || (rawJobKey && !isUuidLike(rawJobKey) ? rawJobKey : null),
        job_title: job.title || job.project_title || "Untitled job",
        category: job.category || null,
        city: job.city || null,
        state: job.state || null,
        business_name: item.business_name || "Pro",
        pro_email: item.email || null,
        email: item.email || null,
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
