import { Ledger } from "./ledger.js";
import { guestHtml } from "./guest.js";
import { deskHtml } from "./desk.js";

export { Ledger };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = env.LEDGER.idFromName("arka-dhama");
    const stub = env.LEDGER.get(id);

    if (url.pathname.startsWith("/api/")) {
      return stub.fetch(request);
    }
    if (url.pathname === "/desk") {
      return html(deskHtml());
    }
    if (url.pathname === "/" || url.pathname === "/stay") {
      return html(guestHtml());
    }
    return new Response("Not found", { status: 404 });
  },
};

function html(body) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
