import { useState } from 'react';

// Fixed approximate USD conversion rates for display only — billing isn't live yet
// (see the footnote below), so there's no live FX rate feed wired up. Locale controls
// number grouping/symbol placement (e.g. ₹87,00 vs 87,00 €), currency controls the
// actual unit (and its native decimal digits — Intl handles JPY's 0 decimals itself).
const COUNTRY_CURRENCY = {
  us: { currency: 'USD', locale: 'en-US', rate: 1 },
  gb: { currency: 'GBP', locale: 'en-GB', rate: 0.79 },
  in: { currency: 'INR', locale: 'en-IN', rate: 87 },
  ca: { currency: 'CAD', locale: 'en-CA', rate: 1.37 },
  au: { currency: 'AUD', locale: 'en-AU', rate: 1.52 },
  de: { currency: 'EUR', locale: 'de-DE', rate: 0.92 },
  fr: { currency: 'EUR', locale: 'fr-FR', rate: 0.92 },
  ae: { currency: 'AED', locale: 'en-AE', rate: 3.67 },
  sg: { currency: 'SGD', locale: 'en-SG', rate: 1.34 },
  jp: { currency: 'JPY', locale: 'ja-JP', rate: 149 },
};

function formatPrice(usdAmount, country) {
  const { currency, locale, rate } = COUNTRY_CURRENCY[country] || COUNTRY_CURRENCY.us;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(usdAmount * rate);
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l3.5 3.5L16 5.5" />
    </svg>
  );
}

const FREE_FEATURES = [
  '5 price searches per month',
  'Compare prices across major stores',
  'Voice search & spoken results',
  'Save deals for later',
  'Location-aware nearby stores',
];

const PRO_FEATURES = [
  'Unlimited price searches',
  'Unlimited conversations with Brook',
  'Priority search results',
  'Early access to new features',
];

const PREMIUM_FEATURES = [
  'Price drop alerts on saved deals',
  'Unlimited saved watchlists',
  'Fastest priority search — skip the queue entirely',
  'Dedicated priority support',
  'Family sharing for up to 5 people',
];

export default function PricingPage({ onBack, country }) {
  const [billing, setBilling] = useState('monthly');
  const [upgradeMessage, setUpgradeMessage] = useState(null);

  const prices = {
    free: formatPrice(0, country),
    pro: formatPrice(billing === 'monthly' ? 9.99 : 7.99, country),
    premium: formatPrice(billing === 'monthly' ? 19.99 : 15.99, country),
  };
  const period = billing === 'monthly' ? '/month' : '/month, billed yearly';

  function handleUpgradeClick(plan) {
    setUpgradeMessage(
      `🎉 Thanks for your interest in ${plan}! Billing isn't live yet — we'll let you know the moment it launches.`
    );
  }

  return (
    <div className="pricing-page">
      <button className="back-link pricing-back" onClick={onBack}>
        ← Back to price comparison
      </button>

      <div className="pricing-header">
        <h1>Simple pricing, better deals.</h1>
        <p className="tagline">Start free. Upgrade whenever you outgrow the free tier.</p>

        <div className="billing-toggle">
          <button
            type="button"
            className={billing === 'monthly' ? 'active' : ''}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billing === 'yearly' ? 'active' : ''}
            onClick={() => setBilling('yearly')}
          >
            Yearly <span className="save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid pricing-grid-3">
        <div className="pricing-card">
          <div className="pricing-card-name">Free</div>
          <div className="pricing-card-price">
            {prices.free}
            <span>/month</span>
          </div>
          <p className="pricing-card-desc">For trying Deal Breaker out.</p>
          <button className="btn-ghost pricing-cta" disabled>
            Your current plan
          </button>
          <ul className="pricing-features">
            {FREE_FEATURES.map((f) => (
              <li key={f}>
                <IconCheck />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pricing-card pricing-card-pro">
          <div className="pricing-card-badge">Most popular</div>
          <div className="pricing-card-name">Pro</div>
          <div className="pricing-card-price">
            {prices.pro}
            <span>{period}</span>
          </div>
          <p className="pricing-card-desc">For shoppers who search often.</p>
          <button className="btn-primary pricing-cta" onClick={() => handleUpgradeClick('Pro')}>
            Upgrade to Pro
          </button>
          <p className="pricing-features-lead">Everything in Free, plus:</p>
          <ul className="pricing-features">
            {PRO_FEATURES.map((f) => (
              <li key={f}>
                <IconCheck />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pricing-card pricing-card-premium">
          <div className="pricing-card-badge pricing-card-badge-premium">Best value</div>
          <div className="pricing-card-name">Premium</div>
          <div className="pricing-card-price">
            {prices.premium}
            <span>{period}</span>
          </div>
          <p className="pricing-card-desc">For power shoppers and families.</p>
          <button className="btn-primary pricing-cta pricing-cta-premium" onClick={() => handleUpgradeClick('Premium')}>
            Upgrade to Premium
          </button>
          <p className="pricing-features-lead">Everything in Pro, plus:</p>
          <ul className="pricing-features">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f}>
                <IconCheck />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {upgradeMessage && <div className="pricing-message">{upgradeMessage}</div>}

      <p className="pricing-footnote">
        Prices shown are illustrative, converted to your local currency at approximate rates, and may change before
        billing launches.
      </p>
    </div>
  );
}
