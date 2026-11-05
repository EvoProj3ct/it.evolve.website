import {
  field as f,
  optional as opt,
  publicId,
  assertInvariant,
} from "./schema-kit.js";

// Technical ceilings, not shop commercial settings. Checkout must use its lower configured cap.
export const COMMERCE_LIMITS = Object.freeze({
  lines: 100,
  quantity: 1000,
  moneyMinor: 1_000_000_000_000,
});
export const currency = () => f.choice(["EUR"]);
export const money = () => f.integer(COMMERCE_LIMITS.moneyMinor);
export const totals = () =>
  f.object({
    netMinor: money(),
    taxMinor: money(),
    grossMinor: money(),
    currency: currency(),
  });
export const taxPrice = () =>
  f.object({
    unitMinor: money(),
    taxMode: f.choice(["inclusive", "exclusive"]),
    taxRateBps: f.integer(10000),
    currency: currency(),
  });
export const address = () =>
  f.object({
    name: f.text(200),
    line1: f.text(200),
    line2: f.text(200, opt),
    city: f.text(100),
    postalCode: f.text(20),
    region: f.text(100, opt),
    country: f.text(2, { pattern: "^[A-Z]{2}$" }),
  });
export const billing = () =>
  f.object({
    kind: f.choice(["individual", "company"]),
    name: f.text(200),
    email: f.text(254),
    taxCode: f.text(40, opt),
    vatNumber: f.text(40, opt),
    recipientCode: f.text(20, opt),
    certifiedEmail: f.text(254, opt),
    address: address(),
  });
export const publicLine = () =>
  f.object({
    lineId: publicId(),
    productPublicId: publicId(),
    listingRevision: f.integer(),
    title: f.text(200),
    code: f.text(100),
    kind: f.choice(["physical", "service", "delivery"]),
    quantity: f.integer(1000, { min: 1 }),
    price: taxPrice(),
    totals: totals(),
  });
export const lines = () =>
  f.array(publicLine(), COMMERCE_LIMITS.lines, { min: 1, immutable: true });
export const operationalStatus = () =>
  f.choice(["open", "in_progress", "on_hold", "completed", "cancelled"]);
export const paymentStatus = () =>
  f.choice([
    "awaiting",
    "processing",
    "paid",
    "refund_pending",
    "partially_refunded",
    "refunded",
    "failed",
    "expired",
    "disputed",
    "under_review",
  ]);
export const fulfillmentStatus = () =>
  f.choice(["unfulfilled", "in_progress", "partial", "fulfilled", "cancelled"]);
export const media = () =>
  f.array(
    f.object({
      publicId: publicId(),
      url: f.text(2048, { pattern: "^https://" }),
      alt: f.text(300),
      width: f.integer(20000, { min: 1 }),
      height: f.integer(20000, { min: 1 }),
    }),
    20,
  );
export const content = () =>
  f.object({
    title: f.text(200),
    summary: f.text(1000),
    // Plain structured text: rendering HTML/URLs requires a dedicated allowlist later.
    sections: f.array(
      f.object({ heading: f.text(200), text: f.text(10000) }),
      20,
    ),
    media: media(),
  });
export const actor = () =>
  f.object({
    kind: f.choice(["system", "customer", "staff", "provider"]),
    id: f.text(200),
    requestId: f.text(100),
  });
export const lease = () =>
  f.object(
    { token: f.text(100), owner: f.text(100), expiresAt: f.date() },
    opt,
  );
export const jobFields = () => ({
  state: f.choice(["pending", "running", "succeeded", "failed", "dead"], {
    default: "pending",
  }),
  attempts: f.integer(100, { default: 0 }),
  availableAt: f.date(),
  lease: lease(),
  lastErrorCode: f.text(80, opt),
  finishedAt: f.date(opt),
});

export function validateTotals(value) {
  assertInvariant(
    value &&
      value.currency === "EUR" &&
      [value.netMinor, value.taxMinor, value.grossMinor].every(
        (amount) =>
          Number.isSafeInteger(amount) &&
          amount >= 0 &&
          amount <= COMMERCE_LIMITS.moneyMinor,
      ),
    "MONEY",
  );
  assertInvariant(
    Number.isSafeInteger(value.netMinor + value.taxMinor) &&
      value.netMinor + value.taxMinor === value.grossMinor,
    "TOTALS",
  );
}
function roundHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}
export function calculateLineTotals(price, quantity) {
  assertInvariant(
    price?.currency === "EUR" &&
      ["inclusive", "exclusive"].includes(price.taxMode) &&
      Number.isSafeInteger(price.unitMinor) &&
      price.unitMinor >= 0 &&
      price.unitMinor <= COMMERCE_LIMITS.moneyMinor &&
      Number.isInteger(price.taxRateBps) &&
      price.taxRateBps >= 0 &&
      price.taxRateBps <= 10000 &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= COMMERCE_LIMITS.quantity,
    "PRICE_INPUT",
  );
  const base = BigInt(price.unitMinor) * BigInt(quantity),
    rate = BigInt(price.taxRateBps);
  const net =
    price.taxMode === "exclusive"
      ? base
      : roundHalfUp(base * 10000n, 10000n + rate);
  const tax =
    price.taxMode === "exclusive"
      ? roundHalfUp(net * rate, 10000n)
      : base - net;
  assertInvariant(
    net + tax <= BigInt(COMMERCE_LIMITS.moneyMinor),
    "PRICE_LIMIT",
  );
  return {
    netMinor: Number(net),
    taxMinor: Number(tax),
    grossMinor: Number(net + tax),
    currency: "EUR",
  };
}
export function sumLineTotals(lines) {
  const result = { netMinor: 0, taxMinor: 0, grossMinor: 0, currency: "EUR" };
  for (const line of lines) {
    validateTotals(line.totals);
    for (const key of ["netMinor", "taxMinor", "grossMinor"])
      result[key] += line.totals[key];
  }
  validateTotals(result);
  return result;
}
export function validateLineSnapshots(document) {
  validateTotals(document.totals);
  const ids = new Set();
  const sum = { netMinor: 0, taxMinor: 0, grossMinor: 0 };
  for (const line of document.lines) {
    assertInvariant(!ids.has(line.lineId), "DUPLICATE_LINE");
    ids.add(line.lineId);
    validateTotals(line.totals);
    const expected = calculateLineTotals(line.price, line.quantity);
    assertInvariant(
      expected.netMinor === line.totals.netMinor &&
        expected.taxMinor === line.totals.taxMinor,
      "LINE_PRICE",
    );
    for (const key of Object.keys(sum)) sum[key] += line.totals[key];
  }
  for (const key of Object.keys(sum))
    assertInvariant(sum[key] === document.totals[key], "LINE_SUM");
}

// A scheduled date, an instant and a window are different shapes, never inferred from a timestamp.
export const expectation = () =>
  f.object(
    {
      kind: f.choice(["date", "instant", "window"]),
      date: f.text(10, { pattern: "^\\d{4}-\\d{2}-\\d{2}$", ...opt }),
      startsAt: f.date(opt),
      endsAt: f.date(opt),
      timeZone: f.text(80),
    },
    opt,
  );
export function validateExpectation(value) {
  if (!value) return;
  try {
    new Intl.DateTimeFormat("it-IT", { timeZone: value.timeZone }).format();
  } catch {
    assertInvariant(false, "TIME_ZONE");
  }
  assertInvariant(
    value.kind === "date"
      ? !!value.date && !value.startsAt && !value.endsAt
      : value.kind === "instant"
        ? !!value.startsAt && !value.date && !value.endsAt
        : !!value.startsAt &&
          !!value.endsAt &&
          !value.date &&
          value.endsAt >= value.startsAt,
    "EXPECTATION",
  );
  if (value.kind === "date") {
    const parsed = new Date(`${value.date}T00:00:00.000Z`);
    assertInvariant(
      !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value.date,
      "CALENDAR_DATE",
    );
  }
}
