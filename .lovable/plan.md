# Order a printed Medora card

## What we're adding
A way for a signed-in user to order a real plastic card (credit-card size) that carries the same details as their digital card: name, blood group, emergency numbers, allergies, highlighted conditions, insurance/policy details, and the same QR code that always opens their up-to-date emergency page.

## Where it goes
1. **Main place — under the health card.** On the screen where the user already sees their card and QR (the health card page), a new section sits right below the Download / Print buttons: "Want this on a real card?" with a preview of the front and back and an "Order printed card" button. This is where intent is highest, and all the details are already on screen.
2. **Pricing page.** A short line in each plan card noting the printed card can be ordered any time, so people browsing plans know it exists.
3. **After registration success.** A single quiet mention in the success state so new users learn about it early.

## Price
Based on Indian PVC card printing rates (roughly Rs 35-100 per card plus courier), the suggested price is:
- **Rs 299** for one card, delivery included, 5-7 working days.
- **Rs 699** for a family pack of 3 cards.
Both are editable in one place, so you can change them later without touching the rest.

## Order flow
1. User taps "Order printed card".
2. A form asks what to highlight on the card (allergies and conditions pre-ticked from their record, can be edited), plus delivery name, full address, pincode and a contact number.
3. Live preview of both sides updates as they choose.
4. Payment through Razorpay, the same checkout already used for plans.
5. On success: confirmation, an order reference, and an "Your card orders" list showing status (paid, printing, shipped, delivered) with a tracking note.

## Data and privacy
- A new `card_orders` table stores the delivery address, the chosen highlights snapshot, price, payment reference and status, locked to the owner only (same owner-only rules as the rest of the app). Nobody else can read an address.
- The printed card shows only what the user ticks. The QR stays the live share link, so an old printed card always shows current records.
- The user can cancel a card before it enters printing.

## For you (the operator)
Because these cards must be physically printed and posted, you need a way to see paid orders. The plan includes a simple owner-only orders view listing paid orders with the exact card content and address, plus a "mark as printed / shipped" control, so you can hand them to a print vendor. Access is restricted by a proper admin role in the database, not anything stored in the browser.

## Technical notes
- New table `public.card_orders` (owner_id, patient_id, plan/quantity, highlights jsonb, delivery fields, amount_inr, status, razorpay ids) with GRANTs, RLS scoped to `auth.uid()`, plus admin read/update via a `has_role` security-definer function and a separate `user_roles` table.
- Reuse `razorpay-create-order` / `razorpay-verify-payment` edge functions, extended to accept a one-time `card_order` purchase alongside subscriptions, verifying the amount server-side.
- New components: `PrintedCardOrder.tsx` (form + preview + checkout), `CardOrderStatus.tsx` (user's orders), `AdminCardOrders.tsx` (owner view at a protected route).
- Card artwork reuses `HealthCard.tsx` styling in a CR80 (85.6 x 54 mm) print layout so the physical card matches the app.

## Open item
Card fulfilment (which print vendor, courier, returns) is handled outside the app; the app captures the order and shows status. Tell me if you already have a printer so I can match their required export format (CSV or PDF artwork).
