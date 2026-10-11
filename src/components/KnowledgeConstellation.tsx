"use client";

import { createConstellation } from "./Constellation";
import type { Concept, ConstellationData } from "./Constellation";

const homeConcepts: Concept[] = [
  { name: "Analisi", text: "Partiamo dal lavoro reale: osserviamo processi, vincoli e obiettivi prima di scegliere gli strumenti.", desktop: { x: 85, y: 390 } },
  { name: "Informazione", text: "Rendiamo accessibili temi tecnici e novità, con parole chiare e occasioni di confronto.", desktop: { x: 300, y: 190 } },
  { name: "Consulenza", text: "Mettiamo a fuoco il problema insieme a te e definiamo un percorso che abbia senso per la tua organizzazione.", desktop: { x: 300, y: 570 } },
  { name: "Formazione ed eventi", text: "Condividiamo metodi e strumenti con corsi, seminari e incontri, perché l'innovazione continui anche dopo il nostro intervento.", desktop: { x: 520, y: 85 } },
  { name: "Dati", text: "Organizziamo le informazioni perché siano affidabili, reperibili e davvero utili nel lavoro quotidiano.", desktop: { x: 520, y: 275 } },
  { name: "Progettazione", text: "Traduciamo un'esigenza in un sistema chiaro: flussi, interfacce e integrazioni vengono pensati come un insieme.", desktop: { x: 520, y: 470 } },
  { name: "Prototipazione", text: "Rendiamo le idee verificabili presto, con prove concrete prima di investire nella soluzione finale.", desktop: { x: 520, y: 650 } },
  { name: "Sicurezza", text: "Consideriamo accessi, dati e continuità fin dall'inizio, come parte del progetto e non come aggiunta finale.", desktop: { x: 800, y: 100 } },
  { name: "Modelli locali", text: "Valutiamo quando eseguire modelli nei tuoi ambienti, considerando riservatezza, prestazioni e costi operativi.", desktop: { x: 800, y: 275 } },
  { name: "Agenti IA", text: "Progettiamo assistenti capaci di usare informazioni e strumenti per svolgere compiti definiti, con confini verificabili.", desktop: { x: 800, y: 390 } },
  { name: "Sviluppo", text: "Costruiamo software su misura intorno alle persone che lo useranno, con attenzione a manutenzione e crescita.", desktop: { x: 800, y: 470 } },
  { name: "Stampa 3D", text: "Diamo forma a componenti e prototipi per testare, adattare e migliorare un oggetto nel mondo reale.", desktop: { x: 800, y: 650 } },
  { name: "ATLAS", text: "Il nostro gestionale modulare mette in relazione dati, flussi operativi e persone, adattandosi al processo aziendale.", desktop: { x: 1160, y: 470 } },
  { name: "Automazione", text: "Affidiamo alle macchine le attività ripetitive, lasciando alle persone il controllo delle decisioni.", desktop: { x: 1160, y: 575 } },
  { name: "Integrazioni elettroniche", text: "Colleghiamo software e oggetti fisici: sensori, lettori e dispositivi entrano nello stesso flusso di lavoro.", desktop: { x: 1160, y: 650 } },
];

// A single left-to-right tree keeps the conceptual journey readable and the
// main connections free of crossings at every viewport size.
const homeLinks: [number, number][] = [
  [0, 1], [0, 2],
  [1, 3], [1, 4], [2, 5], [2, 6],
  [4, 7], [4, 8], [4, 9], [5, 10], [6, 11],
  [10, 12], [10, 13], [10, 14],
];

// A printed prototype may also carry sensors and electronics.
const homeCrossLinks: [number, number][] = [[11, 14]];

const homeData: ConstellationData = {
  id: "knowledge",
  title: "Nel metodo Evolve tutto è interconnesso.",
  concepts: homeConcepts,
  links: homeLinks,
  crossLinks: homeCrossLinks,
  homeScroll: true,
};

export const KnowledgeConstellation = createConstellation(homeData);
