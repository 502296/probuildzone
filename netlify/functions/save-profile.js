// netlify/functions/save-profile.js

const { createClient } = require('@supabase/supabase-js');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method not allowed' };

  }



  const SUPABASE_URL = process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;



  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {

    console.error('Missing Supabase env vars');

    return { statusCode: 500, body: 'Supabase not configured' };

  }



  let body;

  try {

    body = JSON.parse(event.body);

  } catch (err) {

    return { statusCode: 400, body: 'Invalid JSON' };

  }



  const {

    name = '',

    email = '',

    phone = '',

    address = '',

    license = '',

    insurance = '',

    notes = ''

  } = body;



  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);



  // جدولك اسمه pros وفيه الأعمدة: email, phone, company_address, license_no, insurance_no, notes, stripe_status

  const { error } = await supabase

    .from('pros')

    .insert([{

      email,

      phone,

      company_address: address,

      license_no: license,

      insurance_no: insurance,

      // نحفظ اسم البزنس داخل الملاحظات حتى نحتفظ به

      notes: name ? `Business: ${name}\n${notes}` : notes,

      stripe_status: 'pending'

    }]);



  if (error) {

    console.error('Supabase insert error:', error);

    return { statusCode: 500, body: 'Supabase insert error' };

  }



  return {

    statusCode: 200,

    body: 'ok'

  };

};
