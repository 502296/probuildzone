exports.handler = async (event) => {

  try {

    // تأكد أن الطلب من نوع POST

    if (event.httpMethod !== "POST") {

      return {

        statusCode: 405,

        body: JSON.stringify({ ok: false, error: "Method not allowed" })

      };

    }



    // نحاول قراءة البودي

    const data = JSON.parse(event.body || "{}");



    // تحقق سريع من البيانات المطلوبة

    const required = ["project_title", "contact_name", "phone", "email", "full_address", "full_description"];

    for (const field of required) {

      if (!data[field]) {

        return {

          statusCode: 400,

          body: JSON.stringify({ ok: false, error: `Missing field: ${field}` })

        };

      }

    }



    // هنا لاحقًا نضيف حفظ في Supabase أو أي قاعدة بيانات

    // حالياً نطبع فقط

    console.log("📩 Received homeowner job:", data);



    // استجابة ناجحة

    return {

      statusCode: 200,

      body: JSON.stringify({

        ok: true,

        message: "Job saved successfully",

        received: data

      })

    };

  } catch (err) {

    console.error("❌ Error in save-homeowner-job:", err);

    return {

      statusCode: 500,

      body: JSON.stringify({

        ok: false,

        error: err.message || "Internal Server Error"

      })

    };

  }

};
