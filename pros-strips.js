// pros-stripe.js

// Handles Stripe checkout for ProBuildZone

// Connects buttons (#trialBtn & #payBtn) with your backend API endpoint



document.addEventListener("DOMContentLoaded", function () {

  const trialBtn = document.getElementById("trialBtn");

  const payBtn = document.getElementById("payBtn");



  // Stripe public key (replace with your actual publishable key)

  const stripe = Stripe("pk_live_your_public_key_here");



  async function createCheckout(planType) {

    try {

      const response = await fetch("/api/create-checkout-session", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          plan: planType, // "trial" or "yearly"

        }),

      });



      const session = await response.json();



      if (session.url) {

        window.location.href = session.url; // Redirect to Stripe Checkout

      } else {

        alert("Unable to start checkout. Please try again later.");

        console.error(session);

      }

    } catch (err) {

      console.error("Error creating checkout session:", err);

      alert("An error occurred. Please try again later.");

    }

  }



  // Handle clicks

  if (trialBtn) {

    trialBtn.addEventListener("click", () => createCheckout("trial"));

  }

  if (payBtn) {

    payBtn.addEventListener("click", () => createCheckout("yearly"));

  }

});
