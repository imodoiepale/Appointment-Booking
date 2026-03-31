import { NextRequest, NextResponse } from "next/server";

// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// const isPublicRoute = createRouteMatcher(["/"]);

// Temporarily disable middleware completely
export default function middleware(req: NextRequest) {
  // Let all requests pass through
  return NextResponse.next();
}

// export default clerkMiddleware((auth, req) => {
//   // Skip auth protection for now to debug the headers issue
//   // if (!isPublicRoute(req)) {
//   //   auth().protect()
//   // }
// });

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
};
