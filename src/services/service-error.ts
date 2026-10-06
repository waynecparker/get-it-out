import { FunctionsHttpError } from '@supabase/supabase-js';

// An Edge Function refusal the user should see in plain words, rather than
// a generic failure: a fair-use limit or a lapsed subscription.
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'fair_use' | 'subscription_required',
  ) {
    super(message);
  }
}

// Turns a functions.invoke error into a ServiceError when the server sent
// one of the known codes; otherwise returns the original error unchanged.
export async function toServiceError(error: unknown): Promise<unknown> {
  if (!(error instanceof FunctionsHttpError)) return error;
  try {
    const body = await (error.context as Response).json();
    if (body?.code === 'fair_use' || body?.code === 'subscription_required') {
      return new ServiceError(body.error ?? 'Not available right now.', body.code);
    }
  } catch {
    // Not JSON — fall through.
  }
  return error;
}
