# Cashfree Payment Gateway - Create Order Edge Function

This Supabase Edge Function integrates with Cashfree Payment Gateway to create
and fetch payment orders using their REST API.

## Features

- Create new payment orders
- Fetch existing order details
- CORS enabled for browser requests
- Environment-based configuration (Sandbox/Production)
- Comprehensive error handling

## Environment Variables

Set these secrets in your Supabase project:

```bash
supabase secrets set CASHFREE_CLIENT_ID=your_client_id
supabase secrets set CASHFREE_CLIENT_SECRET=your_client_secret
supabase secrets set CASHFREE_ENVIRONMENT=SANDBOX  # or PRODUCTION
```

## API Endpoints

### POST /functions/v1/pg-create-order

Creates a new payment order.

**Request Body:**

```json
{
  "order_amount": 100.00,
  "order_currency": "INR",
  "order_id": "unique_order_id_123",
  "customer_details": {
    "customer_id": "customer_123",
    "customer_phone": "9999999999",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe"
  },
  "order_meta": {
    "return_url": "https://yoursite.com/payment-success?order_id={order_id}",
    "notify_url": "https://yoursite.com/webhook",
    "payment_methods": "cc,dc,upi,nb"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "unique_order_id_123",
    "order_amount": 100.00,
    "order_currency": "INR",
    "order_status": "ACTIVE",
    "payment_session_id": "session_xxx",
    "cf_order_id": 123456789
  },
  "message": "Order created successfully"
}
```

### GET /functions/v1/pg-create-order?order_id={order_id}

Fetches details of an existing order.

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "unique_order_id_123",
    "order_amount": 100.00,
    "order_currency": "INR",
    "order_status": "PAID",
    "customer_details": {
      "customer_id": "customer_123",
      "customer_phone": "9999999999"
    }
  },
  "message": "Order fetched successfully"
}
```

## Usage Examples

### JavaScript/TypeScript

```javascript
// Create Order
const createOrder = async () => {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/pg-create-order',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_amount: 100.00,
        order_currency: 'INR',
        order_id: `order_${Date.now()}`,
        customer_details: {
          customer_id: 'cust_123',
          customer_phone: '9999999999',
          customer_email: 'test@example.com',
        },
      }),
    },
  );

  const data = await response.json();
  return data;
};

// Fetch Order
const fetchOrder = async (orderId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-create-order?order_id=${orderId}`,
  );
  const data = await response.json();
  return data;
};
```

### cURL

```bash
# Create Order
curl -X POST https://your-project.supabase.co/functions/v1/pg-create-order \
  -H "Content-Type: application/json" \
  -d '{
    "order_amount": 100.00,
    "order_currency": "INR",
    "order_id": "order_123",
    "customer_details": {
      "customer_id": "cust_123",
      "customer_phone": "9999999999"
    }
  }'

# Fetch Order
curl "https://your-project.supabase.co/functions/v1/pg-create-order?order_id=order_123"
```

## Deployment

```bash
# Deploy this function
supabase functions deploy pg-create-order --no-verify-jwt

# Or deploy with import map
supabase functions deploy pg-create-order --import-map ./supabase/functions/import_map.json --no-verify-jwt
```

## Error Handling

The function returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing required fields)
- `405`: Method Not Allowed
- `500`: Internal Server Error

Error responses include:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Security Notes

1. Store your Cashfree credentials as Supabase secrets, never in code
2. Use HTTPS endpoints in production
3. Validate webhook signatures for payment confirmations
4. Implement proper authentication for your frontend applications
