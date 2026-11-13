import { Kitchen } from "./kitchen.js";
import { menuHtml } from "./menu.js";
import { staffHtml } from "./staff.js";
import { adminHtml } from "./admin.js";
import { loginHtml } from "./login.js";
export { Kitchen };

function page(body) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function notFound() {
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    if (path.startsWith("/api/")) {
      // Handled by the KITCHEN Durable Object. Request passes through
      // untouched; the body is never read here.
      const id = env.KITCHEN.idFromName("arka-dhama-order");
      return env.KITCHEN.get(id).fetch(request);
    }

    if (path.startsWith("/media/")) {
      // Public menu photos. No cookie check by design.
      let key;
      try {
        key = decodeURIComponent(path.slice("/media/".length));
      } catch {
        return notFound();
      }
      if (key === "" || key.includes("..") || key.startsWith("/")) {
        return notFound();
      }
      const object = await env.MEDIA.get(key);
      if (object === null) {
        return notFound();
      }
      return new Response(object.body, {
        headers: {
          "content-type":
            object.httpMetadata?.contentType ?? "application/octet-stream",
          "cache-control": "public, max-age=86400",
        },
      });
    }

    if (path === "/login") return page(loginHtml());
    if (path === "/staff") return page(staffHtml());
    if (path === "/admin") return page(adminHtml());
    if (path === "/") return page(menuHtml());

    return notFound();
  },
};
