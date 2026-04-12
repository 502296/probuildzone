 // netlify/functions/create-checkout-session.js

const { createClient } = require("@supabase/supabase-js");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: "Method Not Allowed",
      }),
    };
  }

  try {
    if (
      !process.env.SUPABASE_URL ||
      !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
    ) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Server is missing Supabase environment variables.",
        }),
      };
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Invalid JSON body.",
        }),
      };
    }

    const {
      name,
      email,
      phone,
      address,
      license,
      insurance,
      notes,
      category,
      city,
      state,
    } = body;

    if (!name || !email || !phone || !license || !category || !city || !state) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields: name, email, phone, license, category, city, state",
        }),
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      }
    );

    const insertPayload = {
      full_name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      company_address: address ? String(address).trim() : null,
      license_no: String(license).trim(),
      insurance_no: insurance ? String(insurance).trim() : null,
      notes: notes ? String(notes).trim() : null,
      stripe_status: "inactive",
      category: String(category).trim(),
      city: String(city).trim(),
      state: String(state).trim(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from("pros")
      .insert([insertPayload])
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Supabase insert error:", insertError);
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Could not save pro to Supabase",
          details: insertError?.message || "Insert failed",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        mode: "supabase_only",
        message: "Your free trial request has been saved successfully.",
        pro_id: inserted.id,
      }),
    };
  } catch (err) {
    console.error("General error:", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        ok: false,
        error: err.message || "Unknown error",
      }),
    };
  }
};
