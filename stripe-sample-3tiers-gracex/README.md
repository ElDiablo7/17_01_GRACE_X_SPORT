# GRACE-X Sport™ – Stripe Subscriptions (3 tiers)

This is a small, working integration using Stripe Checkout (subscriptions) + Stripe Billing Portal, with **three tiers**:

- Starter (£3.99/mo)
- Pro Punter (£12.99/mo)
- Syndicate (£29.99/mo)

All tiers include a **7-day free trial**.

## Setup

1. Copy `.env.example` to `.env` and fill in:

- `STRIPE_SECRET_KEY`
- `APP_DOMAIN` (local or your Render URL)

2. In Stripe Dashboard, create **one Product** and **three Prices**, and set each Price's **Lookup key** to:

- `starter_monthly`
- `pro_monthly`
- `syndicate_monthly`

> If you prefer different lookup keys, update them in `.env`.

## Running locally

1. Build the server

~~~
npm install
~~~

2. Run the server

~~~
npm start
~~~

3. Open:

- http://localhost:4242/checkout.html

## Render notes

- Set the same env vars in Render (Environment / Secrets)
- Make sure `APP_DOMAIN` matches your public Render URL