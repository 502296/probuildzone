// netlify/functions/save-pro-profile.js

const fetch = require("node-fetch"); // Netlify يوفّر fetch في بعض الرن تايمس، لكن نضمنه



exports.handler = async (event) => {

  try {

    if (event.httpMethod !== "POST") {

      return { statusCode: 405, body: "Method Not Allowed" };

    }



    const WEBAPP_URL = process.env.SHEETS_WEBAPP_URL; // اكتب رابط Web App هنا في المتغيرات

    if (!WEBAPP_URL) {

      return { statusCode: 400, body: JSON.stringify({ error: "Missing SHEETS_WEBAPP_URL" }) };

    }



    const body = JSON.parse(event.body || "{}");



    // تحقق بسيط

    const required = ["biz", "name", "email", "phone", "license"];

    for (const k of required) {

      if (!body[k] || String(body[k]).trim() === "") {

        return { statusCode: 400, body: JSON.stringify({ error: `Missing field: ${k}` }) };

      }

    }



    // أرسل لـ Apps Script (يتوقع JSON)

    const res = await fetch(WEBAPP_URL, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        ...body,

        ts: new Date().toISOString(),   // ختم وقت

        source: "ProBuildZone"          // تمييز المصدر

      }),

    });



    const text = await res.text();

    if (!res.ok) {

      console.error("Sheets WebApp error:", res.status, text);

      return { statusCode: 502, body: JSON.stringify({ error: "Sheets WebApp failed", detail: text }) };

    }



    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {

    console.error("save-pro-profile error:", err);

    return { statusCode: 500, body: JSON.stringify({ error: "Internal error" }) };

  }

};
