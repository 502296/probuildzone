exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {

    return { statusCode: 405, body: "Method Not Allowed" };

  }

  try {

    const { createClient } = await import("@supabase/supabase-js");

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);



    const { offer_id } = JSON.parse(event.body || "{}");

    if (!offer_id) return { statusCode: 400, body: JSON.stringify({ error: "Missing offer_id" }) };



    // اجعل هذا العرض مقبول

    const { error: upErr } = await supabase

      .from("pro_offers")

      .update({ status: "accepted" })

      .eq("id", offer_id);



    if (upErr) return { statusCode: 500, body: JSON.stringify({ error: upErr.message }) };



    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (e) {

    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };

  }

};
