/**
 * urlCodec — Compress/decompress JSON for URL sharing
 *
 * Strategy:
 *   1. JSON string → pako gzip → Uint8Array → base64url string
 *   2. Stored in the URL hash fragment (after #), NOT query params
 *      - Hash fragments are never sent to the server
 *      - No server-side URL length limits apply
 *      - Browser limit is typically ~2MB for the full URL
 *   3. Format: #hz=100&d=<compressed-base64url>
 *
 * Backward compat:
 *   - Also reads legacy ?json=<base64>&hz=100 query params
 */

import pako from 'pako';

// ─── Base64url (URL-safe base64, no padding) ────────────────────────────────

function uint8ToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlToUint8(str: string): Uint8Array {
  // Restore standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Compress / Decompress ──────────────────────────────────────────────────

export function compressJson(json: string): string {
  const compressed = pako.deflate(new TextEncoder().encode(json));
  return uint8ToBase64url(compressed);
}

export function decompressJson(encoded: string): string {
  const bytes = base64urlToUint8(encoded);
  const decompressed = pako.inflate(bytes);
  return new TextDecoder().decode(decompressed);
}

// ─── URL Building ───────────────────────────────────────────────────────────

export interface UrlState {
  json: string;
  hz: number;
}

/**
 * Build a shareable URL with compressed data in the hash fragment.
 * Format: https://domain/#hz=50&d=<compressed>
 */
export function buildShareUrl(state: UrlState): string {
  const base = window.location.origin + window.location.pathname;
  const parts: string[] = [];

  if (state.hz !== 100) {
    parts.push(`hz=${state.hz}`);
  }

  if (state.json.trim()) {
    const compressed = compressJson(state.json);
    parts.push(`d=${compressed}`);
  }

  if (parts.length === 0) return base;
  return `${base}#${parts.join('&')}`;
}

/**
 * Parse state from the current URL.
 * Checks hash fragment first (new format), then query params (legacy).
 */
export function parseUrlState(): UrlState {
  let json = '';
  let hz = 100;

  // ─── Try hash fragment first (new compressed format) ───────────────────
  const hash = window.location.hash.slice(1); // remove leading #
  if (hash) {
    const hashParams = new URLSearchParams(hash);

    const hzVal = hashParams.get('hz');
    if (hzVal) {
      const parsed = parseInt(hzVal, 10);
      if (!isNaN(parsed) && parsed > 0) hz = parsed;
    }

    const compressed = hashParams.get('d');
    if (compressed) {
      try {
        json = decompressJson(compressed);
        // Verify it's valid JSON
        JSON.parse(json);
        return { json, hz };
      } catch {
        // Decompression or parse failed, try other formats
        json = '';
      }
    }
  }

  // ─── Fallback: legacy query params (?json=...&hz=...) ─────────────────
  const params = new URLSearchParams(window.location.search);

  const hzParam = params.get('hz') || params.get('sampling_rate') || params.get('samplingRate');
  if (hzParam) {
    const parsed = parseInt(hzParam, 10);
    if (!isNaN(parsed) && parsed > 0) hz = parsed;
  }

  const jsonParam = params.get('json') || params.get('data');
  if (jsonParam) {
    // Try base64 decode
    try {
      const decoded = atob(jsonParam);
      JSON.parse(decoded);
      json = decoded;
    } catch {
      // Try as raw JSON
      try {
        JSON.parse(jsonParam);
        json = jsonParam;
      } catch {
        json = jsonParam; // still set it so user sees the error
      }
    }
  }

  return { json, hz };
}

/**
 * Silently update the URL hash fragment without triggering navigation.
 * Only updates if the JSON is non-empty.
 */
export function syncUrlState(state: UrlState): void {
  const parts: string[] = [];

  if (state.hz !== 100) {
    parts.push(`hz=${state.hz}`);
  }

  if (state.json.trim()) {
    const compressed = compressJson(state.json);
    parts.push(`d=${compressed}`);
  }

  const newHash = parts.length > 0 ? `#${parts.join('&')}` : '';

  // Use replaceState to avoid polluting browser history
  // Also clear any legacy query params
  const cleanUrl = window.location.origin + window.location.pathname + newHash;
  window.history.replaceState({}, '', cleanUrl);
}

/**
 * Get the approximate compression ratio for display purposes.
 */
export function getCompressionInfo(json: string): { originalSize: number; compressedSize: number; ratio: number } {
  if (!json.trim()) return { originalSize: 0, compressedSize: 0, ratio: 0 };
  const originalSize = new TextEncoder().encode(json).length;
  const compressed = compressJson(json);
  const compressedSize = compressed.length;
  const ratio = compressedSize / originalSize;
  return { originalSize, compressedSize, ratio };
}
