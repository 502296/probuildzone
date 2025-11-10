import { createClient } from '@supabase/supabase-js'



const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_ANON_KEY

)



export const handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      body: JSON.stringify({ ok: false, error: 'Method not allowed' })

    }

  }



  try {

    const body = JSON.parse(event.body || '{}')

    const {

      project_title,

      short_summary,

      city,

      state,

      contact_name,

      phone,

      email,

      full_address,

      full_description,

      category,

      file_urls

    } = body



    const { error } = await supabase

      .from('homeowners_jobs')

      .insert([

        {

          project_title,

          short_summary,

          city,

          state,

          contact_name,

          phone,

          email,

          full_address,

          full_description,

          category,

          file_urls

        }

      ])



    if (error) throw error



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true, message: 'Job posted successfully' })

    }

  } catch (err) {

    console.error(err)

    return {

      statusCode: 500,

      body: JSON.stringify({ ok: false, error: err.message })

    }

  }

}
