import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase's own auth/data-API layers occasionally issue a fresh access
 * token whose `iat` claim lands a hair ahead of the validating server's
 * clock — a sub-second skew inside Supabase's own infra, not this app's
 * or this machine's clock (confirmed by comparing local time against
 * Supabase's HTTP `Date` header, and by the fact the affected token's
 * `iat` reads safely in the past moments later). The symptom is a 401
 * with `message: "JWT issued at future"` right after sign-in or a token
 * refresh, which is gone on the very next request. Retrying once, only
 * for this exact signature, avoids surfacing a scary error banner for
 * something that isn't wrong on our end and resolves itself immediately.
 */
export async function fetchWithJwtRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  let message = "";
  try {
    message =
      ((await response.clone().json()) as { message?: string })?.message ??
      "";
  } catch {
    return response;
  }

  if (!/jwt issued at future/i.test(message)) return response;

  await new Promise((resolve) => setTimeout(resolve, 500));
  return fetch(input, init);
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: fetchWithJwtRetry } },
  );
}
