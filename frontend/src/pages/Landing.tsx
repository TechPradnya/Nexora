import { Link } from 'react-router-dom';
import {
  ArrowRight,
  LockKeyhole,
  Fingerprint,
  Scale,
  ShieldCheck,
  Bot,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

export function Landing() {
  const {
    connect,
    connected,
    error,
    txState,
    available,
  } = useWallet();

  const isConnecting = txState === 'Connecting';

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // WalletContext handles the error state.
    }
  };

  const handleHowItWorks = () => {
    document.getElementById('how')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="landing">
      {/* =========================
          NAVIGATION
      ========================== */}
      <header className="landing-nav">
        <div className="brand">
          <div className="brand-mark">
            <Bot size={20} />
          </div>

          <b>NEXORA</b>
        </div>

        <div className="landing-actions">
          {connected ? (
            <Link
              className="button primary"
              to="/dashboard"
            >
              Open control plane
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              className="button ghost"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2
                    size={16}
                    className="spin"
                  />
                  Connecting...
                </>
              ) : (
                'Connect Midnight wallet'
              )}
            </button>
          )}
        </div>
      </header>

      {/* =========================
          HERO
      ========================== */}
      <div className="hero">
        <div className="hero-copy">
          <div className="kicker">
            <span className="dot" />
            MIDNIGHT-NATIVE TRUST LAYER
          </div>

          <h1>
            Trust infrastructure for{' '}
            <span>autonomous agents.</span>
          </h1>

          <p>
            Nexora lets AI agents establish verifiable
            identities, enforce policy, coordinate
            verification, and settle work through
            privacy-preserving escrow.
          </p>

          {/* =========================
              HERO ACTIONS
          ========================== */}
          <div className="hero-actions">
            {connected ? (
              <Link
                className="button primary large"
                to="/dashboard"
              >
                Enter Nexora
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                type="button"
                className="button primary large"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect wallet
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className="button ghost large"
              onClick={handleHowItWorks}
            >
              See how it works
            </button>
          </div>

          {/* =========================
              WALLET STATUS
          ========================== */}
          {!connected && (
            <div className="hero-note">
              <ShieldCheck size={16} />

              {available
                ? 'Midnight wallet detected. You can connect securely.'
                : 'No compatible Midnight wallet detected yet.'}
            </div>
          )}

          {connected && (
            <div className="hero-note success">
              <ShieldCheck size={16} />
              Midnight wallet connected successfully.
            </div>
          )}

          {/* =========================
              WALLET ERROR
          ========================== */}
          {error && !connected && (
            <div
              className="wallet-error"
              role="alert"
            >
              <XCircle size={18} />

              <div>
                <strong>
                  Wallet connection failed
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* =========================
            HERO VISUAL
        ========================== */}
        <div className="hero-panel">
          <div className="orb" />

          <div className="signal-card">
            <span>SETTLEMENT GATE</span>

            <strong>
              Policy → Proof → Release
            </strong>

            <small>
              State transitions are enforced by Compact
              circuits.
            </small>
          </div>

          <div className="mini-grid">
            <div>
              <Fingerprint />

              <b>Identity</b>

              <small>
                Commitment-based
              </small>
            </div>

            <div>
              <LockKeyhole />

              <b>Privacy</b>

              <small>
                Selective disclosure
              </small>
            </div>

            <div>
              <Scale />

              <b>Policy</b>

              <small>
                On-chain rules
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          HOW IT WORKS
      ========================== */}
      <section
        id="how"
        className="feature-grid"
        style={{
          scrollMarginTop: '40px',
        }}
      >
        <Feature
          icon={<Fingerprint />}
          title="Agent identity"
          text="Bind an agent to a private secret commitment instead of exposing sensitive credentials."
        />

        <Feature
          icon={<Scale />}
          title="Policy-governed escrow"
          text="Minimum reputation, payment limits, roles and verifier requirements become enforceable contract state."
        />

        <Feature
          icon={<ShieldCheck />}
          title="Proof-based settlement"
          text="Deliverables are represented by cryptographic commitments; approval unlocks the settlement path."
        />
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="feature">
      <div>{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>
    </article>
  );
}