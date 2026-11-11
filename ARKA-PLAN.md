# Arka Dhama — room reservation execution plan

Private. 11 November 2026. Plan only.

This file sequences the work in the unsigned agreement. It does not start the build, does not edit the contract or the PDF, and does not open a repository. No application code, no deploy, no implementer, and no paste for one.

The fee is **USD 2,000**, a concession for this first project and not a precedent. USD 1,000 is due on signing, before work or the shoot. USD 1,000 is due on delivery after a test payment. The flight reimbursement of **USD 441.50** is separate, due on signing, and is not a deposit against the fee. `SCOPE-ROOMS.md` is an earlier quote. It does not set the price.

---

## What is being built

One property. Ten rooms in three types. A guest books and pays on a page. Staff run the bookings from a desk page. The contractor photographs the ten rooms and delivers one short film, on the November 2026 visit. WordPress on SiteGround stays. DNS moves to Cloudflare. The domain registration does not move.

Nothing else. The restaurant is not this project.

### Guest page

- Designed for Arka Dhama. Not a purchased theme and not a WordPress plugin. Usable on a phone, a tablet, and a computer. English only.
- Each of the three types shows its photographs, what is included, the house rules, and the price per night.
- A calendar. The guest picks a check-in date and a check-out date and sees which types are free across those nights.
- Registration: name, email, mobile, and a way back in (password or one-time code).
- One government ID, one image or one PDF. Indian and overseas guests use the same step. Staff can see it. The public cannot. It is not checked against a government database and it is not judged genuine. Arka Dhama decides which documents it accepts, can delete an ID, and is responsible for having a lawful reason to collect it.
- Razorpay through its API: UPI (PhonePe, Google Pay, Paytm), Indian debit and credit cards including RuPay, and international cards. No PayPal. Card numbers are stored by Razorpay, never here.
- A successful payment records the booking, takes the nights, and sends email and WhatsApp. Nobody at the desk retypes it.
- If two guests pay for the last room of a type, one booking stands. The other is told on the page and refunded.
- A price change does not alter a booking already paid.

### Desk page

Staff sign in. Guests do not.

- Arrivals, departures, and whether each booking is paid.
- Open a booking and see the guest's ID.
- Block dates (a guest of the guru, maintenance, a program).
- Enter a walk-in for a person standing at the desk.
- Change the nightly price of each of the three types.
- Set a second price on a date range, such as a program week.
- Refund through Razorpay when a booking is cancelled under Arka Dhama's own rule.

Adding rooms of these same three types later is free, including rooms built after the agreement. A fourth type is **USD 250** after launch, from photographs and a description Arka Dhama supplies. It is not in the build.

### Photographs and film

Shot on a Sony ZV-E1 with a Viltrox 14mm f/4, one shoot day during the November 2026 visit, while the rooms are open and presentable.

- Each of the ten rooms, finished JPEG, sized for the page and large enough to print. Raw files are not included.
- Up to eight more of the property (exterior, approach, a shared space), if those places are available that day.
- One film, 60 to 90 seconds, 4K at 60 frames per second, for the booking page. One cut. One round of changes after Arka Dhama watches it. Music only if Arka Dhama supplies a track they have the right to use.

A second shoot day, a drone, printed albums, photographs of people, a second film, a long cut, and interviews are not included.

### Not included

The restaurant. Booking.com, MakeMyTrip, Agoda, Airbnb, or any other listing site. An app in the Apple or Google store. Door locks, housekeeping, a night audit, accounting software. Promo codes, or prices that change themselves with demand. Kannada or Hindi. A second property. Verifying an ID with the government, DigiLocker, or a face match. PayPal. Rebuilding WordPress. Cancelling SiteGround. Moving the domain registration.

---

## Architecture

Already chosen. This plan does not reopen it.

| Piece | Choice |
| --- | --- |
| Pages | Cloudflare Workers. The booking page is a new hostname on the existing domain, or a path on it if they insist on one address. WordPress never sees a cart or a room-night. |
| Ledger | One Durable Object for the property. SQLite inside it. It is the only writer of bookings and of the availability snapshot. |
| What guests and the desk read | The snapshot. Not a live query. Not Supabase. |
| Pay | Razorpay checkout. This system stores "paid" and a payment id. It does not store a card number. |
| Messages | Email plus WhatsApp, from the address and number Arka Dhama names. |
| DNS | Nameservers pointed at Cloudflare. Free plan. Reversible. |
| Registrar | Stays where it is. |
| WordPress | Stays on SiteGround. Not rebuilt. Hosting not cancelled. |
| Monthly new cost | About USD 5 (Workers Paid). Razorpay's cut, GST on that cut, SiteGround, and the domain renewal are Arka Dhama's, paid to those companies. |

A guest action is a poke. The object drains what is waiting, writes one snapshot, and sleeps. It arms another pass only to finish a backlog or to retry a failed pass. A quiet night pays nothing. There is no always-on heartbeat, and no second cron that edits the same calendar.

Payment confirmation starts the booking and the messages. It is not buried inside a long job. A new snapshot is baked only when something changed. A retry is the same request: the same payment notice does not take a second room and does not send a second confirmation.

A hold that a guest started and walked away from expires inside that same writer. The expiry is a scheduled wake of the writer, not a separate job that also edits availability. A staff block, a walk-in, a price change, and a refund are pokes to the same writer. There is not a second calendar.

Supabase is not the ledger. It may later be a read-only export for their CA. It is not required to launch.

The words tick, drain, pool, and heartbeat never appear on the page, in a receipt, in a confirmation, or in anything the guest or Arka Dhama sees. They belong in this file and in the code comments of a later sitting.

TrueMainstream contributes only the distinction between tick-triggered and awaited, and the ban on a leftover clock that repeats the writer. The 10-second news clock, feed budgets, trending, and a thousand-reader fan-out do not come along. The bar here is a normal week and a full program week at one property of ten rooms, not a news site.

### What the guest is waiting on, and what is not

Awaited, because the guest or the desk is standing there: recording the booking, taking the nights, writing the new snapshot, and answering the page. That answer is short. It does not also send the messages, resize a photograph, or rebuild anything else.

Started and not awaited: the email, the WhatsApp message, and a refund that Razorpay has already been asked to make. A failed send retries as the same request. It does not sit inside the payment answer, and it does not get its own clock.

---

## Lanes, on paper

A lane is a plan. This sitting does not open one. When a later sitting asks for the build, the lanes below are the split. One writer per lock. The Durable Object is one lock. Two lanes do not both edit it.

The implementer waits. Weekdays 14:00–18:00 Asia/Shanghai are the 3× peak. Prompts are not written until after 18:00 China time on a weekday, or on a weekend, and not even then unless a later sitting asks for them.

### Locks

| Lock | What it is | Who may edit it |
| --- | --- | --- |
| Ledger | The Durable Object: SQLite schema, booking writes, availability snapshot, holds, blocks, walk-ins, price rows, refund records, idempotency of a payment notice. | One lane at a time. Never shared. |
| Guest page | Public HTML, the calendar the guest sees, registration, the ID upload step, the Razorpay handoff. Reads the snapshot. Does not write a booking. | Its own lane, once the snapshot shape is frozen. |
| Desk page | Staff sign-in, arrivals, the ID view, the forms that poke the writer. | Its own lane, once the poke shape is frozen. |
| Messages | Email and WhatsApp senders. Called by the writer after a booking stands. Does not decide whether a room is free. | Its own lane. |
| Media pipeline | Finished JPEGs and the film, sized and placed for the page. No ledger. | Its own lane. The shoot itself is not a software lane. |
| DNS and edge | Nameservers, the Worker route, the WordPress origin left where it is. | Its own lane. Does not touch the object. |

### What is sequential because the ledger requires it

These cannot run together. Each one changes the only writer, or changes the contract the writer offers to every other lane.

1. The object's schema and the snapshot shape, before any page reads it.
2. The payment-notice path: one notice, one booking, nights taken, snapshot replaced. Idempotency lives here.
3. The lost race: two paid intents for the last room of a type. One stands, one is marked for refund.
4. Holds, and the wake that releases a hold nobody paid.
5. Staff mutations on the same object: block, walk-in, nightly price, second price on a range, refund. A paid booking's price does not move.

A later lane may add a field the object already reserved. It may not redesign the write path while another lane is using it.

### What is parallel because the files do not touch

Once the snapshot shape and the poke shape are frozen, these do not share a file with each other or with the object:

- Guest page against the frozen snapshot.
- Desk page against the frozen poke list.
- Message templates and the two senders, against a frozen "booking stood" call.
- Photograph sizing and the film file, against a frozen media slot on the page.
- DNS cutover, against the existing WordPress origin. No object, no page logic.

The shoot is parallel with all of the software. It happens in Mysore, on one day, and it produces files. It does not wait for the ledger, and the ledger does not wait for it beyond the point where the page needs real pictures instead of placeholders.

---

## Phases

Nine phases. Phase 0 is this file. Phases 1 and 2 can overlap. Phase 3 is alone. Phases 4, 5, and 6 can overlap after phase 3 freezes the shapes they read. Phase 7 follows the ones it demonstrates. Phase 8 is the acceptance window in the agreement, not a build.

The 45 days in the agreement start after the first payment and after the items in "What Arka Dhama provides" have been received. Days lost to Razorpay's review are not counted. Photographs and the film are shot during the November 2026 visit, if the rooms are accessible. This plan does not invent a tighter date.

### Phase 0 — This plan

**Delivers:** this file.

**Lanes:** none. No repo, no code, no deploy, no prompt.

**Depends on:** the unsigned agreement, the visit brief's architecture, the poke-wake rule, and the tick-triggered versus awaited distinction. All four are already read. Nothing in them is re-opened here.

### Phase 1 — What Arka Dhama still has to hand over

**Delivers:** a written record of the inputs the system cannot be finished without. Not software.

- Legal name, PAN, bank account, and GSTIN if any. Razorpay's own checks started, including international cards.
- The nightly price of each of the three types. What a stay includes. Until those arrive, the prototype uses placeholder nightly prices the desk can change, and takes the full stay in advance.
- Cancellation, in the owner's words (11 November 2026): there is no free cancellation. Treat a stay as not cancellable. The guest page has no cancel action. The desk can still cancel and refund under Arka Dhama's own rule.
- Which ID documents they accept.
- The WhatsApp number and the email address confirmations come from.
- Who at the desk will use the page after launch. One named person.
- The domain, who can change its nameservers, and confirmation that WordPress stays on SiteGround.
- A shoot day inside the November 2026 visit, with all ten rooms open and presentable.

**Lanes:** none. This is a conversation and a checklist. Days waiting on it are not counted against the contractor.

**Runs beside:** phase 2, because the shoot does not need the prices, and the prices do not need the shoot. It blocks phase 3's price rows, phase 6's live sender, and phase 7's live payment. It does not block a test-mode payment.

### Phase 2 — The shoot

**Delivers:** finished JPEGs of each of the ten rooms; up to eight more of the property if those places are available that day; one 60–90 second film, 4K at 60 frames per second, one cut. Camera raw is not a deliverable.

**Lane:** the camera. Sony ZV-E1, Viltrox 14mm f/4. One day. This is not a software lane and it owns no file in the system.

**Runs beside:** phases 1, 3, 4, and 5. The page can be built against placeholders. Real files replace them in phase 6's media slot, or whenever they are finished, without a ledger change.

**Sequential after the shoot:** one round of film changes, only after Arka Dhama has watched the cut. Music waits on a track they have the right to use. No track means the film ships silent.

### Phase 3 — The writer

**Delivers:** one Durable Object. SQLite inside it. The only writer of bookings and of the availability snapshot.

In order, because each step changes the same lock:

1. Schema. Three types. Ten rooms, each assigned to a type. A nightly price per type. A second price that applies on a date range and does not rewrite a booking already paid. A booking row: guest, type, check-in, check-out, paid state, payment id, the nights taken. A block row. A hold row.
2. The snapshot. Which types are free across a range of nights. Readers get this and nothing else. No snapshot written when nothing changed.
3. Idempotency. A payment notice and a guest retry carry one key. The second arrival is the same booking.
4. The lost race. Two paid intents for the last room of a type: the first stands, the second is told it just went and is marked for refund. The writer does not call Razorpay itself in this phase. It records the outcome the refund lane will act on.
5. Holds. A checkout that nobody finishes does not pin a room overnight. The release is a wake of this same object, armed only while a hold exists. When the last hold is gone, nothing is armed.
6. Staff writes, still this object: block dates, enter a walk-in, change a nightly price, set the range price, mark a refund requested. A walk-in takes nights the same way a paid booking does, so the last room still cannot be sold twice.

**Lane:** Ledger. One lane. No other lane edits this object during this phase.

**Does not deliver:** a page, a pixel, a real Razorpay call, an email, a WhatsApp message. Those read what this phase freezes.

**Frozen at the end, and not reopened by a parallel lane:**

- The snapshot's shape.
- The poke list: hold, pay, block, walk-in, price, range price, refund, delete-ID.
- The rule that a retry is the same request.

### Phase 4 — Guest page

**Delivers:** the public page. Calendar, check-in and check-out, which types are free, the three type pages (photographs, what is included, house rules, nightly price), registration, the ID upload, and the handoff to Razorpay.

The page reads the snapshot. It does not ask the object a question per date. It does not write a booking. Paying pokes the writer with one key generated before the guest pays. Uploading an ID pokes the writer, stores the file where only a staff session can read it, and never puts that file on the public page.

Registration is name, email, mobile, and a way back in. Password or one-time code is decided in phase 1's leftovers only if Arka Dhama cares; otherwise the page ships one of the two and does not build both.

**Lane:** Guest page. Owns the public templates and the upload step. Does not own the object.

**Runs beside:** phase 5 and phase 6, after phase 3 has frozen the snapshot and the poke list. Does not run beside a ledger change.

**Placeholders:** type photographs and the film are slots. The shoot fills them when the files exist. The page is reviewable before that.

### Phase 5 — Desk page

**Delivers:** staff sign-in, and nothing for a guest. Arrivals, departures, paid state. Open a booking and see the ID. Block dates. Enter a walk-in. Change the nightly price. Set a second price on a range. Ask for a refund. Delete an ID.

Every one of those is a poke. The desk reads the same snapshot the guest reads, plus the staff-only rows (the ID, the paid state, the guest's name and mobile). It does not keep a second calendar.

**Lane:** Desk page. Owns the staff templates and the staff session. Does not own the object.

**Runs beside:** phase 4 and phase 6.

### Phase 6 — Messages, media, DNS

Three lanes, file-disjoint, started once phase 3's "booking stood" call and phase 4's media slot exist. They do not wait on each other.

**Messages.** Email and WhatsApp, one of each per booking that stands. A retried payment notice does not send a second pair. A failed send retries as the same request and is not awaited on the payment answer. The from-address and the WhatsApp number come from phase 1. This lane owns the templates and the sender. It does not decide availability.

**Media.** Finished JPEGs sized for the page, and the film file on the page. Owns the media files and the slot phase 4 left open. Does not own the object. Cannot start the file work until the shoot has produced them; the slot itself can exist earlier.

**DNS.** Nameservers pointed at Cloudflare. WordPress stays on SiteGround and keeps serving the ashram pages through the proxy. The booking page is a Worker on a new hostname, or on a path if they insist. The registrar is not touched. SiteGround is not cancelled. This lane owns the DNS change and the Worker route. It does not own the object. The change is reversible by pointing the nameservers back.

### Phase 7 — Payment in the loop, and delivery

**Delivers:** the demonstration the second USD 1,000 is tied to.

- Razorpay test mode: UPI, Indian cards including RuPay, and international cards, as far as test mode allows each one. A successful test payment records the booking, takes the nights, and sends the confirmation. No one retypes it.
- The lost-race case, run on purpose: two payments for the last room of a type, one booking, the other told on the page and refunded through Razorpay.
- A price change that leaves an already-paid booking alone.
- A staff block, a walk-in, a range price, a refund, and an ID that a guest session cannot open.

**Lane:** this phase is sequential. It touches the ledger's payment path, so it does not run beside another ledger lane. Guest, desk, messages, and DNS are already built. This phase wires them and then stops editing.

**The second payment.** Due when the page is delivered and a payment has been taken on it in a test the contractor runs with Arka Dhama present or on a call. A real guest is not required. If Razorpay has not approved the account, the second half is due when the page is otherwise complete and the payment step is demonstrated against test mode. Switching on live payments after approval is included and is not a new fee.

**Live, after their KYC, still this phase and still no new fee:** the same path against the live Razorpay account, including international cards once Razorpay has turned them on. Their review time is not counted against the 45 days.

### Phase 8 — Acceptance

**Delivers:** nothing new. The window in the agreement.

- 14 days after delivery for one written list of things in section 1 that do not work. The contractor fixes that list. No list means the work is accepted.
- 30 days after acceptance for defects in section 1, at no charge. A defect is a room sold twice, a confirmation that did not send, a payment taken with no booking, a broken date selection, or a delivered photograph or film that will not open.
- A new feature is not a defect. Satisfaction is not a right to redo the design, reshoot, or add a feature. A fourth room type remains USD 250 and is not done inside this window.

**Lane:** none, until a list arrives. A fix that touches the object is a ledger lane and runs alone. A fix to a photograph or the film touches the media lane only.

---

## How the phases sit next to each other

```
Phase 0   plan                         (this file, done when it is written)
Phase 1   their inputs                 ─────────────┐
Phase 2   shoot (not software)         ─────────────┤  these overlap
                                                     ▼
Phase 3   the writer                   (alone; freezes the shapes)
                                                     ▼
Phase 4   guest page                   ─┐
Phase 5   desk page                    ─┼─ these overlap
Phase 6   messages, media, DNS         ─┘
                                                     ▼
Phase 7   test payment, then delivery  (alone on the ledger)
                                                     ▼
Phase 8   14 days, then 30 days        (fixes only, and only against section 1)
```

Phase 2 can also run during phases 3, 4, and 5. It shares no file with them. It only has to finish before phase 6 puts real photographs and the film into the page, and before delivery, because section 1 includes both.

---

## One writer, said as behavior

What a guest or a staff member can observe, without any of the private words:

- Tap pay twice, still one booking, still one email, still one WhatsApp message.
- The calendar paints from one baked board. It does not spin while a database is asked about each night.
- Two people cannot book the last room of a type. One gets it. The other is told it just went, and is refunded if their payment was captured.
- A block, a walk-in, and a price change show up on the same board. There is not a second calendar.
- A night with no bookings costs nothing, because nothing is polling.
- A paid booking keeps the price it was paid at.

---

## Guest record and the desk — decided 11 November 2026, not yet built

The live prototype has two pages and books a room type, not a numbered room. That is enough to prove a reservation. It is not a front desk. The decisions below are the shape of the next build. No code in the sitting that wrote them.

### Agree, with one correction

Registration comes after the guest has chosen dates and a room type, and before payment. They should not upload a passport just to look. They should not be able to take the nights without naming who will sleep there.

The desk does not open on every guest who has ever stayed. A modern front office opens on one date, defaulting to today: who arrives, who is in house, who leaves. Everyone else is a search, or a click on another date. History is kept. It is not the landing list.

Everything else in the request stands. Room move and a discretionary upgrade. Edit the guest. Notes. Every person in the room named. A calendar the desk can move through, including the past. Search by name or phone.

### Three records, not one row

A stay, a person, and a room are different things. The prototype's single booking row cannot grow into this. The same Durable Object remains the only writer. No second database.

- **Room.** Ten numbered rooms, each of one of the three types. A reservation occupies one room for a range of nights. The guest page can still say "a garden room is free" without showing the number. The desk assigns the number, and can change it.
- **Person.** One record per human: name, phone, email, address, and staff notes (strong wifi, quiet room, anything the desk wants remembered). Notes are staff-only. The same person can have many stays. Search hits this record and lists the stays under it.
- **Stay.** Check-in, check-out, the room, the amount paid, the payment id, the status. A price change never rewrites a stay already paid.
- **Occupants.** Every person sleeping in the room, including the booker, up to the room's own cap. Each occupant has a name and one government ID (image or PDF). Two, three, four, or five names are five occupant rows, not one text field. The cap is a property of the room type, not a hardcoded 2. Indian and overseas guests use the same step. Nationality and passport number are captured for a guest from outside India, so the desk can file what the law requires. This system stores the record. It does not submit it to a government portal, and it does not decide whether an ID is genuine.

IDs and notes are visible only to signed-in staff. The public page never receives them.

### What the guest does, in order

1. Dates, then which type is free.
2. Who is staying: the booker's name, mobile, email, and address, then each other person in the room, each with an ID.
3. Pay. The nights are taken only after this. A second tap is the same stay.

### What the desk does

- **Today**, by default. Three lists: arriving, in house, departing. A date control moves that board to any day, forward or back.
- **A calendar.** Click a date and see the ten rooms: who is in each, or that it is empty or blocked. Click a room and open the stay.
- **Search.** Name or phone. Returns the person and every stay attached to them, including stays that ended years ago.
- **The stay, once open.** Change the guest's details. Add or correct an occupant. Read and write notes. Move the guest to another room, including an upgrade the desk chooses to give. The move frees the old room and takes the new one. It fails if the new room is already taken, and it does not create a second stay. Charging the difference or waiving it is the desk's choice, recorded on the stay.
- **History.** Rows are not deleted when a guest leaves. Amount paid stays on the stay. "In perpetuity" at ten rooms is simply not throwing records away. A legal duty to delete an ID remains the delete already planned. It does not erase the fact that the stay happened.

All of these are pokes to the same writer. The desk does not keep a second calendar. A move, a note, and an edited name show up on the same board the guest's availability is baked from.

### Still not this

Housekeeping boards, a night audit, door locks, channel managers, and filing Form C on the guest's behalf. The fields a foreign guest requires are stored. The submission is the desk's.

---

## Explicitly not in any phase

- A heartbeat, a standing cron, or a second job that edits availability.
- Supabase as the ledger, or as a requirement for launch.
- Card numbers anywhere in this system.
- PayPal.
- A WordPress plugin, WooCommerce, or PHP on SiteGround as the calendar.
- Moving the domain registration. Cancelling SiteGround. Rebuilding the ashram pages.
- The restaurant, a channel manager, a store app, door locks, housekeeping, a night audit, accounting, promo codes, demand pricing, Kannada, Hindi, a second property, DigiLocker, a face match.
- A fourth room type. After launch, USD 250, from their photographs and a description.
- More than one writer of bookings or of the snapshot. The Durable Object is the lock. Two lanes never edit it at once.
