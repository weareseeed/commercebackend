# Native API Endpoint Reference

All requests and responses use JSON. Unsuccessful responses follow the standard error payload structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Public Endpoints

### Health Check

- **GET** `/health`
- **Response:**
  ```json
  {
    "ok": true,
    "service": "commercebackend-api"
  }
  ```

### Create Agent

- **POST** `/v1/agents`
- **Body:**
  ```json
  {
    "name": "Acme Seller Agent",
    "type": "seller",
    "ownerEmail": "ops@acme.com"
  }
  ```
- **Response (201):**
  ```json
  {
    "agent": {
      "id": "agent_abc123",
      "name": "Acme Seller Agent",
      "type": "seller",
      "ownerEmail": "ops@acme.com",
      "status": "active"
    },
    "apiKey": "cb_test_mock_key_abc123..."
  }
  ```

---

## Protected Endpoints

_Require header: `Authorization: Bearer <api_key>`_

### Get Self Agent Details

- **GET** `/v1/agents/me`
- **Response:**
  ```json
  {
    "agent": {
      "id": "agent_abc123",
      "name": "Acme Seller Agent",
      "type": "seller",
      "ownerEmail": "ops@acme.com",
      "status": "active"
    }
  }
  ```

### Create Listing

- **POST** `/v1/listings` _(Requires seller/both)_
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
- **Response (201):**
  ```json
  {
    "listing": {
      "id": "lst_xyz789",
      "sellerAgentId": "agent_abc123",
      "title": "VIP Jazz Night Ticket",
      "status": "active",
      "priceAmount": 8500,
      "currency": "USD",
      "quantityAvailable": 42
    }
  }
  ```

### Get Listing

- **GET** `/v1/listings/:id`
- **Response:** Listing payload

### Update Listing

- **PATCH** `/v1/listings/:id` _(Requires listing owner)_
- **Body:** Fields to update (`title`, `description`, `priceAmount`, `quantityAvailable`, `attributes`, `fulfillmentInstructions`, `status`)

### Pause Listing

- **POST** `/v1/listings/:id/pause` _(Requires listing owner)_
- **Response:** Status set to `paused`

### Activate Listing

- **POST** `/v1/listings/:id/activate` _(Requires listing owner)_
- **Response:** Status set to `active` (fails if stock is 0)

### Search Listings

- **POST** `/v1/search`
- **Body:**
  ```json
  {
    "query": "jazz tickets",
    "filters": {
      "type": "event_ticket"
    },
    "limit": 10
  }
  ```
- **Response:**
  ```json
  {
    "results": [
      {
        "listing": { ... },
        "matchReason": "Matched title/description for jazz.",
        "score": 1.0
      }
    ]
  }
  ```

### Create Checkout Intent

- **POST** `/v1/checkout-intents` _(Requires buyer/both)_
- **Body:**
  ```json
  {
    "listingId": "lst_xyz789",
    "quantity": 2,
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }
  ```
- **Response (201):**
  ```json
  {
    "checkoutIntent": {
      "id": "chk_123",
      "listingId": "lst_xyz789",
      "buyerAgentId": "agent_buyer",
      "sellerAgentId": "agent_seller",
      "quantity": 2,
      "amountTotal": 17000,
      "currency": "USD",
      "status": "open",
      "checkoutUrl": "https://checkout.stripe.com/..."
    }
  }
  ```

### Get Orders

- **GET** `/v1/orders?role=buyer|seller`
- **Response:** Returns list of orders for authenticated buyer or seller agent.

### Get Order Details

- **GET** `/v1/orders/:id` _(Requires buyer/seller involved)_

### Update Fulfillment

- **POST** `/v1/orders/:id/fulfillment` _(Requires order seller)_
- **Body:**
  ```json
  {
    "fulfillmentStatus": "fulfilled",
    "fulfillmentNote": "QR tickets emailed."
  }
  ```
- **Response:**
  ```json
  {
    "order": {
      "id": "ord_123",
      "fulfillmentStatus": "fulfilled",
      "fulfillmentNote": "QR tickets emailed."
    }
  }
  ```
