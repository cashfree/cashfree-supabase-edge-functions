# Cashfree Payment Gateway - Fetch All Payments Edge Function

This Supabase Edge Function integrates with Cashfree Payment Gateway to fetch
all payment details for a specific order using their SDK.

## Features

- Fetch all payments for a specific order
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

### GET /functions/v1/pg-order-fetch-payments/{order_id}

### GET /functions/v1/pg-order-fetch-payments?order_id={order_id}

Fetches all payment details for a specific order.

**Path Parameter:**

- `order_id`: The unique identifier of the order

**Query Parameter (alternative):**

- `order_id`: The unique identifier of the order

**Response:**

```json
{
  "success": true,
  "data": [
    {
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
    {
      "cf_payment_id": 12376124,
      "order_id": "order_8123",
      "entity": "payment",
      "payment_currency": "INR",
      "error_details": {
        "error_code": "TRANSACTION_DECLINED",
        "error_description": "issuer bank or payment service provider declined the transaction",
        "error_reason": "auth_declined",
        "error_source": "customer"
      },
      "order_amount": 10.01,
      "is_captured": true,
      "payment_group": "credit_card",
      "authorization": null,
      "payment_method": {
        "card": {
          "channel": "link",
          "card_number": "xxxxxx1111"
        }
      },
      "payment_amount": 10.01,
      "payment_time": "2021-07-23T12:15:06+05:30",
      "payment_completion_time": "2021-07-23T12:18:59+05:30",
      "payment_status": "FAILED",
      "payment_message": "Transaction failed",
      "bank_reference": "P78112898712",
      "auth_id": "A898101"
    }
  ],
  "message": "Payments fetched successfully"
}
```

## Payment Status Values

Each payment in the response can have the following `payment_status` values:

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
// Fetch all payments using path parameter
const fetchPaymentsByPath = async (orderId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-order-fetch-payments/${orderId}`,
  );
  const data = await response.json();
  return data;
};

// Fetch all payments using query parameter
const fetchPaymentsByQuery = async (orderId) => {
  const response = await fetch(
    `https://your-project.supabase.co/functions/v1/pg-order-fetch-payments?order_id=${orderId}`,
  );
  const data = await response.json();
  return data;
};

// Usage example with analysis
try {
  const paymentsData = await fetchPaymentsByPath('order_123');
  if (paymentsData.success) {
    const payments = paymentsData.data;

    // Analyze payment attempts
    const successfulPayments = payments.filter((p) =>
      p.payment_status === 'SUCCESS'
    );
    const failedPayments = payments.filter((p) =>
      p.payment_status === 'FAILED'
    );
    const pendingPayments = payments.filter((p) =>
      p.payment_status === 'PENDING'
    );

    console.log(`Total payment attempts: ${payments.length}`);
    console.log(`Successful: ${successfulPayments.length}`);
    console.log(`Failed: ${failedPayments.length}`);
    console.log(`Pending: ${pendingPayments.length}`);

    // Get payment methods used
    const paymentMethods = payments.map((p) => p.payment_group);
    console.log('Payment methods used:', [...new Set(paymentMethods)]);

    // Calculate total successful amount
    const totalSuccessAmount = successfulPayments.reduce(
      (sum, p) => sum + p.payment_amount,
      0,
    );
    console.log(`Total successful payment amount: ₹${totalSuccessAmount}`);
  } else {
    console.error('Error:', paymentsData.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### React Component for Payment History

```javascript
import { useEffect, useState } from 'react';

const PaymentHistory = ({ orderId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://your-project.supabase.co/functions/v1/pg-order-fetch-payments/${orderId}`,
        );
        const data = await response.json();

        if (data.success) {
          setPayments(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to fetch payment history');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [orderId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'green';
      case 'FAILED':
        return 'red';
      case 'PENDING':
        return 'orange';
      default:
        return 'gray';
    }
  };

  if (loading) return <div>Loading payment history...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className='payment-history'>
      <h3>Payment History for Order: {orderId}</h3>
      {payments.length === 0
        ? <p>No payments found for this order.</p>
        : (
          <div className='payments-list'>
            {payments.map((payment, index) => (
              <div key={payment.cf_payment_id} className='payment-item'>
                <div className='payment-header'>
                  <span className='payment-id'>
                    Payment #{payment.cf_payment_id}
                  </span>
                  <span
                    className='payment-status'
                    style={{ color: getStatusColor(payment.payment_status) }}
                  >
                    {payment.payment_status}
                  </span>
                </div>
                <div className='payment-details'>
                  <p>
                    <strong>Amount:</strong> ₹{payment.payment_amount}
                  </p>
                  <p>
                    <strong>Method:</strong> {payment.payment_group}
                  </p>
                  <p>
                    <strong>Time:</strong>{' '}
                    {new Date(payment.payment_time).toLocaleString()}
                  </p>
                  {payment.bank_reference && (
                    <p>
                      <strong>Bank Reference:</strong> {payment.bank_reference}
                    </p>
                  )}
                  {payment.payment_message && (
                    <p>
                      <strong>Message:</strong> {payment.payment_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
```

### Payment Analytics Hook

```javascript
import { useEffect, useState } from 'react';

const usePaymentAnalytics = (orderId) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchAndAnalyze = async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `https://your-project.supabase.co/functions/v1/pg-order-fetch-payments/${orderId}`,
        );
        const data = await response.json();

        if (data.success) {
          const payments = data.data;

          const analytics = {
            totalAttempts: payments.length,
            successfulPayments: payments.filter((p) =>
              p.payment_status === 'SUCCESS'
            ).length,
            failedPayments: payments.filter((p) =>
              p.payment_status === 'FAILED'
            ).length,
            pendingPayments: payments.filter((p) =>
              p.payment_status === 'PENDING'
            ).length,
            totalSuccessAmount: payments
              .filter((p) => p.payment_status === 'SUCCESS')
              .reduce((sum, p) => sum + p.payment_amount, 0),
            paymentMethods: [...new Set(payments.map((p) => p.payment_group))],
            lastAttemptTime: payments.length > 0
              ? Math.max(
                ...payments.map((p) => new Date(p.payment_time).getTime()),
              )
              : null,
            averageAttemptTime: payments.length > 0
              ? payments.map((p) => new Date(p.payment_time).getTime()).reduce(
                (a, b) => a + b,
                0,
              ) / payments.length
              : null,
          };

          setAnalytics(analytics);
        }
      } catch (error) {
        console.error('Analytics fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyze();
  }, [orderId]);

  return { analytics, loading };
};
```

### cURL

```bash
# Fetch all payments using path parameter
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payments/order_123"

# Fetch all payments using query parameter
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payments?order_id=order_123"

# With authentication header (if required)
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payments/order_123" \
  -H "Authorization: Bearer your-supabase-jwt"

# Get only successful payments (using jq for filtering)
curl "https://your-project.supabase.co/functions/v1/pg-order-fetch-payments/order_123" | \
  jq '.data[] | select(.payment_status == "SUCCESS")'
```

## Deployment

```bash
# Deploy this function
supabase functions deploy pg-order-fetch-payments --no-verify-jwt

# Or deploy with import map
supabase functions deploy pg-order-fetch-payments --import-map ./supabase/functions/import_map.json --no-verify-jwt
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

1. **Payment History Display**: Show all payment attempts to customers
2. **Reconciliation**: Match multiple payment attempts with bank records
3. **Analytics**: Analyze payment success rates and method preferences
4. **Customer Support**: Comprehensive payment troubleshooting
5. **Retry Logic**: Identify failed payments for retry mechanisms
6. **Fraud Detection**: Analyze payment patterns for suspicious activity
7. **Commission Calculation**: Calculate fees based on successful payments

## Security Notes

1. Store your Cashfree credentials as Supabase secrets, never in code
2. Use HTTPS endpoints in production
3. Implement proper authentication for your frontend applications
4. Consider rate limiting for public-facing endpoints
5. Validate order_id format before making API calls
6. Log payment queries for audit purposes
7. Filter sensitive payment data before displaying to end users

## Integration with Other Functions

This function works great with other payment-related functions:

```javascript
// Get all payments for an order
const paymentsResponse = await fetch(
  '/functions/v1/pg-order-fetch-payments/order_123',
);
const paymentsData = await paymentsResponse.json();

if (paymentsData.success) {
  // Get details for each successful payment
  const successfulPayments = paymentsData.data.filter((p) =>
    p.payment_status === 'SUCCESS'
  );

  for (const payment of successfulPayments) {
    const detailResponse = await fetch(
      `/functions/v1/pg-order-fetch-payment/order_123/${payment.cf_payment_id}`,
    );
    const details = await detailResponse.json();
    console.log(
      `Detailed info for payment ${payment.cf_payment_id}:`,
      details.data,
    );
  }
}

// Get order details
const orderResponse = await fetch('/functions/v1/pg-fetch-order/order_123');
const orderData = await orderResponse.json();

console.log('Order details:', orderData.data);
console.log('Payment attempts:', paymentsData.data.length);
```
