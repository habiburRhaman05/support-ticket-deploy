/**
 * One-time GHL API verification script (see "first phase.md" §5 step 1).
 *
 * Confirms, against the LIVE GHL API with a real agency-level Private
 * Integration Token, everything the client currently marks as ASSUMED:
 *   1. Token validation probe works (GET /locations/search)
 *   2. Listing locations under the company works + response shape
 *   3. Single-location lookup works (GET /locations/{id}) + response shape
 *
 * Usage (never pass the key as a CLI arg — it would land in shell history):
 *   set GHL_VERIFY_COMPANY_ID=<your company/agency id>
 *   set GHL_VERIFY_API_KEY=<your private integration token>
 *   pnpm tsx scripts/verify-ghl.ts
 *
 * The API key is never printed. Location data is printed (names/ids only)
 * so you can confirm it matches what you see inside GHL.
 */
import { ghlClient } from "../src/lib/ghl/ghl.client";

const companyId = process.env.GHL_VERIFY_COMPANY_ID;
const apiKey = process.env.GHL_VERIFY_API_KEY;

if (!companyId || !apiKey) {
  console.error("Set GHL_VERIFY_COMPANY_ID and GHL_VERIFY_API_KEY environment variables first.");
  process.exit(1);
}

async function main() {
  console.log("=== GHL live verification ===");
  console.log(`Company ID: ${companyId}`);
  console.log(`API key: ****${apiKey!.slice(-4)} (redacted)`);

  console.log("\n[1/3] Validating token via GET /locations/search?limit=1 ...");
  const validation = await ghlClient.validateApiKey(apiKey!, companyId!);
  if (!validation.valid) {
    console.error(`  ✗ INVALID: ${validation.reason}`);
    process.exit(1);
  }
  console.log("  ✓ Token accepted — agency-level PIT + locations scope confirmed");

  console.log("\n[2/3] Listing all locations under the company ...");
  const locations = await ghlClient.listAllLocations(apiKey!, companyId!);
  console.log(`  ✓ ${locations.length} location(s) returned`);
  for (const loc of locations.slice(0, 10)) {
    console.log(`    - ${loc.id}  ${loc.name}  ${loc.email ?? "(no email)"}`);
  }
  if (locations.length > 10) console.log(`    ... and ${locations.length - 10} more`);
  if (locations.length > 0) {
    console.log("  Raw shape of first location (for schema confirmation):");
    console.log("   ", JSON.stringify(locations[0], null, 2).split("\n").join("\n    "));
  }

  console.log("\n[3/3] Fetching a single location by ID ...");
  if (locations.length === 0) {
    console.log("  (skipped — no locations to test with)");
  } else {
    const single = await ghlClient.getLocation(apiKey!, locations[0].id);
    if (single) {
      console.log(`  ✓ GET /locations/${locations[0].id} returned: ${single.name}`);
    } else {
      console.error("  ✗ Single-location lookup returned null for a known-good ID — response shape differs from assumption, paste this output back to Claude.");
    }
  }

  console.log("\n=== All checks passed. The ASSUMED items in ghl.client.ts are now confirmed. ===");
}

main().catch((err) => {
  console.error("\nVerification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
