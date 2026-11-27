"use client";

import { configureStore } from "@reduxjs/toolkit";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { useMemo } from "react";
import { useStore } from "react-redux";
import type { PublicCatalogList, PublicCatalogProduct, PublicProductPage } from "@evolve/ecommerce-server/catalog";
import type { PublicOrderTracking, PublicTrackingDeliveryDetails, PublicTrackingTimeline } from "@evolve/ecommerce-server/tracking";
import type { z } from "zod";
import { hidesPreviousData, sessionChanged, storefrontSessionGeneration, StorefrontError, storefrontGet, storefrontRead } from "./browser";
import { forgetCatalogSnapshot, saveCatalogSnapshot } from "./catalog-snapshot";
import { orderGroups, orderProgressFor, type OrderStatusCounts } from "./order-progress";
import {
  cartCountSchema, cartSchema, checkoutOptionsSchema, customerLinkSchema,
  orderSchema, ordersSchema, paymentSchema, profileSchema, savedBillingSchema,
} from "./contracts";

type QueryError = { message: string; status: number; code: string; retryAfter: number };
type QueryResult<T> = { data: T } | { error: QueryError };
const profileAge = 90;
const cartAge = 45;
export const catalogCacheAge = 120;
export const orderCacheAge = 30;
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

function privateResult<T>(read: () => Promise<T>, getState: () => unknown): Promise<QueryResult<T>> {
  return result(async () => {
    try {
      return await read();
    } catch (error) {
      if (error instanceof StorefrontError && error.code === "LOGIN_REQUIRED" && hasProfile(getState()))
        sessionChanged("invalid");
      throw error;
    }
  });
}

function privateQuery<T, Arg = void>(path: string | ((arg: Arg) => string), schema: z.ZodType<T>):
  (arg: Arg, api: { signal: AbortSignal; getState: () => unknown }) => Promise<QueryResult<T>> {
  return (arg, { signal, getState }) =>
    privateResult(() => storefrontGet(typeof path === "string" ? path : path(arg), schema, signal), getState);
}

const orderPath = (id: string) => `/orders/${encodeURIComponent(id)}`;
type TrackingPage = { orderId: string; delivery: string; cursor: string; version: number };
type TrackingDelivery = { orderId: string; id: string; version: number };

export const shopApi = createApi({
  reducerPath: "shopApi",
  baseQuery: fakeBaseQuery<QueryError>(),
  keepUnusedDataFor: 180,
  tagTypes: ["Profile", "Billing", "CustomerLink", "Cart", "Catalog", "Orders"],
  endpoints: builder => ({
    profile: builder.query<z.infer<typeof profileSchema>, void>({ queryFn: privateQuery("/me", profileSchema), providesTags: ["Profile"] }),
    billing: builder.query<z.infer<typeof savedBillingSchema>, void>({ queryFn: privateQuery("/me/billing", savedBillingSchema), providesTags: ["Billing"] }),
    customerLink: builder.query<z.infer<typeof customerLinkSchema>, void>({ queryFn: privateQuery("/me/customer-link", customerLinkSchema), providesTags: ["CustomerLink"] }),
    cart: builder.query<z.infer<typeof cartSchema>, void>({ queryFn: privateQuery("/cart", cartSchema), providesTags: ["Cart"] }),
    cartCount: builder.query<z.infer<typeof cartCountSchema>, void>({ queryFn: privateQuery("/cart/count", cartCountSchema), providesTags: ["Cart"] }),
    checkoutOptions: builder.query<z.infer<typeof checkoutOptionsSchema>, void>({ queryFn: privateQuery("/checkout-options", checkoutOptionsSchema) }),
    orders: builder.query<z.infer<typeof ordersSchema>, string>({
      queryFn: privateQuery((query: string) => `/orders${query ? `?${query}` : ""}`, ordersSchema),
      providesTags: ["Orders"],
    }),
    orderStatusCounts: builder.query<OrderStatusCounts, void>({
      queryFn: (_, { signal, getState }) => privateResult(async () => {
        const counts = Object.fromEntries(Object.keys(orderGroups).map(kind => [kind, 0])) as OrderStatusCounts;
        const seenOrders = new Set<string>();
        const seenCursors = new Set<string>();
        let cursor: string | null = null;

        do {
          const page: z.infer<typeof ordersSchema> = await storefrontGet(
            cursor ? `/orders?cursor=${encodeURIComponent(cursor)}` : "/orders", ordersSchema, signal,
          );
          for (const order of page.items) {
            if (seenOrders.has(order.id)) continue;
            seenOrders.add(order.id);
            counts[orderProgressFor(order).kind]++;
          }
          cursor = page.nextCursor;
          if (cursor) {
            if (seenCursors.has(cursor)) throw new StorefrontError("Pagina ordini non disponibile.", 502, "RESPONSE_INVALID");
            seenCursors.add(cursor);
          }
        } while (cursor);

        return counts;
      }, getState),
      providesTags: ["Orders"],
    }),
    order: builder.query<z.infer<typeof orderSchema>, string>({
      queryFn: privateQuery(orderPath, orderSchema),
      providesTags: ["Orders"],
    }),
    paymentStatus: builder.query<z.infer<typeof paymentSchema>, string>({
      queryFn: (id, { signal, getState }) => privateResult(async () => {
        const payment = await storefrontGet(`${orderPath(id)}/payment-status`, paymentSchema, signal);
        return { ...payment, checkoutUrl: null };
      }, getState),
    }),
    tracking: builder.query<PublicOrderTracking, string>({
      queryFn: (id, { signal, getState }) =>
        privateResult(() => storefrontRead<PublicOrderTracking>(`${orderPath(id)}/tracking`, signal), getState),
    }),
    trackingTimeline: builder.query<PublicTrackingTimeline, TrackingPage>({
      queryFn: ({ orderId, delivery, cursor }, { signal, getState }) => {
        const query = new URLSearchParams();
        if (cursor) query.set("cursor", cursor);
        if (delivery) query.set("deliveryPublicId", delivery);
        return privateResult(() => storefrontRead<PublicTrackingTimeline>(`${orderPath(orderId)}/timeline${query.size ? `?${query}` : ""}`, signal), getState);
      },
    }),
    trackingDelivery: builder.query<PublicTrackingDeliveryDetails, TrackingDelivery>({
      queryFn: ({ orderId, id }, { signal, getState }) =>
        privateResult(() => storefrontRead<PublicTrackingDeliveryDetails>(`${orderPath(orderId)}/deliveries/${encodeURIComponent(id)}`, signal), getState),
    }),
    catalog: builder.query<PublicCatalogList, string>({
      queryFn: (query, { signal }) => result(() => storefrontRead<PublicCatalogList>(`/catalog?${query}`, signal)),
      providesTags: ["Catalog"],
      onQueryStarted: (arg, { queryFulfilled }) => trackCatalogSnapshot("catalog", arg, queryFulfilled),
    }),
    catalogProduct: builder.query<PublicCatalogProduct, string>({
      queryFn: (id, { signal }) => result(() => storefrontRead<PublicCatalogProduct>(`/catalog/${encodeURIComponent(id)}`, signal)),
      providesTags: ["Catalog"],
      onQueryStarted: (arg, { queryFulfilled }) => trackCatalogSnapshot("catalogProduct", arg, queryFulfilled),
    }),
    productPage: builder.query<PublicProductPage, string>({
      queryFn: (slug, { signal }) => result(() => storefrontRead<PublicProductPage>(`/product-pages/${encodeURIComponent(slug)}`, signal)),
      providesTags: ["Catalog"],
      onQueryStarted: (arg, { queryFulfilled }) => trackCatalogSnapshot("productPage", arg, queryFulfilled),
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

async function trackCatalogSnapshot(
  endpointName: "catalog" | "catalogProduct" | "productPage",
  arg: string,
  queryFulfilled: Promise<{ data: unknown }>,
): Promise<void> {
  try {
    const { data } = await queryFulfilled;
    saveCatalogSnapshot(endpointName, arg, data);
  } catch (failure) {
    if (failure && typeof failure === "object" && "error" in failure && hidesPreviousData(shopQueryError(failure.error)))
      forgetCatalogSnapshot(endpointName, arg);
  }
}

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

export function cachedShopData<T>({ data, error }: { data?: T; error?: unknown }) {
  return error && hidesPreviousData(shopQueryError(error)) ? undefined : data;
}

export function useShopQueryView<T>(query: { currentData?: T; error?: unknown; isFetching: boolean; refetch: () => unknown }, previous?: T) {
  const error = useMemo(() => query.error && shopQueryError(query.error), [query.error]);
  const data = hidesPreviousData(error) ? undefined : query.currentData ?? previous;
  return { data, error, busy: data === undefined && query.isFetching, refreshing: data !== undefined && query.isFetching, reload: query.refetch };
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
