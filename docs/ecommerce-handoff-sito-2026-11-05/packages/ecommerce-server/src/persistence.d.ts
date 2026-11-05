import type {
  Mongoose,
  Connection,
  ClientSession,
  Model,
  HydratedDocument,
} from "mongoose";

export interface CommerceActor {
  readonly kind: "system" | "customer" | "staff" | "provider";
  readonly id: string;
  readonly requestId: string;
}
export interface MoneyTotals {
  netMinor: number;
  taxMinor: number;
  grossMinor: number;
  currency: "EUR";
}
export function calculateLineTotals(
  price: PriceSnapshot,
  quantity: number,
): MoneyTotals;
export function sumLineTotals(lines: { totals: MoneyTotals }[]): MoneyTotals;
export interface PriceSnapshot {
  unitMinor: number;
  taxMode: "inclusive" | "exclusive";
  taxRateBps: number;
  currency: "EUR";
}
export interface CommerceLine {
  lineId: string;
  productPublicId: string;
  listingRevision: number;
  title: string;
  code: string;
  kind: "physical" | "service" | "delivery";
  quantity: number;
  price: PriceSnapshot;
  totals: MoneyTotals;
}
export interface ExpectedTime {
  kind: "date" | "instant" | "window";
  date?: string;
  startsAt?: Date;
  endsAt?: Date;
  timeZone: string;
}
export interface FieldDefinition {
  kind: "text" | "integer" | "boolean" | "date" | "id" | "object" | "array";
  required: boolean;
  immutable?: boolean;
  secret?: boolean;
  default?: unknown;
  max?: number;
  min?: number;
  values?: string[];
  pattern?: string;
  fields?: Record<string, FieldDefinition>;
  item?: FieldDefinition;
}
type FieldOptions = Partial<Omit<FieldDefinition, "kind" | "fields" | "item">>;
export const field: {
  text(max?: number, options?: FieldOptions): FieldDefinition;
  choice(values: string[], options?: FieldOptions): FieldDefinition;
  integer(max?: number, options?: FieldOptions): FieldDefinition;
  boolean(options?: FieldOptions): FieldDefinition;
  date(options?: FieldOptions): FieldDefinition;
  id(options?: FieldOptions): FieldDefinition;
  object(
    fields: Record<string, FieldDefinition>,
    options?: FieldOptions,
  ): FieldDefinition;
  array(
    item: FieldDefinition,
    max?: number,
    options?: FieldOptions,
  ): FieldDefinition;
};
export interface CommerceIndex {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
}
// Runtime models have heterogeneous shapes. Strict validation is generated from FieldDefinition;
// business services narrow their own records rather than treating these as public input DTOs.
export interface CommerceModelDefinition {
  readonly model: Model<any>;
  readonly collection: string;
  readonly indexes: CommerceIndex[];
  readonly immutableFields: string[];
  readonly appendOnly: boolean;
}
export interface CommerceModelSet {
  readonly definitions: Readonly<Record<string, CommerceModelDefinition>>;
  readonly models: Readonly<Record<string, Model<any>>>;
}
export function defineCommerceModel(
  connection: Connection,
  collection: string,
  fields: Record<string, FieldDefinition>,
  indexes?: CommerceIndex[],
  options?: {
    appendOnly?: boolean;
    validate?: (document: any) => void;
  },
): CommerceModelDefinition;
export function describeCommerceModel(
  model: Model<any>,
): CommerceModelDefinition;
export function unique(
  name: string,
  key: CommerceIndex["key"],
  partialFilterExpression?: Record<string, unknown>,
): CommerceIndex;
export function index(
  name: string,
  key: CommerceIndex["key"],
  options?: Partial<CommerceIndex>,
): CommerceIndex;
export function publicId(): FieldDefinition;
export function digest(options?: FieldOptions): FieldDefinition;
export const optional: Readonly<{ required: false }>;
export function assertInvariant(
  condition: unknown,
  code: string,
): asserts condition;
export const COMMERCE_LIMITS: Readonly<{
  lines: 100;
  quantity: 1000;
  moneyMinor: number;
}>;
export function currency(): FieldDefinition;
export function money(): FieldDefinition;
export function totals(): FieldDefinition;
export function taxPrice(): FieldDefinition;
export function address(): FieldDefinition;
export function billing(): FieldDefinition;
export function publicLine(): FieldDefinition;
export function lines(): FieldDefinition;
export function operationalStatus(): FieldDefinition;
export function paymentStatus(): FieldDefinition;
export function fulfillmentStatus(): FieldDefinition;
export function media(): FieldDefinition;
export function content(): FieldDefinition;
export function actor(): FieldDefinition;
export function lease(): FieldDefinition;
export function jobFields(): Record<string, FieldDefinition>;
export function expectation(): FieldDefinition;
export function validateTotals(value: MoneyTotals): void;
export function validateLineSnapshots(value: {
  lines: CommerceLine[];
  totals: MoneyTotals;
}): void;
export function validateExpectation(value?: ExpectedTime): void;
export const PUBLIC_COMMANDS: Readonly<
  Record<string, Record<string, FieldDefinition>>
>;
export function buildStorefrontModels(connection: Connection): CommerceModelSet;
export function stableJson(value: unknown): string;
export function commerceIndexSignature(
  definitions: Readonly<
    Record<string, Pick<CommerceModelDefinition, "collection" | "indexes">>
  >,
): string;
export function connectStorefrontDatabase(
  mongoose: Mongoose,
  env: Record<string, string | undefined>,
): Promise<Connection>;
export function assertTransactionsSupported(
  connection: Connection,
): Promise<void>;
export function assertCommerceStorageReady(
  connection: Connection,
  definitions: Readonly<
    Record<string, Pick<CommerceModelDefinition, "collection" | "indexes">>
  >,
): Promise<void>;
/** Callback can be retried by Mongo. It must contain only DB operations on this client/session, sequentially. */
export function withCommerceTransaction<T>(
  connection: Connection,
  work: (session: ClientSession) => Promise<T>,
): Promise<T>;
export function assertCommerceSession(
  connection: Connection,
  session: ClientSession,
): void;
export function insertCommerceRecord(
  model: Model<any>,
  document: Record<string, unknown>,
  session: ClientSession,
): Promise<HydratedDocument<any>>;
export function replaceCommerceRecord(
  model: Model<any>,
  key: { shopId: string; id: string; expectedRevision: number },
  patch: Record<string, unknown>,
  session: ClientSession,
  extraFilter?: Record<string, unknown>,
): Promise<HydratedDocument<any>>;
export function appendIdempotentCommerceCommand(
  model: Model<any>,
  document: Record<string, unknown>,
  receiptModel?: Model<any>,
): Promise<{ publicId: string; replayed: boolean }>;
export function loadCommerceCommandForProcessing(
  model: Model<any>,
  key: { shopId: string; id: string },
  session: ClientSession,
  receiptModel?: Model<any>,
): Promise<HydratedDocument<any>>;
export function claimCommerceJob(
  model: Model<any>,
  options: {
    shopId: string;
    workerId: string;
    leaseMs?: number;
    maxAttempts?: number;
  },
): Promise<HydratedDocument<any> | null>;
export function finishCommerceJob(
  model: Model<any>,
  key: {
    shopId: string;
    id: string;
    expectedRevision: number;
    leaseToken: string;
  },
  outcome: {
    state: "succeeded" | "failed" | "dead";
    errorCode?: string;
    result?: Record<string, unknown>;
    availableAt?: Date;
  },
  session: ClientSession,
): Promise<HydratedDocument<any>>;
export function reapExhaustedCommerceJobs(
  model: Model<any>,
  options: { shopId: string; maxAttempts?: number },
): Promise<unknown>;
