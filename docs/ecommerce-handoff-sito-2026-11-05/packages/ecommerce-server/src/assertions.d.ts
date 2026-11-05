export function assertionSessionId(token: string | null): string;
export function commercePayloadHash(payload: unknown): string;
export function verifyCommerceAssertion(
  token: string,
  publicKey: string,
  expected: {
    issuer: string;
    audience: string;
    accountId: string;
    sessionId: string;
    shopId: string;
    credentialVersion: number;
    accessVersion: number;
    path: string;
    body: unknown;
  },
): Promise<{ nonceHash: string; expiresAt: Date }>;
