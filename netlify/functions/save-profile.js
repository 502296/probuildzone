fetch('/.netlify/functions/save-profile-rest', {

  method: 'POST',

  headers: { 'Content-Type': 'application/json' },

  body: JSON.stringify({

    name: 'Test Pro',

    email: 'test@example.com',

    phone: '502-000-0000',

    address: 'Louisville, KY',

    license: 'KY-12345',

    insurance: 'Yes',

    notes: 'Test from Ali'

  })

})

.then(r => r.text())

.then(console.log)

.catch(console.error);
