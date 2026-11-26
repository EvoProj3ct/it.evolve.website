import type { PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { cartSchema, type Cart, type PersonalizationInput, type SaveCart } from "./contracts";
import { StorefrontError, storefrontGet, storefrontMutate } from "./browser";
import { addGuestLine, readGuestCart, removeGuestLine } from "./guest-cart";

const cartEvent = "evolve:storefront-cart";

export function subscribeCartChanges(callback: () => void) {
  window.addEventListener(cartEvent, callback);
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(cartEvent);
  if (channel) channel.onmessage = callback;
  return () => {
    window.removeEventListener(cartEvent, callback);
    channel?.close();
  };
}

export function cartChanged() {
  window.dispatchEvent(new Event(cartEvent));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(cartEvent);
    channel.postMessage("changed");
    channel.close();
  }
}

export async function saveAccountCart(input: SaveCart, notify = true) {
  const cart = await storefrontMutate("/cart/items", "PUT", input, cartSchema);
  if (notify) cartChanged();
  return cart;
}

export async function addCatalogProduct(
  product: PublicCatalogProduct,
  personalization: PersonalizationInput | undefined,
  signal?: AbortSignal,
) {
  const line = { productPublicId: product.id, listingRevision: product.revision, quantity: 1, personalization };
  let current: Cart;
  try {
    current = await storefrontGet("/cart", cartSchema, signal);
  } catch (error) {
    if (!(error instanceof StorefrontError) || error.code !== "LOGIN_REQUIRED") throw error;
    signal?.throwIfAborted();
    addGuestLine({ ...line, title: product.name, slug: product.slug, unitGrossCents: product.price.unitGrossCents });
    return;
  }
  signal?.throwIfAborted();
  return addToAccountCart(current, line);
}

function addToAccountCart(current: Cart, line: SaveCart["items"][number]) {
  if (current.requiresReview || current.status === "expired" || current.status === "converted" ||
      current.items.some(item => item.state !== "available" || item.listingRevision === null)) {
    throw new StorefrontError("Controlla e conferma il carrello prima di aggiungere altri articoli.", 409, "CART_REVIEW_REQUIRED");
  }
  const found = !line.personalization && current.items.find(item => item.productPublicId === line.productPublicId && !item.personalizationId);
  if (found && found.listingRevision !== line.listingRevision)
    throw new StorefrontError("La scheda è cambiata. Rivedi il prodotto e il carrello.", 409, "CATALOG_CHANGED");
  const items: SaveCart["items"] = current.items.map(item => ({
    productPublicId: item.productPublicId,
    listingRevision: item.listingRevision!,
    quantity: item.quantity + (item === found ? line.quantity : 0),
    personalizationId: item.personalizationId,
  }));
  if (!found) items.push(line);
  return saveAccountCart({ cartPublicId: current.id, expectedRevision: current.revision, items });
}

export async function importGuestCart(cart: Cart, signal: AbortSignal) {
  let current = cart;
  let imported = false;
  try {
    for (const line of readGuestCart()) {
      signal.throwIfAborted();
      const { id, productPublicId, listingRevision, quantity, personalization, expiresAt } = line;
      if (expiresAt > Date.now()) {
        current = await saveAccountCart({
          cartPublicId: current.id,
          expectedRevision: current.revision,
          items: [{ productPublicId, listingRevision, quantity, personalization }],
          guestImportId: id,
        }, false);
        removeGuestLine(id);
        imported = true;
      } else {
        removeGuestLine(id);
      }
    }
    return { cart: current, importError: null };
  } catch (importError) {
    signal.throwIfAborted();
    return { cart: current, importError };
  } finally {
    if (imported) cartChanged();
  }
}
