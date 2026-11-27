"use client";

import { useEffect, useState } from "react";
import { validatePublicCatalogList, validatePublicCatalogProduct } from "@evolve/ecommerce-server/catalog-validation";

type CatalogEndpoint = "catalog" | "catalogProduct" | "productPage";
type Snapshot = { endpointName: CatalogEndpoint; arg: string; value: unknown; savedAt: number };
const storageKey = "evolve:public-catalog-v1";
const maxAgeMs = 10 * 60_000;
const maxEntries = 12;
const maxChars = 240_000;

function readSnapshots(): Snapshot[] {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw || raw.length > maxChars) return [];
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    const now = Date.now();
    return entries.slice(0, maxEntries).filter(entry => {
      return entry && typeof entry.arg === "string" && entry.arg.length <= 250 &&
        typeof entry.savedAt === "number" && entry.savedAt <= now && now - entry.savedAt < maxAgeMs &&
        (entry.endpointName === "catalog" || entry.endpointName === "catalogProduct" || entry.endpointName === "productPage");
    });
  } catch {
    return [];
  }
}

export function readCatalogSnapshot(endpointName: CatalogEndpoint, arg: string) {
  const saved = readSnapshots().find(entry => entry.endpointName === endpointName && entry.arg === arg);
  if (!saved) return;
  try {
    if (endpointName === "catalog") return { endpointName, arg, value: validatePublicCatalogList(saved.value) };
    if (endpointName === "catalogProduct") {
      const value = validatePublicCatalogProduct(saved.value);
      if (value.id === arg) return { endpointName, arg, value };
    } else {
      const value = validatePublicCatalogProduct(saved.value, true);
      if (value.slug === arg) return { endpointName, arg, value };
    }
  } catch {
    forgetCatalogSnapshot(endpointName, arg);
  }
}

function writeSnapshots(entries: Snapshot[]) {
  try {
    const limited: Snapshot[] = [];
    let length = 2;
    for (const entry of entries.slice(0, maxEntries)) {
      const size = JSON.stringify(entry).length + 1;
      if (length + size > maxChars) continue;
      limited.push(entry);
      length += size;
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(limited));
  } catch {
    // The in-memory cache still works when browser storage is unavailable.
  }
}

export function saveCatalogSnapshot(endpointName: CatalogEndpoint, arg: string, value: unknown) {
  const previous = readSnapshots().filter(entry => entry.endpointName !== endpointName || entry.arg !== arg);
  writeSnapshots([{ endpointName, arg, value, savedAt: Date.now() }, ...previous]);
}

export function forgetCatalogSnapshot(endpointName: CatalogEndpoint, arg: string) {
  writeSnapshots(readSnapshots().filter(entry => entry.endpointName !== endpointName || entry.arg !== arg));
}

export function useCatalogSnapshot(endpointName: CatalogEndpoint, arg: string) {
  const [snapshot, setSnapshot] = useState<ReturnType<typeof readCatalogSnapshot>>();
  useEffect(() => {
    setSnapshot(readCatalogSnapshot(endpointName, arg));
  }, [endpointName, arg]);
  if (snapshot?.endpointName === endpointName && snapshot.arg === arg) return snapshot;
}
