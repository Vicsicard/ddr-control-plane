/**
 * Meta DDR Download Bytes Helper
 * Phase 5: Headless download bytes generation
 */

import { ContractArtifact } from '../types/simulation';
import { canonicalize } from './canonicalizer';

export interface DownloadBytes {
  filename: string;
  contentType: string;
  bytes: Buffer;
}

/**
 * Convert contract artifact to deterministic download bytes.
 * The bytes are canonical JSON (stable order) with a trailing newline.
 */
export function toDownloadBytes(artifact: ContractArtifact): DownloadBytes {
  const canonicalText = canonicalize(artifact.canonical_json as Record<string, unknown>);
  const bytes = Buffer.from(canonicalText, 'utf8');

  const safeId = artifact.contract_id.replace(/[^a-zA-Z0-9._@-]/g, '_');
  const filename = `${safeId}.meta-ddr.json`;

  return {
    filename,
    contentType: 'application/json; charset=utf-8',
    bytes,
  };
}
