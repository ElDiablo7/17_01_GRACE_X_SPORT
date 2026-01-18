require('dotenv').config();

const express = require('express');

// Never hardcode Stripe keys in source. Use env vars.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment');
}
const stripe = require('stripe')(stripeSecretKey);

const app = express();

// If you deploy behind a proxy (Render, Vercel, etc.) this helps with correct redirects.
app.set('trust proxy', 1);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Webhook endpoint (optional)
// IMPORTANT: webhooks require the raw body, so this MUST be defined
// before express.json() middleware.
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const endpointSecret = process.env.WEBHOOK_SECRET;
  let event = req.body;

  if (endpointSecret) {
    const signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
      console.log('⚠️  Webhook signature verification failed.', err.message);
      return res.sendStatus(400);
    }
  }

  // TODO: Handle events you care about.
  // customer.subscription.created/updated/deleted etc.
  console.log(`Webhook received: ${event?.type || 'unknown'}`);
  return res.sendStatus(200);
});

app.use(express.json());

// Public domain of your app (no trailing slash)
// Local: http://localhost:4242
// Prod (Render): https://your-service.onrender.com
const YOUR_DOMAIN = (process.env.APP_DOMAIN || 'http://localhost:4242').replace(/\/$/, '');

// 7-day trial across all paid tiers
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 7);

// Use Stripe Price "lookup keys" so you don't need to hardcode price_ IDs.
// In Stripe Dashboard: Product -> Pricing -> (Price) -> "Lookup key"
const LOOKUP_KEYS = {
  starter: process.env.STRIPE_LOOKUP_STARTER || 'starter_monthly',
  pro: process.env.STRIPE_LOOKUP_PRO || 'pro_monthly',
  syndicate: process.env.STRIPE_LOOKUP_SYNDICATE || 'syndicate_monthly',
};

function pickTier(raw) {
  const tier = String(raw || '').toLowerCase().trim();
  if (!tier || !Object.prototype.hasOwnProperty.call(LOOKUP_KEYS, tier)) return null;
  return tier;
}

// Create a new subscription Checkout session for a tier.
app.post('/create-checkout-session', async (req, res) => {
  try {
    const tier = pickTier(req.body.tier || req.body.plan || req.body.lookup_key);
    if (!tier) return res.status(400).send('Missing/invalid tier. Use starter | pro | syndicate');

    const prices = await stripe.prices.list({
      lookup_keys: [LOOKUP_KEYS[tier]],
      expand: ['data.product'],
      limit: 1,
    });

    if (!prices.data?.length) {
      return res.status(400).send(
        `No Stripe price found for lookup key: ${LOOKUP_KEYS[tier]} (tier: ${tier}). ` +
          'Set the lookup key on the Stripe Price, or update your env vars.'
      );
    }

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'auto',
      mode: 'subscription',

      // If you want users to be able to enter promo codes in checkout.
      allow_promotion_codes: true,

      line_items: [{
        price: prices.data[0].id,
        quantity: 1,
      }],

      subscription_data: {
        // Free trial without needing to set it on the price in Stripe.
        trial_period_days: TRIAL_DAYS,
        // Optional metadata for your own tracking
        metadata: {
          gracex_tier: tier,
        },
      },

      success_url: `${YOUR_DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}&tier=${encodeURIComponent(tier)}`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
    });

    return res.redirect(303, session.url);
  } catch (e) {
    console.error(e);
    return res.status(500).send(String(e?.message || e));
  }
});

// Customer billing portal (manage cancel / update card / swap plans, etc.)
app.post('/create-portal-session', async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).send('Missing session_id');

    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    const returnUrl = YOUR_DOMAIN;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer,
      return_url: returnUrl,
    });

    return res.redirect(303, portalSession.url);
  } catch (e) {
    console.error(e);
    return res.status(500).send(String(e?.message || e));
  }
});

// "Admin key" activation (simple server-side check + redirect).
// This does NOT create a Stripe subscription. It's just a backdoor for your own testing/admin.
// Put a comma-separated list of keys in ADMIN_KEYS env var.
app.post('/activate-key', (req, res) => {
  const provided = String(req.body.admin_key || '').trim();
  const keys = String(process.env.ADMIN_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (!provided) return res.status(400).send('Missing admin_key');
  if (!keys.length) return res.status(400).send('ADMIN_KEYS not set on server');

  const ok = keys.includes(provided);
  if (!ok) return res.status(403).send('Invalid key');

  // Redirect to success page with a flag. Your real app would set a secure cookie / JWT.
  return res.redirect(303, `${YOUR_DOMAIN}/success.html?activated=1`);
});

const port = Number(process.env.PORT || 4242);
app.listen(port, () => console.log(`Running on port ${port}`));
