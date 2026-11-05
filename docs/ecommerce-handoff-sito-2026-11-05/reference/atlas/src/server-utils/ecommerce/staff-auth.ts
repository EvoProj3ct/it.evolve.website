import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { CommerceServiceError } from "@evolve/ecommerce-server/identity";
import { authOptions } from "@/server-utils/lib/auth-options";
import { connectToDatabase } from "@/server-utils/lib/mongoose-connection";
import UserModel from "@/server-utils/models/User";
import {
  hasCommerceCapability,
  type CommerceCapability,
  type CommerceStaffRole,
} from "@/config/access/ecommerce-access.config";

export interface CommerceStaffPrincipal {
  readonly kind: "staff";
  readonly userId: string;
  readonly role: CommerceStaffRole;
}
type StaffAccess =
  | { state: "anonymous" | "forbidden" }
  | { state: "authorized"; principal: CommerceStaffPrincipal };

// Request-scoped RSC memoization only. Re-read approval/role on every server request;
// JWT role, browser headers and storefront/OIDC principals are not authorization sources.
const readCommerceStaffAccess = cache(async (): Promise<StaffAccess> => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { state: "anonymous" };
  if (typeof userId !== "string" || !/^[a-f0-9]{24}$/i.test(userId))
    return { state: "forbidden" };
  try {
    await connectToDatabase();
    const current = await UserModel.findOne({ _id: userId, approved: true })
      .select({ _id: 1, role: 1 })
      .lean<{ _id: { toString(): string }; role: string } | null>();
    if (
      !current ||
      !hasCommerceCapability(current.role, "ecommerce.workspace.view")
    )
      return { state: "forbidden" };
    return {
      state: "authorized",
      principal: Object.freeze({
        kind: "staff",
        userId: String(current._id),
        role: current.role as CommerceStaffRole,
      }),
    };
  } catch {
    throw new CommerceServiceError(
      503,
      "STAFF_ACCESS_UNAVAILABLE",
      "Verifica dell’accesso temporaneamente non disponibile.",
    );
  }
});

export async function requireCommerceStaffPage(
  capability: CommerceCapability,
): Promise<CommerceStaffPrincipal> {
  const access = await readCommerceStaffAccess();
  if (access.state === "anonymous") redirect("/auth/sign-in");
  if (
    access.state !== "authorized" ||
    !hasCommerceCapability(access.principal.role, capability)
  )
    notFound();
  return access.principal;
}

export async function requireCommerceStaffApi(
  capability: CommerceCapability,
): Promise<CommerceStaffPrincipal> {
  const access = await readCommerceStaffAccess();
  if (access.state === "anonymous")
    throw new CommerceServiceError(
      401,
      "STAFF_AUTH_REQUIRED",
      "Accesso Atlas richiesto.",
    );
  if (
    access.state !== "authorized" ||
    !hasCommerceCapability(access.principal.role, capability)
  ) {
    throw new CommerceServiceError(
      403,
      "STAFF_ACCESS_DENIED",
      "Operazione non consentita per questo profilo.",
    );
  }
  return access.principal;
}
