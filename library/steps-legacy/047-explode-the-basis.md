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
