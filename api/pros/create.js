// /api/pros/create.js

module.exports = async (req, res) => {

  // CORS الخفيف (إن لزم)

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');



  if (req.method === 'OPTIONS') {

    return res.status(200).end();

  }



  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'Method not allowed' });

  }



  try {

    const body = req.body || {};



    // حقول متوقعة من النموذج — عدّل الأسماء لتطابق الحقول لديك

    const required = ['company', 'fullName', 'email'];

    const missing = required.filter((k) => !body[k]);



    if (missing.length) {

      return res.status(400).json({

        ok: false,

        error: 'Missing fields',

        fields: missing

      });

    }



    // لاحقًا: احفظ بـ Google Sheets/Supabase/Email

    // الآن نرجّع OK وبنفس البيانات لتأكيد الاستلام

    return res.status(200).json({

      ok: true,

      received: {

        company: body.company,

        fullName: body.fullName,

        phone: body.phone || null,

        email: body.email,

        address: body.address || null,

        businessLicense: body.businessLicense || null,

        insurance: body.insurance || null,

        notes: body.notes || null

      }

    });

  } catch (err) {

    console.error('pros/create error:', err);

    return res.status(500).json({ ok: false, error: 'Server error', details: err.message });

  }

};
