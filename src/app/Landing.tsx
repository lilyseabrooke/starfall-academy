"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Map,
  Play,
  ScrollText,
  Sparkles,
} from "lucide-react";
import HudTopBar, { type HudTopBarHandle } from "@/components/HudTopBar";
import "@/styles/landing.css";

type IconType = typeof BookOpen;

type NavLink = { name: string; icon: IconType; href: string };
type Destination = NavLink & { blurb: string };

const DESTINATIONS: Destination[] = [
  {
    name: "Compendium",
    icon: BookOpen,
    href: "/compendium",
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
    href: "/map",
    blurb: "Explore Starfall Academy and the many places within.",
  },
  {
    name: "Character Ledger",
    icon: BookMarked,
    href: "/character-map",
    blurb: "The legends of the arcane world.",
  },
];

export default function Landing({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const router = useRouter();
  const hud = useRef<HudTopBarHandle>(null);

  function play() {
    if (signedIn) {
      router.push("/characters");
    } else {
      hud.current?.openSignIn();
    }
  }

  const playHint = signedIn
    ? "Continue to your character dashboard"
    : "Sign in to start your story";

  return (
    <div className="lp-root">
      <HudTopBar ref={hud} signedIn={signedIn} showMyCharacters={false} />

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
              <button
                className="sa-btn-ghost"
                onClick={() => hud.current?.openSignIn()}
              >
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
            <span className="lp-dest__label">Explore the Academy</span>
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
    </div>
  );
}
