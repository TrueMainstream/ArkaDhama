# Arka Dhama — Mysore visit brief

Week of Monday 9 Nov – Sunday 15 Nov. You arrive Tuesday.
Purpose of the trip: two customer-facing systems, and nothing else unless they ask.

1. Restaurant ordering — menu, checkout, pay, kitchen gets the order. Dine-in, pickup, or delivery.
2. Room booking — see rooms, pick dates, pay, get a confirmation. Turnkey, not a full hotel chain system.

**Requirement, not a nice-to-have.** A guest completes both on the website alone. They do not call a number to place a food order or to reserve a room. “Call us to book” and “WhatsApp the kitchen your order” are the thing being replaced. Staff may still enter a booking or an order from the desk for someone standing in front of them. That is a back-office exception. It is not the customer path, and it is not allowed to be the only path.

Side topics they already named (quotes, spreading Arkaji’s word) stay side topics. Do not turn them into a third product this week.

---

## What to say in one minute

Both sites take payment the way India actually pays: UPI first (PhonePe, Google Pay, Paytm), then Indian cards, then international cards for guests flying in. One payment account can serve both sites.

The restaurant site is their own counter, not a replacement for Swiggy or Zomato. Those apps do not offer a simple plug-in. If the kitchen also sells on Swiggy or Zomato, a restaurant system such as Petpooja or UrbanPiper puts every order on one kitchen screen. Building that link ourselves is the wrong promise.

The room site is a booking calendar for Arka Dhama, not Booking.com and not a 200-room hotel system. The guest picks the room and pays on the site. No phone call, no “request a callback.” Staff can block a room for a visiting devotee, or type in a booking for someone already at the desk. A guest who is not in the building never has to speak to anyone to get a room.

Version one of each is a working site a guest can pay on. Reports, loyalty, and a dozen room types come later.

The bar is the same one used at SuperTalk and TrueMainstream. A theme, a WooCommerce plugin, or a hotel template that "takes orders" is not this. The guest-facing pages stay simple. Under them, one writer owns the kitchen and one writer owns the rooms, so a double tap and a webhook replay cannot create a second order or sell the last room twice.

---

## Restaurant — what version one is

Guest opens the site on a phone. Sees today’s menu, prices, what is sold out. Adds items. Chooses:

- Dine-in (table number or “I’ll find a seat”)
- Pickup (name + time)
- Delivery (address inside a radius you agree, or “we don’t deliver”)

Pays on the site (UPI or card) and gets an order number. Collects the food, sits down, or waits for delivery. They never phone the order in. Pay-at-counter is only an extra switch if the kitchen insists; the default, and the client’s ask, is pay online and collect.

Kitchen sees the order on a tablet (or a printed slip): items, notes, dine-in / pickup / delivery, paid or pay-at-counter. Marks it accepted, then ready. Guest can see that status.

Staff can turn an item off when it runs out, change a price, and close ordering outside hours.

### What you should not promise

- A live two-way connection to Swiggy or Zomato built from scratch. Partner access is gated, slow, and usually goes through Petpooja, UrbanPiper, Posist, or DotPe. Ask what they use today before designing anything.
- A full point-of-sale with inventory, recipes, and supplier orders. That is a different product.
- Automatic splitting of bills across a table of eight. Nice later. Not day one.

### India payments on this site

Razorpay is the default gateway for a site this size. Cashfree or PayU are fine if their bank or accountant already has one. The guest should see:

- UPI (intent + QR)
- Indian debit and credit cards, including RuPay
- International cards, turned on separately in the gateway (needed for overseas visitors)
- Optional: pay at counter / pay on delivery

Netbanking is optional. Wallets matter less every year because UPI ate them.

---

## Rooms — what version one is

Public page: a few room types with photos, what is included, house rules, price per night.

Guest picks dates, sees which types are free, enters name and contact, pays a deposit or the full stay, gets email and a WhatsApp confirmation.

Staff calendar: arrivals, departures, who has paid, a button to block dates (maintenance, guru guests, full-moon programs), and a button to type in a booking for someone standing at the desk. A guest booking from home uses the public site only. There is no “call this number to reserve” on the page.

Rules you need from them before building: deposit percent, free-cancellation window, what happens on a no-show, minimum nights, whether a room can be booked by the hour or only by the night.

### What you should not promise

- Channel manager to Booking.com, MakeMyTrip, and Agoda in version one. If they already live on those sites, say so and look at eZee, Hotelogix, or Little Hotelier instead of a custom build. An ashram that mostly takes its own guests does not need that.
- Door locks, ID-scan check-in, or a night audit. Later, if ever.
- Dynamic pricing. A weekday rate and a program-week rate is enough.

International cards matter more here than in the restaurant. Many guests will not have UPI. Razorpay international payments need extra KYC and a few days of lead time. Start that this week if it is not already on.

---

## One stack for both

| Piece | Recommendation | Why |
| --- | --- | --- |
| Sites | Cloudflare Workers. Two sites, one visual family, or one site with `/order` and `/stay` | Same trust, separate jobs. Kitchen staff should not see room admin. |
| Ledger | One Durable Object per property, SQLite inside it. One for the kitchen, one for rooms if the two must not share a failure. | This is the single writer. A quiet night pays nothing. |
| Pay | Razorpay, one account if one legal entity. Not PayPal. | UPI, Indian cards, international cards, payment links, refunds. |
| Guest messages | Email + WhatsApp (their existing number) | India confirms on WhatsApp. Email is the receipt. |
| Kitchen / front desk | A simple signed-in screen, not a native app | A tablet in the kitchen and one at reception. |
| Languages | English first. Add Kannada or Hindi only if they ask. | Mysore is Kannada. Their visitors may be all-India and overseas. Ask who actually books. |

Do not start a custom payment integration. The gateway’s checkout is the product. Your job is the menu, the calendar, and the order or booking record.

### Cloudflare, not Supabase

Preferred: the sites and the booking ledger both live on Cloudflare. Workers serve the pages. The calendar is SQLite inside one Durable Object, the same single-writer shape as SuperTalk. The guest’s intent and Razorpay’s “paid” notice both land on that one object. It drains them and writes the only availability snapshot.

Not preferred: Supabase as the reservation system. Postgres is a shared database, so “the last room” needs extra locking you then have to prove. A webhook can write a booking while a page reads availability and you have two writers. The database is on whether or not anyone booked today. Workers talking to Supabase put a round-trip under the thing the guest is waiting on.

Supabase is acceptable later as a read-only export for their CA (a day’s payments, a month’s stays). It is not the calendar, and it is not required to launch.

Not preferred either: a SQLite file on a computer in the ashram, or a Worker with no Durable Object. A file on one machine dies when that machine sleeps. A Worker without the object has no single writer across requests. “SQLite” here means SQLite inside the Durable Object, not a database app they install.

### WordPress stays. DNS moves. The domain registration does not.

They are on WordPress at SiteGround. Do not migrate that site to prove a point, and do not rebuild the ashram pages on Workers.

What moves is DNS only. Point the domain's nameservers at Cloudflare (free plan). The existing site keeps working: Cloudflare proxies it and the origin stays SiteGround. Order and booking are new hostnames on the same domain (`order.` and `stay.`, or `/order` and `/stay` if they insist on one address). Those hostnames are Workers. WordPress never sees a cart or a room-night.

Do not transfer the registrar this week. Registration can stay wherever it is (SiteGround, GoDaddy, or whoever holds it). Transferring the domain is a separate, slow, lock-prone step and it does not make the booking system better. Cloudflare Registrar is at-cost and fine later, when someone has the auth code and an hour with nothing else in flight. It is not the launch.

Do not cancel SiteGround. Cancelling it takes the current website down. Their WordPress bill is whatever they already pay. I could not read SiteGround's price page on this visit (403). Ask them for the invoice instead of quoting a plan from memory.

The thing to refuse: "keep SiteGround and also run the bookings there" (a WordPress plugin, WooCommerce, or PHP on that host). That is a second writer, a plugin update away from a double booking, and it puts the calendar on a machine that sleeps when the host does maintenance. SiteGround keeps serving the ashram pages. It does not keep the ledger.

### What it costs per month

Figures from Cloudflare's own docs, fetched 11 Nov 2026. Workers pricing page last updated 2 Oct 2026. Durable Objects pricing page last updated 18 Oct 2026. USD.

| Item | Monthly |
| --- | --- |
| Cloudflare DNS + proxy in front of WordPress | $0 (Free plan) |
| Workers Paid, one account for both order and stay | $5 minimum |
| Requests, CPU, SQLite rows, stored data at ashram volume | $0 on top of the $5. Included allotment is 10 million Worker requests, 1 million Durable Object requests, 50 million rows written, 5 GB stored. A busy lunch does not leave that. |
| Domain registration | Unchanged. Still paid yearly to whoever holds it now. |
| SiteGround | Unchanged. Their current invoice. |
| Razorpay | No monthly fee assumed. They take a cut of each successful payment. Their CA confirms the rate. |
| WhatsApp | Their existing number. A business-API sender, if they outgrow the manual number, is a later line and not in the $5. |

So the new system adds about **$5 a month** until the property is far busier than one ashram. Do not put them on Cloudflare Pro ($20 a month billed annually, or $25 month-to-month) or Business ($200 / $250). Those buy WAF extras the booking system does not need.

The $5 stays $5 because a quiet night hibernates. An always-on timer would be the thing that made this bill grow, which is the same reason SuperTalk retired the heartbeat.

### PayPal is not the payment system

Razorpay is. Indian guests pay with UPI and Indian cards. PayPal shut its domestic India business in 2021, so a guest in Mysore with PhonePe cannot pay an Indian PayPal checkout. PayPal’s own pages would not load for a fresh check on this visit (403), and the Wikipedia India section is stale (it still describes the 2017 domestic launch). Confirm with their CA, but do not design around PayPal.

International cards on Razorpay cover guests who flew in. That needs the extra international KYC (video KYC, PAN, address). Start it this week.

A PayPal button may be added later, only for an overseas guest who already lives in PayPal, and only if Arka Dhama’s account can actually receive that payment. It is a second notice into the same Durable Object. It does not get its own calendar, and it is not version one.

---

## The standard underneath

Same class of system as SuperTalk, with the pieces of TrueMainstream that earn their place. Not the news ingest clock. There is no article budget, no trending pipe, and no always-on heartbeat.

SuperTalk’s rule, applied here: a guest action is a poke. One writer drains everything waiting and writes one snapshot. Then it sleeps. It arms another pass only to finish a backlog or to retry a pass that failed. A quiet kitchen at 2am pays nothing. Do not leave a cron that polls "just in case" and does the same work.

TrueMainstream’s rule that carries over: the thing the guest is waiting on is not the place you hide extra work. Payment confirmed starts the kitchen ticket and the confirmation message. It does not sit inside a long job. A second clock that duplicates the writer is a bug, not a safety net. Bake a new menu or a new availability board only when something changed.

Say none of this to a guest, and do not put the words tick, drain, pool, or heartbeat on the site, in a receipt, or in a screenshot they will see. In the meeting, say the outcomes:

- Tap pay twice, still one order.
- The kitchen sees each paid order once, on one screen, without refreshing.
- Two people cannot book the last room. One gets it. The other is told it just went, and is not charged.
- The menu and the room calendar paint as soon as their bytes arrive. No spinner standing in for a database round-trip.
- A night with no orders costs nothing, because nothing is polling.

### Restaurant writer

One writer for the kitchen. Not one writer per table, and not the browser as the writer.

The guest’s checkout posts one intent, with an idempotency key generated on their phone before they pay. Razorpay (or whichever gateway) will deliver the "paid" notice more than once. That notice carries the same key. The writer drains the intent and every copy of the payment notice into exactly one kitchen ticket.

The kitchen tablet does not query the database. It reads one baked board: open tickets, what was paid, dine-in / pickup / delivery. A new ticket replaces that board. The guest’s status page reads their own small snapshot (accepted, cooking, ready), not a live query.

Sold out is the same writer. Staff marks dosa off. The next menu snapshot omits it. Phones already open keep reading the previous snapshot until the new one is there. They never read stock with their own query.

A retry, a double tap, or a webhook that arrives twice is the same order. The guest sees the order they already have.

### Rooms writer

One writer for the property calendar. Same shape.

Availability is a baked snapshot. The date picker reads that. It does not run a search against live rows for every guest who opens the page.

A booking intent and its payment notice drain together. The writer takes those nights once, writes the new availability snapshot, and sends one confirmation (email and WhatsApp). A second payment notice does not send a second confirmation and does not take a second room.

Two guests on the last room are serialized by that one writer. The first paid intent wins. The second gets a clear "just taken" and a refund if their payment already captured. No overbook, and no "we will call you to sort it out."

A staff block (guru guest, maintenance, program week) is a poke to the same writer. There is not a second calendar.

Holds expire inside that writer. A guest who started checkout and walked away does not pin a room overnight. The expiry is a scheduled wake of the same writer, not a separate cron that also edits availability.

### What does not come along

- TrueMainstream’s 10-second news tick, feed budgets, and trending work. Wrong product.
- An always-hot timer that fires when the pool is empty. SuperTalk retired that. A quiet ashram must not pay for a heartbeat.
- The kitchen tablet polling a database every second. It reads the snapshot. Push a frame when the snapshot changes, or a cheap stamp that says "fetch again."
- Storing cards, cooking a second order on webhook replay, or selling one room-night twice. Those are failures of the office, not edge cases to patch later.
- Judging the design only at today’s traffic. A normal lunch and a full program week are the bar. "Fine because the ashram is quiet" is not a proposal. A thousand-person news fan-out is also not the bar. Do not import that machinery to feel serious.

---

## Money and tax — ask, do not guess

GST on restaurant food and on room tariff depends on how the property is registered and on current slabs. Their CA owns the rates. The site must show tax as a line, not bake a guessed percent into the price.

You need, for the gateway:

- Legal name, PAN, bank account in that name
- GSTIN if they have one
- A live page with refund rules, terms, and a contact address (the gateway rejects sites without these)
- FSSAI number if the restaurant sells to the public

KYC is the long pole. A beautiful site that cannot take a rupee is not launched. If the documents are in the building this week, start the Razorpay application before you fly home.

---

## Questions to get answered before you leave

Restaurant

- Who cooks, and who would look at the kitchen tablet? One person or a shift?
- Dine-in, pickup, delivery — which of the three exist today, and which are wished for?
- Delivery radius, or no delivery at all?
- Are they already on Swiggy, Zomato, or both? Which POS or billing app is on the counter today (Petpooja, a cash register, a notebook)?
- Rough order volume on a busy day, and on a quiet day.
- Who sets the menu — daily plate, or a fixed card?
- Veg only, or veg and non-veg? Jain? Any allergen note they care about?
- Online pay is the path. Do they also want a pay-at-counter switch, or is that out?

Rooms

- How many rooms, and how many types? Get the real count by walking the building.
- Nightly rate, what is included (meals, programs), extra person, extra mattress.
- Deposit or full prepay? Cancellation in their words.
- Do they take walk-ins? Overseas guests? Groups for a program?
- Is anyone already listed on MakeMyTrip, Booking.com, or Airbnb?
- If a payment fails at 11 pm, the guest retries on the site. Who, if anyone, looks at failed payments the next morning? There is no night-duty phone line in the design.

Shared

- One legal entity or two (food vs lodging)? This decides one Razorpay account or two.
- Who is the day-to-day owner of each site after you leave? Name them.
- English only, or Kannada / Hindi as well?
- Domain they want, and who controls the current website and its login.

Side topics — only if the meeting goes there

- Quotes and messages: a shared note (a doc or a simple page) that staff can copy from beats a new app. Do not build a social tool.
- Spreading the word: their existing YouTube, WhatsApp channel, and Instagram, posted on a rhythm. Not a new platform.

---

## Suggested shape of the work, after the visit

Not a quote. A way to talk about phases so the room does not invent a third and fourth system.

Phase 0 — this week, on site. Answers above, photos of rooms and food, sample menu, sample rate card, legal name for payments, who decides.

Phase 1 — restaurant site. Menu, cart, pay, kitchen tablet, sold-out switch. Pickup and dine-in first if delivery is vague.

Phase 2 — room site. Types, calendar, pay, confirmation, staff blocks. International cards on.

Phase 3 — only if phase 1 and 2 are in daily use. Delivery zone, Swiggy/Zomato via a restaurant system they already pay for, Kannada, program-week room rates, simple daily sales total.

---

## Out of scope unless they bring a signed reason

- Rewriting their main ashram website, teachings, or donation page.
- A mobile app in the stores. The sites are phone-first. An app store listing is a year-two conversation.
- Accounting software. Export a day’s payments. Their CA already has a tool.
- Anything that stores a guest’s card number on Arka Dhama’s server. The gateway stores cards. You store “paid” and a payment id.
