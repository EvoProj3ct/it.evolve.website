"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { subscribeSession } from "@/lib/ecommerce/browser";
import { subscribeCartChanges } from "@/lib/ecommerce/cart";
import { cacheShopEntries, makeShopStore, shopApi, subscribeShopPreferences } from "@/lib/ecommerce/shop-store";

export function ShopStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeShopStore);
  useEffect(() => {
    const stopSession = subscribeSession(() => {
      store.dispatch(shopApi.util.resetApiState());
    });
    const stopCart = subscribeCartChanges(cart => {
      if (!cart) {
        store.dispatch(shopApi.util.invalidateTags(["Cart"]));
        return;
      }
      void cacheShopEntries(store, [
        { endpointName: "cart", arg: undefined, value: cart },
        { endpointName: "cartCount", arg: undefined, value: { quantity: cart.items.reduce((sum, item) => sum + item.quantity, 0) } },
      ]);
    });
    const stopPreferences = subscribeShopPreferences(tag => {
      store.dispatch(shopApi.util.invalidateTags(tag === "Profile" ? [tag, "CustomerLink"] : [tag]));
    });
    return () => { stopSession(); stopCart(); stopPreferences(); };
  }, [store]);
  return <Provider store={store}>{children}</Provider>;
}
