"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import { personalizationInputSchema, publicIdSchema } from "./contracts";
import { StorefrontError } from "./browser";

const storageKey = "evolve:guest-cart-v1";
const lifetime = 86400000;
const guestLine = z.object({
  id: publicIdSchema,
  productPublicId: publicIdSchema,
  listingRevision: z.number().int().nonnegative(),
  quantity: z.number().int().min(1).max(1000),
  personalization: personalizationInputSchema.optional(),
  title: z.string().min(1).max(200),
  slug: z.string().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  unitGrossCents: z.number().int().nonnegative(),
  expiresAt: z.number().int(),
}).strict();

export type GuestCartLine = z.infer<typeof guestLine>;
const empty: GuestCartLine[] = [];
let lines: GuestCartLine[] | undefined;
const listeners = new Set<() => void>();

export function readGuestCart() {
  if (!lines) {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]");
      const parsed = z.array(guestLine).max(98).safeParse(saved);
      lines = parsed.success ? parsed.data.filter(line => line.expiresAt > Date.now()) : empty;
    } catch {
      lines = empty;
    }
  }
  return lines;
}

function writeGuestCart(next: GuestCartLine[]) {
  lines = next;
  try {
    if (next.length) window.sessionStorage.setItem(storageKey, JSON.stringify(next));
    else window.sessionStorage.removeItem(storageKey);
  } catch {
    // The cart remains available during navigation when storage is blocked.
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useGuestCart() {
  return useSyncExternalStore(subscribe, readGuestCart, () => empty);
}

export function addGuestLine(line: Omit<GuestCartLine, "id" | "expiresAt">) {
  const candidate = guestLine.safeParse({ ...line, id: crypto.randomUUID(), expiresAt: Date.now() + lifetime });
  if (!candidate.success)
    throw new StorefrontError("Controlla le scelte della personalizzazione.", 400, "PERSONALIZATION_INVALID");
  const current = readGuestCart().filter(item => item.expiresAt > Date.now());
  const existing = !line.personalization && current.find(item =>
    !item.personalization && item.productPublicId === line.productPublicId && item.listingRevision === line.listingRevision,
  );
  if (!existing && current.length >= 98)
    throw new StorefrontError("Il carrello contiene troppe righe.", 400, "CART_LIMIT");
  if (existing) {
    setGuestQuantity(existing.id, existing.quantity + line.quantity);
    return;
  }
  const quantity = current.filter(item => item.productPublicId === line.productPublicId)
    .reduce((total, item) => total + item.quantity, line.quantity);
  if (quantity > 1000)
    throw new StorefrontError("Hai raggiunto la quantità massima per questo articolo.", 400, "CART_LIMIT");
  writeGuestCart([...current, candidate.data]);
}

export function setGuestQuantity(id: string, quantity: number) {
  const current = readGuestCart();
  const line = current.find(item => item.id === id);
  if (!line) return;
  const otherQuantity = current.filter(item => item.id !== id && item.productPublicId === line.productPublicId)
    .reduce((total, item) => total + item.quantity, 0);
  if (quantity < 1 || quantity + otherQuantity > 1000)
    throw new StorefrontError("Controlla la quantità di questo articolo.", 400, "CART_LIMIT");
  writeGuestCart(current.map(item => item.id === id ? { ...item, quantity } : item));
}

export function removeGuestLine(id: string) {
  writeGuestCart(readGuestCart().filter(item => item.id !== id));
}
