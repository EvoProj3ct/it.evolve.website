export class CommerceServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "CommerceServiceError";
    this.status = status;
    this.code = code;
  }
}

export function configurationError() {
  return new CommerceServiceError(
    503,
    "SERVICE_NOT_CONFIGURED",
    "Servizio non configurato.",
  );
}

export function authenticationError() {
  return new CommerceServiceError(
    401,
    "SERVICE_AUTH_REQUIRED",
    "Autenticazione del servizio non valida.",
  );
}
