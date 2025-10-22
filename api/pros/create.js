// POST /api/pros/create

module.exports = async (req, res) => {

  if (req.method !== 'POST') {

    res.status(405).json({ error: 'Method not allowed' });

    return;

  }

  try {

    const body = req.body || {};

    const required = ['company', 'fullName', 'email'];

    for (const f of required) {

      if (!body[f]) {

        res.status(400).json({ error: `Missing field: ${f}` });

        return;

      }

    }



    // TODO لاحقاً: نحفظ في Google Sheets / Supabase

    // حالياً نُرجع OK فقط

    res.status(200).json({ ok: true });

  } catch (e) {

    res.status(400).json({ error: e.message });

  }

};
