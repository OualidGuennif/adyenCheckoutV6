import { App, staticFiles } from "fresh";
import { applySecurityHeaders } from "@suite/platform/security.ts";
import { api } from "./api.ts";
import { define, type State } from "./utils.ts";

export const app = new App<State>();
app.use(staticFiles());
app.use(define.middleware(async (ctx) => {
  ctx.state.requestId = crypto.randomUUID();
  const path = new URL(ctx.req.url).pathname;
  if (path.startsWith("/api/") || path === "/healthz") {
    const apiResponse = await api.fetch(ctx.req);
    applySecurityHeaders(apiResponse.headers);
    return apiResponse;
  }
  const response = await ctx.next();
  applySecurityHeaders(response.headers);
  return response;
}));
app.fsRoutes();
