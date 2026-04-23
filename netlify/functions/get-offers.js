// netlify/functions/get-offers.js
// Transitional architecture:
// Supports both homeowner-side job request lookup by public_id
// and pro-side dashboard lookup by pro email / phone.

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
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseKey) {
    return json(500, {
      ok: false,
      error: "Server missing Supabase env vars",
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

    const publicId = String(
      params.id ||
      params.jobId ||
      params.job ||
      params.public_id ||
      ""
    ).trim();

    const email = String(params.email || "")
      .trim()
      .toLowerCase();

    const phone = String(params.phone || "").trim();

    // ------------------------------------------------------------
    // MODE 1: Homeowner-side lookup by public_id
    // ------------------------------------------------------------
    if (publicId) {
      const { data: jobRow, error: jobError } = await supabase
        .from("homeowner_jobs")
        .select("id")
        .eq("public_id", publicId)
        .maybeSingle();

      if (jobError) {
        console.error("get-offers job lookup error:", jobError);
        return json(500, { ok: false, error: jobError.message });
      }

      if (!jobRow) {
        return json(200, { ok: true, requests: [] });
      }

      const jobUuid = jobRow.id;

      const { data: offers, error: offersError } = await supabase
        .from("pro_offers")
        .select(
          "id, job_id, business_name, pro_name, phone, pro_phone, pro_email, email, amount, message, status, created_at"
        )
        .eq("job_id", jobUuid)
        .order("created_at", { ascending: false });

      if (offersError) {
        console.error("get-offers homeowner requests error:", offersError);
        return json(500, { ok: false, error: offersError.message });
      }

      const normalizedRequests = (offers || []).map((offer) => ({
        id: offer.id,
        job_id: offer.job_id || null,
        business_name: offer.business_name || offer.pro_name || "Pro",
        pro_name: offer.pro_name || offer.business_name || "Pro",
        phone: offer.pro_phone || offer.phone || null,
        email: offer.pro_email || offer.email || null,
        pro_email: offer.pro_email || offer.email || null,
        amount: offer.amount ?? null,
        message: offer.message || "",
        status: offer.status || "pending",
        created_at: offer.created_at || null,
        request_type: "connection_request",
      }));

      return json(200, {
        ok: true,
        requests: normalizedRequests,
      });
    }

    // ------------------------------------------------------------
    // MODE 2: Pro-side dashboard lookup by email / phone
    // ------------------------------------------------------------
    if (!email && !phone) {
      return json(400, {
        ok: false,
        error: "Missing job identifier or pro email/phone",
      });
    }

    let query = supabase
      .from("pro_offers")
      .select(
        "id, job_id, business_name, pro_name, phone, pro_phone, pro_email, email, amount, message, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (email && phone) {
      query = query.or(
        `pro_email.ilike.${email},email.ilike.${email},phone.eq.${phone},pro_phone.eq.${phone}`
      );
    } else if (email) {
      query = query.or(`pro_email.ilike.${email},email.ilike.${email}`);
    } else {
      query = query.or(`phone.eq.${phone},pro_phone.eq.${phone}`);
    }

    const { data: offersRaw, error: offersError } = await query;

    if (offersError) {
      console.error("get-offers pro lookup error:", offersError);
      return json(500, { ok: false, error: offersError.message });
    }

    const offers = Array.isArray(offersRaw) ? offersRaw : [];

    if (!offers.length) {
      return json(200, {
        ok: true,
        requests: [],
      });
    }

    const jobKeys = [
      ...new Set(
        offers
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
        console.error("get-offers jobs UUID lookup error:", jobsUuidError);
        return json(500, { ok: false, error: jobsUuidError.message });
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
        console.error("get-offers jobs public_id lookup error:", jobsPublicError);
        return json(500, { ok: false, error: jobsPublicError.message });
      }

      (jobsByPublicId || []).forEach((job) => {
        if (job?.id) jobsMap.set(String(job.id), job);
        if (job?.public_id) jobsMap.set(String(job.public_id), job);
      });
    }

    const normalizedRequests = offers.map((offer) => {
      const rawJobKey = String(offer.job_id || "").trim();
      const job = jobsMap.get(rawJobKey) || {};

      return {
        id: offer.id,
        job_id: offer.job_id || null,
        job_public_id:
          job.public_id || (rawJobKey && !isUuidLike(rawJobKey) ? rawJobKey : null),
        job_title: job.title || job.project_title || "Untitled job",
        category: job.category || null,
        city: job.city || null,
        state: job.state || null,
        business_name: offer.business_name || offer.pro_name || "Pro",
        pro_name: offer.pro_name || offer.business_name || "Pro",
        phone: offer.pro_phone || offer.phone || null,
        email: offer.pro_email || offer.email || null,
        pro_email: offer.pro_email || offer.email || null,
        amount: offer.amount ?? null,
        message: offer.message || "",
        status: offer.status || "pending",
        created_at: offer.created_at || null,
        request_type: "connection_request",
      };
    });

    return json(200, {
      ok: true,
      requests: normalizedRequests,
    });
  } catch (err) {
    console.error("get-offers unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
