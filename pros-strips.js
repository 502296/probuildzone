// pros-stripe.js

document.addEventListener("DOMContentLoaded", function () {

  const trialBtn = document.getElementById("trialBtn");

  const payBtn = document.getElementById("payBtn");



  async function createCheckout(planType) {

    try {

      const response = await fetch("/api/create-checkout-session", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ plan: planType }),

      });



      const data = await response.json();



      if (data.url) {

        window.location.href = data.url;

      } else {

        alert("Unable to start checkout session");

      }

    } catch (err) {

      console.error(err);

      alert("Something went wrong while connecting to Stripe.");

    }

  }



  if (trialBtn) trialBtn.addEventListener("click", () => createCheckout("trial"));

  if (payBtn) payBtn.addEventListener("click", () => createCheckout("yearly"));

});
