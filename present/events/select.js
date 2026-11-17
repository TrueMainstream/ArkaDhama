// Which posts an event block shows. A block is { show, limit }: show is
// "upcoming" or "all", limit is a number or missing. A post is
// { id, date, title, place, summary } with date as YYYY-MM-DD; a post whose
// date is not a real calendar date is skipped. today is YYYY-MM-DD. Pure:
// no fetch, no DOM, the posts array is left untouched.

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(text) {
  if (typeof text !== "string" || !DATE_SHAPE.test(text)) {
    return false;
  }
  const [year, month, day] = text.split("-").map(Number);
  const when = new Date(Date.UTC(year, month - 1, day));
  return (
    when.getUTCFullYear() === year && when.getUTCMonth() === month - 1 && when.getUTCDate() === day
  );
}

export function postsFor(block, posts, today) {
  const upcoming = block.show === "upcoming";
  const kept = posts.filter((post) => isRealDate(post.date) && (!upcoming || post.date >= today));
  kept.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (typeof block.limit === "number") {
    return kept.slice(0, Math.max(0, block.limit));
  }
  return kept;
}
