// netlify/functions/get-jobs.js

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

const PBZ_CANONICAL_CATEGORIES = [
  "General Construction",
  "Remodeling",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Roofing",
  "Flooring",
  "Painting",
  "Drywall",
  "Landscaping",
  "Cleaning",
  "Moving",
  "Handyman",
  "Concrete",
  "Fencing",
  "Windows & Doors",
  "Kitchen Remodeling",
  "Bathroom Remodeling",
];

const PBZ_CATEGORY_GROUPS = {
  "General Construction": [
    "General Construction",
    "General Contractor",
    "General Contracting",
    "Contractor",
    "Siding",
    "Decks & Porches",
    "Decks",
    "Porches"
  ],
  "Remodeling": [
    "Remodeling"
  ],
  "Plumbing": [
    "Plumbing",
    "Plumber"
  ],
  "Electrical": [
    "Electrical",
    "Electrician",
    "Electrical Work"
  ],
  "HVAC": [
    "HVAC",
    "Heating & Cooling"
  ],
  "Roofing": [
    "Roofing",
    "Roof",
    "Roof Repair"
  ],
  "Flooring": [
    "Flooring",
    "Floor"
  ],
  "Painting": [
    "Painting",
    "Painting Interior",
    "Painting Exterior"
  ],
  "Drywall": [
    "Drywall"
  ],
  "Landscaping": [
    "Landscaping"
  ],
  "Cleaning": [
    "Cleaning"
  ],
  "Moving": [
    "Moving"
  ],
  "Handyman": [
    "Handyman"
  ],
  "Concrete": [
    "Concrete"
  ],
  "Fencing": [
    "Fencing"
  ],
  "Windows & Doors": [
    "Windows & Doors",
    "Windows and Doors",
    "Window and Doors",
    "Windows Doors"
  ],
  "Kitchen Remodeling": [
    "Kitchen Remodeling",
    "Kitchen Remodel"
  ],
  "Bathroom Remodeling": [
    "Bathroom Remodeling",
    "Bathroom Remodel",
    "Bath Remodel"
  ]
};

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

function normalizeCategory(value) {
  const raw = normalize(value);
  if (!raw) return "";

  const exact = PBZ_CANONICAL_CATEGORIES.find(
    (item) => item.toLowerCase() === raw.toLowerCase()
  );
  if (exact) return exact;

  for (const [canonical, variants] of Object.entries(PBZ_CATEGORY_GROUPS)) {
    const found = variants.find(
      (variant) => String(variant).toLowerCase() === raw.toLowerCase()
    );
    if (found) return canonical;
  }

  return raw;
}

function getCategoryVariants(category) {
  const canonical = normalizeCategory(category);
  if (!canonical) return [];

  const variants = PBZ_CATEGORY_GROUPS[canonical] || [canonical];

  return [...new Set(
    variants
      .map((item) => normalize(item))
      .filter(Boolean)
  )];
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

    const category = normalize(params.category);
    const city = normalize(params.city);
    const state = normalize(params.state);

    let query = supabase
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
      .order("created_at", { ascending: false })
      .limit(30);

    if (category) {
      const categoryVariants = getCategoryVariants(category);

      if (categoryVariants.length === 1) {
        query = query.eq("category", categoryVariants[0]);
      } else if (categoryVariants.length > 1) {
        const orClause = categoryVariants
          .map((item) => `category.eq.${item}`)
          .join(",");

        query = query.or(orClause);
      }
    }

    if (city) {
      query = query.ilike("city", city);
    }

    if (state) {
      query = query.ilike("state", state);
    }

    const { data, error } = await query;

    if (error) {
      console.error("get-jobs error:", error);
      return json(500, {
        ok: false,
        error: error.message || "Failed to load jobs",
      });
    }

    const jobs = Array.isArray(data) ? data : [];

    const normalizedJobs = jobs.map((job) => ({
      ...job,
      category: normalizeCategory(job.category || "")
    }));

    return json(200, {
      ok: true,
      jobs: normalizedJobs,
    });
  } catch (err) {
    console.error("get-jobs unexpected error:", err);
    return json(500, {
      ok: false,
      error: err.message || "Unexpected error",
    });
  }
};
