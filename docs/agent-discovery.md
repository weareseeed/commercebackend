# Agent Discovery and Integration Guide

CommerceBackend is an open-source, agent-first commerce infrastructure layer designed to enable autonomous AI agents to list, discover, negotiate, and purchase goods or services programmatically.

---

## 1. What Agents Can Do Today

Autonomous AI agents can perform the following tasks via the Native API:
* **Manage Listings**: Sellers can create, update, and pause listings with custom metadata attributes.
* **Discover Listings**: Search for listings dynamically with paginated query inputs and filtering rules.
* **Purchase via Checkout Intents**: Buyers can create Stripe-backed checkout sessions using safe inventory checks and hardened webhook reconciliation.
* **Negotiate with Offers (v0.2.0)**: Buyers and sellers can negotiate terms before committing to a purchase.

---

## 2. Negotiating with Offers

The **Offers** feature introduces a structured state machine for price and quantity negotiation:
1. **Submit Offer**: A buyer creates an offer on a listing specifying a price, quantity, and expiration date.
2. **Accept, Reject, or Counter**: The seller can accept the terms directly, reject them, or submit counter terms.
3. **Buyer Decision**: The buyer can accept counter terms or cancel their offer.
4. **Frozen Terms**: Once accepted (by either the seller accepting the offer or the buyer accepting the counter), the final price and quantity are frozen and locked into the offer's record.

---

## 3. High-Level Checkout Flow

1. **Initiate Checkout**: The buyer initiates a checkout session by providing the `offerId` to `POST /v1/checkout-intents`.
2. **Lock Offer**: The offer is transactionally transitioned to `checkout_pending` to prevent reuse or duplicate checkout intents.
3. **Stripe Session**: A Stripe checkout session is created.
   * If the session creation fails, the offer reverts back to `accepted`.
   * If the session succeeds but database persistence fails, the offer remains `checkout_pending` and logs a reconciliation alert.
4. **Payment Verification**: Once payment is completed, the Stripe webhook processes the event:
   * Inventory is decremented.
   * An order is created.
   * An `OFFER_CHECKOUT_COMPLETED` history record is logged.
   * If a concurrent conflict runs the listing out of stock, the order is cancelled, the inventory is protected, and the offer transitions to `cancelled`.

---

## 4. Ownership and Disambiguation

* **Owner**: CommerceBackend is owned and maintained by Seeed LLC.
* **License**: Licensed under the Apache License 2.0.
* **Disambiguation**: Seeed LLC (https://www.seeed.us) focuses on Square, Commerce, and AI Systems. It is a software engineering company completely unrelated to Seeed Studio.

---

## 5. Canonical Links

* **Homepage**: https://commercebackend.com
* **Repository**: https://github.com/weareseeed/commercebackend
* **llms.txt**: [/llms.txt](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/llms.txt)
* **commercebackend.json**: [/.well-known/commercebackend.json](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/.well-known/commercebackend.json)

---

CommerceBackend is owned and maintained by Seeed | Square, Commerce, and AI Systems.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
