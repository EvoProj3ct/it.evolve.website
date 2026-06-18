# Palette aziendale Evolve

Fonte: <https://evolve3d.it/evo-tools/Palette_Evolve_v2.html>

## Palette primaria (12 colori)

| Campione | Codice | Nome d'uso |
|---|---|---|
| `#00140B` | — | Nero vegetale (sfondo scuro) |
| `#1E6E30` | — | Verde Evolve medio-scuro |
| `#114928` | — | Verde Evolve scuro |
| `#578B60` | — | Verde salvia (mid-tone) |
| `#72C94F` | `--accent-blue` | Verde brillante (CTA, accenti primari) |
| `#ECF3E9` | — | Verde chiarissimo (sfondo light) |
| `#2C7A62` | `--accent-purple` | Verde-teal (accento secondario) |
| `#CABEE6` | — | Violetto chiaro |
| `#660000` | — | Rosso scuro bordò |
| `#F2F2A6` | — | Giallo chiaro pastello |
| `#CDE8D1` | `--accent-yellow` | Verde pallido (bordi, sfondi soft) |
| `#0B3D2E` | — | Verde profondità (titoli su light) |

## Sottogruppi

### Verde
- `#0B3D2E` — profondità
- `#2C7A62` — mid scuro
- `#578B60` — mid chiaro
- `#CDE8D1` — pallido

### Rosso
- `#660000`, `#800000`, `#B20000`, `#FF6666`

### Giallo-oro
- `#C1B10A`, `#E4D915`, `#F2F2A6`, `#FFFBD2`

### Violetto
- `#362066`, `#6956A6`, `#8567C1`, `#CABEE6`

## Variabili CSS (src/app/globals.css)

| Variabile | Valore | Ruolo |
|---|---|---|
| `--background` | `#0b1118` | Sfondo scuro globale |
| `--foreground` | `#eef2f7` | Testo su sfondo scuro |
| `--accent` | `#FF6666` | Accento rosso |
| `--accent-blue` | `#72C94F` | Verde brillante (CTA, hover) |
| `--accent-purple` | `#2C7A62` | Verde-teal (accento secondario) |
| `--accent-yellow` | `#CDE8D1` | Verde pallido (bordi, sfondi) |

## Mappatura componenti aggiornata (2026-06-18)

### StayUpdatedBanner (`src/components/StayUpdatedBanner.tsx`)
| Elemento | Colore |
|---|---|
| Background sezione | `#0b1118` (dark) con gradienti radiali `#72C94F` / `#2C7A62` opacity 4% |
| Sfondo card | `bg-white/[0.04]` con `shadow-black/40` |
| Bordo card | `border-[#72C94F]/15` |
| Titolo | `text-[#EEF2F7]` (foreground) |
| Testo | `text-[#EEF2F7]/70` |
| Bottone CTA | `from-[#72C94F] via-[#578B60] to-[#2C7A62]` con `shadow-[#72C94F]/20` su hover |

### /rimani-aggiornato (`src/app/rimani-aggiornato/page.tsx`)
| Elemento | Colore |
|---|---|
| Background pagina | `bg-[#FAFBFA]` (bianco caldo mono) |
| Sfondo card | `bg-white` con `shadow-[#0B3D2E]/6` |
| Bordo card | `border-[#CDE8D1]` |
| Badge | `border-[#72C94F]/40` `bg-[#72C94F]/10` `text-[#0B3D2E]` |
| Titolo h1 | `from-[#0B3D2E] via-[#2C7A62] to-[#72C94F]` |
| Testo descrittivo | `text-[#114928]/80` |
| Bottone "Torna alla home" | `border-[#72C94F]/30` `text-[#2C7A62]` hover `bg-[#ECF3E9]` `border-[#72C94F]` |

### EventInterestForm (`src/components/chiedilo/event-interest-form.tsx`)
| Elemento | Colore |
|---|---|
| Box intro (con barra laterale) | `bg-[#FAFBFA]` `border-[#72C94F]/20` + barra `from-[#72C94F] to-[#2C7A62]` |
| Box materiali (con barra laterale) | `bg-[#FAFBFA]` `border-[#72C94F]/20` + barra `from-[#72C94F] to-[#CDE8D1]` |
| Box consensi (con barra laterale) | `bg-[#FAFBFA]` `border-[#2C7A62]/25` + barra `from-[#2C7A62] to-[#578B60]` |
| Bottone submit | `from-[#72C94F] via-[#578B60] to-[#2C7A62]` con glow `hover:shadow-[#72C94F]/30` |
| Successo | `bg-[#ECF3E9]` `text-[#0B3D2E]` |

### Classe `.form-control` (globals.css)
| Proprietà | Valore |
|---|---|
| Bordo | `border-[#CDE8D1]` |
| Testo | `text-[#0B3D2E]` |
| Placeholder | `text-[#114928]/50` |
| Focus border | `border-[#72C94F]` |

### Classe `.form-field-label` (globals.css)
| Proprietà | Valore |
|---|---|
| Colore | `text-[#0B3D2E]/80` |
