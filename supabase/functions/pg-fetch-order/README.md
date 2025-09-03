# Cashfree Payment Gateway - Fetch Order Edge Function

This Supabase Edge Function integrates with Cashfree Payment Gateway to fetch
payment order details using their SDK.

## Features

- Fetch existing order details by order ID
- CORS enabled for browser requests
- Environment-based configuration (Sandbox/Production)
- Comprehensive error handling
- Multiple ways to provide order ID (path parameter or query parameter)

## Environment Variables

Set these secrets in your Supabase project:

```bash
supabase secrets set CASHFREE_CLIENT_ID=your_client_id
supabase secrets set CASHFREE_CLIENT_SECRET=your_client_secret
supabase secrets set CASHFREE_ENVIRONMENT=SANDBOX  # or PRODUCTION
```

## API Endpoints

### GET /functions/v1/pg-fetch-order/{order_id}

### GET /functions/v1/pg-fetch-order?order_id={order_id}

Fetches details of an existing payment order.

**Path Parameter:**

- `order_id`: The unique identifier of the order to fetch

**Query Parameter (alternative):**

- `order_id`: The unique identifier of the order to fetch

**Response:**

```json
{
  "success": true,
  "data": {
    "cf_order_id": 2149460581,
    "created_at": "2023-08-11T18:02:46+05:30",
    "customer_details": {
      "customer_id": "409128494",
      "customer_name": "John Doe",
      "customer_email": "example@cashfree.com",
      "customer_phone": "9876543210"
    },
    "entity": "order",
    "order_amount": 22.00,
    "order_currency": "INR",
    "order_expiry_time": "2023-09-09T18:02:46+05:30",
    "order_id": "order_3242Tq4Edj9CC5RDcMeobmJOWOBJij",
    "order_meta": {
      "return_url": "https://example.com/return/{order_id}",
      "notify_url": "https://example.com/notify",
      "payment_methods": "cc,dc,upi,nb"
    },
    "order_note": "some order note",
    "order_splits": [],
    "order_status": "ACTIVE",
    "order_tags": {
      "name": "John",
      "age": "19"
    },
    "payment_session_id": "session_xxx",
    "payments": {
      "url": "https://sandbox.cashfree.com/pg/orders/order_123/payments"
    },
    "refunds": {
      "url": "https://sandbox.cashfree.com/pg/orders/order_123/refunds"
    },
    "settlements": {
      "url": "https://sandbox.cashfree.com/pg/orders/order_123/settlements"
    },
    "terminal_data": null
  },
  "message": "Order fetched successfully"
}
```

## Order Status Values

The `order_status` field can have the following values:

- `ACTIVE`: Order is created and awaiting payment
- `PAID`: Payment has been completed successfully
- `EXPIRED`: Order has expired
- `CANCELLED`: Order has been cancelled
- `TERMINATED`: Order has been terminated

## Usage Examples

### JavaScript/TypeScript

```javascript
// Fetch Order using path parameter
const fetchOrderByPath = async (orderId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-fetch-order/${orderId}`,
  );
  const data = await response.json();
  return data;
};

// Fetch Order using query parameter
const fetchOrderByQuery = async (orderId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-fetch-order?order_id=${orderId}`,
  );
  const data = await response.json();
  return data;
};

// Usage example
try {
  const orderData = await fetchOrderByPath('order_123');
  if (orderData.success) {
    console.log('Order Status:', orderData.data.order_status);
    console.log('Order Amount:', orderData.data.order_amount);
    console.log('Customer Details:', orderData.data.customer_details);
  } else {
    console.error('Error:', orderData.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';

const useOrderData = (orderId) => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://your-project.supabase.co/functions/v1/pg-fetch-order/${orderId}`,
        );
        const data = await response.json();

        if (data.success) {
          setOrderData(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  return { orderData, loading, error };
};
```

### cURL

```bash
# Fetch Order using path parameter
curl "https://your-project.supabase.co/functions/v1/pg-fetch-order/order_123"

# Fetch Order using query parameter
curl "https://your-project.supabase.co/functions/v1/pg-fetch-order?order_id=order_123"

# With authentication header (if required)
curl "https://your-project.supabase.co/functions/v1/pg-fetch-order/order_123" \
  -H "Authorization: Bearer your-supabase-jwt"
```

## Deployment

```bash
# Deploy this function
supabase functions deploy pg-fetch-order --no-verify-jwt

# Or deploy with import map
supabase functions deploy pg-fetch-order --import-map ./supabase/functions/import_map.json --no-verify-jwt
```

## Error Handling

The function returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing order_id)
- `404`: Order not found
- `405`: Method Not Allowed (only GET supported)
- `500`: Internal Server Error

Error responses include:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Common Use Cases

1. **Order Status Tracking**: Check the current status of a payment order
2. **Payment Confirmation**: Verify payment completion after redirect
3. **Customer Service**: Look up order details for support queries
4. **Analytics**: Fetch order data for reporting and analytics
5. **Webhook Verification**: Cross-check webhook data with actual order status

## Security Notes

1. Store your Cashfree credentials as Supabase secrets, never in code
2. Use HTTPS endpoints in production
3. Implement proper authentication for your frontend applications
4. Consider rate limiting for public-facing endpoints
5. Validate order_id format before making API calls

## Integration with pg-create-order

This function works perfectly with the `pg-create-order` function:

```javascript
// Create an order first
const orderResponse = await fetch('/functions/v1/pg-create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_amount: 100.00,
    order_currency: 'INR',
    order_id: 'order_123',
    customer_details: {
      customer_id: 'cust_123',
      customer_phone: '9999999999',
    },
  }),
});

const order = await orderResponse.json();

// Then fetch the order details
if (order.success) {
  const orderDetails = await fetch(
    `/functions/v1/pg-fetch-order/${order.data.order_id}`,
  );
  const details = await orderDetails.json();
  console.log('Order created and fetched:', details.data);
}
```
