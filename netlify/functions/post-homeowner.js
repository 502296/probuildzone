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



    const {

      category,

      project_title,

      short_summary,

      city,

      state,

      budget_from,

      budget_to,

      contact_name,

      phone,

      email,

      full_address,

      full_description,

    } = body;



    const { data, error } = await supabase

      .from('homeowner_jobs')

      .insert([

        {

          category,

          project_title,

          short_summary,

          city,

          state,

          budget_from,

          budget_to,

          contact_name,

          phone,

          email,

          full_address,

          full_description,

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
