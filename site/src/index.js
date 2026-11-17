export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return Response.redirect(new URL("/scroll-poc/", url), 302);
    }
    // The editor page answers at /editor with and without the slash. Its
    // script and stylesheet are plain assets and fall through to ASSETS.
    if (url.pathname === "/editor" || url.pathname === "/editor/") {
      return env.ASSETS.fetch(new Request(new URL("/editor/index.html", url)));
    }
    // The document API lives in the arka-present worker, reached over the
    // PRESENT service binding. The river page does not read it yet; the
    // editor does once editor-save lands.
    if (
      url.pathname === "/api/doc" ||
      url.pathname === "/api/history" ||
      url.pathname === "/api/revert" ||
      url.pathname === "/api/restore"
    ) {
      return env.PRESENT.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
