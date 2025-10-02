/**
 * ActBlue Account Use Policy (AUP) Violation Definitions
 * 
 * Source: https://help.actblue.com/hc/en-us/articles/16870069234839-ActBlue-Account-Use-Policy
 * Last Updated: 2025-10-01
 * 
 * Update this file when ActBlue updates their AUP.
 */

export const AUP_HELP_URL = "https://help.actblue.com/hc/en-us/articles/16870069234839-ActBlue-Account-Use-Policy";

export type ViolationPolicy = {
  code: string;
  title: string;
  policy: string;
};

export const VIOLATION_POLICIES: ViolationPolicy[] = [
  {
    code: "AB001",
    title: "Misrepresentation/Impersonation",
    policy: "Entities must not misrepresent themselves as being another entity or use the name or likeness of any candidate, elected official, or organization in a manner that implies endorsement, affiliation, or authorization without documented written permission of that candidate, elected official, or organization.",
  },
  {
    code: "AB002",
    title: "Direct-Benefit Claim",
    policy: "Entities must not misrepresent that donations will directly benefit specific individuals.",
  },
  {
    code: "AB003",
    title: "Missing Full Entity Name",
    policy: "All text and email fundraising solicitations must include the full name of the entity or established organizational acronym. Other abbreviations are not acceptable.",
  },
  {
    code: "AB004",
    title: "Entity Clarity (Org vs Candidate)",
    policy: "Fundraising solicitations must make clear whether the donation is going to an organization or a candidate.",
  },
  {
    code: "AB005",
    title: "Branding/Form Clarity",
    policy: "All contribution forms must include branding that contains the entity's logo or name, and the form link must not be misleading.",
  },
  {
    code: "AB006",
    title: "PAC Disclosure Clarity",
    policy: "If the entity is a PAC, contribution forms must make it clear that the donation is going to a PAC.",
  },
  {
    code: "AB007",
    title: "False/Unsubstantiated Claims",
    policy: "All text and email fundraising solicitations may not include false or unsubstantiated claims, including references to fake voting records, [or] insinuate expiration of non-existent memberships or subscriptions.",
  },
  {
    code: "AB008",
    title: "Unverified Matching Program",
    policy: "All text and email fundraising solicitations may not [...] promote unverified matching programs. If an entity advertises a matching program for contributions made through ActBlue, the entity must be able to provide documentation to ActBlue of such a program, upon request.",
  },
];

/**
 * Get violation policy by code
 */
export function getViolationPolicy(code: string): ViolationPolicy | undefined {
  return VIOLATION_POLICIES.find((v) => v.code === code);
}

