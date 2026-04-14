// netlify/functions/update-request-status.js

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

  const requestId = String(payload.request_id || "").trim();
  const nextStatus = String(payload.status || "").trim().toLowerCase();

  if (!requestId) {
    return json(400, {
      ok: false,
      error: "Missing request_id",
    });
  }

  if (!["accepted", "declined"].includes(nextStatus)) {
    return json(400, {
      ok: false,
      error: "Invalid status. Use accepted or declined.",
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

    const { data, error } = await supabase
      .from("pro_offers")
      .update({ status: nextStatus })
      .eq("id", requestId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      console.error("update-request-status error:", error);
      return json(500, {
        ok: false,
        error: error.message || "Failed to update request status",
      });
    }

    if (!data) {
      return json(404, {
        ok: false,
        error: "Request not found",
      });
    }

    return json(200, {
      ok: true,
      request: data,
    });
  } catch (err) {
    console.error("update-request-status unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
