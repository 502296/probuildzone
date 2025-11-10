<script>

document.addEventListener("DOMContentLoaded", () => {

  const form = document.querySelector("form");



  form.addEventListener("submit", async (e) => {

    e.preventDefault();



    // 🔹 نجمع البيانات من الحقول

    const formData = {

      category: form.category?.value || "General",

      project_title: form.project_title?.value,

      short_summary: form.short_summary?.value,

      city: form.city?.value,

      state: form.state?.value,

      contact_name: form.contact_name?.value,

      phone: form.phone?.value,

      email: form.email?.value,

      full_address: form.full_address?.value,

      full_description: form.full_description?.value,

    };



    // 🔹 نرسل الطلب إلى Netlify function

    try {

      const response = await fetch("https://probuildzone.netlify.app/.netlify/functions/save-homeowner-job", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(formData),

      });



      // نقرأ الردّ كـ نصّ أولاً ثم نحاول نحوله إلى JSON

      const text = await response.text();

      console.log("🔍 Raw response:", text);



      try {

        const data = JSON.parse(text);



        if (data.ok) {

          alert("✅ Job saved successfully!");

          form.reset();

        } else {

          alert("❌ Error: " + data.error);

        }

      } catch {

        alert("⚠️ Unexpected response from server:\n" + text);

      }

    } catch (err) {

      console.error("Fetch error:", err);

      alert("⚠️ Network error, please try again.");

    }

  });

});

</script>
