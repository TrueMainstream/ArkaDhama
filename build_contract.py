#!/usr/bin/env python3
"""Arka Dhama room reservation agreement. Letter, no cover."""

import os
import sys

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table,
    TableStyle, KeepTogether, ListFlowable, ListItem, CondPageBreak, HRFlowable,
)

PAGE_BG = HexColor("#f7f7f6")
HEADER_FILL = HexColor("#6b6246")
ACCENT = HexColor("#2f88a6")
TEXT_PRIMARY = HexColor("#252421")
TEXT_MUTED = HexColor("#8a8780")
BORDER = HexColor("#d7d1bf")
RULE = HexColor("#c9c3b2")

PAGE_W, PAGE_H = letter
LEFT = 0.85 * inch
RIGHT = 0.85 * inch
TOP = 0.78 * inch
BOTTOM = 0.7 * inch
CONTENT_W = PAGE_W - LEFT - RIGHT

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Arka-Dhama-Room-Reservation-Agreement.pdf")


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(HEADER_FILL)
    canvas.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Times-Roman", 8)
    canvas.drawString(LEFT, 0.38 * inch, "Arka Dhama  ·  Room reservation agreement  ·  Draft")
    canvas.drawRightString(PAGE_W - RIGHT, 0.38 * inch, str(doc.page))
    canvas.restoreState()


def styles():
    s = {}
    s["kicker"] = ParagraphStyle(
        "kicker", fontName="Times-Bold", fontSize=9, leading=12,
        textColor=HEADER_FILL, tracking=1.2, spaceAfter=4,
    )
    s["title"] = ParagraphStyle(
        "title", fontName="Times-Bold", fontSize=20, leading=24,
        textColor=TEXT_PRIMARY, spaceAfter=2,
    )
    s["sub"] = ParagraphStyle(
        "sub", fontName="Times-Italic", fontSize=10, leading=13,
        textColor=TEXT_MUTED, spaceAfter=8,
    )
    s["h"] = ParagraphStyle(
        "h", fontName="Times-Bold", fontSize=13, leading=16,
        textColor=HEADER_FILL, spaceBefore=13, spaceAfter=5,
    )
    s["h2"] = ParagraphStyle(
        "h2", fontName="Times-Bold", fontSize=11, leading=14,
        textColor=TEXT_PRIMARY, spaceBefore=9, spaceAfter=3,
    )
    s["body"] = ParagraphStyle(
        "body", fontName="Times-Roman", fontSize=10, leading=13.5,
        textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=6,
    )
    s["li"] = ParagraphStyle(
        "li", fontName="Times-Roman", fontSize=10, leading=13.2,
        textColor=TEXT_PRIMARY, alignment=TA_LEFT, leftIndent=0, spaceAfter=1,
    )
    s["note"] = ParagraphStyle(
        "note", fontName="Times-Italic", fontSize=9.5, leading=12.5,
        textColor=TEXT_MUTED, spaceBefore=2, spaceAfter=6,
    )
    s["sign"] = ParagraphStyle(
        "sign", fontName="Times-Roman", fontSize=10, leading=14,
        textColor=TEXT_PRIMARY, spaceAfter=2,
    )
    s["small"] = ParagraphStyle(
        "small", fontName="Times-Roman", fontSize=8.5, leading=11,
        textColor=TEXT_MUTED, spaceBefore=8,
    )
    return s


def bullets(items, st):
    flow = []
    for text in items:
        flow.append(ListItem(Paragraph(text, st["li"]), leftIndent=12, bulletColor=HEADER_FILL))
    return ListFlowable(
        flow, bulletType="bullet", leftIndent=14, bulletFontName="Times-Roman",
        bulletFontSize=8, spaceBefore=1, spaceAfter=6,
    )


def money_table():
    data = [
        ["When", "Amount"],
        ["On signing, before any work or the shoot", "USD 1,000"],
        ["On delivery, after a test payment on the page", "USD 1,000"],
        ["Flight, reimbursed separately, due on signing", "USD 441.50"],
    ]
    col1 = CONTENT_W * 0.72
    col2 = CONTENT_W - col1
    t = Table(data, colWidths=[col1, col2])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_FILL),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_PRIMARY),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 1), (-1, -2), 0.3, BORDER),
        ("BOX", (0, 0), (-1, -1), 0.4, HEADER_FILL),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    t.hAlign = "CENTER"
    return t


def sign_block(who):
    label = ParagraphStyle("lab", fontName="Times-Bold", fontSize=11, leading=14, textColor=TEXT_PRIMARY, spaceAfter=8)
    line = ParagraphStyle("ln", fontName="Times-Roman", fontSize=10, leading=16, textColor=TEXT_PRIMARY)
    bits = [Paragraph(who, label)]
    for field in ("Name", "Title", "Signature", "Date"):
        if who == "Contractor" and field == "Title":
            continue
        bits.append(Paragraph(f"{field}  ________________________________", line))
        bits.append(Spacer(1, 8))
    return KeepTogether(bits)


def build():
    st = styles()
    story = []

    story.append(Paragraph("AGREEMENT", st["kicker"]))
    story.append(Paragraph("Arka Dhama room reservation system", st["title"]))
    story.append(Paragraph("Draft for signature. 11 November 2026. Mysore.", st["sub"]))
    story.append(HRFlowable(width="100%", thickness=0.6, color=HEADER_FILL, spaceAfter=10))

    story.append(Paragraph(
        "This is the whole of the work. Anything not written in this agreement is not included.",
        st["body"]))
    story.append(Paragraph("<b>Client.</b> Arka Dhama, Mysore, signed by a person authorized to bind it.", st["body"]))
    story.append(Paragraph("<b>Contractor.</b> ________________________________", st["body"]))
    story.append(Paragraph(
        "The fee in this agreement is a concession for this first project. It is not the price of any later project.",
        st["note"]))

    story.append(Paragraph("1. The work", st["h"]))
    story.append(Paragraph(
        "One property. Ten rooms in three types. A guest books and pays on a page. Staff run the bookings from a desk page. The contractor also photographs the rooms and delivers one short film.",
        st["body"]))

    story.append(Paragraph("1.1 The booking page", st["h2"]))
    story.append(bullets([
        "Designed and built for Arka Dhama. Not a purchased theme and not a WordPress plugin.",
        "Usable on a phone, a tablet, and a computer.",
        "Each room type shows its photographs, what is included, the house rules, and the price per night.",
        "A calendar. The guest selects a check-in date and a check-out date and sees which types are free across those nights.",
        "The guest registers, uploads a government-issued photo ID, pays, and receives the booking. No phone call and no message to the desk is required.",
        "Registration asks for name, email, and mobile number, and a way back in, by password or one-time code.",
        "The ID is one image or one PDF. Indian and overseas guests use the same step. Arka Dhama decides which documents it accepts. The page stores the file for staff. It does not check the document against a government database, and it does not decide whether the document is genuine.",
        "The ID is visible only to signed-in staff. It is not shown on the public page. Arka Dhama can delete a guest's ID. Arka Dhama is responsible for having a lawful reason to collect it.",
        "Payment is Razorpay, connected through its API: UPI (PhonePe, Google Pay, Paytm), Indian debit and credit cards including RuPay, and international cards for guests paying from outside India.",
        "Card numbers are stored by Razorpay, never by this system. PayPal is not included.",
        "On a successful payment the booking is recorded, the nights are taken, and a confirmation is sent by email and by WhatsApp. No one at the desk has to retype it.",
        "If two guests pay for the last room of a type, one booking stands. The other is told on the page and is refunded.",
        "A price change does not alter a booking already paid.",
    ], st))

    story.append(Paragraph("1.2 The desk page", st["h2"]))
    story.append(Paragraph("Staff sign in. Guests do not.", st["body"]))
    story.append(bullets([
        "Arrivals, departures, and whether each booking is paid.",
        "Open a booking and see the guest's ID.",
        "Block dates, for a guest of the guru, maintenance, or a program.",
        "Enter a booking for a person standing at the desk.",
        "Change the nightly price of each of the three room types.",
        "Set a different price for a range of dates, such as a program week.",
        "Refund a payment through Razorpay when a booking is cancelled under Arka Dhama's own rule.",
    ], st))
    story.append(Paragraph(
        "Adding rooms of these same three types later, including rooms built after this agreement, is done by the contractor at no charge. A new kind of room, a fourth type, is not included. After launch the contractor adds one new type for USD 250, from photographs and a description Arka Dhama supplies.",
        st["body"]))

    story.append(Paragraph("1.3 Photographs", st["h2"]))
    story.append(Paragraph("Shot on a Sony ZV-E1 with a Viltrox 14mm f/4 full-frame lens.", st["body"]))
    story.append(bullets([
        "Each of the ten rooms, photographed for the booking page.",
        "Up to eight finished photographs of the property in addition (exterior, approach, a shared space), if those places are available on the shoot day.",
        "One shoot day during the November 2026 visit, while the contractor is in Mysore. Rooms must be open and presentable that day.",
        "Delivery is finished JPEG files, sized for the page and large enough to print. Camera raw files are not included.",
        "Arka Dhama may use the delivered photographs on its website and in its own promotion. The contractor may show them as examples of his work. Neither party sells them as stock.",
    ], st))
    story.append(Paragraph("A second shoot day, a drone, printed albums, and photographs of people are not included.", st["note"]))

    story.append(Paragraph("1.4 Film", st["h2"]))
    story.append(bullets([
        "One film, between 60 and 90 seconds, delivered in 4K at 60 frames per second, for the booking page.",
        "Shot on the same day as the photographs, on the same visit.",
        "One cut. One round of changes after Arka Dhama watches it.",
        "Music only if Arka Dhama supplies a track they have the right to use. Otherwise the film is delivered without licensed music.",
        "Arka Dhama may use the film on its website and in its own promotion. The contractor may show it as an example of his work.",
    ], st))
    story.append(Paragraph("A second film, a long cut, interviews, and a drone are not included.", st["note"]))

    story.append(Paragraph("1.5 The existing website", st["h2"]))
    story.append(Paragraph(
        "WordPress on SiteGround stays. It is not rebuilt, and that hosting is not cancelled. The domain registration stays where it is. The nameservers are pointed at Cloudflare so the booking page can live on the same domain. That change is reversible.",
        st["body"]))

    story.append(Paragraph("2. Not included", st["h"]))
    story.append(bullets([
        "The restaurant ordering system, and any later project.",
        "Booking.com, MakeMyTrip, Agoda, Airbnb, or any other listing site.",
        "An app in the Apple or Google store.",
        "Door locks, housekeeping, a night audit, accounting software.",
        "Promo codes, or prices that change themselves with demand.",
        "Kannada or Hindi. This version is English.",
        "A second property.",
        "Verifying an ID with the government, DigiLocker, or a face match.",
        "PayPal.",
    ], st))

    story.append(Paragraph("3. Fee and payment", st["h"]))
    story.append(Paragraph("<b>USD 2,000</b> for everything in section 1.", st["body"]))
    story.append(KeepTogether([Spacer(1, 4), money_table(), Spacer(1, 8)]))
    story.append(Paragraph(
        "The second half is not delayed by Razorpay's review of Arka Dhama's documents. If Razorpay has not approved the account, the second half is due when the page is otherwise complete and the payment step is demonstrated against Razorpay's test mode. Switching on live payments after approval is included and is not a new fee.",
        st["body"]))
    story.append(Paragraph(
        "The flight reimbursement is not a deposit and is not refundable against the fee. Razorpay's percentage, GST on that percentage, Cloudflare hosting of about USD 5 a month, SiteGround, and the domain renewal are paid by Arka Dhama to those companies. They are not part of the USD 2,000. Prices are in US dollars.",
        st["body"]))

    story.append(Paragraph("4. What Arka Dhama provides", st["h"]))
    story.append(Paragraph("Before the system can be finished:", st["body"]))
    story.append(bullets([
        "Legal name, PAN, bank account, and GSTIN if any, for Razorpay, and completion of Razorpay's own checks, including international cards.",
        "The nightly price of each type, what a stay includes, and the deposit or full-prepay rule.",
        "The cancellation rule, in their words, and which ID documents they accept.",
        "The WhatsApp number and the email address confirmations come from.",
        "Access to all ten rooms on the shoot day, lit and ready to photograph.",
        "One person at the desk who will use the page after launch.",
    ], st))
    story.append(Paragraph("Days spent waiting on these are not counted against the contractor.", st["note"]))

    story.append(Paragraph("5. Time", st["h"]))
    story.append(Paragraph(
        "Photographs and the film are shot during the November 2026 visit, provided the rooms are accessible. The booking page is ready for review within 45 days after the first payment and after the items in section 4 have been received, not counting days lost to Razorpay's review.",
        st["body"]))

    story.append(Paragraph("6. Acceptance", st["h"]))
    story.append(Paragraph(
        "Arka Dhama has 14 days after delivery to send one written list of things in section 1 that do not work. The contractor fixes that list. If no list arrives in 14 days, the work is accepted.",
        st["body"]))
    story.append(Paragraph(
        "For 30 days after acceptance the contractor fixes defects in section 1 at no charge. A defect is a room sold twice, a confirmation that did not send, a payment taken with no booking, a broken date selection, or a delivered photograph or film that will not open. A new feature is not a defect.",
        st["body"]))
    story.append(Paragraph(
        "Satisfaction means section 1 works. It is not a right to redo the design, reshoot, or add a feature.",
        st["body"]))

    close = []
    close.append(Paragraph("7. Ending", st["h"]))
    close.append(Paragraph(
        "Either party may stop this agreement in writing before the shoot and before the second payment. If Arka Dhama stops it, the first USD 1,000 and the flight reimbursement are kept, and work already shot or built is handed over as it stands. If the contractor stops it before delivery, he returns the USD 1,000 and hands over whatever has been made. The flight reimbursement is not returned. It paid for a flight already flown.",
        st["body"]))
    close.append(Paragraph("8. Signatures", st["h"]))
    close.append(Paragraph(
        "By signing, each person agrees to sections 1 through 7 and nothing beyond them.",
        st["body"]))
    close.append(Spacer(1, 6))
    close.append(sign_block("Arka Dhama"))
    close.append(Spacer(1, 8))
    close.append(sign_block("Contractor"))
    close.append(Paragraph(
        "This draft is for the parties to negotiate. It is not a substitute for a lawyer reading it.",
        st["small"]))
    story.append(KeepTogether(close))

    doc = BaseDocTemplate(
        OUT, pagesize=letter,
        leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM,
        title="Arka Dhama room reservation agreement",
        author="Rishi",
        subject="Agreement for the Arka Dhama room reservation system, photographs, and film.",
    )
    frame = Frame(LEFT, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id="body", showBoundary=0)
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=draw_page)])
    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
