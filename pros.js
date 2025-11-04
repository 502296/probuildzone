// pros.js  – send form data to Netlify, Netlify → Stripe + Google Sheet

(function () {

  // هيلبر صغير يجيب القيمة سواء كانت بالـ id أو بالـ name

  function getVal(idOrName) {

    const byId = document.getElementById(idOrName);

    if (byId) return byId.value.trim();



    const byName = document.querySelector(`[name="${idOrName}"]`);

    if (byName) return byName.value.trim();



    return "";

  }



  async function handleSubmit(e) {

    if (e && e.preventDefault) e.preventDefault();



    // الزر عشان نطفيه أثناء الإرسال

    const btn =

      document.getElementById("startTrialBtn") ||

      document.getElementById("start-free-trial") ||

      (e && e.submitter);



    if (btn) {

      btn.disabled = true;

      btn.textContent = "Processing...";

    }



    // نجمع بيانات الفورم – غيّر الأسماء تحت لو IDs عندك مختلفة

    const payload = {

      name: getVal("businessName") || getVal("ownerName") || getVal("biz") || getVal("fullName"),

      email: getVal("email"),

      phone: getVal("phone"),

      address: getVal("businessAddress") || getVal("address"),

      license: getVal("license") || getVal("businessLicense"),

      insurance: getVal("insurance"),

      notes: getVal("notes") || getVal("services"),

    };



    try {

      const res = await fetch("/.netlify/functions/create-checkout-session", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload),

      });



      if (!res.ok) {

        const text = await res.text();

        throw new Error("Function error: " + text);

      }



      const data = await res.json();



      if (data.url) {

        // روح على Stripe

        window.location.href = data.url;

      } else {

        alert("Did not get checkout URL.");

      }

    } catch (err) {

      console.error(err);

      alert("Something went wrong. Please try again.");

    } finally {

      if (btn) {

        btn.disabled = false;

        btn.textContent = "Start Free Trial";

      }

    }

  }



  function boot() {

    // لو عندك <form id="proForm">

    const form = document.getElementById("proForm");

    if (form) {

      form.addEventListener("submit", handleSubmit);

    }



    // ولو عندك زر فقط بدون form

    const btn =

      document.getElementById("startTrialBtn") ||

      document.getElementById("start-free-trial");

    if (btn && !form) {

      btn.addEventListener("click", handleSubmit);

    }

  }



  if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", boot);

  } else {

    boot();

  }

})();
