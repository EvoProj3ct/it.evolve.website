# Font locali

Le quattro famiglie già utilizzate dal sito sono caricate con `next/font/local`.
La build non richiede più il download da Google Fonts. Non servono pacchetti aggiuntivi.

I WOFF2 variabili, normali, del subset latin sono gli stessi file già scaricati
dal precedente caricamento Google Fonts del progetto. Comprendono i caratteri
accentati italiani. I caratteri non presenti nel subset usano il fallback.

| Asset | Famiglia | Asset originale nella cache locale |
| --- | --- | --- |
| Inter-latin-variable.woff2 | Inter | 83afe278b6a6bb3c-s.p.3a6ba036.woff2 |
| Montserrat-latin-variable.woff2 | Montserrat | e8f2fbee2754df70-s.p.9b7a96b4.woff2 |
| Geist-latin-variable.woff2 | Geist | caa3a2e1cccd8315-s.p.3b6cae6d.woff2 |
| GeistMono-latin-variable.woff2 | Geist Mono | 797e433ab948586e-s.p.29207c2f.woff2 |

I file sono copiati negli asset sorgenti e devono restare nel repository: non
dipendono più da `.next` durante build e deploy. Le variabili CSS dei layout restano
`--fonts-body`, `--fonts-display`, `--font-geist-sans` e `--font-geist-mono`.

Licenza SIL Open Font License 1.1: vedere `OFL.txt`.

Font e copyright:

- [Inter](https://github.com/rsms/inter), [licenza](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt).
- [Montserrat](https://github.com/JulietaUla/Montserrat), [licenza](https://github.com/google/fonts/blob/main/ofl/montserrat/OFL.txt).
- [Geist e Geist Mono](https://github.com/vercel/geist-font), [licenza Geist](https://github.com/google/fonts/blob/main/ofl/geist/OFL.txt), [licenza Geist Mono](https://github.com/google/fonts/blob/main/ofl/geistmono/OFL.txt).

Riferimento di implementazione: [Next.js Font](https://nextjs.org/docs/app/api-reference/components/font).
