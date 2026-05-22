export class AuthError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function toAuthErrorResponse(error: unknown) {
  if (!(error instanceof AuthError)) return null;
  return Response.json(
    { success: false, error: error.message },
    { status: error.status }
  );
}
