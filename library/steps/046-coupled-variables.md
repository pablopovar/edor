---
name: CoupledVariables
description: Separate falsely coupled variables and clarify their actual dependencies
enabled: true
legacy_id: 46
object_type: step
step_type: transformer
---

Identify variables in the Material that are treated as coupled but are actually distinct and, for each, say:

**These are distinct variables** (and explain why)

**This is what actually depends on what** (and explain the dependency)

Edit the Material based on your conclusions and return one complete improved version.
