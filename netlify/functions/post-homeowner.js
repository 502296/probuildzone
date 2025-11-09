// netlify/functions/post-homeowner.js

import { createClient } from '@supabase/supabase-js';



const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);



export const handler = async (event) => {

  // CORS preflight

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



    // إدخال في جدول homeowner_jobs

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

        },

      ])

      .select()

      .single();



    if (error) {

      console.error('Supabase insert error:', error);

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

    console.error('General error:', err);

    return {

      statusCode: 500,

      headers: { 'Access-Control-Allow-Origin': '*' },

      body: JSON.stringify({ ok: false, error: 'Invalid JSON' }),

    };

  }

};
