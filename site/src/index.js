export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return Response.redirect(new URL("/scroll-poc/", url), 302);
    }
    return env.ASSETS.fetch(request);
  },
};
