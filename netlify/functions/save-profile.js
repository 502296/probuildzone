// netlify/functions/save-profile.js

const { google } = require('googleapis');



exports.handler = async (event) => {

  try {

    if (event.httpMethod !== 'POST') {

      return { statusCode: 405, body: 'Method Not Allowed' };

    }



    // === 1) إعداد الاعتماد (Service Account) ===

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    const sheetId    = process.env.SHEET_ID;      // Spreadsheet ID

    const tabName    = process.env.SHEET_TAB || 'Sheet1';



    if (!clientEmail || !privateKey || !sheetId) {

      return {

        statusCode: 500,

        body: JSON.stringify({ error: 'Missing Google Sheet credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, SHEET_ID)' })

      };

    }



    const jwt = new google.auth.JWT(

      clientEmail,

      null,

      privateKey,

      ['https://www.googleapis.com/auth/spreadsheets']

    );

    await jwt.authorize();



    const sheets = google.sheets({ version: 'v4', auth: jwt });



    // === 2) قراءة جسم الطلب (بيانات النموذج) ===

    const body = JSON.parse(event.body || '{}');



    const {

      biz = '',              // Company Name

      name = '',             // Full Name

      email = '',

      phone = '',

      address = '',          // Business Address (حقل "primary" أو "address" حسب واجهتك)

      license = '',

      insurance = '',        // "true"/"false" أو "on"/""

      notes = '',            // ملاحظات

      stripe_customer_id = '',   // نتركها فارغة الآن (تُملأ لاحقًا عبر webhook)

      stripe_subscription_id = ''// نتركها فارغة الآن

    } = body;



    // تحضير القيم بترتيب الأعمدة لديك:

    // Timestamp | Company Name | Full Name | Email | Phone | Business Address | Business License | Has Insurance | Notes | Status | Stripe Customer ID | Subscription ID

    const timestamp = new Date().toISOString();

    const hasInsurance = (String(insurance).toLowerCase() === 'true' || String(insurance).toLowerCase() === 'on') ? 'YES' : (insurance ? 'YES' : 'NO');

    const status = 'Pending';



    const row = [

      timestamp,

      biz,

      name,

      email,

      phone,

      address,

      license,

      hasInsurance,

      notes,

      status,

      stripe_customer_id,

      stripe_subscription_id

    ];



    // === 3) الإضافة إلى الشيت ===

    await sheets.spreadsheets.values.append({

      spreadsheetId: sheetId,

      range: `${tabName}!A:Z`,

      valueInputOption: 'RAW',

      requestBody: { values: [row] }

    });



    return {

      statusCode: 200,

      body: JSON.stringify({ ok: true })

    };



  } catch (err) {

    console.error('save-profile error:', err);

    return {

      statusCode: 500,

      body: JSON.stringify({ error: 'Failed to save profile' })

    };

  }

};
