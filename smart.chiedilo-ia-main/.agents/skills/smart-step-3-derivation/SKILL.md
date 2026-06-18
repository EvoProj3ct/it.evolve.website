---
name: smart-step-3-derivation
description: Usa questa skill quando devi produrre derivati da una cartella-master validata, selezionando tool e provider target, mantenendo tracciabilita alle fonti e bloccando la pubblicazione se emergono claim non supportati o incoerenze.
---

# smart-step-3-derivation

## Procedura essenziale

1. Verifica gate Step 2 e leggi `09_step_3_handoff/`.
2. Esegui `prompts/runtime/step-3-tool-router.md` per selezionare uno o piu flow tool.
3. Per ogni flow, usa il prompt runtime dedicato (`naming`, `image`, `summary-docs`, `powerpoint`, `static-web-page`, `informative-video`).
4. Dichiara sempre `tool_usato` e `provider_target` (`non specificato` se assente).
5. Genera output coerente con obiettivi, target, vincoli e policy.
6. Compila report di coerenza e checklist pubblicazione per ogni tool.

## Output obbligatori

- `workflow-output/<project-id>/step-3/<tool-name>/output.md`
- `workflow-output/<project-id>/step-3/<tool-name>/validation-report.md`
- `workflow-output/<project-id>/status/tools-used.md`

## Gate di blocco

- Cartella master non validata.
- Tool o scope non tracciabili all'handoff.
- Claim nuovi non supportati dalle fonti.
- Mancata dichiarazione di `tool_usato` o `provider_target`.

## References

- `references/derivation-contract.md`
- `references/provider-target-rules.md`
- `references/tool-catalog.md`
- `references/publication-checklist.md`
