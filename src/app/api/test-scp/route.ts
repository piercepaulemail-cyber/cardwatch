import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.SCP_API_KEY || process.env.scp_api_key;

  // Debug: list ALL env var names that contain "SCP" or "scp"
  const allEnvKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes("scp") || k.toLowerCase().includes("api_key")
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
    step3_parsed: null,
    error: null,
  };

  if (!apiKey) {
    results.error = "SCP_API_KEY not found in environment";
    return NextResponse.json(results);
  }

  try {
    const url = `https://www.sportscardspro.com/api/products?t=${apiKey}&q=caleb+williams+2024+panini+prizm`;
    console.log("[TEST] Calling SCP:", url.replace(apiKey, "***"));

    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    results.step2_api_call = {
      status: resp.status,
      statusText: resp.statusText,
      ok: resp.ok,
    };

    if (!resp.ok) {
      const text = await resp.text();
      results.error = `API returned ${resp.status}: ${text.substring(0, 200)}`;
      return NextResponse.json(results);
    }

    const data = await resp.json();
    const products = data.products || [];

    results.step3_parsed = {
      productCount: products.length,
      firstProduct: products[0] ? {
        name: products[0]["product-name"],
        set: products[0]["console-name"],
        raw_pennies: products[0]["loose-price"],
        raw_dollars: products[0]["loose-price"] ? products[0]["loose-price"] / 100 : null,
        psa9_pennies: products[0]["graded-price"],
        psa9_dollars: products[0]["graded-price"] ? products[0]["graded-price"] / 100 : null,
        psa10_pennies: products[0]["manual-only-price"],
        psa10_dollars: products[0]["manual-only-price"] ? products[0]["manual-only-price"] / 100 : null,
        all_keys: Object.keys(products[0]),
      } : null,
    };
  } catch (e) {
    results.error = `Exception: ${String(e)}`;
  }

  const response = NextResponse.json(results, { status: 200 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
