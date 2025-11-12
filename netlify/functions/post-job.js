// netlify/functions/post-job.js

exports.handler = async (event) => {

  const headers = {

    'Content-Type': 'application/json',

    'Access-Control-Allow-Origin': '*',

    'Access-Control-Allow-Methods': 'POST,OPTIONS'

  };



  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };



  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Use POST' }) };

  }



  let payload = {};

  try { payload = JSON.parse(event.body || '{}'); }

  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }



  const { name, email, address, description } = payload;

  if (!name || !email || !address || !description) {

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };

  }



  // فقط للـ test

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, received: payload }) };

};
