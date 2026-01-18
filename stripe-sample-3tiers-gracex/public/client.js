// In production, this should check CSRF, and not pass the session ID.
// The customer ID for the portal should be pulled from the
// authenticated user on the server.
document.addEventListener('DOMContentLoaded', async () => {
  let searchParams = new URLSearchParams(window.location.search);
  const activated = searchParams.get('activated') === '1';
  const tier = searchParams.get('tier');

  const titleEl = document.getElementById('success-title');
  const portalForm = document.getElementById('portal-form');

  if (titleEl) {
    if (activated) {
      titleEl.textContent = 'Key activated ✅ (admin access)';
    } else if (tier) {
      const label = tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Pro Punter' : tier === 'syndicate' ? 'Syndicate' : tier;
      titleEl.textContent = `Subscription started ✅ (${label})`;
    } else {
      titleEl.textContent = "You're in ✅";
    }
  }

  if (searchParams.has('session_id')) {
    const session_id = searchParams.get('session_id');
    document.getElementById('session-id').setAttribute('value', session_id);
  } else {
    // No Stripe session means we can't open the billing portal.
    if (portalForm) portalForm.style.display = 'none';
  }
});