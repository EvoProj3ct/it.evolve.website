# evolve-webapp-migration-planner

## Scopo

Pianificare migrazioni, refactor e decommissioning nella webapp Evolve senza modificare codice direttamente.

## Quando usarla

Usare quando bisogna analizzare una migrazione fra repository, definire rotte, componenti, API, asset, documentazione e cleanup.

## Output atteso

- Mappa source -> target.
- Rotte da creare, modificare e rimuovere.
- Componenti da mantenere, spostare o eliminare.
- API e librerie da adattare.
- Checklist QA.
- Rischi e blocchi.
- Prompt operativo per agente coding.

## Divieti

- Non creare branch.
- Non creare PR.
- Non modificare file.
- Non chiamare strumenti di modifica come update_file, delete_file o create_pull_request.
- Non fare commit.
