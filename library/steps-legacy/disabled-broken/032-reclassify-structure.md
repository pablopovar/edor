---
name: ReclassifyStructure
description:
enabled: false
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
