// netlify/functions/save-profile.js

const { createClient } = require("@supabase/supabase-js");



exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {

    return { statusCode: 405, body: "Method Not Allowed" };

  }



  try {

    const data = JSON.parse(event.body);



    // إنشاء اتصال بـ Supabase

    const supabase = createClient(

      process.env.SUPABASE_URL,

      process.env.SUPABASE_SERVICE_ROLE_KEY

    );



    // إدخال البيانات في جدول pros

    const { error } = await supabase.from("pros").insert([

      {

        email: data.email,

        phone: data.phone,

        company_address: data.address,

        license_no: data.license,

        insurance_no: data.insurance || null,

        notes: data.notes || "",

        stripe_status: "pending",

      },

    ]);



    if (error) {

      console.error("Supabase insert error:", error);

      return {

        statusCode: 500,

        body: JSON.stringify({ message: "Error inserting data", error }),

      };

    }



    return {

      statusCode: 200,

      body: JSON.stringify({ message: "Saved to Supabase successfully" }),

    };

  } catch (err) {

    console.error("General error:", err);

    return {

      statusCode: 400,

      body: JSON.stringify({ message: "Bad Request", error: err.message }),

    };

  }

};
