import "server-only";
import {
  commerceRequestId,
  commerceJson,
  commerceErrorResponse,
} from "@evolve/ecommerce-server/identity";
import { requireCommerceStaffApi } from "../staff-auth";
import { readCommerceStaffMutation } from "../staff-request";
import { reauthenticateCommerceStaff } from "../accounts/staff-handler";
import { getAtlasCommerceStorage } from "../persistence/atlas-storage";
import {
  objectWithKeys,
  integer,
  text,
  sourceHash,
  catalogError,
} from "../catalog/validation";
import {
  staffCustomerLinkDetails,
  resolveCustomerByStaff,
  type StaffCustomerResolution,
} from "./service";
function id(value: unknown) {
  const result = text(value, 24);
  if (!/^[a-f0-9]{24}$/.test(result))
    catalogError(400, "INVALID_INPUT", "Identificatore non valido.");
  return result;
}
export async function staffCustomerLinkHandler(
  request: Request,
  profileId: string,
) {
  const requestId = commerceRequestId();
  try {
    const staff = await requireCommerceStaffApi("ecommerce.accounts.view"),
      profile = id(profileId);
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some(
        (key) =>
          request.method !== "GET" ||
          key !== "q" ||
          params.getAll(key).length !== 1,
      )
    )
      catalogError(400, "INVALID_QUERY", "Parametri non ammessi.");
    if (request.method === "GET")
      return commerceJson(
        await staffCustomerLinkDetails(
          profile,
          text(params.get("q") || "", 100, true),
        ),
        { requestId },
      );
    await requireCommerceStaffApi("ecommerce.customers.resolve");
    const input = objectWithKeys(await readCommerceStaffMutation(request), [
      "action",
      "expectedRevision",
      "expectedProfileHash",
      "reason",
      "currentPassword",
      "customerId",
      "expectedCustomerHash",
      "draft",
      "evidenceConfirmed",
    ]);
    if (
      !["existing", "create", "block", "retry"].includes(String(input.action))
    )
      catalogError(400, "INVALID_INPUT", "Azione non valida.");
    const action = input.action as StaffCustomerResolution["action"];
    objectWithKeys(input, [
      "action",
      "expectedRevision",
      "expectedProfileHash",
      "reason",
      "currentPassword",
      ...(["existing", "create"].includes(action) ? ["evidenceConfirmed"] : []),
      ...(action === "existing"
        ? ["customerId", "expectedCustomerHash"]
        : action === "create"
          ? ["draft"]
          : []),
    ]);
    if (
      ["existing", "create"].includes(action) &&
      input.evidenceConfirmed !== true
    )
      catalogError(
        400,
        "EVIDENCE_REQUIRED",
        "Conferma la verifica dell’identità e dell’autorizzazione commerciale.",
      );
    const resolution: StaffCustomerResolution = {
      action,
      expectedRevision:
        input.expectedRevision === null
          ? null
          : integer(input.expectedRevision),
      expectedProfileHash: sourceHash(input.expectedProfileHash),
      reason: text(input.reason, 80),
    };
    if (/[\u0000-\u001f\u007f]/.test(resolution.reason))
      catalogError(400, "INVALID_INPUT", "Motivazione non valida.");
    if (action === "existing") {
      resolution.customerId = id(input.customerId);
      resolution.expectedCustomerHash = sourceHash(input.expectedCustomerHash);
    }
    if (action === "create") {
      const draft = objectWithKeys(input.draft, [
        "name",
        "kind",
        "taxCode",
        "vatNumber",
      ]);
      if (!["individual", "company"].includes(String(draft.kind)))
        catalogError(400, "INVALID_INPUT", "Tipo cliente non valido.");
      resolution.draft = {
        name: text(draft.name, 200),
        kind: draft.kind as "individual" | "company",
        ...(draft.taxCode ? { taxCode: text(draft.taxCode, 40) } : {}),
        ...(draft.vatNumber ? { vatNumber: text(draft.vatNumber, 40) } : {}),
      };
    }
    const storage = await getAtlasCommerceStorage();
    await reauthenticateCommerceStaff(
      storage,
      staff,
      input.currentPassword,
      process.env.ECOMMERCE_SHOP_ID!,
      requestId,
    );
    return commerceJson(
      await resolveCustomerByStaff(
        { kind: "staff", id: staff.userId, requestId },
        profile,
        resolution,
      ),
      { requestId },
    );
  } catch (error) {
    return commerceErrorResponse(error, requestId);
  }
}
