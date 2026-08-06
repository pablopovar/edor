---
name: AuditAgainstThread
description:
enabled: false
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
