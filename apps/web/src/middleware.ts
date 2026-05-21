import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",
    "/(zh|es|ja|ko|fr|de|pt|ru|ar|hi)/:path*",
    "/((?!api|_next|_vercel|feeds|icon$|apple-icon$|favicon\\.ico$|.*\\..*).*)",
  ],
};
