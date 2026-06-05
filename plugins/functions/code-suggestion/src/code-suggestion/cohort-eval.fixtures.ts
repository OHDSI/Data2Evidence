/**
 * Seed fixtures for the cohort-builder prompt eval (DATA-2305 T4).
 *
 * Each case is a plain-English request and the tool arguments the agent SHOULD
 * extract from it. `expected: null` means the agent should NOT call the tool
 * (the request has neither an age nor a gender, so rule 3 of getCohortPrompting
 * says to ask the user instead).
 *
 * This tests the SYSTEM PROMPT's language understanding only — the deterministic
 * builder is covered by the mcp-server oracle tests. Gender is compared
 * case-insensitively; ages must match exactly.
 */
export interface CohortEvalExpectation {
  ageMin?: number;
  ageMax?: number;
  gender?: "FEMALE" | "MALE";
}

export interface CohortEvalFixture {
  name: string;
  input: string;
  expected: CohortEvalExpectation | null;
}

export const COHORT_EVAL_FIXTURES: CohortEvalFixture[] = [
  {
    name: "gender + open-ended lower age",
    input: "female patients over 60",
    expected: { gender: "FEMALE", ageMin: 60 },
  },
  {
    name: "gender synonym + upper age",
    input: "men younger than 40",
    expected: { gender: "MALE", ageMax: 40 },
  },
  {
    name: "age range, no gender",
    input: "patients aged 18 to 65",
    expected: { ageMin: 18, ageMax: 65 },
  },
  {
    name: "gender word + range",
    input: "women between 30 and 50",
    expected: { gender: "FEMALE", ageMin: 30, ageMax: 50 },
  },
  {
    name: "gender only",
    input: "show me all male patients",
    expected: { gender: "MALE" },
  },
  {
    name: "age only, no gender word",
    input: "people over 70",
    expected: { ageMin: 70 },
  },
  {
    name: "unsupported criterion ignored, age+gender kept",
    input: "female patients with diabetes over 50",
    expected: { gender: "FEMALE", ageMin: 50 },
  },
  {
    name: "no age or gender -> no tool call",
    input: "build me a cohort",
    expected: null,
  },
];
