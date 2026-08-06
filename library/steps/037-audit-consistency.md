---
name: AuditConsistency
description:
enabled: false
legacy_id: 37
object_type: step
step_type: control
---

This step does:
1. Analyze the consolidated session_payload document for naming inconsistencies, hierarchy inconsistencies, duplicate categories, unresolved term drift, and unmarked structural overlap.
2. Populate StepResult.step_output with the final consistency audit report.
3. Return StepResult with an unchanged session_payload.
