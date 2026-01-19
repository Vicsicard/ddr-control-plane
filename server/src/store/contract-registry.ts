/**
 * Contract Registry
 * 
 * In-memory store for finalized contracts.
 * Used for lineage validation (parent_hash, supersedes).
 * 
 * NOTE: In production, this would be backed by a persistent store.
 * For now, this is sufficient for validation and lineage queries.
 */

export interface StoredContract {
  contract_id: string;
  contract_hash: string;
  finalized_at: string;
  engine_version: string;
  artifact_schema_version: string;
  lineage: {
    parent_hash: string | null;
    supersedes: string | null;
  };
  canonical_json: Record<string, unknown>;
}

class ContractRegistry {
  private contracts: Map<string, StoredContract> = new Map();
  private supersededBy: Map<string, string> = new Map(); // hash -> superseding hash

  /**
   * Register a finalized contract
   */
  register(contract: StoredContract): void {
    this.contracts.set(contract.contract_hash, contract);
    
    // Track supersession
    if (contract.lineage.supersedes) {
      this.supersededBy.set(contract.lineage.supersedes, contract.contract_hash);
    }
    
    console.log(`[REGISTRY] Registered contract: ${contract.contract_id} (${contract.contract_hash.slice(0, 20)}...)`);
  }

  /**
   * Check if a contract hash exists
   */
  exists(hash: string): boolean {
    return this.contracts.has(hash);
  }

  /**
   * Get a contract by hash
   */
  get(hash: string): StoredContract | undefined {
    return this.contracts.get(hash);
  }

  /**
   * Check if a contract has been superseded
   */
  isSuperseded(hash: string): boolean {
    return this.supersededBy.has(hash);
  }

  /**
   * Get the contract that supersedes this one
   */
  getSupersedingHash(hash: string): string | undefined {
    return this.supersededBy.get(hash);
  }

  /**
   * Get lineage info for a contract
   */
  getLineage(hash: string): {
    contract_hash: string;
    contract_id: string;
    parent_hash: string | null;
    supersedes: string | null;
    superseded_by: string | null;
    finalized_at: string;
  } | null {
    const contract = this.contracts.get(hash);
    if (!contract) return null;

    return {
      contract_hash: contract.contract_hash,
      contract_id: contract.contract_id,
      parent_hash: contract.lineage.parent_hash,
      supersedes: contract.lineage.supersedes,
      superseded_by: this.supersededBy.get(hash) || null,
      finalized_at: contract.finalized_at,
    };
  }

  /**
   * Validate lineage references before finalization
   */
  validateLineage(
    parentHash: string | null,
    supersedes: string | null,
    newContractHash: string
  ): { valid: boolean; error?: string } {
    // Self-reference check
    if (parentHash === newContractHash) {
      return { valid: false, error: 'parent_hash cannot reference self' };
    }
    if (supersedes === newContractHash) {
      return { valid: false, error: 'supersedes cannot reference self' };
    }

    // Parent must exist if specified
    if (parentHash && !this.exists(parentHash)) {
      return { valid: false, error: `parent_hash references unknown contract: ${parentHash}` };
    }

    // Supersedes must exist if specified
    if (supersedes && !this.exists(supersedes)) {
      return { valid: false, error: `supersedes references unknown contract: ${supersedes}` };
    }

    // Check if supersedes target is already superseded (warning, not error)
    // This is allowed but logged
    if (supersedes && this.isSuperseded(supersedes)) {
      const existingSuperseder = this.getSupersedingHash(supersedes);
      console.warn(`[REGISTRY] Warning: ${supersedes} is already superseded by ${existingSuperseder}`);
    }

    return { valid: true };
  }

  /**
   * Get all contracts (for debugging)
   */
  getAll(): StoredContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Get contract count
   */
  count(): number {
    return this.contracts.size;
  }
}

// Singleton instance
export const contractRegistry = new ContractRegistry();
