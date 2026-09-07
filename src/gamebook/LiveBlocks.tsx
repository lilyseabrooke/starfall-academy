"use client";

import * as React from "react";
import Blocks from "./Blocks";
import { parseMarkdown, type Block } from "./markdown";
import { createClient } from "@/lib/supabase/client";

/* ===========================================================================
   TEMPORARY — gamebook live-edit utility
   ---------------------------------------------------------------------------
   Wraps Blocks so a row saved from /gamebook/edit shows up here without a
   redeploy: renders the server-parsed content/*.md blocks first (so there's
   real markup before JS runs), then checks gamebook_overrides for this part
   and, if a row exists, swaps in the parsed override. Delete alongside the
   rest of the utility — see src/app/api/gamebook-edit/route.ts.
   =========================================================================== */

export default function LiveBlocks({
  blocks,
  anchorIndex,
  partSlug,
}: {
  blocks: Block[];
  anchorIndex: Record<string, string>;
  partSlug: string;
}) {
  const [liveBlocks, setLiveBlocks] = React.useState(blocks);

  React.useEffect(() => {
    let cancelled = false;
    createClient()
      .from("gamebook_overrides")
      .select("text")
      .eq("slug", partSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.text) {
          setLiveBlocks(parseMarkdown(data.text).blocks);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [partSlug]);

  return <Blocks blocks={liveBlocks} anchorIndex={anchorIndex} partSlug={partSlug} />;
}
