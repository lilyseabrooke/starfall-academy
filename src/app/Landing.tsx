"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  KeyRound,
  LogOut,
  MailCheck,
  Map,
  Menu,
  MessageCircle,
  Play,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "@/styles/landing.css";

type IconType = typeof BookOpen;

type NavLink = { name: string; icon: IconType; href: string };
type Destination = NavLink & { blurb: string };

const NAV_LINKS: NavLink[] = [
  { name: "Compendium", icon: BookOpen, href: "#" },
  { name: "Gamebook", icon: ScrollText, href: "#" },
  { name: "Map", icon: Map, href: "#" },
  { name: "Character Ledger", icon: BookMarked, href: "/characters" },
];

const DESTINATIONS: Destination[] = [
  {
    name: "Compendium",
    icon: BookOpen,
    href: "#",
    blurb:
      "The reference of all spells, artifacts, potions, and everything else within the wards.",
  },
  {
    name: "Gamebook",
    icon: ScrollText,
    href: "#",
    blurb: "The rules, the world, and how to run a game of your own.",
  },
  {
    name: "Map",
    icon: Map,
    href: "#",
    blurb: "Explore Starfall Academy and the many places within.",
  },
  {
    name: "Character Ledger",
    icon: BookMarked,
    href: "/characters",
    blurb: "The legends of the arcane world.",
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Landing({
  signedIn,
  userEmail,
}: {
  signedIn: boolean;
  userEmail: string | null;
}) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInitial = (userEmail?.trim()[0] ?? "I").toUpperCase();

  function openSignIn() {
    setShowSignIn(true);
    setSent(false);
    setError(null);
    setMenuOpen(false);
  }

  function closeSignIn() {
    setShowSignIn(false);
  }

  async function sendLink() {
    if (sending) return;
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  function play() {
    if (signedIn) {
      router.push("/characters");
    } else {
      openSignIn();
    }
  }

  const playHint = signedIn
    ? "Continue to your character dashboard"
    : "Sign in to start your story";

  return (
    <div className="lp-root">
      {/* ===================== SHARED HUD TOP BAR ===================== */}
      <header className="hud">
        <img
          className="hud-crest"
          src="/coming-soon/assets/crest-simple.png"
          alt="Starfall Academy crest"
        />
        <div className="hud-titles">
          <span className="hud-eyebrow">Starfall Academy</span>
          <span className="hud-title">The Portal</span>
        </div>

        <nav className="hud-nav">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.name} className="sa-link-hud" href={link.href}>
                <Icon size={15} aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <span className="hud-spacer" />

        <a className="sa-btn-ghost hud-discord" href="#">
          <MessageCircle size={15} aria-hidden="true" />
          Discord
        </a>

        {signedIn ? (
          <div className="hud-user">
            <div className="hud-user__id">
              <span className="hud-user__avatar">{avatarInitial}</span>
              <span className="hud-user__name">Initiate</span>
            </div>
            <button className="sa-btn-ghost" onClick={signOut}>
              <LogOut size={15} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        ) : (
          <button className="sa-btn-ghost" onClick={openSignIn}>
            <KeyRound size={15} aria-hidden="true" />
            <span className="hud-signin-label">Sign In</span>
          </button>
        )}

        <button
          className="sa-btn-ghost hud-burger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <X size={19} aria-hidden="true" />
          ) : (
            <Menu size={19} aria-hidden="true" />
          )}
        </button>
      </header>

      {/* Mobile / tablet nav drawer */}
      {menuOpen && (
        <nav className="hud-menu">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                className="hud-menu__link"
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
          <a
            className="hud-menu__discord"
            href="#"
            onClick={() => setMenuOpen(false)}
          >
            <MessageCircle size={18} aria-hidden="true" />
            Join the Discord
          </a>
        </nav>
      )}

      {/* ===================== HERO ===================== */}
      <main className="lp-main">
        <div className="lp-watermark" aria-hidden="true" />

        <section className="lp-hero">
          <div className="lp-eyebrow">
            <span className="lp-eyebrow__rule" />
            Semper ad astra
            <span className="lp-eyebrow__rule" />
          </div>
          <h1 className="lp-title">
            Starfall
            <br />
            Academy
          </h1>
          <p className="lp-sub">
            A modern-fantasy tabletop adventure of greatness and the arcane.
            <br />
            Enter the Citadel, build your character, tell your story, and
            remember:
            <br />
            stay out of trouble.
          </p>

          <div className="lp-actions">
            <button className="sa-btn-primary" onClick={play}>
              <Play size={18} aria-hidden="true" />
              Play the Game
            </button>
            {!signedIn && (
              <button className="sa-btn-ghost" onClick={openSignIn}>
                <Sparkles size={17} aria-hidden="true" />
                Sign In
              </button>
            )}
          </div>
          <p className="lp-playhint">{playHint}</p>
        </section>

        {/* ===================== DESTINATION CARDS ===================== */}
        <section className="lp-dest">
          <div className="lp-dest__head">
            <span className="lp-dest__label">Explore the Realm</span>
            <span className="lp-dest__rule" />
          </div>
          <div className="lp-dest__grid">
            {DESTINATIONS.map((dest) => {
              const Icon = dest.icon;
              return (
                <Link
                  key={dest.name}
                  className="sa-card-dest"
                  href={dest.href}
                >
                  <span className="sa-card-icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div className="sa-card-body">
                    <span className="sa-card-name">{dest.name}</span>
                    <span className="sa-card-blurb">{dest.blurb}</span>
                  </div>
                  <span className="sa-card-enter">
                    Enter
                    <ArrowRight
                      className="sa-card-chev"
                      size={14}
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ===================== FOOTER ===================== */}
        <footer className="lp-footer">Starfall Academy · Semper Ad Astra</footer>
      </main>

      {/* ===================== MAGIC-LINK SIGN-IN MODAL ===================== */}
      {showSignIn && (
        <div
          className="lp-modal-overlay"
          onClick={closeSignIn}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in"
        >
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal__watermark" aria-hidden="true" />
            <button
              className="lp-modal__close"
              onClick={closeSignIn}
              aria-label="Close"
            >
              <X size={15} aria-hidden="true" />
            </button>

            <div className="lp-modal__inner">
              <img
                className="lp-modal__crest"
                src="/coming-soon/assets/crest-simple.png"
                alt=""
              />

              {!sent ? (
                <div className="lp-modal__pane">
                  <span className="lp-modal__eyebrow">Initiation</span>
                  <h2 className="lp-modal__title">Sign In</h2>
                  <p className="lp-modal__copy">
                    Enter your email address and we&apos;ll blink you a one-time
                    access code to enter the site. No passwords to remember.
                  </p>

                  <label className="lp-modal__label" htmlFor="lp-email">
                    Email Address
                  </label>
                  <input
                    id="lp-email"
                    className="sa-input-ml"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendLink();
                    }}
                    placeholder="arcanist@starfall.to"
                    autoFocus
                  />

                  {error && <p className="lp-modal__error">{error}</p>}

                  <button
                    className="sa-btn-primary"
                    onClick={sendLink}
                    disabled={sending}
                  >
                    <Sparkles size={17} aria-hidden="true" />
                    {sending ? "Sending…" : "Send Magic Link"}
                  </button>
                  <p className="lp-modal__oath">
                    By signing in you solemnly swear to stay out of trouble.
                  </p>
                </div>
              ) : (
                <div className="lp-modal__pane">
                  <span className="lp-modal__sealed">
                    <MailCheck size={26} aria-hidden="true" />
                  </span>
                  <h2 className="lp-modal__title lp-modal__title--sent">
                    Check Your Scrolls
                  </h2>
                  <p className="lp-modal__copy lp-modal__copy--sent">
                    A sign-in link is winging its way to{" "}
                    <strong>{email.trim()}</strong>. Click it within fifteen
                    minutes to enter the Academy.
                  </p>
                  <button
                    className="sa-btn-ghost sa-btn-ghost--reset"
                    onClick={() => {
                      setSent(false);
                      setError(null);
                    }}
                  >
                    <ArrowLeft size={15} aria-hidden="true" />
                    Use a different address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
