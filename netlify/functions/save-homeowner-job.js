exports.handler = async (event, context) => {
if (event.httpMethod !== 'POST') {
return { statusCode: 405, body: 'Method Not Allowed' };
}

try {
const data = JSON.parse(event.body);
// هنا ممكن تحفظ في DB، أو ترسل إيميل، أو تحفظ في ملف
console.log('New Job:', data);

// مثال: إرجاع نجاح
return {
statusCode: 200,
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ success: true, message: 'Job posted!', id: Date.now() })
};
} catch (error) {
return {
statusCode: 400,
body: JSON.stringify({ error: error.message })
};
}
