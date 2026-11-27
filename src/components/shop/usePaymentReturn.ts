"use client";

import { useEffect, useState } from "react";
import { StorefrontError, storefrontMutate, storefrontSessionGeneration, subscribeSession } from "@/lib/ecommerce/browser";
import { paymentSchema, type Payment } from "@/lib/ecommerce/contracts";
import { cacheShopEntries, shopApi, useShopStore } from "@/lib/ecommerce/shop-store";

const delays = [1500, 3000, 6000, 10000];

export function paymentConfirmationPending(payment?: Payment) {
  return !payment || payment.paymentStatus === "awaiting" || payment.paymentStatus === "processing";
}

export function usePaymentReturn(orderId: string, returned: boolean) {
  const store = useShopStore();
  const [checking, setChecking] = useState(returned);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!returned) return;
    let cancelled = false;
    let timer: number;
    const generation = storefrontSessionGeneration();
    const active = () => !cancelled && generation === storefrontSessionGeneration();
    const finish = () => { if (active()) setChecking(false); };
    const stopSession = subscribeSession(() => {
      cancelled = true;
      window.clearTimeout(timer);
      setChecking(false);
    });

    function checkStatus(index: number) {
      if (!active()) return;
      if (index >= delays.length) { finish(); return; }
      timer = window.setTimeout(async () => {
        if (!active()) return;
        const current = shopApi.endpoints.paymentStatus.select(orderId)(store.getState()).data;
        if (!paymentConfirmationPending(current)) {
          store.dispatch(shopApi.util.invalidateTags(["Orders"]));
          finish();
          return;
        }
        const result = await store.dispatch(shopApi.endpoints.paymentStatus.initiate(orderId, {
          subscribe: false, forceRefetch: true,
        }));
        if (!active()) return;
        if (!paymentConfirmationPending(result.data)) {
          store.dispatch(shopApi.util.invalidateTags(["Orders"]));
          finish();
        } else if (result.error && "status" in result.error && [401, 403, 404, 429].includes(result.error.status)) {
          finish();
        } else {
          checkStatus(index + 1);
        }
      }, delays[index]);
    }

    timer = window.setTimeout(async () => {
      if (!active()) return;
      setChecking(true);
      try {
        const payment = await storefrontMutate(`/orders/${orderId}/payment-status`, "POST", {}, paymentSchema);
        if (!active()) return;
        const current = shopApi.endpoints.paymentStatus.select(orderId)(store.getState()).data;
        const latest = current && current.orderRevision > payment.orderRevision ? current : payment;
        if (latest === payment)
          await cacheShopEntries(store, [{ endpointName: "paymentStatus", arg: orderId, value: payment }]);
        if (!active()) return;
        if (!paymentConfirmationPending(latest)) {
          store.dispatch(shopApi.util.invalidateTags(["Orders"]));
          finish();
          return;
        }
      } catch (error) {
        if (!active()) return;
        if (error instanceof StorefrontError && [401, 403, 404, 429].includes(error.status)) {
          finish();
          return;
        }
      }
      checkStatus(0);
    }, 0);

    return () => { cancelled = true; window.clearTimeout(timer); stopSession(); };
  }, [orderId, returned, revision, store]);

  return {
    checking: returned && checking,
    recheck() {
      setChecking(true);
      setRevision(value => value + 1);
    },
  };
}
