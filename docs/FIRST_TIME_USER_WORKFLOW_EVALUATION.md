# First-time user workflow evaluation

**Purpose:** gather observed usability evidence for the approved Discover → Research → Strategy Lab → Paper Desk workflow. This protocol evaluates navigation and comprehension; it does not measure research accuracy, investment outcomes, or product-market fit.

## Completion gate

Recruit five people who have not built Tidelight and have not previously completed this workflow. An individual passes only if they can, without navigation coaching:

1. Find a public company or supported tokenized-equity instrument and explain which instrument they selected.
2. Open a research result and identify a source, its date, and whether a displayed item is a source observation or model interpretation.
3. Open a strategy replay, identify its historical data window and cost assumptions, and explain one limitation of the result.
4. Reach the related paper review or Nightwatch workflow and correctly explain that it is a paper simulation, not a live order.
5. Return to the evidence or Decision Record that supports the review.

The roadmap's usability gate is at least four passes out of five. Report the numerator and denominator. Do not treat a participant's factual market answer as a research-quality label.

## Session setup

- Choose the authentication mode before recruitment and use it consistently for all five sessions. If the workflow needs a saved account, use a dedicated pre-provisioned test account per session with no previous workflow data or exchange credentials. Reset or remove test data under the approved retention policy between sessions. Do not ask participants to connect exchange accounts, enter personal credentials, or place orders.
- Confirm participant consent to observe task completion and take anonymous notes. Do not record passwords, API keys, account balances, private research content, or unnecessary personal information.
- Use a neutral facilitator who did not build the tested flow. Give the same task wording to every participant and avoid hints about navigation or expected answers.
- Record the app commit, date, viewport, theme, authentication state, and any provider outage or unavailable feature that affects the task. Keep provider failures separate from usability failures.
- Do not create, enable, or change a Nightwatch schedule or paper position during a session. The participant only inspects the existing paper workflow.

## Neutral task prompt

> You are looking into a recent event affecting a company you follow. Use Tidelight to find the relevant company or supported instrument, review the evidence, inspect a historical strategy result, and reach the paper review. As you work, explain what you believe is sourced, what is interpretation or simulation, and what you would check next. Do not place any order or change an account setting.

Let the participant choose the company or supported instrument. If live sources, replay data, or a workflow step are unavailable, record the actual state and let the participant decide what to do next; do not substitute a fabricated or pre-completed result.

## Moderator rules

- Read the prompt once, then let the participant work. Do not point to buttons, explain labels, or complete steps for them.
- If the participant asks for help, ask what they would try next. Record any explanation or navigation hint as assistance; assisted completion does not pass the unassisted gate.
- Stop before any irreversible or account-changing action. If the UI offers an unexpected live action, end that step and record it as a safety issue.
- Ask follow-up questions after the task: what was unclear, what evidence they trusted, how they interpreted the data mode, and what they thought the paper review would do.

## Anonymous session record

Use `P01`–`P05`; do not store participant names in this repository.

| Participant | Date | Commit / viewport / theme | Auth state | Found instrument | Distinguished source from interpretation | Understood replay window and costs | Reached paper review and explained simulation | Returned to supporting evidence | Assistance given | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01 |  |  |  |  |  |  |  |  |  |  |
| P02 |  |  |  |  |  |  |  |  |  |  |
| P03 |  |  |  |  |  |  |  |  |  |  |
| P04 |  |  |  |  |  |  |  |  |  |  |
| P05 |  |  |  |  |  |  |  |  |  |  |

For each participant, save only brief, de-identified notes about observed friction and participant wording. Summarize the five outcomes, blockers, and resulting product changes in a dated report. Keep raw notes access-controlled and delete them according to the project's approved retention policy.

## Reporting boundary

Publish the sample size, unassisted completion count, tested app commit, participant criteria, and material limitations. Five sessions are a directional usability check, not a statistically representative study. A pass does not establish factual correctness, accessibility conformance, security, or commercial readiness. Keep the gate open until five valid sessions are observed and at least four pass.
