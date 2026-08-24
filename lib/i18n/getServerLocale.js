import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale } from "./config";

// Server Components can't use React Context, so pages that render translated text
// server-side (browse, scheme detail) read the cookie directly instead. Using
// cookies() makes the calling route dynamic — a deliberate tradeoff: losing static
// prerendering on a few routes in exchange for correct server-rendered translation
// (no flash of English before client hydration).
export function getServerLocale() {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}
