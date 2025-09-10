# Cashfree Supabase Edge Functions

This repository contains Supabase Edge Functions for Cashfree integration.

## Current Functions

- `pg-create-order`: Used to create orders with Cashfree
- `pg-get-order`: Used to fetch the order that was created at Cashfree’s using
  the order_id.

## Local Development

To run the functions locally, you need to have the Supabase CLI installed:

```bash
# Install Supabase CLI using brew
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Start local development
supabase start

# Set up environment variables for Cashfree
supabase secrets set CASHFREE_APP_ID=your_client_id
supabase secrets set CASHFREE_SECRET_KEY=your_client_secret
supabase secrets set CASHFREE_ENVIRONMENT=PRODUCTION
```

## Deployment

To deploy the functions to your Supabase project:

```bash
# Deploy all functions together
supabase functions deploy --project-ref your-project-ref

# Deploy a specific function
supabase functions deploy pg-create-order --project-ref your-project-ref
supabase functions deploy pg-fetch-order --project-ref your-project-ref
supabase functions deploy pg-order-fetch-payment --project-ref your-project-ref
supabase functions deploy pg-order-fetch-payments --project-ref your-project-ref
```

## Testing

You can test deployed functions using cURL:

```bash
# Create order
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/pg-create-order' \
--header 'Content-Type: application/json' \
--data '{
  "orderAmount": 100,
  "orderCurrency": "INR",
  "customerDetails": {
    "customerId": "cust_123",
    "customerPhone": "9999999999"
  },
  "returnUrl": "https://yourdomain.com/payment/return"
}'

# Get order
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/pg-get-order' \
--header 'Content-Type: application/json' \
--data '{
  "order_id": "your_order_id_here"
}'
```
