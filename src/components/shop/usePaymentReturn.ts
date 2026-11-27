"use client";

import { useEffect, useState } from "react";
import { forgetStripeCheckout, hasStripeCheckout, type ShopPaymentReturn } from "./stripeCheckoutReturn";
import { hidesPreviousData, StorefrontError, storefrontMutate, storefrontSessionGeneration, subscribeSession } from "@/lib/ecommerce/browser";
import { paymentSchema, type Payment } from "@/lib/ecommerce/contracts";
import { cachedShopData, cacheShopEntries, shopApi, shopQueryError, useShopStore } from "@/lib/ecommerce/shop-store";

const checks = [
  { delay: 0, verify: true },
  { delay: 2000, verify: false },
  { delay: 4000, verify: true },
  { delay: 6000, verify: false },
];

function paymentConfirmationPending(payment?: Payment) {
  return !payment || payment.paymentStatus === "awaiting" || payment.paymentStatus === "processing";
}

export function usePaymentReturn(orderId: string, hint: ShopPaymentReturn) {
  const store = useShopStore();
  const [initialized, setInitialized] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [checking, setChecking] = useState(true);
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
    if (!returned) return;
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

    function schedule(index: number) {
      if (!active()) return;
      const step = checks[index];
      if (!step) {
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
            if (hidesPreviousData(error) || error instanceof StorefrontError && error.status === 429) {
              finish(undefined, error);
              return;
            }
            lastVerificationError = error;
          }
        } else {
          const result = await store.dispatch(endpoint.initiate(orderId, { subscribe: false, forceRefetch: true }));
          if (!active()) return;
          if (result.error) {
            const error = shopQueryError(result.error);
            if (hidesPreviousData(error) || error instanceof StorefrontError && error.status === 429) {
              finish(undefined, error);
              return;
            }
          }
        }
        if (!active()) return;
        const after = currentPayment();
        if (paymentConfirmationPending(after)) schedule(index + 1);
        else finish(after);
      }, step.delay);
    }

    schedule(0);
    return () => { cancelled = true; window.clearTimeout(timer); stopSession(); };
  }, [orderId, returned, retry, store]);

  return {
    initialized,
    returned,
    checking: returned && checking,
    failure,
    recheck() {
      setChecking(true);
      setFailure(null);
      setRetry(value => value + 1);
    },
  };
}
