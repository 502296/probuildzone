// netlify/functions/post-job.js

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BUCKET = "homeowner_uploads";

function json(statusCode, body) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(body) };
}

function normalize(value) {
  return String(value || "").trim();
}

function safeFileName(name) {
  return normalize(name)
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase() || "project-photo.jpg";
}

function getBase64Data(dataUrlOrBase64) {
  const value = String(dataUrlOrBase64 || "");
  if (value.includes(",")) return value.split(",").pop();
  return value;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const category = normalize(payload.category) || "General";
  const title = normalize(payload.title);
  const summary = normalize(payload.summary) || null;
  const city = normalize(payload.city) || null;
  const state = normalize(payload.state) || null;
  const name = normalize(payload.name);
  const email = normalize(payload.email).toLowerCase();
  const phone = normalize(payload.phone);
  const address = normalize(payload.address);
  const description = normalize(payload.description);

  const imageBase64 = payload.image_base64 || null;
  const imageName = safeFileName(payload.image_name || "project-photo.jpg");
  const imageType = normalize(payload.image_type) || "image/jpeg";

  if (!category || !title || !name || !email || !phone || !address || !description) {
    return json(400, {
      ok: false,
      error: "Missing required fields (category, title, name, email, phone, address, description)",
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return json(500, { ok: false, error: "Server missing Supabase env vars" });
  }

  const digits = Math.floor(10000 + Math.random() * 90000);
  const public_id = `PBZ-${digits}`;

  try {
    const insertPayload = [{
      public_id,
      category,
      title,
      summary,
      city,
      state,
      name,
      email,
      phone,
      address,
      description,
    }];

    const res = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return json(res.status, {
        ok: false,
        error: (body && (body.message || body.error || body.details)) || "Insert failed",
      });
    }

    const row = Array.isArray(body) ? body[0] : body;
    const jobId = row?.id || null;

    let photoPath = null;

    if (jobId && imageBase64) {
      const bytes = Buffer.from(getBase64Data(imageBase64), "base64");
      photoPath = `${public_id}/${Date.now()}-${imageName}`;

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${photoPath}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`,
            "apikey": SUPABASE_SERVICE_ROLE,
            "Content-Type": imageType,
            "x-upsert": "true",
          },
          body: bytes,
        }
      );

      if (!uploadRes.ok) {
        const uploadText = await uploadRes.text().catch(() => "");
        return json(uploadRes.status, {
          ok: false,
          error: `Job saved, but image upload failed: ${uploadText || uploadRes.status}`,
        });
      }

      const photoRes = await fetch(`${SUPABASE_URL}/rest/v1/homeowner_job_photos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_ROLE,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`,
        },
        body: JSON.stringify([{
          job_id: jobId,
          path: photoPath,
        }]),
      });

      if (!photoRes.ok) {
        const photoText = await photoRes.text().catch(() => "");
        return json(photoRes.status, {
          ok: false,
          error: `Image uploaded, but photo row insert failed: ${photoText || photoRes.status}`,
        });
      }
    }

    return json(200, {
      ok: true,
      job_id: jobId,
      public_id: row?.public_id || public_id,
      photo_path: photoPath,
      homeowner: { name, email, phone },
      job: {
        id: jobId,
        public_id: row?.public_id || public_id,
        category,
        title,
        summary,
        city,
        state,
      },
    });
  } catch (e) {
    return json(500, {
      ok: false,
      error: e.message || "Server error",
    });
  }
};
