---
name: Not Like That Specialist
description: That won't work. This works
enabled: true
---

Select as many elements as needed from the **Material**—such as the text, title and subheadings, length, pace, flow, content, structure, readability, or specific parts of it—and, for each selected element:

Say "Not like that, it won't work" and elaborate your reasons.

Say "This is what works" and elaborate your reasons.

Use your conclusions to improve the **Material** and provide one complete reformulated **Material**.
---
name: AuditLoop
description:
enabled: true
legacy_id: 7
object_type: step
step_type: control
step_inputs: payload, contextual_data, instructions_definition, goals_success_definition, session_directives, ResolvedSteps, step_history, current_loop_record_ids, loop_history, control_output_history
---

This step does:
1. Analyze the completed visible portion of the current loop using current_loop_record_ids, step_history, control_output_history, and prior loop_history.
2. Compare execution against payload, contextual_data, instructions_definition, goals_success_definition, session_directives, and ResolvedSteps.
3. Identify drift, stack-boundary violations, hidden-method contamination, repeated weak reasoning, over-optimization, loss of meaning, false justification, and non-improving iteration.
4. Populate StepResult.step_output with a loop audit report.
5. Return StepResult with an unchanged session_payload.
---
name: Like This Instead Specialist
description: This can be improved. This can be omitted
enabled: true
legacy_id: 8
object_type: step
step_type: transformer
---

Select as many elements as needed from the **Material**—such as the text, title and subheadings, length, pace, flow, content, structure, readability, or specific parts of it—and, for each selected element:

Say "This can be improved" and elaborate your reasons.

Say "This can be omitted" and elaborate your reasons.

Use your conclusions to improve the **Material** and provide one complete reformulated **Material**.
---
name: Consolidate
description:
enabled: true
legacy_id: 9
object_type: step
step_type: transformer
---

Adhere to contextual_data, instructions_definition, and goals_success_definition as the governing frame.
Read session_payload and prior transformer transitions recorded in step_history and consolidate the strongest valid outputs into the current session_payload while preserving coherence with the governing frame.
Return the consolidated state in StepResult.session_payload.
---
name: ExplodeTheBasis
description:
enabled: false
legacy_id: 10
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for inherited assumptions that do not hold.
2. Elaborate on "This basis will not hold:".
3. Rebuild from supported criteria and return the rebuilt state in StepResult.session_payload.
---
name: CoupledVariables
description:
enabled: true
---

Analyze session_payload and separate coupled variables based on contextual_data, instructions_definition, and goals_success_definition.
2. Say "These are distinct variables:" and "This is what actually depends on what:" with elaborations.
3. Return full, improved state in StepResult.session_payload.
---
name: Compress
description:
enabled: true
legacy_id: 12
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload against criteria for filler, redundancy, and non-essential material.
2. Reduce content while preserving the conceptual spine and return it in StepResult.session_payload.
---
name: AuditCompress
description:
enabled: true
legacy_id: 13
object_type: step
step_type: control
step_inputs: contextual_data, instructions_definition, goals_success_definition, session_payload, step_history, current_loop_record_ids
---

This step does:
1. Retrieve the most recent Compress transition from the current loop.
2. If no current-loop Compress transition exists, return StepResult.control_signal = "HALT" with a missing-dependency report.
3. Compare the state immediately before Compress with the state immediately after Compress.
4. Identify omission, mutation of meaning, over-smoothing, false coherence, and loss of necessary distinctions.
5. Populate StepResult.step_output with a compression audit report.
6. Return StepResult with an unchanged session_payload.
---
name: ExtractSignals
description:
enabled: true
legacy_id: 14
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload against contextual requirements for its top three strongest signals.
2. Append those extracted signals into a copy of the payload state and return it in StepResult.session_payload.
---
name: OutputFromSignal
description:
enabled: true
legacy_id: 15
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for extracted signals.
2. Generate output candidates from those signals prioritizing conceptual precision and structural fit.
3. Append the generated candidates to the payload state and return it in StepResult.session_payload.
---
name: PromptExtractIntent
description:
enabled: true
legacy_id: 16
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for the user’s intended assistant function, task family, posture, constraints, and allowances.
2. Append the extracted prompt intent into the payload state and return it in StepResult.session_payload.
---
name: PromptInferOperationalDefaults
description:
enabled: true
legacy_id: 17
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for missing but necessary prompt constraints, boundaries, and allowances.
2. Infer minimal sensible prompt defaults, append them to the payload state, and return it in StepResult.session_payload.
---
name: PromptDefineContract
description:
enabled: true
legacy_id: 18
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for extracted prompt intent, inferred defaults, and missing structure.
2. Convert them into a prompt contract covering scope, behavior, and posture, append to state, and return in StepResult.session_payload.
---
name: PromptDraftSystemPrompt
description:
enabled: true
legacy_id: 19
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for the prompt contract.
2. Draft a system prompt from that contract, append it to the payload state, and return it in StepResult.session_payload.
---
name: PromptAuditFit
description:
enabled: true
legacy_id: 20
object_type: step
step_type: control
---

This step does:
1. Analyze session_payload for drift, overreach, vagueness, or mismatch with the extracted prompt intent and contract.
2. Populate StepResult.step_output with a prompt-fit audit report.
3. Return StepResult with an unchanged session_payload.
---
name: TranslateFaithfully
description:
enabled: true
legacy_id: 25
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload against variables and constraints before translating.
2. Translate content into the target language with maximum fidelity to original meaning, technical accuracy, and structural relationships.
3. Avoid unrequested localization or smoothing. Return the translation in StepResult.session_payload.
---
name: ImproveTranslationFidelity
description:
enabled: true
legacy_id: 26
object_type: step
step_type: transformer
---

This step does:
1. Analyze translated session_payload for semantic weakness, collapsed distinctions, or structural drift.
2. Correct the content to restore original qualifiers and logical relationships, and return the modified state in StepResult.session_payload.
---
name: AuditTranslationFidelity
description:
enabled: true
legacy_id: 27
object_type: step
step_type: control
step_inputs: payload, contextual_data, instructions_definition, goals_success_definition, session_payload
---

This step does:
1. Compare translated session_payload against immutable payload and the governing translation constraints.
2. Analyze translation equivalence, untranslated residue, omitted qualifiers, meaning drift, structural distortion, and localization creep.
3. Populate StepResult.step_output with a translation fidelity audit report.
4. Return StepResult with an unchanged session_payload.
---
name: AuditAgainstThread
description:
enabled: true
legacy_id: 30
object_type: step
step_type: control
step_inputs: source_thread, contextual_data, instructions_definition, goals_success_definition, session_payload
---

This step does:
1. Require source_thread.
2. If source_thread is absent, populate StepResult.step_output with a missing-dependency report and set StepResult.control_signal = "HALT".
3. Compare session_payload against source_thread.
4. Identify omissions, inaccuracies, misclassifications, collapsed distinctions, and false integrations.
5. Populate StepResult.step_output with the audit report.
6. Return StepResult with an unchanged session_payload.
---
name: WriteAddendum
description:
enabled: true
legacy_id: 31
object_type: step
step_type: transformer
step_inputs: contextual_data, instructions_definition, goals_success_definition, session_payload, control_output_history, current_loop_number
---

This step does:
1. Retrieve the most recent current-loop control output from AuditAgainstThread using Step name and current_loop_number.
2. If the required output is absent, stale, or belongs to another Step, return an unchanged session_payload, populate StepResult.step_output with a missing-dependency report, and set StepResult.control_signal = "HALT".
3. Analyze session_payload as the current document and the retrieved control output as the audit result.
4. Append only validated audit findings as an addendum, leaving the base document intact.
5. Return the modified document state in StepResult.session_payload.
---
name: ReclassifyStructure
description:
enabled: true
legacy_id: 32
object_type: step
step_type: transformer
step_inputs: domain_model, contextual_data, instructions_definition, goals_success_definition, session_payload
---

This step does:
1. Require domain_model.
2. If domain_model is absent, return an unchanged session_payload, populate StepResult.step_output with a missing-dependency report, and set StepResult.control_signal = "HALT".
3. Analyze session_payload using domain_model as read-only classification criteria.
4. Append or replace the classification layer with updated domains, verticals, projects, subprojects, and unresolved classifications.
5. Return the modified state in StepResult.session_payload.
---
name: IsolateOrphansAndDecisions
description:
enabled: true
legacy_id: 33
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for orphaned topics, unmade decisions, and under-integrated concepts.
2. Append these isolated elements as a distinct pass layer and return the updated state in StepResult.session_payload.
---
name: ExtractLineages
description:
enabled: true
legacy_id: 34
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload for relational concept descent, branch splits, and parent-child hierarchies.
2. Append this lineage mapping to the document state and return it in StepResult.session_payload.
---
name: EnforceDistinctionLayer
description:
enabled: true
legacy_id: 35
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload to ensure separation between artifact vs commentary and concept vs implementation.
2. Append explicit boundary markers where blurring occurred and return the state in StepResult.session_payload.
---
name: ConsolidatePasses
description:
enabled: true
legacy_id: 36
object_type: step
step_type: transformer
---

This step does:
1. Analyze session_payload elements (base document, addenda, classification layers, passes) and merge them into a unified, duplication-free document.
2. Preserve unresolved ambiguities cleanly and return the consolidated state in StepResult.session_payload.
---
name: AuditConsistency
description:
enabled: true
legacy_id: 37
object_type: step
step_type: control
---

This step does:
1. Analyze the consolidated session_payload document for naming inconsistencies, hierarchy inconsistencies, duplicate categories, unresolved term drift, and unmarked structural overlap.
2. Populate StepResult.step_output with the final consistency audit report.
3. Return StepResult with an unchanged session_payload.
---
name: AuditConsistency
description:
enabled: true
legacy_id: 37
object_type: step
step_type: control
---

This step does:
1. Analyze the consolidated session_payload document for naming inconsistencies, hierarchy inconsistencies, duplicate categories, unresolved term drift, and unmarked structural overlap.
2. Populate StepResult.step_output with the final consistency audit report.
3. Return StepResult with an unchanged session_payload.
---
name: MarkdownFormatArchitect
description: Markdown expert specialized in improving content usability and readability
enabled: true
legacy_id: 40
object_type: step
step_type: transformer
---

You are a Markdown expert specialized in improving content usability and readability by leveraging Markdown's formatting elements as headings, quotes, bolded sentences, structure, tables, cells, and breathability by smart placement of whitespace.
---
name: IlluminateStatusQuo
description: Identify the buyer’s current approach, recurring friction, consequential problem, and reason to reconsider the status quo.
enabled: true
object_type: step
---

Read the source material from the buyer’s point of view. Identify:

- what the buyer is trying to accomplish;
- how the work is handled today;
- where friction, uncertainty, delay, risk, or unnecessary effort occurs;
- why the problem is consequential enough to deserve attention;
- what the buyer may not have considered about the current approach;
- the language the buyer would naturally use to describe the situation;
- evidence, limitations, and unresolved assumptions.

Produce a concise buyer-recognition brief for the next Step. Do not pitch the product, write the final sales asset, manufacture urgency, or assume every buyer has the problem. Preserve the source facts and truth boundaries required for subsequent work.
---
name: InviteSelfSelection
description: Turn buyer recognition into a complete sales asset that presents the offer, establishes fit, and invites a low-pressure next step.
enabled: true
object_type: step
---

Use the buyer-recognition brief and source material to produce the requested sales asset.

Move the reader through this progression:

1. Recognize the current situation.
2. Understand why it may be worth reconsidering.
3. See what a different outcome would make possible.
4. Understand how the offer contributes to that outcome.
5. Evaluate evidence, limitations, tradeoffs, and fit.
6. Decide whether to take the proposed next step.

Write one complete, selected direction. Do not append alternatives, candidate banks, rejected language, analysis, or process commentary. Do not exaggerate the problem or force a conclusion. End with a clear, proportionate invitation that lets the reader continue, decline, or determine that the offer is not for them.
---
name: Unsupported Assumptions
description: Expose unsupported assumptions and rebuild the Material on a defensible basis
enabled: true
legacy_id: 45
object_type: step
step_type: transformer
---

Identify and list unsupported assumptions in the Material and, for each, say:

**This basis won't hold** (and explain why)

Edit the Material based on your conclusions and return one complete improved version.
