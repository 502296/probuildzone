// netlify/functions/get-offers.js

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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  const publicId = event.queryStringParameters
    ? String(event.queryStringParameters.id || "").trim()
    : "";

  if (!publicId) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: "Missing id" }),
    };
  }

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: "Server missing Supabase env vars",
      }),
    };
  }

  try {
    // 1) Resolve homeowner job UUID from public_id
    const { data: jobRow, error: jobError } = await supabase
      .from("homeowner_jobs")
      .select("id")
      .eq("public_id", publicId)
      .maybeSingle();

    if (jobError) {
      console.error("get-offers job lookup error:", jobError);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ ok: false, error: jobError.message }),
      };
    }

    if (!jobRow) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ ok: true, offers: [] }),
      };
    }

    const jobUuid = jobRow.id;

    // 2) Fetch offers for this job
    const { data: offers, error: offersError } = await supabase
      .from("pro_offers")
      .select(
        "id, business_name, pro_name, phone, pro_email, email, amount, message, status, created_at"
      )
      .eq("job_id", jobUuid)
      .order("created_at", { ascending: true });

    if (offersError) {
      console.error("get-offers offers error:", offersError);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ ok: false, error: offersError.message }),
      };
    }

    // 3) Normalize response so frontend gets one stable shape
    const normalizedOffers = (offers || []).map((offer) => ({
      id: offer.id,
      business_name: offer.business_name || offer.pro_name || "Pro",
      pro_name: offer.pro_name || offer.business_name || "Pro",
      phone: offer.phone || null,
      email: offer.pro_email || offer.email || null,
      pro_email: offer.pro_email || offer.email || null,
      amount: offer.amount ?? null,
      message: offer.message || "",
      status: offer.status || "pending",
      created_at: offer.created_at || null,
    }));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, offers: normalizedOffers }),
    };
  } catch (err) {
    console.error("get-offers unexpected error:", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: err.message || "Unexpected error",
      }),
    };
  }
};
