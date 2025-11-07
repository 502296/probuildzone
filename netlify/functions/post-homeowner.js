import { createClient } from "@supabase/supabase-js";



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey =

  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;



export async function handler(event) {

  if (event.httpMethod !== "POST") {

    return {

      statusCode: 405,

      body: JSON.stringify({ error: "Method not allowed" }),

    };

  }



  if (!supabaseUrl || !supabaseKey) {

    return {

      statusCode: 500,

      body: JSON.stringify({ error: "Missing Supabase environment variables" }),

    };

  }



  let body;

  try {

    body = JSON.parse(event.body || "{}");

  } catch (e) {

    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };

  }



  const supabase = createClient(supabaseUrl, supabaseKey);



  const { error, data } = await supabase

    .from("homeowner_jobs")

    .insert([

      {

        category: body.category || null,

        title: body.title || null,

        summary: body.summary || null,

        city: body.city || null,

        state: body.state || null,

        budget_from: body.budget_from || null,

        budget_to: body.budget_to || null,

        full_name: body.full_name || null,

        phone: body.phone || null,

        email: body.email || null,

        address: body.address || null,

        description: body.description || null,

        zip: body.zip || null,

        homeowner_id: body.homeowner_id || null,

      },

    ])

    .select();



  if (error) {

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: error.message }),

    };

  }



  return {

    statusCode: 200,

    body: JSON.stringify({ ok: true, data }),

  };

}
