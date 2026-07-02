"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  KeyRound,
  LogOut,
  MailCheck,
  Map,
  Menu,
  MessageCircle,
  ScrollText,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "@/styles/landing.css";

type IconType = typeof BookOpen;
type NavLink = { name: string; icon: IconType; href: string };

export type HudActiveLink =
  | "Compendium"
  | "Gamebook"
  | "Map"
  | "Character Ledger"
  | "My Characters";

// TODO: replace with the real Gamebook page once it's built.
const GAMEBOOK_URL =
  "https://docs.google.com/document/d/1QkXZovkaw1SzvZOmOxjfb_1DwX79_PmoU-LWwiSPLUc/edit?usp=sharing";

const BASE_NAV_LINKS: NavLink[] = [
  { name: "Compendium", icon: BookOpen, href: "/compendium" },
  { name: "Gamebook", icon: ScrollText, href: GAMEBOOK_URL },
  { name: "Map", icon: Map, href: "/map" },
  { name: "Character Ledger", icon: BookMarked, href: "/character-map" },
];

const MY_CHARACTERS_LINK: NavLink = {
  name: "My Characters",
  icon: UsersRound,
  href: "/characters",
};

const DISCORD_INVITE_URL = "https://discord.gg/JgYPJGF7DE";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type HudTopBarHandle = {
  openSignIn: () => void;
};

const HudTopBar = forwardRef<
  HudTopBarHandle,
  {
    active?: HudActiveLink;
    signedIn: boolean;
    showMyCharacters?: boolean;
    title?: string;
    showBack?: boolean;
  }
>(function HudTopBar(
  { active, signedIn, showMyCharacters = true, title = "The Portal", showBack = true },
  ref
) {
  const router = useRouter();

  const navLinks = showMyCharacters
    ? [...BASE_NAV_LINKS, MY_CHARACTERS_LINK]
    : BASE_NAV_LINKS;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSignIn() {
    setShowSignIn(true);
    setSent(false);
    setError(null);
    setMenuOpen(false);
  }

  function closeSignIn() {
    setShowSignIn(false);
  }

  useImperativeHandle(ref, () => ({ openSignIn }));

  function openDiscord() {
    setShowDiscord(true);
    setMenuOpen(false);
  }

  function closeDiscord() {
    setShowDiscord(false);
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

  return (
    <>
      {/* ===================== SHARED HUD TOP BAR ===================== */}
      <header className="hud">
        {showBack && (
          <Link className="hud-back" href="/" aria-label="Back to the landing page">
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        )}
        <img
          className="hud-crest"
          src="/coming-soon/assets/crest-simple.png"
          alt="Starfall Academy crest"
        />
        <div className="hud-titles">
          <span className="hud-eyebrow">Starfall Academy</span>
          <span className="hud-title">{title}</span>
        </div>

        <nav className="hud-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                className="sa-link-hud"
                href={link.href}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                style={
                  link.name === active
                    ? { color: "var(--text-gold)" }
                    : undefined
                }
              >
                <Icon size={15} aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <span className="hud-spacer" />

        <button className="sa-btn-ghost hud-discord" onClick={openDiscord}>
          <MessageCircle size={15} aria-hidden="true" />
          Discord
        </button>

        {signedIn ? (
          <button className="sa-btn-ghost" onClick={signOut}>
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
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
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                className="hud-menu__link"
                href={link.href}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
          <button className="hud-menu__discord" onClick={openDiscord}>
            <MessageCircle size={18} aria-hidden="true" />
            Join the Discord
          </button>
        </nav>
      )}

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

                  <label className="lp-modal__label" htmlFor="hud-email">
                    Email Address
                  </label>
                  <input
                    id="hud-email"
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
                    Runic Key Sent
                  </h2>
                  <p className="lp-modal__copy lp-modal__copy--sent">
                    We&apos;ve blinked the key to your email. Hit the link and
                    step through the gates into the Citadel. Your key expires in
                    15 minutes.
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

      {/* ===================== DISCORD INVITE MODAL ===================== */}
      {showDiscord && (
        <div
          className="lp-modal-overlay"
          onClick={closeDiscord}
          role="dialog"
          aria-modal="true"
          aria-label="Join the Discord"
        >
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal__watermark" aria-hidden="true" />
            <button
              className="lp-modal__close"
              onClick={closeDiscord}
              aria-label="Close"
            >
              <X size={15} aria-hidden="true" />
            </button>

            <div className="lp-modal__inner">
              <span className="lp-modal__sealed lp-modal__sealed--discord">
                <MessageCircle size={26} aria-hidden="true" />
              </span>
              <span className="lp-modal__eyebrow lp-modal__eyebrow--discord">
                The Great Hall
              </span>
              <h2 className="lp-modal__title lp-modal__title--sent">
                Join the Discord
              </h2>
              <p className="lp-modal__copy lp-modal__copy--sent">
                Find a group to play with, see the latest out of the world, and
                join the Starfall experience in our Discord server.
              </p>
              <a
                className="sa-btn-primary"
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeDiscord}
              >
                <MessageCircle size={17} aria-hidden="true" />
                Join the Server
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default HudTopBar;
