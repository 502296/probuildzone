// netlify/functions/save-profile.js

const { google } = require('googleapis');



exports.handler = async (event) => {

  try {

    if (event.httpMethod !== 'POST') {

      return { statusCode: 405, body: 'Method Not Allowed' };

    }



    // 1) Env checks

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    const privateKey  = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    const sheetId     = process.env.SHEET_ID;

    const tabNameEnv  = process.env.SHEET_TAB;

    const tabName     = tabNameEnv && tabNameEnv.trim() ? tabNameEnv.trim() : 'Sheet1';



    if (!clientEmail || !privateKey || !sheetId) {

      const msg = `Missing envs: email=${!!clientEmail} key=${!!privateKey} sheet=${!!sheetId}`;

      console.error(msg);

      return { statusCode: 500, body: JSON.stringify({ ok:false, error: msg }) };

    }



    // 2) Auth

    const jwt = new google.auth.JWT(

      clientEmail,

      null,

      privateKey,

      ['https://www.googleapis.com/auth/spreadsheets']

    );

    await jwt.authorize();

    const sheets = google.sheets({ version: 'v4', auth: jwt });



    // 3) Parse payload

    const body = JSON.parse(event.body || '{}');

    const {

      biz = '', name = '', email = '', phone = '',

      address = '', license = '', insurance = '',

      notes = '', status = 'trial_active',

      stripe_customer_id = '', stripe_subscription_id = '', session_id = ''

    } = body;



    const timestamp = new Date().toISOString();

    const hasInsurance = (String(insurance).toLowerCase() === 'true' || String(insurance).toLowerCase() === 'yes' || String(insurance).toLowerCase() === 'on') ? 'YES' : (insurance ? 'YES' : 'NO');



    const row = [

      timestamp,          // Timestamp

      biz,                // Company Name

      name,               // Full Name

      email,              // Email

      phone,              // Phone

      address,            // Business Address

      license,            // Business License

      hasInsurance,       // Has Insurance

      notes,              // Notes

      status,             // Status

      stripe_customer_id || stripe_subscription_id || session_id // Stripe Customer/Subscription/Session

    ];



    // 4) Append

    try {

      const range = `${tabName}!A:K`;  // 11 أعمدة حسب الشيت الظاهر بالصورة

      await sheets.spreadsheets.values.append({

        spreadsheetId: sheetId,

        range,

        valueInputOption: 'USER_ENTERED',

        requestBody: { values: [row] }

      });

    } catch (appendErr) {

      console.error('Append error:', appendErr);

      // احتمال اسم التاب غير موجود → أعد رسالة واضحة

      return {

        statusCode: 500,

        body: JSON.stringify({ ok:false, error: `Append failed. Check SHEET_TAB ("${tabName}") exists. Details: ${appendErr.message}` })

      };

    }



    return { statusCode: 200, body: JSON.stringify({ ok: true }) };



  } catch (err) {

    console.error('save-profile fatal error:', err);

    return { statusCode: 500, body: JSON.stringify({ ok:false, error: err.message || 'Failed to save profile' }) };

  }

};
