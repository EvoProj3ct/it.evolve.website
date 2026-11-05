import "server-only";

import {
  assertServerToServerRequest,
  readVercelTrustPolicy,
  verifyVercelServiceIdentity,
  type CommerceServicePrincipal,
} from "@evolve/ecommerce-server/identity";

/** Non usa NextAuth e non restituisce mai un AuthContext del personale. */
export async function requireCommerceInternalService(
  request: Request,
): Promise<CommerceServicePrincipal> {
  assertServerToServerRequest(request);
  const policy = readVercelTrustPolicy(process.env);
  return verifyVercelServiceIdentity(
    request.headers.get("authorization"),
    policy,
  );
}
