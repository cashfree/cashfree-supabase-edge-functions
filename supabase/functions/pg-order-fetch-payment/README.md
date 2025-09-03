# Cashfree Payment Gateway - Fetch Single Payment Edge Function

This Supabase Edge Function integrates with Cashfree Payment Gateway to fetch details of a specific payment by payment ID using their SDK.

## Features

- Fetch specific payment details by order ID and payment ID
- CORS enabled for browser requests
- Environment-based configuration (Sandbox/Production)
- Comprehensive error handling
- Multiple ways to provide parameters (path parameters or query parameters)

## Environment Variables

Set these secrets in your Supabase project:

```bash
supabase secrets set CASHFREE_CLIENT_ID=your_client_id
supabase secrets set CASHFREE_CLIENT_SECRET=your_client_secret
supabase secrets set CASHFREE_ENVIRONMENT=SANDBOX  # or PRODUCTION
```

## API Endpoints

### GET /functions/v1/pg-order-fetch-payment/{order_id}/{cf_payment_id}
### GET /functions/v1/pg-order-fetch-payment?order_id={order_id}&cf_payment_id={cf_payment_id}

Fetches details of a specific payment within an order.

**Path Parameters:**
- `order_id`: The unique identifier of the order
- `cf_payment_id`: The Cashfree payment or transaction ID

**Query Parameters (alternative):**
- `order_id`: The unique identifier of the order
- `cf_payment_id`: The Cashfree payment or transaction ID

**Response:**
```json
{
  "success": true,
  "data": {
    "cf_payment_id": 12376123,
    "order_id": "order_8123",
    "entity": "payment",
    "payment_currency": "INR",
    "error_details": null,
    "order_amount": 10.01,
    "is_captured": true,
    "payment_group": "upi",
    "authorization": {
      "action": "CAPTURE",
      "status": "PENDING",
      "captured_amount": 100,
      "start_time": "2022-02-09T18:04:34+05:30",
      "end_time": "2022-02-19T18:04:34+05:30",
      "approve_by": "2022-02-09T18:04:34+05:30",
      "action_reference": "6595231908096894505959",
      "action_time": "2022-08-03T16:09:51"
    },
    "payment_method": {
      "upi": {
        "channel": "collect",
        "upi_id": "rohit@xcxcx"
      }
    },
    "payment_amount": 10.01,
    "payment_time": "2021-07-23T12:15:06+05:30",
    "payment_completion_time": "2021-07-23T12:18:59+05:30",
    "payment_status": "SUCCESS",
    "payment_message": "Transaction successful",
    "bank_reference": "P78112898712",
    "auth_id": "A898101"
  },
  "message": "Payment details fetched successfully"
}
```

## Payment Status Values

The `payment_status` field can have the following values:
- `SUCCESS`: Payment completed successfully
- `FAILED`: Payment failed
- `PENDING`: Payment is being processed
- `CANCELLED`: Payment was cancelled
- `VOID`: Payment was voided

## Payment Groups

The `payment_group` field indicates the payment method category:
- `upi`: UPI payments
- `credit_card`: Credit card payments
- `debit_card`: Debit card payments
- `net_banking`: Net banking payments
- `wallet`: Digital wallet payments
- `emi`: EMI payments
- `pay_later`: Pay later services

## Usage Examples

### JavaScript/TypeScript

```javascript
// Fetch Payment using path parameters
const fetchPaymentByPath = async (orderId, cfPaymentId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-order-fetch-payment/${orderId}/${cfPaymentId}`
  );
  const data = await response.json();
  return data;
};

// Fetch Payment using query parameters
const fetchPaymentByQuery = async (orderId, cfPaymentId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-order-fetch-payment?order_id=${orderId}&cf_payment_id=${cfPaymentId}`
  );
  const data = await response.json();
  return data;
};

// Usage example
try {
  const paymentData = await fetchPaymentByPath('order_123', '12376123');
  if (paymentData.success) {
    console.log('Payment Status:', paymentData.data.payment_status);
    console.log('Payment Amount:', paymentData.data.payment_amount);
    console.log('Payment Method:', paymentData.data.payment_method);
    console.log('Bank Reference:', paymentData.data.bank_reference);
  } else {
    console.error('Error:', paymentData.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### React Component Example

```javascript
import { useState, useEffect } from 'react';

const PaymentDetails = ({ orderId, paymentId }) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId || !paymentId) return;

    const fetchPayment = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `https://your-project.supabase.co/functions/v1/pg-order-fetch-payment/${orderId}/${paymentId}`
        );
        const data = await response.json();
        
        if (data.success) {
          setPayment(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch payment details');
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [orderId, paymentId]);

  if (loading) return <div>Loading payment details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!payment) return <div>No payment data</div>;

  return (
    <div className="payment-details">
      <h3>Payment Details</h3>
      <p><strong>Payment ID:</strong> {payment.cf_payment_id}</p>
      <p><strong>Status:</strong> <span className={`status ${payment.payment_status.toLowerCase()}`}>
        {payment.payment_status}
      </span></p>
      <p><strong>Amount:</strong> ₹{payment.payment_amount}</p>
      <p><strong>Payment Group:</strong> {payment.payment_group}</p>
      <p><strong>Bank Reference:</strong> {payment.bank_reference}</p>
      {payment.payment_completion_time && (
        <p><strong>Completed At:</strong> {new Date(payment.payment_completion_time).toLocaleString()}</p>
      )}
    </div>
  );
};
```

### cURL

```bash
# Fetch Payment using path parameters
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payment/order_123/12376123"

# Fetch Payment using query parameters
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payment?order_id=order_123&cf_payment_id=12376123"

# With authentication header (if required)
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payment/order_123/12376123" \
  -H "Authorization: Bearer your-supabase-jwt"
```

## Deployment

```bash
# Deploy this function
supabase functions deploy pg-order-fetch-payment --no-verify-jwt

# Or deploy with import map
supabase functions deploy pg-order-fetch-payment --import-map ./supabase/functions/import_map.json --no-verify-jwt
```

## Error Handling

The function returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing order_id or cf_payment_id)
- `404`: Payment not found
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

1. **Payment Verification**: Verify specific payment details after processing
2. **Transaction Reconciliation**: Match payments with bank records using bank_reference
3. **Customer Support**: Look up specific payment details for support queries
4. **Refund Processing**: Get payment details before initiating refunds
5. **Analytics**: Detailed payment method analysis
6. **Webhook Verification**: Cross-check webhook payment data

## Security Notes

1. Store your Cashfree credentials as Supabase secrets, never in code
2. Use HTTPS endpoints in production
3. Implement proper authentication for your frontend applications
4. Consider rate limiting for public-facing endpoints
5. Validate order_id and cf_payment_id format before making API calls
6. Log payment queries for audit purposes

## Integration with Other Functions

This function works with other payment-related functions:

```javascript
// First get all payments for an order
const paymentsResponse = await fetch('/functions/v1/pg-order-fetch-payments/order_123');
const payments = await paymentsResponse.json();

// Then get details for a specific payment
if (payments.success && payments.data.length > 0) {
  const firstPayment = payments.data[0];
  const paymentDetails = await fetch(
    `/functions/v1/pg-order-fetch-payment/order_123/${firstPayment.cf_payment_id}`
  );
  const details = await paymentDetails.json();
  console.log('Detailed payment info:', details.data);
}
```
