"use client";

import { useEffect, useState } from "react";
import { forgetStripeCheckout, hasStripeCheckout, type ShopPaymentReturn } from "./stripeCheckoutReturn";
import { hidesPreviousData, StorefrontError, storefrontMutate, storefrontSessionGeneration, subscribeSession } from "@/lib/ecommerce/browser";
import { paymentSchema, type Payment } from "@/lib/ecommerce/contracts";
import { cachedShopData, cacheShopEntries, shopApi, shopQueryError, useShopStore } from "@/lib/ecommerce/shop-store";

const checks = [
  { delay: 0, verify: true },
  { delay: 1000, verify: false },
  { delay: 1800, verify: false },
  { delay: 2200, verify: true },
  { delay: 3500, verify: false },
  { delay: 5000, verify: false },
  { delay: 6000, verify: true },
  { delay: 8000, verify: false },
  { delay: 12000, verify: false },
  { delay: 15000, verify: false },
];
const maxCheckingMs = 90000;
const overlayMs = 6000;

function paymentConfirmationPending(payment?: Payment) {
  return !payment || payment.paymentStatus === "awaiting" || payment.paymentStatus === "processing";
}

export function usePaymentReturn(orderId: string, hint: ShopPaymentReturn) {
  const store = useShopStore();
  const [initialized, setInitialized] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [failure, setFailure] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const returned = hint === "success" || (hint !== "cancelled" && remembered);

  useEffect(() => {
    function readReturn() {
      if (hint === "cancelled") forgetStripeCheckout(orderId);
      const pending = hint !== "cancelled" && hasStripeCheckout(orderId);
      if (hint === "success" || pending) setChecking(true);
      setRemembered(pending);
      setInitialized(true);
    }
    function restoreFromHistory(event: PageTransitionEvent) {
      if (event.persisted && hasStripeCheckout(orderId)) {
        readReturn();
        setRetry(value => value + 1);
      }
    }
    readReturn();
    window.addEventListener("pageshow", restoreFromHistory);
    return () => window.removeEventListener("pageshow", restoreFromHistory);
  }, [hint, orderId]);

  useEffect(() => {
    if (!returned || !checking) return;
    setShowOverlay(true);
    const timer = window.setTimeout(() => setShowOverlay(false), overlayMs);
    return () => window.clearTimeout(timer);
  }, [checking, retry, returned]);

  useEffect(() => {
    if (!returned) return;
    const deadline = Date.now() + maxCheckingMs;
    let cancelled = false;
    let timer: number | undefined;
    let lastVerificationError: unknown = null;
    const generation = storefrontSessionGeneration();
    const active = () => !cancelled && generation === storefrontSessionGeneration();
    const endpoint = shopApi.endpoints.paymentStatus;
    const currentPayment = () => cachedShopData(endpoint.select(orderId)(store.getState()));
    const stopSession = subscribeSession(() => {
      cancelled = true;
      window.clearTimeout(timer);
      forgetStripeCheckout(orderId);
      setRemembered(false);
      setChecking(false);
    });

    function finish(payment?: Payment, error: unknown = null) {
      if (!paymentConfirmationPending(payment)) {
        forgetStripeCheckout(orderId);
        store.dispatch(shopApi.util.invalidateTags(["Orders"]));
      }
      setFailure(error);
      setChecking(false);
    }

    function schedule(index: number, retryAfterMs = 0) {
      if (!active()) return;
      const step = checks[index];
      const delay = step ? Math.max(step.delay, retryAfterMs) : 0;
      if (!step || Date.now() + delay >= deadline) {
        finish(currentPayment(), lastVerificationError);
        return;
      }
      timer = window.setTimeout(async () => {
        if (!active()) return;
        const before = currentPayment();
        if (!paymentConfirmationPending(before)) {
          finish(before);
          return;
        }
        if (step.verify) {
          try {
            const payment = await storefrontMutate(`/orders/${orderId}/payment-status`, "POST", {}, paymentSchema);
            if (!active()) return;
            lastVerificationError = null;
            const current = currentPayment();
            if (!current || current.orderRevision <= payment.orderRevision) {
              await cacheShopEntries(store, [{ endpointName: "paymentStatus", arg: orderId, value: payment }]);
            }
          } catch (error) {
            if (!active()) return;
            if (hidesPreviousData(error)) {
              finish(undefined, error);
              return;
            }
            lastVerificationError = error;
            if (error instanceof StorefrontError && error.status === 429) {
              schedule(index + 1, (error.retryAfter || 60) * 1000);
              return;
            }
          }
        } else {
          const result = await store.dispatch(endpoint.initiate(orderId, { subscribe: false, forceRefetch: true }));
          if (!active()) return;
          if (result.error) {
            const error = shopQueryError(result.error);
            if (hidesPreviousData(error)) {
              finish(undefined, error);
              return;
            }
            if (error instanceof StorefrontError && error.status === 429) {
              lastVerificationError = error;
              schedule(index + 1, (error.retryAfter || 60) * 1000);
              return;
            }
          } else if (lastVerificationError instanceof StorefrontError && lastVerificationError.status === 429) {
            lastVerificationError = null;
          }
        }
        if (!active()) return;
        const after = currentPayment();
        if (paymentConfirmationPending(after)) schedule(index + 1);
        else finish(after);
      }, delay);
    }

    schedule(0);
    return () => { cancelled = true; window.clearTimeout(timer); stopSession(); };
  }, [orderId, returned, retry, store]);

  return {
    initialized,
    returned,
    checking: returned && checking,
    showOverlay: returned && checking && showOverlay,
    failure,
    recheck() {
      setChecking(true);
      setFailure(null);
      setRetry(value => value + 1);
    },
  };
}
