"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  BookMarked,
  BookOpen,
  Compass,
  Feather,
  KeyRound,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  Plus,
  ScrollText,
  Settings2,
  Sparkles,
  Swords,
  UserMinus,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "@/styles/landing.css";
import "@/styles/characters.css";

export type CharacterCard = {
  id: string;
  name: string;
  monogram: string;
  pronouns: string;
  year: string;
  house: string;
  tone: string;
  campaign: string | null;
};

type IconType = typeof BookOpen;
type NavLink = { name: string; icon: IconType; href: string; active?: boolean };

const NAV_LINKS: NavLink[] = [
  { name: "Compendium", icon: BookOpen, href: "#" },
  { name: "Gamebook", icon: ScrollText, href: "#" },
  { name: "Map", icon: Map, href: "#" },
  { name: "Character Ledger", icon: BookMarked, href: "#" },
  { name: "My Characters", icon: UsersRound, href: "/characters", active: true },
];

// TODO: replace with the real Discord invite link.
const DISCORD_INVITE_URL = "https://discord.gg/your-invite-here";

const KNOWN_TONES = new Set(["gold", "crimson", "teal", "plum", "forest"]);

// Short, human-typeable campaign code (no separate campaigns table yet).
function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(
    bytes,
    (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]
  ).join("");
}

export default function CharactersView({
  characters,
  userEmail,
}: {
  characters: CharacterCard[];
  userEmail: string | null;
}) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showDiscord, setShowDiscord] = useState(false);
  // The character whose manage popup is open, plus its inner view.
  const [manageId, setManageId] = useState<string | null>(null);
  const [manageView, setManageView] = useState<"menu" | "join">("menu");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const avatarInitial = (userEmail?.trim()[0] ?? "I").toUpperCase();
  const managed = characters.find((c) => c.id === manageId) ?? null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  function openManage(id: string) {
    setManageId(id);
    setManageView("menu");
    setJoinCode("");
  }
  function closeManage() {
    setManageId(null);
  }

  async function setCampaign(id: string, code: string | null) {
    setBusy(true);
    await fetch(`/api/characters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_code: code }),
    }).catch(() => {});
    setBusy(false);
    closeManage();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Withdraw this character? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/characters/${id}`, { method: "DELETE" }).catch(() => {});
    setBusy(false);
    closeManage();
    router.refresh();
  }

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
              <Link
                key={link.name}
                className="sa-link-hud"
                href={link.href}
                style={link.active ? { color: "var(--text-gold)" } : undefined}
              >
                <Icon size={15} aria-hidden="true" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <span className="hud-spacer" />

        <button
          className="sa-btn-ghost hud-discord"
          onClick={() => {
            setShowDiscord(true);
            setMenuOpen(false);
          }}
        >
          <MessageCircle size={15} aria-hidden="true" />
          Discord
        </button>

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
          <button
            className="hud-menu__discord"
            onClick={() => {
              setShowDiscord(true);
              setMenuOpen(false);
            }}
          >
            <MessageCircle size={18} aria-hidden="true" />
            Join the Discord
          </button>
        </nav>
      )}

      {/* ===================== PAGE BODY ===================== */}
      <main className="cp-main">
        <div className="cp-watermark" aria-hidden="true" />

        <section className="cp-section">
          {/* page heading */}
          <div className="cp-head">
            <div>
              <div className="cp-eyebrow">
                <span className="cp-eyebrow__rule" />
                Records Hall · {characters.length}{" "}
                {characters.length === 1 ? "arcanist" : "arcanists"} enrolled
              </div>
              <h1 className="cp-title">My Characters</h1>
              <p className="cp-lede">
                The reckless and wild casters you&apos;ve enrolled for your
                adventures. Manage your campaign enrollment status, join a game,
                drop into an existing game, or go to the admissions office to
                enroll a new character.
              </p>
            </div>
            <Link className="sa-btn-primary" href="/characters/new">
              <Feather size={17} aria-hidden="true" />
              New Character
            </Link>
          </div>

          <div className="cp-rule" />

          {/* character grid */}
          <div className="cp-grid">
            {characters.map((ch) => {
              const toneClass = KNOWN_TONES.has(ch.tone)
                ? `house--${ch.tone}`
                : "house--gold";
              return (
                <article key={ch.id} className={`sa-char-card ${toneClass}`}>
                  {/* top: token + identity */}
                  <div className="cp-card__top">
                    <div className="cp-token">
                      <span className="cp-token__ring" />
                      <span className="cp-token__face">
                        <span className="cp-token__mono">{ch.monogram}</span>
                      </span>
                    </div>
                    <div className="cp-id">
                      <span className="cp-id__name">{ch.name}</span>
                      {ch.pronouns && (
                        <span className="cp-id__pronouns">{ch.pronouns}</span>
                      )}
                      <div className="cp-id__meta">
                        <span className="cp-pill">{ch.house}</span>
                        {ch.year && (
                          <span className="cp-year">Year {ch.year}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="cp-card__divider" />

                  {/* bottom: campaign status */}
                  <div className="cp-card__campaign">
                    <span className="cp-card__campaign-label">Campaign</span>

                    {ch.campaign ? (
                      <>
                        <Link className="sa-open" href={`/characters/${ch.id}`}>
                          <span className="sa-open__icon">
                            <Swords size={18} aria-hidden="true" />
                          </span>
                          <span className="sa-open__name">{ch.campaign}</span>
                          <span className="sa-open__go">
                            Open
                            <ArrowRight
                              className="sa-open-chev"
                              size={14}
                              aria-hidden="true"
                            />
                          </span>
                        </Link>
                        <button
                          className="sa-manage"
                          onClick={() => openManage(ch.id)}
                        >
                          <Settings2 size={15} aria-hidden="true" />
                          Manage
                        </button>
                      </>
                    ) : (
                      <button
                        className="sa-join"
                        onClick={() => openManage(ch.id)}
                      >
                        <Compass
                          className="sa-join__icon"
                          size={18}
                          aria-hidden="true"
                        />
                        <span className="sa-join__text">
                          <span className="sa-join__title">Join a Campaign</span>
                          <span className="sa-join__sub">
                            Still waiting for the next adventure.
                          </span>
                        </span>
                        <ArrowRight
                          className="sa-join-chev"
                          size={15}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {/* new character tile */}
            <Link className="sa-newcard" href="/characters/new">
              <span className="sa-newcard__icon">
                <Plus size={24} aria-hidden="true" />
              </span>
              <span className="sa-newcard__label">Enroll a New Character</span>
            </Link>
          </div>
        </section>

        <footer className="lp-footer">Starfall Academy · Semper Ad Astra</footer>
      </main>

      {/* ===================== MANAGE / JOIN POPUP ===================== */}
      {managed && (
        <div
          className="lp-modal-overlay"
          onClick={closeManage}
          role="dialog"
          aria-modal="true"
          aria-label="Manage enrollment"
        >
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="cp-modal__close"
              onClick={closeManage}
              aria-label="Close"
            >
              <X size={15} aria-hidden="true" />
            </button>

            {manageView === "menu" ? (
              <>
                <span className="cp-modal__eyebrow">
                  {managed.campaign
                    ? "Manage Enrollment"
                    : "Campaign Enrollment"}
                </span>
                <h2 className="cp-modal__title">{managed.name}</h2>
                <p className="cp-modal__copy">
                  {managed.campaign
                    ? `Currently enrolled in ${managed.campaign}.`
                    : "Not yet enrolled in a campaign."}
                </p>

                <div className="cp-modal__opts">
                  {managed.campaign ? (
                    <>
                      <button
                        className="sa-manage-opt"
                        onClick={() => {
                          setManageView("join");
                          setJoinCode("");
                        }}
                      >
                        <span className="sa-manage-opt__icon sa-manage-opt__icon--teal">
                          <ArrowRightLeft size={18} aria-hidden="true" />
                        </span>
                        <span className="sa-manage-opt__text">
                          <span className="sa-manage-opt__title">
                            Transfer Campaign
                          </span>
                          <span className="sa-manage-opt__sub">
                            Shift enrollment to a different campaign.
                          </span>
                        </span>
                      </button>
                      <button
                        className="sa-manage-opt sa-manage-opt-danger"
                        disabled={busy}
                        onClick={() => setCampaign(managed.id, null)}
                      >
                        <span className="sa-manage-opt__icon sa-manage-opt__icon--crimson">
                          <UserMinus size={18} aria-hidden="true" />
                        </span>
                        <span className="sa-manage-opt__text">
                          <span className="sa-manage-opt__title">
                            Leave Campaign
                          </span>
                          <span className="sa-manage-opt__sub">
                            End enrollment in the current campaign.
                          </span>
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="sa-manage-opt"
                        disabled={busy}
                        onClick={() => setCampaign(managed.id, makeCode())}
                      >
                        <span className="sa-manage-opt__icon sa-manage-opt__icon--gold">
                          <Sparkles size={18} aria-hidden="true" />
                        </span>
                        <span className="sa-manage-opt__text">
                          <span className="sa-manage-opt__title">
                            Forge a New Campaign
                          </span>
                          <span className="sa-manage-opt__sub">
                            Start a fresh game and share the code.
                          </span>
                        </span>
                      </button>
                      <button
                        className="sa-manage-opt"
                        onClick={() => {
                          setManageView("join");
                          setJoinCode("");
                        }}
                      >
                        <span className="sa-manage-opt__icon sa-manage-opt__icon--teal">
                          <Compass size={18} aria-hidden="true" />
                        </span>
                        <span className="sa-manage-opt__text">
                          <span className="sa-manage-opt__title">
                            Join by Code
                          </span>
                          <span className="sa-manage-opt__sub">
                            Drop into an existing game with its code.
                          </span>
                        </span>
                      </button>
                    </>
                  )}

                  <button
                    className="sa-manage-opt sa-manage-opt-danger"
                    disabled={busy}
                    onClick={() => remove(managed.id)}
                  >
                    <span className="sa-manage-opt__icon sa-manage-opt__icon--crimson">
                      <UserMinus size={18} aria-hidden="true" />
                    </span>
                    <span className="sa-manage-opt__text">
                      <span className="sa-manage-opt__title">
                        Withdraw Character
                      </span>
                      <span className="sa-manage-opt__sub">
                        Permanently remove this character.
                      </span>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className="cp-modal__back"
                  onClick={() => setManageView("menu")}
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Back
                </button>
                <span className="cp-modal__eyebrow">Join a Campaign</span>
                <h2 className="cp-modal__title">{managed.name}</h2>
                <p className="cp-modal__copy">
                  Enter the code shared by your game to enroll in that campaign.
                </p>
                <form
                  className="cp-join-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = joinCode.trim().toUpperCase();
                    if (code) setCampaign(managed.id, code);
                  }}
                >
                  <input
                    className="sa-input-ml"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="CODE"
                    autoFocus
                  />
                  <button
                    className="sa-btn-primary"
                    type="submit"
                    disabled={busy || !joinCode.trim()}
                  >
                    <KeyRound size={15} aria-hidden="true" />
                    Join
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================== DISCORD INVITE MODAL ===================== */}
      {showDiscord && (
        <div
          className="lp-modal-overlay"
          onClick={() => setShowDiscord(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Join the Discord"
        >
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lp-modal__watermark" aria-hidden="true" />
            <button
              className="lp-modal__close"
              onClick={() => setShowDiscord(false)}
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
                onClick={() => setShowDiscord(false)}
              >
                <MessageCircle size={17} aria-hidden="true" />
                Join the Server
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
