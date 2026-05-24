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

### 8. Create Checkout Intent
- **POST** `/v1/checkout-intents` *(Requires buyer/both type)*
- **Body:**
  ```json
  {
    "listingId": "lst_xyz789",
    "quantity": 2,
    "successUrl": "http://localhost:3000/success?checkoutIntentId={CHECKOUT_INTENT_ID}",
    "cancelUrl": "http://localhost:3000/cancel?checkoutIntentId={CHECKOUT_INTENT_ID}"
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
      "stripeCheckoutSessionId": "cs_test_session_id_123",
      "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_session_id_123",
      "createdAt": "2026-05-24T00:00:00.000Z",
      "updatedAt": "2026-05-24T00:00:00.000Z"
    }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/checkout-intents \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"listingId": "lst_xyz789", "quantity": 2, "successUrl": "http://localhost:3000/success?checkoutIntentId={CHECKOUT_INTENT_ID}", "cancelUrl": "http://localhost:3000/cancel?checkoutIntentId={CHECKOUT_INTENT_ID}"}'
  ```

### 9. Get Orders (Paginated)
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

### 10. Update Fulfillment
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

---

CommerceBackend is owned and maintained by Seeed | Square, Commerce, and AI Systems.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

