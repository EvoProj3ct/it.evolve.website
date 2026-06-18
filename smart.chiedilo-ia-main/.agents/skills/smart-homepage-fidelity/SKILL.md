---
name: smart-homepage-fidelity
description: Usa questa skill per aggiornare homepage e sezioni marketing mantenendo fedelta strutturale al layout validato, con modifiche cromatiche o contenutistiche controllate e riusabili.
---

# smart-homepage-fidelity

## Quando usarla

- Modifiche alla homepage in `app/page.tsx`.
- Aggiornamenti di palette, gradienti, tipografia visiva o micro-movimenti.
- Estensioni di sezioni senza perdere la struttura originaria.

## Contratto operativo

1. Preserva struttura e ordine sezioni del layout validato.
2. Applica variazioni cromatiche con remap token, non con redesign completo.
3. Mantieni invariati ritmo verticale, gerarchie tipografiche e pattern animativi.
4. Aggiorna solo i componenti coinvolti e documenta mapping colori applicato.
5. Verifica desktop/mobile e segnala regressioni prima di chiudere.

## Output minimi richiesti

- Diff codice in `app/page.tsx` e file correlati.
- Nota palette applicata (sorgente -> target).
- Check QA compilata con esito responsive e accessibilita base.

## Gate di blocco

- Rimozione o riordino sezioni senza motivazione esplicita.
- Introduzione di nuove palette non tracciate nel mapping.
- Semplificazione del layout che riduce la fedelta al modello.

## References

- `references/layout-contract.md`
- `references/palette-mapping.md`
- `references/component-map.md`
- `references/qa-checklist.md`
