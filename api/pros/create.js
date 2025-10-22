module.exports = async (req, res) => {
// Check if the request method is POST
if (req.method !== 'POST') {
res.status(405).json({ error: 'Method not allowed' });
return;
}

try {
// Extract body, default to empty object if undefined
const body = req.body || {};

// Define required fields
const required = ['company', 'fullName', 'email'];

// Validate required fields
for (const field of required) {
if (!body[field]) {
res.status(400).json({ error: `Missing field: ${field}` });
return;
}
}

// Additional validation (optional)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
res.status(400).json({ error: 'Invalid email format' });
return;
}

// TODO: Save to Google Sheets / Supabase later
// For now, return a success response with a mock ID
const mockProId = `PRO-${Date.now()}`; // Example: PRO-1634823901234
res.status(200).json({ ok: true, proId: mockProId });

} catch (e) {
// Log the error for debugging (optional, Vercel logs it automatically)
console.error('Error in /api/pros/create:', e.message);
res.status(400).json({ error: e.message || 'An unexpected error occurred' });
}
};
