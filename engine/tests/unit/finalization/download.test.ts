/**
 * Meta DDR Download Tests
 * Phase 5: Download bytes helper tests
 */

import { toDownloadBytes } from '../../../src/finalization/download';
import { ContractArtifact } from '../../../src/types/simulation';

describe('toDownloadBytes', () => {
  test('produces deterministic bytes and filename', () => {
    const artifact: ContractArtifact = {
      contract_id: 'age_gate@1.0.0',
      version: '1.0.0',
      hash: 'sha256:abc123',
      canonical_json: { b: 1, a: 2 },
    };

    const d = toDownloadBytes(artifact);
    expect(d.filename).toBe('age_gate@1.0.0.meta-ddr.json');
    expect(d.contentType).toContain('application/json');
    expect(d.bytes.length).toBeGreaterThan(0);
  });

  test('stable ordering: "a" appears before "b" in bytes', () => {
    const artifact: ContractArtifact = {
      contract_id: 'test@1.0.0',
      version: '1.0.0',
      hash: 'sha256:def456',
      canonical_json: { z: 'last', a: 'first', m: 'middle' },
    };

    const d = toDownloadBytes(artifact);
    const content = d.bytes.toString('utf8');
    expect(content.indexOf('"a"')).toBeLessThan(content.indexOf('"m"'));
    expect(content.indexOf('"m"')).toBeLessThan(content.indexOf('"z"'));
  });

  test('sanitizes special characters in filename', () => {
    const artifact: ContractArtifact = {
      contract_id: 'test/decision:v1',
      version: '1.0.0',
      hash: 'sha256:ghi789',
      canonical_json: { a: 1 },
    };

    const d = toDownloadBytes(artifact);
    expect(d.filename).not.toContain('/');
    expect(d.filename).not.toContain(':');
    expect(d.filename).toContain('.meta-ddr.json');
  });

  test('bytes are UTF-8 encoded', () => {
    const artifact: ContractArtifact = {
      contract_id: 'unicode@1.0.0',
      version: '1.0.0',
      hash: 'sha256:jkl012',
      canonical_json: { message: 'Hello 世界' },
    };

    const d = toDownloadBytes(artifact);
    const content = d.bytes.toString('utf8');
    expect(content).toContain('Hello 世界');
  });

  test('bytes end with newline', () => {
    const artifact: ContractArtifact = {
      contract_id: 'newline@1.0.0',
      version: '1.0.0',
      hash: 'sha256:mno345',
      canonical_json: { a: 1 },
    };

    const d = toDownloadBytes(artifact);
    const content = d.bytes.toString('utf8');
    expect(content.endsWith('\n')).toBe(true);
  });
});
