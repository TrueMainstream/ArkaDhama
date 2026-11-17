// Staff page for the event store. Same-origin /api/events only: load the
// list, add a post, remove a post. No login.

const form = document.getElementById('event-form');
const list = document.getElementById('event-list');
const emptyNote = document.getElementById('empty-note');
const errorNote = document.getElementById('error-note');

function showError(message) {
  errorNote.textContent = message;
  errorNote.hidden = false;
}

function clearError() {
  errorNote.textContent = '';
  errorNote.hidden = true;
}

async function request(path, options) {
  try {
    return await fetch(path, options);
  } catch {
    return null;
  }
}

function postNode(post) {
  const item = document.createElement('li');
  item.className = 'post';

  const details = document.createElement('div');

  const when = document.createElement('div');
  when.className = 'post-when';
  when.textContent = post.place ? post.date + ' · ' + post.place : post.date;

  const title = document.createElement('div');
  title.className = 'post-title';
  title.textContent = post.title;

  details.append(when, title);

  if (post.summary) {
    const summary = document.createElement('p');
    summary.className = 'post-summary';
    summary.textContent = post.summary;
    details.append(summary);
  }

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => removeEvent(post.id));

  item.append(details, remove);
  return item;
}

async function loadEvents() {
  const response = await request('/api/events');
  if (!response || !response.ok) {
    showError('The stored events could not be loaded.');
    return;
  }
  const posts = await response.json();
  list.replaceChildren(...posts.map(postNode));
  emptyNote.hidden = posts.length > 0;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  const response = await request('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      date: form.elements.date.value,
      title: form.elements.title.value,
      place: form.elements.place.value,
      summary: form.elements.summary.value,
    }),
  });
  if (!response || !response.ok) {
    showError('The event was not added. Date and title are required.');
    return;
  }
  form.reset();
  await loadEvents();
});

async function removeEvent(id) {
  clearError();
  const response = await request('/api/events/' + encodeURIComponent(id), {
    method: 'DELETE',
  });
  if (!response || (!response.ok && response.status !== 404)) {
    showError('The event was not removed.');
    return;
  }
  await loadEvents();
}

loadEvents();
