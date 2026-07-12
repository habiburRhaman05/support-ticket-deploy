import { badGateway, unauthorized } from "../../utils/appError";
import { env } from "../../utils/envConfig";

/**
 * GoHighLevel API v2 client — the ONLY place in the codebase allowed to call GHL.
 *
 * API discipline (see "first phase.md" §2/§4): every call below names its
 * endpoint, method, and headers, and states whether it is VERIFIED against
 * current GHL docs or ASSUMED and pending live confirmation.
 *
 * VERIFIED (2026-07-11, https://marketplace.gohighlevel.com/docs):
 *   - Base URL: https://services.leadconnectorhq.com
 *   - Headers on every call: Authorization: Bearer <PIT>, Version: 2021-07-28,
 *     Accept: application/json
 *   - Private Integration Tokens exist at Agency (Company) level
 *   - GET /locations/search  ("Search Sub-Account", takes companyId)
 *   - GET /locations/{locationId}
 *
 * ASSUMED — confirm with a real token via `pnpm tsx scripts/verify-ghl.ts`:
 *   - Exact response shapes of both endpoints (fields used are defensive)
 *   - Required scopes (expected: locations.readonly)
 *   - Rate limits (client throttles conservatively until confirmed)
 */

export interface GhlLocation {
  id: string;
  name: string;
  email?: string;
  companyId?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

interface GhlRequestOptions {
  apiKey: string;
  path: string;
  query?: Record<string, string | number | undefined>;
}

export class GhlApiError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus: number) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

const REQUEST_TIMEOUT_MS = 15_000;
// ASSUMED rate limit — GHL has historically enforced burst limits per token.
// Serialize bulk calls with a small gap until real limits are confirmed.
const THROTTLE_GAP_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function ghlGet<T>({ apiKey, path, query }: GhlRequestOptions): Promise<T> {
  const url = new URL(path, env.GHL_API_BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: env.GHL_API_VERSION,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (err) {
    throw new GhlApiError(
      err instanceof Error && err.name === "AbortError"
        ? "GHL API request timed out"
        : "Could not reach the GHL API",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Never include the API key or full response body in errors that may be logged.
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      detail = Array.isArray(body.message) ? body.message.join("; ") : (body.message ?? "");
    } catch {
      /* non-JSON error body — status code is enough */
    }
    throw new GhlApiError(detail || `GHL API responded with ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

interface SearchLocationsResponse {
  locations?: GhlLocation[];
}

interface GetLocationResponse {
  location?: GhlLocation;
}

export const ghlClient = {
  /**
   * GET /locations/search?companyId=&limit=&skip=
   * VERIFIED endpoint exists ("Search Sub-Account"); response shape ASSUMED.
   */
  async searchLocations(apiKey: string, companyId: string, limit = 100, skip = 0): Promise<GhlLocation[]> {
    const data = await ghlGet<SearchLocationsResponse>({
      apiKey,
      path: "/locations/search",
      query: { companyId, limit, skip },
    });
    return data.locations ?? [];
  },

  /**
   * Validates a Private Integration Token + Company ID pair by probing
   * GET /locations/search with limit=1. A 200 proves the token is live and
   * scoped to this company; 401/403 means invalid token or missing scope.
   */
  async validateApiKey(apiKey: string, companyId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      await this.searchLocations(apiKey, companyId, 1, 0);
      return { valid: true };
    } catch (err) {
      if (err instanceof GhlApiError) {
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          return {
            valid: false,
            reason: "GHL rejected this API key. Check that it is an agency-level Private Integration token with the locations.readonly scope, and that the Company/Location ID is correct.",
          };
        }
        if (err.httpStatus === 0) {
          throw badGateway("Could not reach GoHighLevel to validate the API key. Please try again.");
        }
        return { valid: false, reason: `GHL validation failed (${err.httpStatus}): ${err.message}` };
      }
      throw err;
    }
  },

  /**
   * GET /locations/{locationId}
   * VERIFIED endpoint exists; response shape ASSUMED ({ location: {...} }).
   * Returns null when GHL says the location does not exist under this token.
   */
  async getLocation(apiKey: string, locationId: string): Promise<GhlLocation | null> {
    try {
      const data = await ghlGet<GetLocationResponse>({
        apiKey,
        path: `/locations/${encodeURIComponent(locationId)}`,
      });
      return data.location ?? null;
    } catch (err) {
      if (err instanceof GhlApiError) {
        if (err.httpStatus === 404 || err.httpStatus === 400 || err.httpStatus === 422) return null;
        if (err.httpStatus === 401 || err.httpStatus === 403) {
          throw unauthorized("The agency's GHL API key was rejected — it may have been rotated or revoked.", "GHL_KEY_INVALID");
        }
        if (err.httpStatus === 0) {
          throw badGateway("Could not reach GoHighLevel. Please try again.");
        }
      }
      throw err;
    }
  },

  /**
   * Paginates GET /locations/search until exhausted, throttled between pages.
   * Used by the one-time bulk-approve onboarding action.
   */
  async listAllLocations(apiKey: string, companyId: string): Promise<GhlLocation[]> {
    const all: GhlLocation[] = [];
    const pageSize = 100;
    let skip = 0;
    // Hard ceiling of 50 pages (5000 locations) as a runaway guard.
    for (let page = 0; page < 50; page++) {
      const batch = await this.searchLocations(apiKey, companyId, pageSize, skip);
      all.push(...batch);
      if (batch.length < pageSize) break;
      skip += pageSize;
      await sleep(THROTTLE_GAP_MS);
    }
    return all;
  },
};
