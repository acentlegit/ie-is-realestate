/**
 * data.gov.in RERA APIs – India government open data.
 * Keys: set VITE_DATA_GOV_IN_RERA1_KEY and VITE_DATA_GOV_IN_RERA2_KEY in .env (from data.gov.in → My Account).
 * Do not commit .env or keys.
 *
 * RERA Progress response: { status, total, count, limit, offset, records, field, ... }
 * Each record: state_ut, general_rules, establishment_of_regulatory_authority, establishment_of_appellate_tribunal,
 * web_portal, adjudicating_officer, registrations___projects, registrations___agents, total_no__of_cases_disposed_by_authority_
 */

// In dev, use /api/rera so Vite proxies to api.data.gov.in (avoids CORS). In prod, call api.data.gov.in or set VITE_RERA_API_BASE.
const BASE_URL = import.meta.env.VITE_RERA_API_BASE || (import.meta.env.DEV ? "/api/rera" : "https://api.data.gov.in");

/** Resource ID for State/UTs-wise RERA Implementation Progress Report (19-03-2022) */
export const RERA_PROGRESS_RESOURCE_ID = "81242853-a9f9-44f4-a100-ea817d9c9ebe";

/** Resource ID for State/UT-wise Complaints Disposed under RERA (30 June 2019). Replace with the UUID from the second API’s detail page if different. */
export const RERA_COMPLAINTS_RESOURCE_ID = "REPLACE_WITH_SECOND_RESOURCE_ID";

/**
 * Fetch RERA Implementation Progress (state-wise regulatory authority, tribunal, etc.).
 * Uses VITE_DATA_GOV_IN_RERA1_KEY from env.
 * Response: { status, total, count, limit, offset, records, field, ... }
 * @param {Object} [opts] - { offset: number, limit: number } for pagination (default limit 10, offset 0)
 */
export async function fetchReraProgress(opts = {}) {
  const key = import.meta.env.VITE_DATA_GOV_IN_RERA1_KEY;
  if (!key) {
    return { error: "VITE_DATA_GOV_IN_RERA1_KEY not set in .env" };
  }
  const offset = opts.offset != null ? Number(opts.offset) : 0;
  const limit = opts.limit != null ? Number(opts.limit) : 10;
  const params = new URLSearchParams({
    "api-key": key,
    format: "json",
    offset: String(offset),
    limit: String(limit),
  });
  const url = `${BASE_URL}/resource/${RERA_PROGRESS_RESOURCE_ID}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { error: `RERA Progress API ${res.status}`, status: res.status };
  }
  return res.json();
}

/**
 * Fetch all RERA Progress records (all 37 states/UTs). Pages through until all records are fetched.
 * @returns {Promise<{ records: Array, total: number, error?: string }>}
 */
export async function fetchReraProgressAll() {
  const key = import.meta.env.VITE_DATA_GOV_IN_RERA1_KEY;
  if (!key) {
    return { records: [], total: 0, error: "VITE_DATA_GOV_IN_RERA1_KEY not set in .env" };
  }
  const all = [];
  let offset = 0;
  const limit = 50;
  let total = null;
  for (;;) {
    const data = await fetchReraProgress({ offset, limit });
    if (data.error) {
      return { records: all, total: all.length, error: data.error };
    }
    const records = data.records || [];
    all.push(...records);
    if (total == null) total = Number(data.total) ?? 0;
    if (records.length < limit || all.length >= total) break;
    offset += limit;
  }
  return { records: all, total: total ?? all.length };
}

/**
 * Fetch RERA Complaints Disposed (state-wise).
 * Uses VITE_DATA_GOV_IN_RERA2_KEY from env.
 * Ensure RERA_COMPLAINTS_RESOURCE_ID is set to the second API’s resource UUID from data.gov.in.
 */
export async function fetchReraComplaints() {
  const key = import.meta.env.VITE_DATA_GOV_IN_RERA2_KEY;
  if (!key) {
    return { error: "VITE_DATA_GOV_IN_RERA2_KEY not set in .env" };
  }
  if (RERA_COMPLAINTS_RESOURCE_ID === "REPLACE_WITH_SECOND_RESOURCE_ID") {
    return { error: "Set RERA_COMPLAINTS_RESOURCE_ID in dataGovInReraApi.js from the second RERA API’s detail page" };
  }
  const url = `${BASE_URL}/resource/${RERA_COMPLAINTS_RESOURCE_ID}?api-key=${encodeURIComponent(key)}&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    return { error: `RERA Complaints API ${res.status}`, status: res.status };
  }
  return res.json();
}
