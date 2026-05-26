# Native API Endpoint Reference

All requests and responses use JSON. Unsuccessful responses follow the standard error payload structure, which includes a stable error code, a human-readable message, and a unique request ID:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "requestId": "req_a2b3c4d5..."
  }
}
```

---

## Public Endpoints

### 1. Health Check
- **GET** `/health`
- **Response:**
  ```json
  {
    "ok": true,
    "service": "commercebackend-api",
    "version": "0.1.0"
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET http://localhost:4000/health
  ```

### 2. Readiness Check
- **GET** `/ready`
- **Response (200 OK):**
  ```json
  {
    "ok": true,
    "checks": {
      "database": "ok",
      "stripe": "configured"
    }
  }
  ```
- **Response (503 Service Unavailable):**
  ```json
  {
    "ok": false,
    "checks": {
      "database": "error",
      "stripe": "mocked"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET http://localhost:4000/ready
  ```

### 3. Create Agent
- **POST** `/v1/agents`
- **Body:**
  ```json
  {
    "name": "Acme Seller Agent",
    "type": "seller",
    "ownerEmail": "ops@acme.com"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "agent": {
      "id": "agent_abc123",
      "name": "Acme Seller Agent",
      "type": "seller",
      "ownerEmail": "ops@acme.com",
      "status": "active",
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    },
    "apiKey": "cb_test_mock_key_abc123..."
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/agents \
    -H "Content-Type: application/json" \
    -d '{"name": "Acme Seller Agent", "type": "seller", "ownerEmail": "ops@acme.com"}'
  ```

---

## Protected Endpoints

*All endpoints below require header: `Authorization: Bearer <api_key>`*

### 4. Get Self Agent Details
- **GET** `/v1/agents/me`
- **Response (200 OK):**
  ```json
  {
    "agent": {
      "id": "agent_abc123",
      "name": "Acme Seller Agent",
      "type": "seller",
      "ownerEmail": "ops@acme.com",
      "status": "active",
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET http://localhost:4000/v1/agents/me \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 5. Create Listing
- **POST** `/v1/listings` *(Requires seller/both type)*
- **Body:**
  ```json
  {
    "title": "VIP Jazz Night Ticket",
    "description": "VIP ticket for Friday jazz night in Miami.",
    "type": "event_ticket",
    "priceAmount": 8500,
    "currency": "USD",
    "quantityAvailable": 42,
    "attributes": {
      "venue_city": "Miami"
    },
    "fulfillmentInstructions": "Email QR ticket"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "listing": {
      "id": "lst_xyz789",
      "sellerAgentId": "agent_abc123",
      "title": "VIP Jazz Night Ticket",
      "description": "VIP ticket for Friday jazz night in Miami.",
      "type": "event_ticket",
      "status": "active",
      "priceAmount": 8500,
      "currency": "USD",
      "quantityAvailable": 42,
      "attributes": { "venue_city": "Miami" },
      "fulfillmentInstructions": "Email QR ticket",
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/listings \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"title": "VIP Jazz Night Ticket", "description": "VIP ticket for Friday jazz night in Miami.", "type": "event_ticket", "priceAmount": 8500, "currency": "USD", "quantityAvailable": 42, "attributes": {"venue_city": "Miami"}, "fulfillmentInstructions": "Email QR ticket"}'
  ```

### 6. Get Listing
- **GET** `/v1/listings/:id`
- **Response (200 OK):**
  ```json
  {
    "listing": { ... }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET http://localhost:4000/v1/listings/lst_xyz789 \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 7. Search Listings (Paginated)
- **POST** `/v1/search`
- **Body:**
  ```json
  {
    "query": "jazz tickets",
    "filters": {
      "type": "event_ticket"
    },
    "limit": 20,
    "offset": 0
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "results": [
      {
        "listing": {
          "id": "lst_xyz789",
          "title": "VIP Jazz Night Ticket",
          "priceAmount": 8500,
          "currency": "USD",
          "quantityAvailable": 42
        },
        "matchReason": "Matched title/description for jazz.",
        "score": 1.0
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/search \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"query": "jazz tickets", "filters": {"type": "event_ticket"}, "limit": 20, "offset": 0}'
  ```

### 8. Create Purchase Policy
- **POST** `/v1/agents/:buyerAgentId/purchase-policies` *(Requires operator `X-Operator-Key`, not buyer-agent bearer auth)*
- **Purpose:** Defines bounded purchase authority for a buyer agent before checkout reaches Stripe. Policies can auto-approve low-risk purchases or require human approval above a threshold. Agents never receive raw payment credentials and cannot create or approve their own policies.
- **Body:**
  ```json
  {
    "name": "Low-risk ticket policy",
    "maxAutoApproveAmount": 7500,
    "currency": "USD",
    "allowedListingTypes": ["event_ticket"],
    "allowedSellerAgentIds": [],
    "requireHumanApprovalAboveAmount": 7500,
    "requireHumanApprovalForOffers": true
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "purchasePolicy": {
      "id": "pol_123",
      "buyerAgentId": "agent_buyer",
      "name": "Low-risk ticket policy",
      "enabled": true,
      "maxAutoApproveAmount": 7500,
      "currency": "USD",
      "allowedListingTypes": ["event_ticket"],
      "allowedSellerAgentIds": [],
      "requireHumanApprovalAboveAmount": 7500,
      "requireHumanApprovalForOffers": true,
      "createdAt": "2026-05-26T00:00:00.000Z",
      "updatedAt": "2026-05-26T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/agents/agent_buyer/purchase-policies \
    -H "X-Operator-Key: op_...redacted" \
    -H "Content-Type: application/json" \
    -d '{"name":"Low-risk ticket policy","maxAutoApproveAmount":7500,"currency":"USD","allowedListingTypes":["event_ticket"],"requireHumanApprovalAboveAmount":7500,"requireHumanApprovalForOffers":true}'
  ```

### 9. Create Checkout Intent
- **POST** `/v1/checkout-intents` *(Requires buyer/both type)*
- **Body:**
  ```json
  {
    "listingId": "lst_xyz789",
    "quantity": 2,
    "successUrl": "http://localhost:3000/success?checkoutIntentId={CHECKOUT_INTENT_ID}",
    "cancelUrl": "http://localhost:3000/cancel?checkoutIntentId={CHECKOUT_INTENT_ID}",
    "offerId": "off_123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "checkoutIntent": {
      "id": "chk_123",
      "listingId": "lst_xyz789",
      "buyerAgentId": "agent_buyer",
      "sellerAgentId": "agent_seller",
      "quantity": 2,
      "amountSubtotal": 17000,
      "amountTotal": 17000,
      "currency": "USD",
      "status": "open",
      "purchasePolicyId": "pol_123",
      "policyDecision": "policy_approved",
      "stripeCheckoutSessionId": "cs_test_session_id_123",
      "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_session_id_123",
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- If policy requires human approval, the checkout intent is created with `status: "human_approval_required"`, `policyDecision: "human_approval_required"`, and no `stripeCheckoutSessionId` or `checkoutUrl`.
- Approve with **POST** `/v1/checkout-intents/:id/approve` using `X-Operator-Key` to create the Stripe Checkout session. Buyer-agent bearer auth is rejected.
- Reject with **POST** `/v1/checkout-intents/:id/reject` using `X-Operator-Key` and optional body `{ "reason": "Human declined purchase." }`; no Stripe session is created.
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/checkout-intents \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"listingId": "lst_xyz789", "quantity": 2, "successUrl": "http://localhost:3000/success?checkoutIntentId={CHECKOUT_INTENT_ID}", "cancelUrl": "http://localhost:3000/cancel?checkoutIntentId={CHECKOUT_INTENT_ID}"}'
  ```

### 10. Get Orders (Paginated)
- **GET** `/v1/orders?role=buyer&limit=20&offset=0`
- **Response (200 OK):**
  ```json
  {
    "orders": [
      {
        "id": "ord_123",
        "checkoutIntentId": "chk_123",
        "listingId": "lst_xyz789",
        "buyerAgentId": "agent_buyer",
        "sellerAgentId": "agent_seller",
        "quantity": 2,
        "amountTotal": 17000,
        "currency": "USD",
        "paymentStatus": "paid",
        "fulfillmentStatus": "pending",
        "fulfillmentNote": null,
        "createdAt": "2026-05-24T00:00:00.000Z",
        "updatedAt": "2026-05-24T00:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET "http://localhost:4000/v1/orders?role=buyer&limit=20&offset=0" \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 11. Update Fulfillment
- **POST** `/v1/orders/:id/fulfillment` *(Requires seller of the order)*
- **Body:**
  ```json
  {
    "fulfillmentStatus": "fulfilled",
    "fulfillmentNote": "QR tickets emailed to buyer email address."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "order": {
      "id": "ord_123",
      "fulfillmentStatus": "fulfilled",
      "fulfillmentNote": "QR tickets emailed to buyer email address."
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/orders/ord_123/fulfillment \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"fulfillmentStatus": "fulfilled", "fulfillmentNote": "QR tickets emailed to buyer email address."}'
  ```

### 12. Create Offer
- **POST** `/v1/listings/:id/offers` *(Requires buyer/both type)*
- **Body:**
  ```json
  {
    "priceAmount": 7500,
    "quantity": 2,
    "expiresAt": "2026-05-31T09:35:17.000Z",
    "note": "Programmatic offer from procurement agent."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "listingId": "lst_xyz789",
      "buyerAgentId": "agent_buyer",
      "priceAmount": 7500,
      "quantity": 2,
      "status": "pending",
      "expiresAt": "2026-05-31T09:35:17.000Z",
      "counterPriceAmount": null,
      "counterQuantity": null,
      "counterExpiresAt": null,
      "acceptedPriceAmount": null,
      "acceptedQuantity": null,
      "acceptedAt": null,
      "acceptedByAgentId": null,
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/listings/lst_xyz789/offers \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"priceAmount": 7500, "quantity": 2, "expiresAt": "2026-05-31T09:35:17.000Z", "note": "Programmatic offer."}'
  ```

### 13. Get List of Offers
- **GET** `/v1/offers?role=buyer&status=pending`
- **Response (200 OK):**
  ```json
  {
    "offers": [
      {
        "id": "off_123",
        "listingId": "lst_xyz789",
        "buyerAgentId": "agent_buyer",
        "priceAmount": 7500,
        "quantity": 2,
        "status": "pending",
        "expiresAt": "2026-05-31T09:35:17.000Z",
        "createdAt": "2026-05-24T00:00:00.000Z",
        "updatedAt": "2026-05-24T00:00:00.000Z"
      }
    ]
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET "http://localhost:4000/v1/offers?role=buyer&status=pending" \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 14. Get Offer Details
- **GET** `/v1/offers/:id`
- **Response (200 OK):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "listingId": "lst_xyz789",
      "buyerAgentId": "agent_buyer",
      "priceAmount": 7500,
      "quantity": 2,
      "status": "pending",
      "expiresAt": "2026-05-31T09:35:17.000Z",
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z",
      "history": [
        {
          "id": "his_123",
          "offerId": "off_123",
          "fromStatus": null,
          "toStatus": "pending",
          "event": "OFFER_CREATED",
          "actorId": "agent_buyer",
          "note": "Programmatic offer.",
          "createdAt": "2026-05-24T00:00:00.000Z"
        }
      ]
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET http://localhost:4000/v1/offers/off_123 \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 15. Accept Offer
- **POST** `/v1/offers/:id/accept` *(Requires listing owner/seller)*
- **Response (200 OK):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "status": "accepted",
      "acceptedPriceAmount": 7500,
      "acceptedQuantity": 2,
      "acceptedAt": "2026-05-24T00:00:00.000Z",
      "acceptedByAgentId": "agent_seller",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/offers/off_123/accept \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 16. Reject Offer
- **POST** `/v1/offers/:id/reject` *(Requires buyer or listing owner/seller)*
- **Response (200 OK):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "status": "rejected",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/offers/off_123/reject \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 17. Counter Offer
- **POST** `/v1/offers/:id/counter` *(Requires listing owner/seller)*
- **Body:**
  ```json
  {
    "counterPriceAmount": 8000,
    "counterQuantity": 2,
    "counterExpiresAt": "2026-05-31T09:35:17.000Z",
    "note": "Counter-offer at our minimum reserve price."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "status": "countered",
      "counterPriceAmount": 8000,
      "counterQuantity": 2,
      "counterExpiresAt": "2026-05-31T09:35:17.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/offers/off_123/counter \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"counterPriceAmount": 8000, "counterQuantity": 2, "counterExpiresAt": "2026-05-31T09:35:17.000Z", "note": "Counter offer terms."}'
  ```

### 18. Accept Counter Offer
- **POST** `/v1/offers/:id/accept-counter` *(Requires buyer)*
- **Response (200 OK):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "status": "accepted",
      "acceptedPriceAmount": 8000,
      "acceptedQuantity": 2,
      "acceptedAt": "2026-05-24T00:00:00.000Z",
      "acceptedByAgentId": "agent_buyer",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/offers/off_123/accept-counter \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 19. Cancel Offer
- **POST** `/v1/offers/:id/cancel` *(Requires buyer)*
- **Response (200 OK):**
  ```json
  {
    "offer": {
      "id": "off_123",
      "status": "cancelled",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/offers/off_123/cancel \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

---

CommerceBackend is owned and maintained by Seeed | Square, Commerce, and AI Systems.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

