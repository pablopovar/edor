---
name: Consolidate
description:
enabled: false
legacy_id: 9
object_type: step
step_type: transformer
---

Adhere to contextual_data, instructions_definition, and goals_success_definition as the governing frame.
Read session_payload and prior transformer transitions recorded in step_history and consolidate the strongest valid outputs into the current session_payload while preserving coherence with the governing frame.
Return the consolidated state in StepResult.session_payload.
