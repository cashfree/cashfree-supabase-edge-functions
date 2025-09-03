import { serve } from 'http/server.ts';

// CORS headers for handling cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Dynamic import of Cashfree to avoid type issues in Deno
    const { Cashfree } = await import('cashfree-pg');

    // Get environment variables
    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    const environment = Deno.env.get('CASHFREE_ENVIRONMENT') || 'SANDBOX';

    if (!clientId || !clientSecret) {
      throw new Error('Missing Cashfree credentials in environment variables');
    }

    // Initialize Cashfree SDK - try both v5+ and v4 patterns
    let cashfree: unknown;
    try {
      // Try v5+ constructor pattern with proper enum handling
      const env = environment === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
      cashfree = new Cashfree(env as never, clientId, clientSecret);
    } catch {
      // Fallback to v4 global configuration pattern
      const CashfreeConfig = Cashfree as unknown as {
        XClientId: string;
        XClientSecret: string;
        XEnvironment: string;
      };
      CashfreeConfig.XClientId = clientId;
      CashfreeConfig.XClientSecret = clientSecret;
      CashfreeConfig.XEnvironment = environment === 'PRODUCTION'
        ? 'PRODUCTION'
        : 'SANDBOX';
      cashfree = Cashfree;
    }

    if (req.method === 'GET') {
      // Parse URL to get order_id and cf_payment_id
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Expected format: /functions/v1/pg-order-fetch-payment/order_123/payment_456
      // pathParts: ['functions', 'v1', 'pg-order-fetch-payment', 'order_123', 'payment_456']
      let orderId = '';
      let cfPaymentId = '';

      // Look for parameters after 'pg-order-fetch-payment'
      const functionIndex = pathParts.findIndex((part) =>
        part === 'pg-order-fetch-payment'
      );
      if (functionIndex !== -1) {
        orderId = pathParts[functionIndex + 1] || '';
        cfPaymentId = pathParts[functionIndex + 2] || '';
      }

      // If not found in path, try query parameters
      if (!orderId) {
        orderId = url.searchParams.get('order_id') || '';
      }
      if (!cfPaymentId) {
        cfPaymentId = url.searchParams.get('cf_payment_id') || '';
      }

      if (!orderId || !cfPaymentId) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Missing required parameters. Provide order_id and cf_payment_id as path parameters (/pg-order-fetch-payment/order_123/payment_456) or query parameters (?order_id=order_123&cf_payment_id=payment_456)',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Fetch payment using Cashfree SDK - try both v5+ and v4 method patterns
      let response: { data?: unknown };
      try {
        // Try v5+ instance method
        response = await (cashfree as unknown as {
          PGOrderFetchPayment: (
            orderId: string,
            cfPaymentId: string,
          ) => Promise<{ data?: unknown }>;
        }).PGOrderFetchPayment(orderId, cfPaymentId);
      } catch {
        // Try v4 static method with API version
        response = await (cashfree as unknown as {
          PGOrderFetchPayment: (
            version: string,
            orderId: string,
            cfPaymentId: string,
          ) => Promise<{ data?: unknown }>;
        }).PGOrderFetchPayment('2023-08-01', orderId, cfPaymentId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: response.data,
          message: 'Payment details fetched successfully',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Only GET requests are supported.',
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('Error in pg-order-fetch-payment function:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal server error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
