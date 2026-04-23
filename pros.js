// pros.js
// ProBuildZone — signup flow using Supabase only (no Stripe redirect)
// After successful signup, save Pro locally and redirect to matching jobs page

(function () {
  const PBZ_CANONICAL_CATEGORIES = [
    "General Construction",
    "Remodeling",
    "Plumbing",
    "Electrical",
    "HVAC",
    "Roofing",
    "Flooring",
    "Painting",
    "Drywall",
    "Landscaping",
    "Cleaning",
    "Moving",
    "Handyman",
    "Concrete",
    "Fencing",
    "Windows & Doors",
    "Kitchen Remodeling",
    "Bathroom Remodeling",
  ];

  const PBZ_CATEGORY_ALIASES = {
    "general contractor": "General Construction",
    "general contracting": "General Construction",
    "contractor": "General Construction",
    "roof": "Roofing",
    "roof repair": "Roofing",
    "plumber": "Plumbing",
    "electrician": "Electrical",
    "electrical work": "Electrical",
    "heating & cooling": "HVAC",
    "painting interior": "Painting",
    "painting exterior": "Painting",
    "floor": "Flooring",
    "bath remodel": "Bathroom Remodeling",
    "bathroom remodel": "Bathroom Remodeling",
    "kitchen remodel": "Kitchen Remodeling",
    "window and doors": "Windows & Doors",
    "windows and doors": "Windows & Doors",
    "windows doors": "Windows & Doors",
    "decks": "General Construction",
    "porches": "General Construction",
  };

  function normalizeCategory(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const exact = PBZ_CANONICAL_CATEGORIES.find(
      (item) => item.toLowerCase() === raw.toLowerCase()
    );
    if (exact) return exact;

    const alias = PBZ_CATEGORY_ALIASES[raw.toLowerCase()];
    return alias || raw;
  }

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

  function showInlineMessage(message, type) {
    const alertBox = document.getElementById("alert");
    if (!alertBox) {
      if (type === "error") alert(message);
      return;
    }

    alertBox.textContent = message;
    alertBox.style.display = "block";

    if (type === "success") {
      alertBox.style.background = "#ecfdf3";
      alertBox.style.border = "1px solid #bbf7d0";
      alertBox.style.color = "#166534";
    } else {
      alertBox.style.background = "#fdeeee";
      alertBox.style.border = "1px solid #f4c3c3";
      alertBox.style.color = "#a52f2f";
    }
  }

  function clearInlineMessage() {
    const alertBox = document.getElementById("alert");
    if (!alertBox) return;

    alertBox.textContent = "";
    alertBox.style.display = "none";
    alertBox.style.background = "#fdeeee";
    alertBox.style.border = "1px solid #f4c3c3";
    alertBox.style.color = "#a52f2f";
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
    btn.textContent = busy ? "Saving..." : "Start Free Trial";
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
      category: normalizeCategory(getVal("category", "trade", "serviceCategory", "pro_category")),
      city: getVal("city", "pro_city"),
      state: getVal("state", "pro_state"),
    };
  }

  function validatePayload(payload) {
    if (
      !payload.name ||
      !payload.email ||
      !payload.phone ||
      !payload.license ||
      !payload.category ||
      !payload.city ||
      !payload.state
    ) {
      return "Please fill all required fields.";
    }

    return "";
  }

  function buildJobsRedirectUrl(payload) {
    const q = new URLSearchParams({
      category: normalizeCategory(payload.category || ""),
      city: payload.city || "",
      state: payload.state || "",
    });

    return `/jobs.html?${q.toString()}`;
  }

  function saveLocalProSession(payload, serverData) {
    const normalizedCategory = normalizeCategory(payload.category || "");

    const pbzUser = {
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      address: payload.address || "",
      license: payload.license || "",
      insurance: payload.insurance || "",
      notes: payload.notes || "",
      category: normalizedCategory,
      city: payload.city || "",
      state: payload.state || "",
      pro_id:
        (serverData && (serverData.pro_id || serverData.id || serverData.proId)) || "",
      saved_at: new Date().toISOString(),
    };

    const normalizedPayload = {
      ...payload,
      category: normalizedCategory,
    };

    try {
      localStorage.setItem("pbz_form_data", JSON.stringify(normalizedPayload));
    } catch (_) {}

    try {
      localStorage.setItem("pbz_user", JSON.stringify(pbzUser));
    } catch (_) {}
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    clearInlineMessage();

    const btn = getSubmitButton(e);
    setButtonState(btn, true);

    const payload = buildPayload();
    const validationError = validatePayload(payload);

    if (validationError) {
      showInlineMessage(validationError, "error");
      setButtonState(btn, false);
      return;
    }

    try {
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

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      saveLocalProSession(payload, data);

      showInlineMessage(
        "Success. Your ProBuildZone profile has been saved. Redirecting you to matching jobs...",
        "success"
      );

      const redirectUrl = buildJobsRedirectUrl(payload);

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1200);
    } catch (err) {
      console.error("pros.js submit error:", err);

      const message =
        err && err.message
          ? err.message
          : "Something went wrong. Please try again.";

      showInlineMessage(message, "error");
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
