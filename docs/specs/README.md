# ApplyFlow Spec-Driven Development

This directory contains the approved product and engineering specifications for ApplyFlow. **Specifications are the source of truth for intended behaviour; implementation must satisfy them.** Existing code is evidence of current behaviour, not automatic proof of intended behaviour.

The process is deliberately lightweight. Use it for new features, meaningful changes to existing behaviour, data-model changes, integrations, and security-sensitive fixes. Tiny typo or formatting changes do not need a full feature specification.

## Development lifecycle

1. **Understand the problem** — identify the user, problem, desired outcome, constraints, and evidence from the current application.
2. **Define the scope** — agree what is in scope, out of scope, and explicitly deferred.
3. **Write or update the specification** — assign stable requirement IDs and testable acceptance criteria.
4. **Review and approve** — resolve ambiguity and confirm the specification before implementation begins.
5. **Inspect and plan** — the coding agent inspects the existing code, identifies affected areas, risks, and proposes a small implementation plan. No code changes during this planning step.
6. **Implement incrementally** — work on one bounded ticket at a time. Keep changes traceable to requirement IDs.
7. **Verify** — run relevant automated tests and checks, perform manual checks where needed, and review security, accessibility, error states, and regressions.
8. **Close the work** — record what changed, tests run and their results, known limitations, and any specification updates.

## Requirement IDs

Requirement IDs must be stable and unique within the project. Do not recycle an ID after removing a requirement.

| Prefix | Meaning | Example |
| --- | --- | --- |
| `FR` | Functional requirement | `FR-001` |
| `NFR` | Non-functional requirement (performance, reliability, accessibility, etc.) | `NFR-001` |
| `SEC` | Security and privacy requirement | `SEC-001` |
| `DATA` | Data model, validation, retention, or migration requirement | `DATA-001` |
| `UX` | User experience and interaction requirement | `UX-001` |

Use only the prefixes that are relevant. Keep IDs stable when wording changes without changing the underlying requirement. If the meaning changes materially, document the change and decide whether a new ID is needed.

## Writing good requirements

A requirement should describe one clear, observable expectation. Avoid vague words such as *fast*, *easy*, *secure*, *intuitive*, or *robust* unless they are defined with measurable or verifiable criteria.

Each requirement should include:
- A unique ID.
- A concise statement of expected behaviour or constraint.
- A reason or user value where useful.
- One or more observable acceptance criteria.
- A verification method or linked test where appropriate.

Acceptance criteria should describe outcomes, not dictate implementation unnecessarily. Record implementation constraints separately.

## Implementation tickets and traceability

Every implementation ticket must reference the requirement IDs it addresses. Tests should reference those IDs in test names, comments, or the ticket/spec verification table when practical.

A requirement is not complete merely because code exists. It is complete when its acceptance criteria have been verified, or when an exception is explicitly documented and accepted.

Use the templates in [templates/](./templates/) for feature specifications and implementation plans.

## Definition of Ready

Work is ready for implementation when:
- The problem and intended user outcome are clear.
- Scope and non-goals are explicit.
- Relevant requirements have stable IDs.
- Acceptance criteria are testable.
- Important data, privacy, security, and failure-state implications have been considered.
- Open questions that could change the design have been resolved or explicitly deferred.

## Definition of Done

Work is done when:
- All in-scope requirements are implemented or explicitly deferred with agreement.
- Acceptance criteria have been checked.
- Relevant automated tests and project checks pass; any unavailable or failing checks are reported honestly.
- Security, ownership, validation, loading, empty, and error states have been considered where relevant.
- Documentation and specifications match the shipped behaviour.
- Known limitations and follow-up work are recorded.

## Change control

If implementation reveals that a requirement is incorrect, incomplete, or impractical:
1. Stop and explain the discovery.
2. Propose the specification change and its impact.
3. Get agreement before changing scope or behaviour.
4. Update the specification and traceability record.
5. Continue implementation against the updated baseline.

Do not silently change requirements to match what was easiest to build.

## AI coding-agent rules

Coding agents working on ApplyFlow must:
- Read this workflow and the relevant feature specification before changing code.
- Inspect the existing implementation and reuse established patterns unless a justified change is approved.
- Produce an implementation plan before editing files.
- Avoid unrelated refactors and unrequested dependencies.
- Never invent user facts, job qualifications, or achievements in AI-generated career documents.
- Report files changed, requirement IDs addressed, commands/tests run, results, and remaining risks.
- Never claim a test passed unless it was actually executed and passed.

## Current baseline

The first activity under this process is **Milestone 0: technical audit and project baseline**. The existing PRD and feature documentation are historical inputs to review, not yet an approved specification baseline. Do not treat proposed future capabilities as implemented until verified in the codebase.
