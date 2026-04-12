// pros.js
// ProBuildZone — robust client-side submit helper
// Sends Pro signup data to Netlify -> Stripe / backend
// Built to support both old and current form IDs without breaking working flows

(function () {
  function getField(idOrName) {
    const byId = document.getElementById(idOrName);
    if (byId) return byId;

    const byName = document.querySelector(`[name="${idOrName}"]`);
    if (byName) return byName;

    return null;
  }

  function getVal(...keys) {
    for (const key of keys) {
      const el = getField(key);
      if (el && typeof el.value === "string") {
        return el.value.trim();
      }
    }
    return "";
  }

  function showInlineError(message) {
    const alertBox = document.getElementById("alert");
    if (alertBox) {
      alertBox.textContent = message;
      alertBox.style.display = "block";
      return true;
    }
    return false;
  }

  function clearInlineError() {
    const alertBox = document.getElementById("alert");
    if (alertBox) {
      alertBox.textContent = "";
      alertBox.style.display = "none";
    }
  }

  function getSubmitButton(e) {
    return (
      document.getElementById("startBtn") ||
      document.getElementById("startTrialBtn") ||
      document.getElementById("start-free-trial") ||
      (e && e.submitter) ||
      null
    );
  }

  function setButtonState(btn, busy) {
    if (!btn) return;
    btn.disabled = !!busy;
    btn.textContent = busy ? "Processing..." : "Start Free Trial";
  }

  function buildPayload() {
    return {
      name: getVal("name", "businessName", "ownerName", "biz", "fullName", "pro_name"),
      email: getVal("email", "pro_email"),
      phone: getVal("phone", "pro_phone"),
      address: getVal("address", "businessAddress", "pro_address"),
      license: getVal("license", "businessLicense", "pro_license"),
      insurance: getVal("insurance", "pro_insurance"),
      notes: getVal("notes", "services", "pro_notes"),

      // New explicit fields for durable matching architecture
      category: getVal("category", "trade", "serviceCategory", "pro_category"),
      city: getVal("city", "pro_city"),
      state: getVal("state", "pro_state"),
    };
  }

  function validatePayload(payload) {
    if (!payload.name || !payload.email || !payload.phone || !payload.license) {
      return "Please fill name, email, phone, and license.";
    }

    const agree =
      document.getElementById("agree") ||
      document.querySelector('input[name="agree"]');

    if (agree && !agree.checked) {
      return "Please accept the Terms and Privacy notice to continue.";
    }

    return "";
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    clearInlineError();

    const btn = getSubmitButton(e);
    setButtonState(btn, true);

    const payload = buildPayload();
    const validationError = validatePayload(payload);

    if (validationError) {
      if (!showInlineError(validationError)) {
        alert(validationError);
      }
      setButtonState(btn, false);
      return;
    }

    try {
      // Save locally if page wants to reuse data later
      try {
        localStorage.setItem("pbz_form_data", JSON.stringify(payload));
      } catch (_) {}

      const res = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response (${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Function error (${res.status})`);
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Did not get checkout URL.");
    } catch (err) {
      console.error("pros.js submit error:", err);

      const message = err && err.message
        ? err.message
        : "Something went wrong. Please try again.";

      if (!showInlineError(message)) {
        alert(message);
      }
    } finally {
      setButtonState(btn, false);
    }
  }

  function boot() {
    const form =
      document.getElementById("prosForm") ||
      document.getElementById("proForm");

    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    const btn =
      document.getElementById("startBtn") ||
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
