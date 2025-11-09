// netlify/functions/post-homeowner.js

import { createClient } from '@supabase/supabase-js';



const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_ANON_KEY

);



export const handler = async (event) => {

  // CORS

  if (event.httpMethod === 'OPTIONS') {

    return {

      statusCode: 200,

      headers: {

        'Access-Control-Allow-Origin': '*',

        'Access-Control-Allow-Headers': 'Content-Type',

        'Access-Control-Allow-Methods': 'POST, OPTIONS',

      },

      body: '',

    };

  }



  if (event.httpMethod !== 'POST') {

    return {

      statusCode: 405,

      headers: { 'Access-Control-Allow-Origin': '*' },

      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),

    };

  }



  try {

    const body = JSON.parse(event.body || '{}');



    const { data, error } = await supabase

      .from('homeowner_jobs')

      .insert([

        {

          category: body.category,

          project_title: body.project_title,

          short_summary: body.short_summary,

          city: body.city,

          state: body.state,

          contact_name: body.contact_name,

          phone: body.phone,

          email: body.email,

          full_address: body.full_address,

          full_description: body.full_description,

          approved: false,

        },

      ])

      .select()

      .single();



    if (error) {

      console.error(error);

      return {

        statusCode: 500,

        headers: { 'Access-Control-Allow-Origin': '*' },

        body: JSON.stringify({ ok: false, error: error.message }),

      };

    }



    return {

      statusCode: 200,

      headers: { 'Access-Control-Allow-Origin': '*' },

      body: JSON.stringify({ ok: true, data }),

    };

  } catch (err) {

    console.error(err);

    return {

      statusCode: 500,

      headers: { 'Access-Control-Allow-Origin': '*' },

      body: JSON.stringify({ ok: false, error: 'Invalid JSON' }),

    };

  }

};
