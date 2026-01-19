/**
 * Rules Stage Adapter
 * 
 * Translates Studio RulesData → Engine RulesArtifacts
 * 
 * TRANSITIONAL: This file should shrink over time as Studio
 * adopts engine types directly.
 */

import type { RulesData, RuleEntry } from '../types';

/**
 * Engine RulesArtifacts shape (from engine/src/types/artifacts.ts)
 */
export interface EngineRuleDefinition {
  rule_id: string;
  when: string;
  then: string;
}

export interface EngineRulesArtifacts {
  rules: EngineRuleDefinition[];
  coverage_confirmed: boolean;
  termination_confirmed: boolean;
}

export type AdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AdapterError[] };

export interface AdapterError {
  field: string;
  message: string;
}

/**
 * Adapt Studio RuleEntry to Engine RuleDefinition.
 * 
 * Field Mapping:
 * - rule_id → rule_id (same)
 * - condition → when (serialize condition to string)
 * - output → then (same concept)
 * 
 * Studio has extra fields not in engine:
 * - reason_code
 * - description
 */
function adaptRuleEntry(
  entry: RuleEntry,
  index: number
): { data: EngineRuleDefinition | null; errors: AdapterError[] } {
  const errors: AdapterError[] = [];

  if (!entry.rule_id || entry.rule_id.trim() === '') {
    errors.push({
      field: `rules[${index}].rule_id`,
      message: 'Rule ID is required',
    });
  }

  if (!entry.condition) {
    errors.push({
      field: `rules[${index}].condition`,
      message: 'Rule condition is required',
    });
  }

  if (!entry.output || entry.output.trim() === '') {
    errors.push({
      field: `rules[${index}].output`,
      message: 'Rule output is required',
    });
  }

  if (errors.length > 0) {
    return { data: null, errors };
  }

  // Serialize condition to "when" string
  // Format: "left_operand OPERATOR right_operand"
  const condition = entry.condition!;
  let whenClause: string;
  if (condition.right_operand !== undefined) {
    whenClause = `${condition.left_operand} ${condition.operator} ${condition.right_operand}`;
  } else {
    whenClause = `${condition.left_operand} ${condition.operator}`;
  }

  return {
    data: {
      rule_id: entry.rule_id,
      when: whenClause,
      then: entry.output,
    },
    errors: [],
  };
}

/**
 * Adapt Studio RulesData to Engine RulesArtifacts.
 */
export function adaptRulesToEngine(
  studioData: RulesData
): AdapterResult<EngineRulesArtifacts> {
  const allErrors: AdapterError[] = [];
  const engineRules: EngineRuleDefinition[] = [];

  if (!studioData.rules || studioData.rules.length === 0) {
    allErrors.push({
      field: 'rules',
      message: 'At least one rule must be defined',
    });
  } else {
    for (let i = 0; i < studioData.rules.length; i++) {
      const result = adaptRuleEntry(studioData.rules[i], i);
      if (result.data) {
        engineRules.push(result.data);
      }
      allErrors.push(...result.errors);
    }
  }

  if (!studioData.completeness_confirmed) {
    allErrors.push({
      field: 'completeness_confirmed',
      message: 'Rule completeness must be confirmed',
    });
  }

  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    data: {
      rules: engineRules,
      coverage_confirmed: studioData.completeness_confirmed,
      termination_confirmed: studioData.completeness_confirmed, // Studio uses single confirmation
    },
  };
}
