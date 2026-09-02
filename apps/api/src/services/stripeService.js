import Stripe from 'stripe';

export function getStripe() {
  const key = process.env.STRIPE_SECRET || '';
  if (!key) return null;
  return new Stripe(key);
}

export function isStripeConfigured() {
  const key = process.env.STRIPE_SECRET || '';
  return Boolean(key && key.startsWith('sk_'));
}

export async function createDonationCheckout({ donationId, amount, holderName, successUrl, cancelUrl, productName }) {
  const stripe = getStripe();
  if (!stripe) {
    return { success: false, message: 'Card payment is not configured.' };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'xaf',
        unit_amount: Math.round(Number(amount)),
        product_data: {
          name: productName || 'The Sound She Carries donation',
          description: holderName ? `Gift from ${holderName}` : 'Live Recording · Lian Ministrel',
        },
      },
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      donation_id: String(donationId),
      amount: String(Math.round(Number(amount))),
      holder_name: holderName || '',
    },
  });

  return { success: true, url: session.url, sessionId: session.id };
}

export async function getCheckoutStatus(sessionId) {
  const stripe = getStripe();
  if (!stripe || !sessionId) return { status: 'PENDING' };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === 'paid' || session.status === 'complete';
  if (paid) {
    return {
      status: 'SUCCESSFUL',
      holderName: session.customer_details?.name || session.metadata?.holder_name || null,
    };
  }
  if (session.status === 'expired') return { status: 'FAILED' };
  return { status: 'PENDING' };
}

export function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!stripe) throw new Error('Stripe is not configured');
  if (!secret) {
    return JSON.parse(rawBody.toString('utf8'));
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
