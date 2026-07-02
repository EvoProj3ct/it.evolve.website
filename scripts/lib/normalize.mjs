export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function dedupeEmails(docs) {
  const seen = new Set();
  const emails = [];

  for (const doc of docs) {
    const preferredEmail = normalizeEmail(doc.emailLower) || normalizeEmail(doc.email);

    if (!preferredEmail || seen.has(preferredEmail)) continue;

    seen.add(preferredEmail);
    emails.push(preferredEmail);
  }

  return emails;
}

export function additionalGuestsToMinimumCount(value) {
  if (value === "0") return 0;
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3-plus") return 3;
  return 0;
}
