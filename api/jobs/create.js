import { createClient } from '@supabase/supabase-js'



const supabase = createClient(

  process.env.NEXT_PUBLIC_SUPABASE_URL,

  process.env.SUPABASE_SERVICE_ROLE

)



export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({ error: "Method not allowed" })

  }



  const { category, name, phone, address, details, photos } = req.body



  try {

    // 1) حفظ job الأساسي

    const { data: job, error: jobError } = await supabase

      .from("jobs")

      .insert([{ category, status: "pending" }])

      .select()

      .single()



    if (jobError) throw jobError



    // 2) حفظ تفاصيل صاحب المنزل (private)

    const { error: privError } = await supabase

      .from("jobs_private")

      .insert([{

        job_id: job.id,

        homeowner_name: name,

        phone,

        address,

        details

      }])

    if (privError) throw privError



    // 3) رفع الصور للبَكِت job-photos

    for (let photo of photos) {

      const base64Data = photo.data.split(',')[1] // remove "data:image/...;base64,"

      const buffer = Buffer.from(base64Data, "base64")

      await supabase.storage.from("job-photos").upload(

        `${job.id}/${photo.name}`,

        buffer,

        { contentType: "image/jpeg", upsert: true }

      )

    }



    return res.status(200).json({ jobId: job.id })

  } catch (err) {

    console.error(err)

    return res.status(500).json({ error: err.message })

  }

}
