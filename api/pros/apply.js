// /api/pros/apply.js  (Vercel Serverless / Node 18+)

module.exports = async (req, res) => {

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  try {

    const {

      company = '', full_name = '', email = '', phone = '',

      address = '', website = '', areas = '', services = '', notes = ''

    } = req.body || {};



    if (!company || !full_name || !email || !phone) {

      return res.status(400).json({ error: 'Missing required fields' });

    }



    const GAS_URL = process.env.GAS_SHEETS_WEBAPP_URL;

    if (!GAS_URL) return res.status(500).json({ error: 'Missing GAS_SHEETS_WEBAPP_URL' });



    const payload = {

      company, full_name, email, phone, address, website, areas, services, notes,

      source: 'pros-apply',

      created_at: new Date().toISOString()

    };



    // استخدم fetch الأصلي (لا نحتاج node-fetch)

    const r = await fetch(GAS_URL, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify(payload)

    });



    const txt = await r.text();

    let json;

    try { json = JSON.parse(txt); } catch { json = null; }



    if (!r.ok || (json && json.ok === false)) {

      return res.status(502).json({ error: 'Sheets relay failed', detail: txt.slice(0, 300) });

    }



    return res.status(200).json({ ok: true });

  } catch (err) {

    return res.status(500).json({ error: err.message || String(err) });

  }

};
