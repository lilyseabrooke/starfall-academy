import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PARTS, loadIntro, partChapters, buildAnchorIndex } from "@/gamebook/parts";
import Blocks from "@/gamebook/Blocks";

export default function GamebookHub() {
  const intro = loadIntro();
  const anchorIndex = Object.fromEntries(buildAnchorIndex());
  const chapters = Object.fromEntries(PARTS.map((p) => [p.slug, partChapters(p.slug)]));

  return (
    <main className="gb-hub">
      <header className="gb-hub__hero">
        <div className="gb-hub__eyebrow">
          <span className="gb-hub__rule" />
          The Gamebook
          <span className="gb-hub__rule" />
        </div>
        <h1 className="gb-hub__title">Starfall Academy</h1>
        <div className="gb-hub__intro">
          <Blocks blocks={intro} anchorIndex={anchorIndex} partSlug="" />
        </div>
      </header>

      <ol className="gb-hub__parts">
        {PARTS.map((part) => (
          <li key={part.slug} className="gb-hub__card">
            <Link href={`/gamebook/${part.slug}`} className="gb-hub__card-link">
              <span className="gb-hub__card-numeral">{part.numeral}</span>
              <span className="gb-hub__card-body">
                <span className="gb-hub__card-title">
                  {part.title}
                  <ArrowRight size={17} aria-hidden="true" />
                </span>
                <span className="gb-hub__card-blurb">{part.blurb}</span>
              </span>
            </Link>

            <ul className="gb-hub__chapters">
              {chapters[part.slug].map((c) => (
                <li key={c.slug}>
                  <Link href={`/gamebook/${part.slug}#${c.slug}`}>{c.text}</Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
