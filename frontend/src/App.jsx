import { useEffect, useRef, useState } from 'react';
import { detectLocation, COUNTRIES } from './lib/geo';
import { compareProduct, getTrendingDeals, sendBrookMessage } from './lib/api';
import { getSpeechRecognition, speak, describeBestDeal } from './lib/voice';
import { startWakeWordListener, listenOnce } from './lib/wakeword';
import logoImg from './assets/logo.png';
import LocationMapPicker from './components/LocationMapPicker';
import IntroVideo from './components/IntroVideo';
import BrookAssistant from './components/BrookAssistant';
import PricingPage from './components/PricingPage';
import './App.css';

function IconBrook() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12c1.5-3 3.5-3 5-1.5s3.5 1.5 5-1.5 3.5-3 5-1.5" />
      <path d="M2.5 16c1.5-3 3.5-3 5-1.5s3.5 1.5 5-1.5 3.5-3 5-1.5" opacity="0.5" />
      <circle cx="10" cy="5" r="2.3" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="6.5" r="3.2" />
      <path d="M3.5 17c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
    </svg>
  );
}

function IconBookmark({ filled = false }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 3.5h10v13l-5-3.2-5 3.2z" />
    </svg>
  );
}

function SaveButton({ saved, onClick }) {
  return (
    <button
      className={`save-btn ${saved ? 'saved' : ''}`}
      onClick={onClick}
      aria-label={saved ? 'Remove from saved deals' : 'Save deal'}
      aria-pressed={saved}
      type="button"
    >
      <IconBookmark filled={saved} />
    </button>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 15h14l1-8-4.5 3L10 4 6.5 10 2 7z" />
    </svg>
  );
}

function LogoMark() {
  return <img className="brand-mark" src={logoImg} alt="Deal Breaker logo" />;
}

function IconSun() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4l1.4-1.4M14 6l1.4-1.4" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <path d="M16.5 12.8A7.2 7.2 0 0 1 7.2 3.5a7.2 7.2 0 1 0 9.3 9.3z" />
    </svg>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={!isDark}
      type="button"
    >
      <span className="theme-toggle-icon sun">
        <IconSun />
      </span>
      <span className="theme-toggle-icon moon">
        <IconMoon />
      </span>
      <span className={`theme-toggle-knob ${isDark ? '' : 'light'}`} />
    </button>
  );
}

const NAV_ITEMS = [
  { key: 'brook', label: 'Talk to Brook', icon: IconBrook },
  { key: 'profile', label: 'Profile', icon: IconProfile },
  { key: 'saved', label: 'Saved Deals', icon: IconBookmark },
  { key: 'history', label: 'History', icon: IconClock },
  { key: 'upgrade', label: 'Upgrade to Pro', icon: IconCrown, cta: true },
];

const CATEGORIES = [
  { label: 'Electronics', emoji: '🎧', query: 'wireless earbuds' },
  { label: 'Laptops', emoji: '💻', query: 'laptop' },
  { label: 'Smart Watches', emoji: '⌚', query: 'smart watch' },
  { label: 'Home & Kitchen', emoji: '🍳', query: 'air fryer' },
  { label: 'Fashion', emoji: '👟', query: 'running shoes' },
  { label: 'Beauty', emoji: '💄', query: 'skincare set' },
  { label: 'Gaming', emoji: '🎮', query: 'gaming headset' },
  { label: 'Fitness', emoji: '🏋️', query: 'dumbbell set' },
];

function LandingPage({ onStartTrial, onSignIn, theme, onToggleTheme, onOpenPrivacy, onOpenTerms }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="brand">
          <LogoMark />
          <span className="brand-name">DEAL BREAKER</span>
        </div>
        
        <div className="landing-nav-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="btn-ghost" onClick={onSignIn}>
            Sign In
          </button>
        </div>
      </nav>

      <div className="landing-hero">
        <h1>Never overpay for anything again.</h1>
        <p className="brand-attribution">A product of Ahava Infotech Solutions</p>
        <p className="tagline">
          Deal Breaker compares prices across every major store in seconds — by text or voice — so you always land
          the best deal.
        </p>
        <div className="cta-row">
          <button className="btn-primary" onClick={onStartTrial}>
            Start My Free Trial
          </button>
          <button className="btn-ghost" onClick={onSignIn}>
            Sign In
          </button>
        </div>
        <p className="fine-print">No credit card required · Cancel anytime</p>
      </div>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Ahava Infotech Solutions</span>
        <span className="landing-footer-links">
          <button onClick={onOpenPrivacy}>Privacy Policy</button>
          <button onClick={onOpenTerms}>Terms of Service</button>
        </span>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.8 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-1.8 14-5.4l-6.5-5.4c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8L6 32.2C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.4C41.9 36.4 44 30.8 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function AuthPage({ mode, onSwitchMode, onSubmit, onGoogleAuth, onBack, theme, onToggleTheme }) {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);

  function handleSubmit(e) {
    if (isSignup && password !== confirmPassword) {
      e.preventDefault();
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError(null);
    onSubmit(e, email);
  }

  return (
    <div className="landing">
      <div className="auth-topbar">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand auth-brand">
            <LogoMark />
            <span className="brand-name">DEAL BREAKER</span>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${isSignup ? 'active' : ''}`} onClick={() => onSwitchMode('signup')}>
              Sign Up
            </button>
            <button className={`auth-tab ${!isSignup ? 'active' : ''}`} onClick={() => onSwitchMode('login')}>
              Log In
            </button>
          </div>

          <button type="button" className="google-auth-btn" onClick={onGoogleAuth}>
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or {isSignup ? 'sign up' : 'log in'} with email</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <label className="auth-field">
                <span>Name</span>
                <input type="text" placeholder="Jane Doe" required />
              </label>
            )}
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
              />
            </label>
            {isSignup && (
              <label className="auth-field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                />
              </label>
            )}
            {passwordError && <p className="auth-field-error">{passwordError}</p>}

            <button type="submit" className="btn-primary auth-submit">
              {isSignup ? 'Create account' : 'Log In'}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <button onClick={() => onSwitchMode('login')}>Log in</button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button onClick={() => onSwitchMode('signup')}>Sign up</button>
              </>
            )}
          </p>

          <button className="auth-back" onClick={onBack}>
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProfileView({
  email,
  plan,
  usedSearches,
  searchLimit,
  savedCount,
  historyCount,
  onUpgrade,
  onSignOut,
  onOpenPrivacy,
  onOpenTerms,
}) {
  const pct = Math.min(100, Math.round((usedSearches / searchLimit) * 100));
  const initial = (email || '?').charAt(0).toUpperCase();
  return (
    <div className="profile-card">
      <div className="profile-avatar">{initial}</div>
      <h2 className="profile-email">{email}</h2>
      <span className="profile-plan-badge">{plan} plan</span>

      <div className="profile-usage">
        <div className="profile-usage-row">
          <span>Free searches used</span>
          <span>
            {usedSearches} / {searchLimit}
          </span>
        </div>
        <div className="usage-bar">
          <div className="usage-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{savedCount}</span>
          <span className="profile-stat-label">Saved deals</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{historyCount}</span>
          <span className="profile-stat-label">Searches made</span>
        </div>
      </div>

      <button className="btn-primary profile-upgrade-btn" onClick={onUpgrade}>
        Upgrade to Pro
      </button>
      <button className="back-link profile-signout" onClick={onSignOut}>
        Sign out
      </button>

      <div className="profile-legal-links">
        <button onClick={onOpenPrivacy}>Privacy Policy</button>
        <button onClick={onOpenTerms}>Terms of Service</button>
      </div>
    </div>
  );
}

function HistoryView({ history, onRerun, onClear }) {
  if (history.length === 0) {
    return (
      <div className="placeholder-card">
        <div className="placeholder-icon">
          <IconClock />
        </div>
        <h2>No searches yet</h2>
        <p>Your recent price comparisons will show up here.</p>
      </div>
    );
  }
  return (
    <>
      <div className="history-toolbar">
        <button className="back-link" onClick={onClear}>
          Clear history
        </button>
      </div>
      <div className="history-list">
        {history.map((h, i) => (
          <button className="history-item" key={i} onClick={() => onRerun(h.query)}>
            <div className="history-item-main">
              <span className="history-item-query">{h.query}</span>
              <span className="history-item-meta">
                {formatRelativeTime(h.timestamp)} · {h.resultCount} result{h.resultCount === 1 ? '' : 's'}
              </span>
            </div>
            {h.bestPrice && (
              <div className="history-item-price">
                {h.bestPrice}
                {h.bestStore && <span className="history-item-store"> at {h.bestStore}</span>}
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

const LEGAL_UPDATED = 'August 13, 2026';

function LegalPage({ kind, onBack, theme, onToggleTheme }) {
  const isPrivacy = kind === 'privacy';
  return (
    <div className="landing">
      <div className="auth-topbar">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <div className="legal-page">
        <button className="back-link" onClick={onBack}>
          ← Back to home
        </button>
        <h1>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
        <p className="legal-updated">Last updated: {LEGAL_UPDATED}</p>
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <>
      <p>
        Deal Breaker is a product of Ahava Infotech Solutions ("we", "us"). This page explains what information the
        app collects and how it's used.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>The email address you enter when you sign up or log in.</li>
        <li>Your approximate or precise location, only if you allow it, to show nearby stores and distances.</li>
        <li>The product searches you run, your saved deals, and your search history.</li>
        <li>Messages you send to the Brook AI assistant.</li>
      </ul>
      <p>
        Today, this account and activity data is stored only in your browser's local storage — there is no server-side
        account database yet. Clearing your browser data or switching devices will erase it.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run price comparisons and show you results across stores.</li>
        <li>To power the Brook AI assistant's replies to your questions.</li>
        <li>To rank nearby stores by distance when location access is granted.</li>
      </ul>

      <h2>Third-party services</h2>
      <p>Search queries and location data pass through the following third parties to make the app work:</p>
      <ul>
        <li>Apify — sources live product and price listings.</li>
        <li>Anthropic — powers the Brook AI assistant's responses.</li>
        <li>OpenStreetMap Nominatim — converts addresses and coordinates for location features.</li>
      </ul>
      <p>Each processes the data you send them under their own privacy policies.</p>

      <h2>Cookies &amp; tracking</h2>
      <p>Deal Breaker does not use advertising or cross-site tracking cookies.</p>

      <h2>Your choices</h2>
      <ul>
        <li>You can deny location and microphone permissions — the app still works with typed searches.</li>
        <li>You can clear your saved deals, history, and session at any time by clearing your browser's site data.</li>
      </ul>

      <h2>Children's privacy</h2>
      <p>Deal Breaker is not directed at children under 13.</p>

      <h2>Changes to this policy</h2>
      <p>We'll update this page if what we collect or how we use it changes.</p>

      <h2>Contact</h2>
      <p>Questions about this policy can be directed to Ahava Infotech Solutions.</p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p>By using Deal Breaker, you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        Deal Breaker helps you compare product prices across stores and chat with the Brook AI assistant. Results are
        sourced from third-party data providers — prices, availability, and store details can be out of date or
        inaccurate. Always confirm the price and availability on the retailer's own site before buying.
      </p>

      <h2>Accounts</h2>
      <p>
        You're responsible for the activity that happens under the email you sign in with. Paid plans referenced in
        the app (Pro, Premium) are not yet available for purchase — no payment is currently collected, and upgrading
        has no effect beyond a confirmation message.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don't use Deal Breaker to abuse, scrape at scale, or interfere with the service, and don't attempt to
        circumvent search limits through automated means.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The service is provided "as is," without warranties of any kind. We don't guarantee that prices, deals, or
        Brook's responses are accurate, complete, or current.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Ahava Infotech Solutions is not liable for purchasing decisions made based on information shown in Deal
        Breaker, or for losses arising from use of the service.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms as the service evolves. Continued use after changes means you accept them.</p>

      <h2>Contact</h2>
      <p>Questions about these terms can be directed to Ahava Infotech Solutions.</p>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('dealbreaker-theme') || 'dark');
  const [view, setView] = useState('intro');
  const [authMode, setAuthMode] = useState('signup');
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('us');
  const [locationLabel, setLocationLabel] = useState('Detecting location…');
  const [coords, setCoords] = useState(null);
  const [locationPrecise, setLocationPrecise] = useState(false);
  const [fullAddress, setFullAddress] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [bestDeal, setBestDeal] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [listening, setListening] = useState(false);
  const [savedDeals, setSavedDeals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dealbreaker-saved') || '[]');
    } catch {
      return [];
    }
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dealbreaker-search-history') || '[]');
    } catch {
      return [];
    }
  });
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [brookMessages, setBrookMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dealbreaker-brook-messages') || '[]');
    } catch {
      return [];
    }
  });
  const [brookLoading, setBrookLoading] = useState(false);
  const [wakeArmed, setWakeArmed] = useState(false);
  const [brookInlineStatus, setBrookInlineStatus] = useState(null); // null | 'listening' | 'thinking'
  const [brookInlineReply, setBrookInlineReply] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(() => localStorage.getItem('dealbreaker-current-email') || null);
  const [searchCounts, setSearchCounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dealbreaker-search-counts') || '{}');
    } catch {
      return {};
    }
  });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const recognitionRef = useRef(null);
  const wakeControllerRef = useRef(null);
  const wakeArmedRef = useRef(false);
  const inlineReplyTimeoutRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dealbreaker-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  useEffect(() => {
    localStorage.setItem('dealbreaker-saved', JSON.stringify(savedDeals));
  }, [savedDeals]);

  useEffect(() => {
    localStorage.setItem('dealbreaker-search-history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('dealbreaker-brook-messages', JSON.stringify(brookMessages));
  }, [brookMessages]);

  useEffect(() => {
    if (currentUserEmail) localStorage.setItem('dealbreaker-current-email', currentUserEmail);
  }, [currentUserEmail]);

  useEffect(() => {
    localStorage.setItem('dealbreaker-search-counts', JSON.stringify(searchCounts));
  }, [searchCounts]);

  // Free tier is capped per account (keyed by the email used to sign in), not by time —
  // this only lives in the browser today since there's no real backend user database
  // yet, so it's an honest, bypassable-by-clearing-storage limit, not a secure one.
  const SEARCH_LIMIT = 5;

  function hasReachedSearchLimit() {
    if (!currentUserEmail) return false;
    return (searchCounts[currentUserEmail] || 0) >= SEARCH_LIMIT;
  }

  function recordSearchUsage() {
    if (!currentUserEmail) return;
    setSearchCounts((prev) => ({ ...prev, [currentUserEmail]: (prev[currentUserEmail] || 0) + 1 }));
  }

  const MAX_HISTORY = 50;

  function recordSearchHistory(entry) {
    setSearchHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }

  function clearSearchHistory() {
    setSearchHistory([]);
  }

  function handleSignOut() {
    setCurrentUserEmail(null);
    localStorage.removeItem('dealbreaker-current-email');
    setActiveTab('search');
    setView('landing');
  }

  async function handleBrookSend(text) {
    if (hasReachedSearchLimit()) {
      setShowLimitModal(true);
      return null;
    }
    const trimmed = text?.trim();
    if (!trimmed) return null;

    recordSearchUsage();
    const nextMessages = [...brookMessages, { role: 'user', content: trimmed }];
    setBrookMessages(nextMessages);
    setBrookLoading(true);

    try {
      const savedDealsSummary = savedDeals.length
        ? savedDeals
            .slice(0, 10)
            .map((d) => `${d.title} (${d.displayPrice} at ${d.store})`)
            .join('; ')
        : null;

      const data = await sendBrookMessage(
        nextMessages.map(({ role, content }) => ({ role, content })),
        { country, coords: locationPrecise ? coords : null, savedDealsSummary }
      );

      setBrookMessages((prev) => [...prev, { role: 'assistant', content: data.reply, bestDeal: data.bestDeal ?? null }]);
      speak(data.reply);

      // Whenever Brook actually searches, reflect it in the main results view too —
      // she and the search bar share the same results, wherever you asked from.
      if (data.results) {
        setResults(data.results);
        setBestDeal(data.bestDeal);
        setFromCache(false);
      }

      return data;
    } catch (err) {
      const errorReply = `Sorry, something went wrong: ${err.message}`;
      setBrookMessages((prev) => [...prev, { role: 'assistant', content: errorReply }]);
      speak(errorReply);
      return { reply: errorReply, results: null, bestDeal: null };
    } finally {
      setBrookLoading(false);
    }
  }

  function handleBrookClear() {
    setBrookMessages([]);
  }

  async function handleBrookWake(remainder) {
    // Only one SpeechRecognition session can run at a time, so pause the
    // continuous wake-word listener while we handle this turn.
    wakeControllerRef.current?.stop();
    wakeControllerRef.current = null;

    let query = remainder;

    if (!query) {
      setBrookInlineStatus('listening');
      speak("I'm listening — what are you looking for?");
      try {
        query = (await listenOnce())?.trim();
      } catch {
        query = null;
      }
    }

    if (query) {
      setBrookInlineStatus('thinking');
      const data = await handleBrookSend(query);
      if (data) {
        clearTimeout(inlineReplyTimeoutRef.current);
        setBrookInlineReply(data.reply);
        inlineReplyTimeoutRef.current = setTimeout(() => setBrookInlineReply(null), 9000);
      }
    }

    setBrookInlineStatus(null);

    if (wakeArmedRef.current) {
      wakeControllerRef.current = startWakeWordListener({ onWake: handleBrookWake, onError: () => {} });
    }
  }

  function setWakeArmedState(value) {
    wakeArmedRef.current = value;
    setWakeArmed(value);
  }

  function toggleWakeWord() {
    if (wakeArmedRef.current) {
      wakeControllerRef.current?.stop();
      wakeControllerRef.current = null;
      setWakeArmedState(false);
      return;
    }
    setWakeArmedState(true);
    wakeControllerRef.current = startWakeWordListener({
      onWake: handleBrookWake,
      onError: (msg) => {
        setWakeArmedState(false);
        setError(msg);
      },
    });
  }

  useEffect(() => {
    return () => {
      wakeControllerRef.current?.stop();
      clearTimeout(inlineReplyTimeoutRef.current);
    };
  }, []);

  function dealKey(deal) {
    return `${deal.store}|${deal.title}|${deal.link}`;
  }

  function isDealSaved(deal) {
    const key = dealKey(deal);
    return savedDeals.some((d) => dealKey(d) === key);
  }

  function toggleSaveDeal(deal) {
    setSavedDeals((prev) => {
      const key = dealKey(deal);
      if (prev.some((d) => dealKey(d) === key)) {
        return prev.filter((d) => dealKey(d) !== key);
      }
      return [...prev, deal];
    });
  }

  // Only ask for location (which triggers the browser's permission prompt) once the
  // user has actually logged in and reached the app — not on the landing/auth screens,
  // where a permission popup would be an unexplained, off-putting first impression.
  useEffect(() => {
    if (view !== 'app') return;

    detectLocation().then((loc) => {
      setCountry(loc.countryCode);
      setLocationPrecise(loc.source === 'gps');
      setCoords(loc.lat != null && loc.lon != null ? { lat: loc.lat, lon: loc.lon } : null);
      setFullAddress(loc.fullAddress || null);

      const place = [loc.city, loc.region].filter(Boolean).join(', ');
      if (loc.source === 'default') {
        setLocationLabel('Could not detect location — defaulted to United States');
      } else if (loc.source === 'gps' && loc.fullAddress) {
        setLocationLabel(`📍 ${loc.fullAddress}`);
      } else if (loc.source === 'gps' && place) {
        setLocationLabel(`Detected: ${place}, ${loc.countryName} 📍`);
      } else if (place) {
        setLocationLabel(`Detected: ${place}, ${loc.countryName}`);
      } else {
        setLocationLabel(`Detected: ${loc.countryName}`);
      }
    });
  }, [view]);

  function handleMapConfirm(picked) {
    setFullAddress(picked.displayName);
    setLocationLabel(`📍 ${picked.displayName}`);
    setLocationPrecise(true);
    if (picked.countryCode) setCountry(picked.countryCode.toLowerCase());
    if (picked.lat != null && picked.lon != null) {
      setCoords({ lat: picked.lat, lon: picked.lon });
    }
    setShowMapPicker(false);
  }

  useEffect(() => {
    recognitionRef.current = getSpeechRecognition();
  }, []);

  useEffect(() => {
    setTrendingLoading(true);
    getTrendingDeals(country)
      .then((data) => setTrending(data.deals || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, [country]);

  function runCategorySearch(categoryQuery) {
    setQuery(categoryQuery);
    runSearch(categoryQuery);
  }

  async function runSearch(searchQuery) {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    if (hasReachedSearchLimit()) {
      setShowLimitModal(true);
      return;
    }
    recordSearchUsage();
    setLoading(true);
    setError(null);
    setResults([]);
    setBestDeal(null);
    try {
      const data = await compareProduct(q, country, locationPrecise ? coords : null);
      setResults(data.results);
      setBestDeal(data.bestDeal);
      setFromCache(!!data.cached);
      speak(describeBestDeal(data.bestDeal, data.resultCount));
      recordSearchHistory({
        query: q,
        timestamp: Date.now(),
        resultCount: data.resultCount ?? data.results?.length ?? 0,
        bestPrice: data.bestDeal?.displayPrice ?? null,
        bestStore: data.bestDeal?.store ?? null,
      });
    } catch (err) {
      setError(err.message);
      speak('Sorry, something went wrong while comparing prices.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch();
  }

  function handleVoiceSearch() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('Voice search is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      runSearch(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  const activeNavItem = NAV_ITEMS.find((item) => item.key === activeTab);

  function handleAuthSubmit(e, email) {
    e.preventDefault();
    setCurrentUserEmail(email.trim().toLowerCase());
    setView('app');
  }

  function handleGoogleAuth() {
    // Mock OAuth has no real account behind it — every "Google" sign-in shares one
    // bucket, since there's no real Google identity to key the search limit on.
    setCurrentUserEmail('google-authenticated-user');
    setView('app');
  }

  if (view === 'intro') {
    return <IntroVideo onFinish={() => setView('landing')} />;
  }

  if (view === 'landing') {
    return (
      <LandingPage
        theme={theme}
        onToggleTheme={toggleTheme}
        onStartTrial={() => {
          setAuthMode('signup');
          setView('auth');
        }}
        onSignIn={() => {
          setAuthMode('login');
          setView('auth');
        }}
        onOpenPrivacy={() => setView('privacy')}
        onOpenTerms={() => setView('terms')}
      />
    );
  }

  if (view === 'privacy' || view === 'terms') {
    return (
      <LegalPage
        kind={view}
        theme={theme}
        onToggleTheme={toggleTheme}
        onBack={() => setView(currentUserEmail ? 'app' : 'landing')}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthPage
        theme={theme}
        onToggleTheme={toggleTheme}
        mode={authMode}
        onSwitchMode={setAuthMode}
        onSubmit={handleAuthSubmit}
        onGoogleAuth={handleGoogleAuth}
        onBack={() => setView('landing')}
      />
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActiveTab('search')} aria-label="Deal Breaker home">
          <LogoMark />
          <span className="brand-name">DEAL BREAKER</span>
        </button>
        <p className="sidebar-attribution">A product of Ahava Infotech Solutions</p>
        <nav className="side-nav">
          {NAV_ITEMS.map(({ key, label, icon: Icon, cta }) => (
            <button
              key={key}
              className={`nav-item ${activeTab === key ? 'active' : ''} ${cta ? 'nav-cta' : ''}`}
              onClick={() => setActiveTab(key)}
              aria-label={label}
              title={label}
            >
              <Icon />
              <span>{label}</span>
              {key === 'saved' && savedDeals.length > 0 && (
                <span className="nav-badge">{savedDeals.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Dark mode</span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </aside>

      {activeTab === 'saved' ? (
        <main className="app">
          <header>
            <h1>Saved Deals</h1>
            <p className="tagline">Deals you've bookmarked for later.</p>
          </header>
          {savedDeals.length === 0 ? (
            <div className="placeholder-card">
              <div className="placeholder-icon">
                <IconBookmark />
              </div>
              <h2>No saved deals yet</h2>
              <p>Tap the bookmark icon on any deal to save it here.</p>
              <button className="back-link" onClick={() => setActiveTab('search')}>
                ← Back to price comparison
              </button>
            </div>
          ) : (
            <div className="results-grid">
              {savedDeals.map((d, i) => (
                <div className="result-card" key={i}>
                  <SaveButton saved onClick={() => toggleSaveDeal(d)} />
                  {d.thumbnail ? (
                    <img className="result-thumb" src={d.thumbnail} alt="" />
                  ) : (
                    <div className="result-thumb result-thumb-empty" />
                  )}
                  <div className="result-title" title={d.title}>
                    {d.title}
                  </div>
                  <div className="result-store">
                    {d.store}
                    {d.distanceMiles != null && <span className="result-distance"> · 📍 {d.distanceMiles} mi</span>}
                  </div>
                  <div className="result-price">{d.displayPrice}</div>
                  <a className="result-link" href={d.link} target="_blank" rel="noreferrer">
                    {d.linkType === 'store' ? `Buy at ${d.store} →` : 'View on Google →'}
                  </a>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : activeTab === 'brook' ? (
        <main className="app brook-main">
          <BrookAssistant
            messages={brookMessages}
            loading={brookLoading}
            onSend={handleBrookSend}
            onClear={handleBrookClear}
          />
        </main>
      ) : activeTab === 'upgrade' ? (
        <main className="app pricing-main">
          <PricingPage onBack={() => setActiveTab('search')} />
        </main>
      ) : activeTab === 'profile' ? (
        <main className="app">
          <header>
            <h1>Profile</h1>
            <p className="tagline">Your account and usage at a glance.</p>
          </header>
          <ProfileView
            email={currentUserEmail}
            plan="Free"
            usedSearches={searchCounts[currentUserEmail] || 0}
            searchLimit={SEARCH_LIMIT}
            savedCount={savedDeals.length}
            historyCount={searchHistory.length}
            onUpgrade={() => setActiveTab('upgrade')}
            onSignOut={handleSignOut}
            onOpenPrivacy={() => setView('privacy')}
            onOpenTerms={() => setView('terms')}
          />
        </main>
      ) : activeTab === 'history' ? (
        <main className="app">
          <header>
            <h1>Search History</h1>
            <p className="tagline">Your recent price comparisons.</p>
          </header>
          <HistoryView
            history={searchHistory}
            onRerun={(q) => {
              setQuery(q);
              setActiveTab('search');
              runSearch(q);
            }}
            onClear={clearSearchHistory}
          />
        </main>
      ) : activeTab !== 'search' ? (
        <main className="app">
          <div className="placeholder-card">
            <div className="placeholder-icon">
              <activeNavItem.icon />
            </div>
            <h2>{activeNavItem.label}</h2>
            <p>This section is coming soon.</p>
            <button className="back-link" onClick={() => setActiveTab('search')}>
              ← Back to price comparison
            </button>
          </div>
        </main>
      ) : (
      <main className="app">
      <header>
        <h1>Looking for best deals?</h1>
        <h3 className="subtitle">Let me do that for you...</h3>
        <p className="tagline">Compare a product's price across stores and find the best deal — by text or voice.</p>
      </header>

      <form className="search-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Sony WH-1000XM5 headphones"
          aria-label="Product search"
        />
        <button type="button" className={`mic-btn ${listening ? 'listening' : ''}`} onClick={handleVoiceSearch} title="Search by voice">
          {listening ? '● Listening…' : '🎤'}
        </button>
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Compare Prices'}
        </button>
      </form>

      {loading && (
        <p className="loading-hint">
          <span className="spinner" aria-hidden="true" />
          Checking stores… first search for a product can take up to 30s.
        </p>
      )}

      <div className="location-row">
        <span className="location-label" title={fullAddress || undefined}>
          {locationLabel}
        </span>
        <div className="location-actions">
          <button type="button" className="address-edit-btn" onClick={() => setShowMapPicker(true)}>
            📍 {fullAddress ? 'Change on map' : 'Pin on map'}
          </button>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showMapPicker && (
        <LocationMapPicker
          initialCoords={coords}
          onConfirm={handleMapConfirm}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {showLimitModal && (
        <div className="map-modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="limit-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="limit-modal-icon">🔒</div>
            <h2>You've reached your free search limit</h2>
            <p>
              Free accounts get {SEARCH_LIMIT} searches. Upgrade to Pro for unlimited price comparisons and
              unlimited conversations with Brook.
            </p>
            <div className="limit-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setShowLimitModal(false);
                  setActiveTab('upgrade');
                }}
              >
                Upgrade to Pro
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowLimitModal(false)}>
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {!loading && !bestDeal && results.length === 0 && (
        <>
          <div className="category-section">
            <h3>Explore deals by category</h3>
            <div className="category-grid">
              {CATEGORIES.map((c) => (
                <button key={c.label} className="category-card" onClick={() => runCategorySearch(c.query)}>
                  <span className="category-emoji">{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="trending-section">
            <h3>🔥 Trending deals right now</h3>
            {trendingLoading ? (
              <p className="loading-hint">
                <span className="spinner" aria-hidden="true" />
                Loading live deals from across the web…
              </p>
            ) : trending.length === 0 ? (
              <p className="tagline">No trending deals available right now — try a search instead.</p>
            ) : (
              <div className="results-grid">
                {trending.map((t, i) => (
                  <div className="result-card" key={i}>
                    <SaveButton saved={isDealSaved(t.bestDeal)} onClick={() => toggleSaveDeal(t.bestDeal)} />
                    {t.bestDeal.thumbnail ? (
                      <img className="result-thumb" src={t.bestDeal.thumbnail} alt="" />
                    ) : (
                      <div className="result-thumb result-thumb-empty" />
                    )}
                    <div className="result-title" title={t.bestDeal.title}>
                      {t.bestDeal.title}
                    </div>
                    <div className="result-store">
                      {t.bestDeal.store}
                      {t.bestDeal.distanceMiles != null && (
                        <span className="result-distance"> · 📍 {t.bestDeal.distanceMiles} mi</span>
                      )}
                    </div>
                    <div className="result-price">{t.bestDeal.displayPrice}</div>
                    <a
                      className="result-link"
                      href={t.bestDeal.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.bestDeal.linkType === 'store' ? `Buy at ${t.bestDeal.store} →` : 'View on Google →'}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {bestDeal && (
        <div className="best-deal-card">
          <div className="badge">{fromCache ? 'Best Deal ⚡ cached' : '🏆 Best Deal'}</div>
          <SaveButton saved={isDealSaved(bestDeal)} onClick={() => toggleSaveDeal(bestDeal)} />
          <div className="best-deal-body">
            {bestDeal.thumbnail && <img className="best-deal-thumb" src={bestDeal.thumbnail} alt="" />}
            <div className="best-deal-info">
              <h2>{bestDeal.title}</h2>
              <p className="price">{bestDeal.displayPrice}</p>
              <p className="store">
                at {bestDeal.store}
                {bestDeal.distanceMiles != null && (
                  <span className="result-distance"> · 📍 {bestDeal.distanceMiles} mi away</span>
                )}
              </p>
              {bestDeal.rating && (
                <p className="rating">
                  ⭐ {bestDeal.rating} ({bestDeal.reviews ?? 0} reviews)
                </p>
              )}
              {bestDeal.delivery && <p className="delivery">{bestDeal.delivery}</p>}
              <a href={bestDeal.link} target="_blank" rel="noreferrer">
                {bestDeal.linkType === 'store' ? `Buy at ${bestDeal.store} →` : 'View on Google Shopping →'}
              </a>
            </div>
          </div>
        </div>
      )}

      {results.length > 1 && (
        <div className="results-section">
          <h3>All offers ({results.length})</h3>
          <div className="results-grid">
            {results.slice(1).map((r, i) => (
              <div className="result-card" key={i}>
                <SaveButton saved={isDealSaved(r)} onClick={() => toggleSaveDeal(r)} />
                {r.thumbnail ? (
                  <img className="result-thumb" src={r.thumbnail} alt="" />
                ) : (
                  <div className="result-thumb result-thumb-empty" />
                )}
                <div className="result-title" title={r.title}>
                  {r.title}
                </div>
                <div className="result-store">
                  {r.store}
                  {r.distanceMiles != null && <span className="result-distance"> · 📍 {r.distanceMiles} mi</span>}
                </div>
                <div className="result-price">{r.displayPrice}</div>
                <a className="result-link" href={r.link} target="_blank" rel="noreferrer">
                  {r.linkType === 'store' ? `Buy at ${r.store} →` : 'View on Google →'}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      </main>
      )}

      {activeTab === 'search' && (
        <>
          {(brookInlineStatus || brookInlineReply) && (
            <div className={`brook-inline-bubble ${brookInlineStatus ? 'status' : ''}`}>
              {brookInlineStatus === 'listening' && '🎤 I\'m listening…'}
              {brookInlineStatus === 'thinking' && '🤔 Let me check that…'}
              {!brookInlineStatus && brookInlineReply}
            </div>
          )}
          <button
            type="button"
            className={`brook-fab ${wakeArmed ? 'armed' : ''}`}
            onClick={toggleWakeWord}
            aria-label={wakeArmed ? 'Stop listening for Brook' : 'Wake Brook'}
          >
            <span className="brook-fab-avatar">🌊</span>
            {!brookInlineStatus && !brookInlineReply && (
              <span className="brook-fab-tooltip">
                {wakeArmed ? 'Listening… say "hey brook" anytime' : 'Hi there, say "hey brook" to wake me up.'}
              </span>
            )}
          </button>
        </>
      )}
    </div>
  );
}
