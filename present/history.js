import { randomUUID } from "node:crypto";

// In-memory revision history. A revision is { id, savedAt, body }:
// savedAt is an ISO string, body is a JSON object, id is a string.
// The log is append-only. revert and restore publish copies of an
// older body under a new id and a new savedAt; nothing is removed.

export function createHistory() {
  const revisions = [];

  function publish(body, savedAt) {
    const revision = { id: randomUUID(), savedAt, body: structuredClone(body) };
    revisions.push(revision);
    return revision;
  }

  function live() {
    return revisions.length === 0 ? null : revisions[revisions.length - 1];
  }

  function list() {
    return [...revisions];
  }

  function revert(savedAt) {
    const current = live();
    if (current === null) {
      throw new Error("cannot revert an empty history");
    }
    let previous = null;
    for (let i = revisions.length - 1; i >= 0; i--) {
      if (revisions[i].savedAt < current.savedAt) {
        previous = revisions[i];
        break;
      }
    }
    if (previous === null) {
      throw new Error("no revision before the live one to revert to");
    }
    return publish(previous.body, savedAt);
  }

  function restore(at, savedAt) {
    let found = null;
    for (let i = revisions.length - 1; i >= 0; i--) {
      if (revisions[i].savedAt === at) {
        found = revisions[i];
        break;
      }
    }
    if (found === null) {
      throw new Error(`no revision at ${at}`);
    }
    return publish(found.body, savedAt);
  }

  return { publish, live, list, revert, restore };
}
