# Skills Migration Report

## Scope

- Repository: EvoProj3ct/it.evolve.website
- Target: .agents/skills
- Excluded area: /chiedilo-all-ia

## Skills verified

| Skill | SKILL.md | agents/openai.yaml | References | Status |
|---|---:|---:|---:|---|
| smart-homepage-fidelity | yes | yes (created) | complete (4 files) | ok |
| smart-step-3-derivation | yes | yes (created) | complete (4 files) | ok |
| evolve-coding-agent-prompt-builder | yes | yes | complete (1 file) | migrated from `documentation/skills/` |
| evolve-privacy-compliance-reviewer | yes | yes | complete (1 file) | migrated from `documentation/skills/` |
| evolve-webapp-migration-planner | yes | yes | complete (1 file) | migrated from `documentation/skills/` |

## Changes applied

- **smart-homepage-fidelity/SKILL.md**: updated path references from `app/page.tsx` to `src/app/(site)/page.tsx`
- **smart-homepage-fidelity/agents/openai.yaml**: created
- **smart-step-3-derivation/agents/openai.yaml**: created
- **evolve-coding-agent-prompt-builder**: migrated from `documentation/skills/` to `.agents/skills/`
- **evolve-privacy-compliance-reviewer**: migrated from `documentation/skills/` to `.agents/skills/`
- **evolve-webapp-migration-planner**: migrated from `documentation/skills/` to `.agents/skills/`
- **.agents/README.md**: updated skill list and usage instructions
- **documentation/skills/**: source folders deleted after migration (3 skill directories)

## Missing or unresolved

- External skills from `C:\development\sh1ni\sh1ni.consultant.app\.agents\skills` — **not migrated**: consultant-app specific.

## Runtime notes

- Both skills now have `agents/openai.yaml` for runtime UI/metadata support.
- No structural changes to skill layouts or reference files.

## Homepage fidelity notes

- No structural redesign performed.
- No /chiedilo-all-ia files modified.
- Homepage section order preserved.
- 8 components modified with surgical, conservative edits.
