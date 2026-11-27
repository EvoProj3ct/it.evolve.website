"use client";

import { configureStore } from "@reduxjs/toolkit";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { useStore } from "react-redux";
import type { PublicCatalogList, PublicCatalogProduct, PublicProductPage } from "@evolve/ecommerce-server/catalog";
import type { z } from "zod";
import { sessionChanged, storefrontSessionGeneration, StorefrontError, storefrontGet, storefrontRead } from "./browser";
import {
  cartCountSchema, cartSchema, checkoutOptionsSchema, customerLinkSchema,
  profileSchema, savedBillingSchema,
} from "./contracts";

type QueryError = { message: string; status: number; code: string; retryAfter: number };
type QueryResult<T> = { data: T } | { error: QueryError };
const profileAge = 90;
const cartAge = 45;
export const catalogCacheAge = 120;
const preferencesChannel = "evolve:shop-preferences";

async function result<T>(read: () => Promise<T>): Promise<QueryResult<T>> {
  try {
    return { data: await read() };
  } catch (reason) {
    if (reason instanceof StorefrontError) {
      const { message, status, code, retryAfter } = reason;
      return { error: { message, status, code, retryAfter } };
    }
    if (reason instanceof DOMException && reason.name === "AbortError")
      return { error: { message: "Richiesta annullata.", status: 0, code: "ABORTED", retryAfter: 0 } };
    return { error: { message: "Operazione non disponibile. Riprova più tardi.", status: 0, code: "NETWORK_UNAVAILABLE", retryAfter: 0 } };
  }
}

function privateQuery<T>(path: string, schema: z.ZodType<T>):
  (_: void, api: { signal: AbortSignal; getState: () => unknown }) => Promise<QueryResult<T>> {
  return (_, { signal, getState }) => result(async () => {
    try {
      return await storefrontGet(path, schema, signal);
    } catch (error) {
      if (error instanceof StorefrontError && error.code === "LOGIN_REQUIRED" && hasProfile(getState()))
        sessionChanged("invalid");
      throw error;
    }
  });
}

export const shopApi = createApi({
  reducerPath: "shopApi",
  baseQuery: fakeBaseQuery<QueryError>(),
  keepUnusedDataFor: 180,
  tagTypes: ["Profile", "Billing", "CustomerLink", "Cart", "Catalog"],
  endpoints: builder => ({
    profile: builder.query<z.infer<typeof profileSchema>, void>({ queryFn: privateQuery("/me", profileSchema), providesTags: ["Profile"] }),
    billing: builder.query<z.infer<typeof savedBillingSchema>, void>({ queryFn: privateQuery("/me/billing", savedBillingSchema), providesTags: ["Billing"] }),
    customerLink: builder.query<z.infer<typeof customerLinkSchema>, void>({ queryFn: privateQuery("/me/customer-link", customerLinkSchema), providesTags: ["CustomerLink"] }),
    cart: builder.query<z.infer<typeof cartSchema>, void>({ queryFn: privateQuery("/cart", cartSchema), providesTags: ["Cart"] }),
    cartCount: builder.query<z.infer<typeof cartCountSchema>, void>({ queryFn: privateQuery("/cart/count", cartCountSchema), providesTags: ["Cart"] }),
    checkoutOptions: builder.query<z.infer<typeof checkoutOptionsSchema>, void>({ queryFn: privateQuery("/checkout-options", checkoutOptionsSchema) }),
    catalog: builder.query<PublicCatalogList, string>({
      queryFn: (query, { signal }) => result(() => storefrontRead<PublicCatalogList>(`/catalog?${query}`, signal)),
      providesTags: ["Catalog"],
    }),
    catalogProduct: builder.query<PublicCatalogProduct, string>({
      queryFn: (id, { signal }) => result(() => storefrontRead<PublicCatalogProduct>(`/catalog/${encodeURIComponent(id)}`, signal)),
      providesTags: ["Catalog"],
    }),
    productPage: builder.query<PublicProductPage, string>({
      queryFn: (slug, { signal }) => result(() => storefrontRead<PublicProductPage>(`/product-pages/${encodeURIComponent(slug)}`, signal)),
      providesTags: ["Catalog"],
    }),
  }),
});

export const makeShopStore = () => configureStore({
  reducer: { [shopApi.reducerPath]: shopApi.reducer },
  middleware: getDefault => getDefault().concat(shopApi.middleware),
  devTools: false,
});
export type ShopStore = ReturnType<typeof makeShopStore>;
export const useShopStore = useStore.withTypes<ShopStore>();

function hasProfile(state: unknown) {
  return !!shopApi.endpoints.profile.select()(state as ReturnType<ShopStore["getState"]>).data;
}

type CacheEntries = Parameters<typeof shopApi.util.upsertQueryEntries>[0];

export async function cacheShopEntries(store: ShopStore, entries: CacheEntries) {
  const generation = storefrontSessionGeneration();
  const reads = entries.flatMap(({ endpointName, arg }) => {
    const read = store.dispatch(shopApi.util.getRunningQueryThunk(endpointName, arg));
    if (!read) return [];
    read.abort();
    return [read];
  });
  // Wait for aborted reads to settle before recording the server's mutation response.
  if (reads.length) await Promise.all(reads);
  if (generation === storefrontSessionGeneration())
    store.dispatch(shopApi.util.upsertQueryEntries(entries));
}

export function shopQueryError(error: unknown) {
  if (error && typeof error === "object" && "name" in error && error.name === "AbortError")
    return new DOMException("Richiesta annullata.", "AbortError");
  if (error && typeof error === "object" && "status" in error && "code" in error && "message" in error) {
    const reason = error as QueryError;
    if (reason.code === "ABORTED") return new DOMException("Richiesta annullata.", "AbortError");
    return new StorefrontError(reason.message, reason.status, reason.code, reason.retryAfter);
  }
  return new StorefrontError("Operazione non disponibile. Riprova più tardi.");
}

async function unwrap<T>(request: { unwrap: () => Promise<T> }) {
  try { return await request.unwrap(); }
  catch (error) { throw shopQueryError(error); }
}

const readOptions = (age: number, refresh?: boolean) => ({ subscribe: false, forceRefetch: refresh || age });
const { profile, cart, billing, customerLink, checkoutOptions, catalog, catalogProduct } = shopApi.endpoints;
export const shopReads = {
  profile: (store: ShopStore, refresh?: boolean) => unwrap(store.dispatch(profile.initiate(undefined, readOptions(profileAge, refresh)))),
  cart: (store: ShopStore, refresh?: boolean) => unwrap(store.dispatch(cart.initiate(undefined, readOptions(cartAge, refresh)))),
  billing: (store: ShopStore, refresh?: boolean) => unwrap(store.dispatch(billing.initiate(undefined, readOptions(profileAge, refresh)))),
  customerLink: (store: ShopStore, refresh?: boolean) => unwrap(store.dispatch(customerLink.initiate(undefined, readOptions(cartAge, refresh)))),
  checkoutOptions: (store: ShopStore, refresh?: boolean) => unwrap(store.dispatch(checkoutOptions.initiate(undefined, readOptions(cartAge, refresh)))),
  catalog: (store: ShopStore, query: string, refresh?: boolean) => unwrap(store.dispatch(catalog.initiate(query, readOptions(catalogCacheAge, refresh)))),
  catalogProduct: (store: ShopStore, id: string, refresh?: boolean) => unwrap(store.dispatch(catalogProduct.initiate(id, readOptions(catalogCacheAge, refresh)))),
};

type Preference = "Profile" | "Billing" | "CustomerLink";
export function announceShopPreference(tag: Preference) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(preferencesChannel);
  channel.postMessage(tag);
  channel.close();
}

export function subscribeShopPreferences(callback: (tag: Preference) => void) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(preferencesChannel);
  channel.onmessage = ({ data }) => {
    if (data === "Profile" || data === "Billing" || data === "CustomerLink") callback(data);
  };
  return () => channel.close();
}
