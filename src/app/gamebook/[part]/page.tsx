import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PARTS, getPart, loadPart, buildAnchorIndex } from "@/gamebook/parts";
import LiveBlocks from "@/gamebook/LiveBlocks";
import Toc from "@/gamebook/Toc";

export function generateStaticParams() {
  return PARTS.map((p) => ({ part: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ part: string }>;
}) {
  const { part } = await params;
  const meta = getPart(part);
  if (!meta) return {};
  return {
    title: `${meta.title} — Starfall Academy Gamebook`,
    description: meta.blurb,
  };
}

export default async function PartPage({
  params,
}: {
  params: Promise<{ part: string }>;
}) {
  const { part } = await params;
  const loaded = loadPart(part);
  if (!loaded) notFound();

  const anchorIndex = Object.fromEntries(buildAnchorIndex());
  const idx = PARTS.findIndex((p) => p.slug === part);
  const prev = PARTS[idx - 1];
  const next = PARTS[idx + 1];

  return (
    <div className="gb-part">
      <aside className="gb-part__rail">
        <Toc headings={loaded.headings} parts={PARTS} activePart={part} />
      </aside>

      <main className="gb-part__main">
        <header className="gb-part__head">
          <span className="gb-part__eyebrow">
            Part {loaded.meta.numeral}
          </span>
          <h1 className="gb-part__title">{loaded.meta.title}</h1>
          <p className="gb-part__blurb">{loaded.meta.blurb}</p>
        </header>

        <article className="gb-prose">
          <LiveBlocks blocks={loaded.blocks} anchorIndex={anchorIndex} partSlug={part} />
        </article>

        <nav className="gb-part__pager" aria-label="Gamebook parts">
          {prev ? (
            <Link href={`/gamebook/${prev.slug}`} className="gb-part__pager-link">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>
                <em>Part {prev.numeral}</em>
                {prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/gamebook/${next.slug}`}
              className="gb-part__pager-link gb-part__pager-link--next"
            >
              <span>
                <em>Part {next.numeral}</em>
                {next.title}
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </nav>
      </main>
    </div>
  );
}
