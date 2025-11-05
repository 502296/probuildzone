// netlify/functions/stripe-webhook.js

const Stripe = require('stripe');



exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {

    return { statusCode: 405, body: 'Method Not Allowed' };

  }



  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {

    console.error('Missing STRIPE_WEBHOOK_SECRET');

    return { statusCode: 500, body: 'Webhook secret not configured' };

  }



  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {

    apiVersion: '2024-06-20',

  });



  // نتعامل مع الحرف الكبير/الصغير

  const sig =

    event.headers['stripe-signature'] ||

    event.headers['Stripe-Signature'];



  let stripeEvent;

  try {

    stripeEvent = stripe.webhooks.constructEvent(

      event.body,

      sig,

      webhookSecret

    );

  } catch (err) {

    console.error('⚠️  Webhook signature verification failed.', err.message);

    return { statusCode: 400, body: `Webhook Error: ${err.message}` };

  }



  try {

    switch (stripeEvent.type) {

      case 'checkout.session.completed': {

        const session = stripeEvent.data.object;

        console.log('Checkout completed:', session.id);

        // هنا لاحقًا نربطه مع Supabase لو حبيت

        break;

      }

      case 'customer.subscription.created':

      case 'customer.subscription.updated':

      case 'customer.subscription.deleted': {

        const subscription = stripeEvent.data.object;

        console.log('Subscription event:', stripeEvent.type, subscription.id);

        break;

      }

      default:

        console.log('Unhandled event type:', stripeEvent.type);

    }



    return { statusCode: 200, body: 'ok' };

  } catch (err) {

    console.error('Webhook handler error:', err);

    return { statusCode: 500, body: 'Server error' };

  }

};
