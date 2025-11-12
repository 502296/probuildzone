exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {

    return { statusCode: 405, body: "Method Not Allowed" };

  }



  try {

    const { createClient } = await import("@supabase/supabase-js");

    const SUPABASE_URL = process.env.SUPABASE_URL;

    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



    const payload = JSON.parse(event.body || "{}");



    const { job_public_id, business_name, amount, phone, message } = payload;



    if (!job_public_id || !business_name) {

      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };

    }



    // جيب id الداخلي للـ job من public_id

    const { data: jobRow, error: jobErr } = await supabase

      .from("homeowner_jobs")

      .select("id")

      .eq("public_id", job_public_id)

      .maybeSingle();



    if (jobErr || !jobRow) {

      return { statusCode: 404, body: JSON.stringify({ error: "Job not found" }) };

    }



    const insert = {

      job_id: jobRow.id,

      business_name,

      message: message || "",

      amount: amount ? Number(amount) : null,

      phone: phone || null,

      status: "pending"

    };



    const { error: insErr } = await supabase.from("pro_offers").insert(insert);



    if (insErr) {

      return { statusCode: 500, body: JSON.stringify({ error: insErr.message }) };

    }



    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (e) {

    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };

  }

};
