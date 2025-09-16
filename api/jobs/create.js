import { createClient } from '@supabase/supabase-js';



export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });



  try {

    const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const anon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const service = process.env.SUPABASE_SERVICE_ROLE;

    const authHeader = req.headers.authorization || '';



    // DB client (RLS يُطبق إن وُجد توكن)

    const db    = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

    const admin = createClient(url, service); // لرفع الصور (صلاحية مرتفعة)



    const body = req.body || {};

    const {

      category, title, summary, city, state, budget_min, budget_max,

      address, contact_name, phone, email, description_long, photosBase64

    } = body;



    // 1) إنشاء job (ولو فيه مستخدم مسجل سيتم ربطه)

    const { data: sessionInfo } = await db.auth.getUser();

    const user_id = sessionInfo?.user?.id || null;



    const baseJob = { category, title, summary, city, state, budget_min, budget_max };

    if (user_id) baseJob.user_id = user_id;



    const { data: job, error: e1 } = await db.from('jobs').insert(baseJob).select().single();

    if (e1) return res.status(400).json({ error: e1.message });



    // 2) رفع الصور (خاصة)

    const paths = [];

    for (let i = 0; i < (photosBase64 || []).length; i++) {

      const bin = Buffer.from(photosBase64[i], 'base64');

      const filePath = `${job.id}/${Date.now()}_${i}.jpg`;

      const { error: upErr } = await admin.storage.from('job-photos')

        .upload(filePath, bin, { contentType: 'image/jpeg', upsert: true });

      if (upErr) return res.status(400).json({ error: upErr.message });

      paths.push(filePath);

    }



    // 3) التفاصيل الخاصة

    const { error: e2 } = await db.from('jobs_private').insert({

      job_id: job.id, address, contact_name, phone, email, description_long, photos: paths

    });

    if (e2) return res.status(400).json({ error: e2.message });



    return res.json({ ok: true, job_id: job.id });

  } catch (err) {

    console.error(err);

    return res.status(500).json({ error: 'Server error' });

  }

}
