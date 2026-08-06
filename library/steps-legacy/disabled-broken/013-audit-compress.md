---
name: AuditCompress
description:
enabled: false
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
