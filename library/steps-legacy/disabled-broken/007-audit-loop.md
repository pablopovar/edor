---
name: AuditLoop
description:
enabled: false
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
