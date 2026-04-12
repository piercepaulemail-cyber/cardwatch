import { NextResponse, connection } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Mirror of scoreConfidence() in sportscardspro.ts.
 * Weights: last name = 0.5 (required), first name = 0.2,
 *          numeric tokens (card #) = 0.2, other tokens (set/year) = 0.1
 */
function scoreConfidenceDebug(
  queryTokens: string[],
  productName: string,
  playerTokens: string[]
): { score: number; matched: string[]; misses: string[]; playerHit: boolean; lastNameHit: boolean } {
  const nameLower = productName.toLowerCase();
  const lastName = playerTokens.at(-1) ?? "";
  const firstName = playerTokens.length > 1 ? playerTokens[0] : null;
  const lastNameHit = !!lastName && nameLower.includes(lastName);

  if (!lastNameHit) {
    const meaningful = queryTokens.filter((t) => t.length >= 2);
    return { score: 0, matched: [], misses: meaningful, playerHit: false, lastNameHit: false };
  }

  let score = 0.5;
  const matchedTokens: string[] = [lastName];
  const missedTokens: string[] = [];

  if (firstName && firstName !== lastName) {
    if (nameLower.includes(firstName)) { score += 0.2; matchedTokens.push(firstName); }
    else missedTokens.push(firstName);
  }

  const playerPartsSet = new Set(playerTokens);
  const otherTokens = queryTokens.filter((t) => t.length >= 2 && !playerPartsSet.has(t));
  const cardNumTokens = otherTokens.filter((t) => /^\d+$/.test(t));
  const setYearTokens = otherTokens.filter((t) => !/^\d+$/.test(t));

  if (cardNumTokens.length > 0) {
    const m = cardNumTokens.filter((t) => nameLower.includes(t));
    score += (m.length / cardNumTokens.length) * 0.2;
    matchedTokens.push(...m);
    missedTokens.push(...cardNumTokens.filter((t) => !nameLower.includes(t)));
  }
  if (setYearTokens.length > 0) {
    const m = setYearTokens.filter((t) => nameLower.includes(t));
    score += (m.length / setYearTokens.length) * 0.1;
    matchedTokens.push(...m);
    missedTokens.push(...setYearTokens.filter((t) => !nameLower.includes(t)));
  }

  return { score: Math.min(score, 1.0), matched: matchedTokens, misses: missedTokens, playerHit: true, lastNameHit };
}

export async function GET() {
  await connection();

  const apiKey = process.env.SCP_API_KEY || process.env.scp_api_key;

  const allEnvKeys = Object.keys(process.env).filter(
    (k) => k.toLowerCase().includes("scp") || k.toLowerCase().includes("api_key")
  );

  const results: Record<string, unknown> = {
    step1_env_check: {
      SCP_API_KEY_exists: !!apiKey,
      SCP_API_KEY_length: apiKey?.length || 0,
      SCP_API_KEY_first5: apiKey?.substring(0, 5) || "MISSING",
      matching_env_vars: allEnvKeys,
      total_env_count: Object.keys(process.env).length,
    },
    step2_api_call: null,
    step3_scoring: null,
    error: null,
  };

  if (!apiKey) {
    results.error = "SCP_API_KEY not found in environment";
    return NextResponse.json(results);
  }

  // Test two cases: common player (all tokens expected to match) and
  // player where SCP likely abbreviates first name ("T. McMillan")
  const testCases = [
    { playerName: "Caleb Williams", cardDescription: "2024 panini prizm" },
    { playerName: "Tetairoa McMillan", cardDescription: "2024 panini prizm" },
  ];

  const scoringResults: Record<string, unknown>[] = [];

  for (const tc of testCases) {
    const rawQuery = `${tc.playerName} ${tc.cardDescription}`;
    const queryTokens = rawQuery.toLowerCase().replace(/\s+/g, " ").trim().split(/\s+/);
    const playerTokens = tc.playerName.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);

    try {
      const url = `https://www.sportscardspro.com/api/products?t=${apiKey}&q=${encodeURIComponent(rawQuery)}`;
      console.log("[TEST] Calling SCP:", url.replace(apiKey, "***"));

      const resp = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });

      results.step2_api_call = { status: resp.status, ok: resp.ok };

      if (!resp.ok) {
        scoringResults.push({ query: rawQuery, error: `API ${resp.status}` });
        continue;
      }

      const data = await resp.json();
      const products: Record<string, unknown>[] = data.products ?? [];

      if (!products.length) {
        scoringResults.push({
          query: rawQuery,
          productCount: 0,
          note: "SCP returned no results — query may not match any SCP products",
        });
        continue;
      }

      // Score all products, show details for first 20
      const allScores = products.map((p) => {
        const name = String(p["product-name"] ?? "");
        return scoreConfidenceDebug(queryTokens, name, playerTokens).score;
      });

      const top20 = products.slice(0, 20).map((p) => {
        const name = String(p["product-name"] ?? "");
        const debug = scoreConfidenceDebug(queryTokens, name, playerTokens);
        return {
          name,
          set: p["console-name"],
          score: Number(debug.score.toFixed(2)),
          playerHit: debug.playerHit,
          lastNameHit: debug.lastNameHit,
          matched: debug.matched,
          misses: debug.misses,
          loosePriceDollars: p["loose-price"] ? Number(p["loose-price"]) / 100 : null,
        };
      });

      const passing = allScores.filter((s) => s > 0.4).length;
      const rejected = allScores.filter((s) => s === 0).length;
      const lowConf = allScores.filter((s) => s > 0 && s <= 0.4).length;

      scoringResults.push({
        query: rawQuery,
        playerName: tc.playerName,
        playerTokens,
        queryTokens,
        productCount: products.length,
        summary: {
          passing_gt04: passing,
          lowConf_0to04: lowConf,
          rejected_noLastName: rejected,
          wouldUse:
            passing > 0
              ? `${passing} comps (confidence > 0.4)`
              : "NONE — no product contained player's last name",
        },
        top20Products: top20,
      });
    } catch (e) {
      scoringResults.push({ query: rawQuery, error: String(e) });
    }
  }

  results.step3_scoring = scoringResults;

  const response = NextResponse.json(results, { status: 200 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
