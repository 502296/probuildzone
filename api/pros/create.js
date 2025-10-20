export default async function handler(req, res) {

  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' });

  const url = process.env.GS_WEBAPP_URL;

  if (!url) return res.status(500).json({ ok:false, error:'Missing GS_WEBAPP_URL' });



  try {

    const resp = await fetch(url, {

      method: 'POST',

      headers: { 'Content-Type':'application/json' },

      body: JSON.stringify({ ...req.body, source:'probuildzone', ts:new Date().toISOString() })

    });

    const data = await resp.json().catch(()=>({}));

    if (!resp.ok) return res.status(500).json({ ok:false, error:'GS error', details:data || await resp.text() });

    return res.status(200).json({ ok:true, gs:data });

  } catch (e) {

    return res.status(500).json({ ok:false, error:String(e) });

  }

}
