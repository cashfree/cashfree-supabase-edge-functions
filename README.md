# Cashfree Supabase Edge Functions

This repository contains Supabase Edge Functions for Cashfree integration.

## Current Functions

- `pg-create-order`: Cashfree Payment Gateway integration for creating and
  fetching orders
- `pg-fetch-order`: Cashfree Payment Gateway integration for fetching order details by order ID

## Local Development

To run the functions locally, you need to have the Supabase CLI installed:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Start local development
supabase start

# Set up environment variables for Cashfree
supabase secrets set CASHFREE_CLIENT_ID=your_client_id
supabase secrets set CASHFREE_CLIENT_SECRET=your_client_secret
supabase secrets set CASHFREE_ENVIRONMENT=SANDBOX

# Run a specific function locally
supabase functions serve pg-create-order --no-verify-jwt
supabase functions serve pg-fetch-order --no-verify-jwt
```

## Deployment

To deploy the functions to your Supabase project:

```bash
# Deploy a specific function
supabase functions deploy pg-create-order --project-ref your-project-ref
supabase functions deploy pg-fetch-order --project-ref your-project-ref

# Deploy all functions
supabase functions deploy --project-ref your-project-ref
```

## Testing

You can test deployed functions using cURL:

### Create Order
```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/pg-create-order' \
--header 'Content-Type: application/json' \
--data '{"order_amount": 100, "order_currency": "INR", "order_id": "test_123", "customer_details": {"customer_id": "cust_123", "customer_phone": "9999999999"}}'
```

### Fetch Order
```bash
curl -i --location --request GET 'https://your-project-ref.supabase.co/functions/v1/pg-fetch-order/test_123'
```

For functions that require authentication, include the authorization header:

```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/pg-create-order' \
--header 'Authorization: Bearer your-supabase-jwt' \
--header 'Content-Type: application/json' \
--data '{"order_amount": 100, "order_currency": "INR", "order_id": "test_123", "customer_details": {"customer_id": "cust_123", "customer_phone": "9999999999"}}'

curl -i --location --request GET 'https://your-project-ref.supabase.co/functions/v1/pg-fetch-order/test_123' \
--header 'Authorization: Bearer your-supabase-jwt'
```
