exports.handler = async (event) => {

  try {

    const jobPublicId = event.queryStringParameters?.id;

    if (!jobPublicId) return { statusCode: 400, body: "Missing id" };



    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);



    // أولاً نحصل على id الداخلي للوظيفة

    const { data: jobRow, error: jobErr } = await supabase

      .from("homeowner_jobs")

      .select("id")

      .eq("public_id", jobPublicId)

      .maybeSingle();



    if (jobErr || !jobRow) return { statusCode: 404, body: JSON.stringify({ error: "Job not found" }) };



    // نجيب العروض

    const { data: offers, error: offErr } = await supabase

      .from("pro_offers")

      .select("id,business_name,amount,phone,message,status,created_at")

      .eq("job_id", jobRow.id)

      .order("created_at", { ascending: false });



    if (offErr) return { statusCode: 500, body: JSON.stringify({ error: offErr.message }) };



    return { statusCode: 200, body: JSON.stringify({ offers }) };

  } catch (e) {

    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };

  }

};
