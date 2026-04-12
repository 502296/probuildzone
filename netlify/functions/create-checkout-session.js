// netlify/functions/create-checkout-session.js

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_PRICE_YEARLY ||
      !process.env.SITE_URL ||
      !process.env.SUPABASE_URL ||
      !(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)
    ) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Server is missing required environment variables.",
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

    if (!name || !email || !phone || !license) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields: name, email, phone, license",
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

    // Keep DB insert aligned with known columns in current `pros` table.
    // We will add formal matching columns via explicit SQL migration next.
    const proInsert = {
      full_name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      company_address: address ? String(address).trim() : null,
      license_no: String(license).trim(),
      insurance_no: insurance ? String(insurance).trim() : null,
      notes: notes ? String(notes).trim() : null,
      stripe_status: "pending",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("pros")
      .insert([proInsert])
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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_YEARLY,
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/cancel.html`,
      customer_email: String(email).trim(),
      subscription_data: {
        trial_period_days: 30,
      },
      metadata: {
        pro_id: String(inserted.id),
        name: name ? String(name).trim() : "",
        email: email ? String(email).trim() : "",
        phone: phone ? String(phone).trim() : "",
        address: address ? String(address).trim() : "",
        license: license ? String(license).trim() : "",
        insurance: insurance ? String(insurance).trim() : "",
        category: category ? String(category).trim() : "",
        city: city ? String(city).trim() : "",
        state: state ? String(state).trim() : "",
      },
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        url: session.url,
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
