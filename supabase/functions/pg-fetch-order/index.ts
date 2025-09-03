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
      // Get order_id from URL path or query parameters
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean); // Remove empty strings

      // Expected path: /functions/v1/pg-fetch-order/order_123
      // pathParts: ['functions', 'v1', 'pg-fetch-order', 'order_123']
      let orderId = '';

      // Look for order_id in path (should be after 'pg-fetch-order')
      const functionIndex = pathParts.findIndex((part) =>
        part === 'pg-fetch-order'
      );
      if (functionIndex !== -1 && pathParts[functionIndex + 1]) {
        orderId = pathParts[functionIndex + 1];
      }

      // If not found in path, try query parameter
      if (!orderId) {
        orderId = url.searchParams.get('order_id') || '';
      }

      if (!orderId) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'Missing order_id. Provide it as path parameter (/pg-fetch-order/order_123) or query parameter (?order_id=order_123)',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Fetch order using Cashfree SDK - try both v5+ and v4 method patterns
      let response: { data?: unknown };
      try {
        // Try v5+ instance method
        response = await (cashfree as unknown as {
          PGFetchOrder: (orderId: string) => Promise<{ data?: unknown }>;
        }).PGFetchOrder(orderId);
      } catch {
        // Try v4 static method with API version
        response = await (cashfree as unknown as {
          PGFetchOrder: (
            version: string,
            orderId: string,
          ) => Promise<{ data?: unknown }>;
        }).PGFetchOrder('2023-08-01', orderId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: response.data,
          message: 'Order fetched successfully',
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
    console.error('Error in pg-fetch-order function:', error);

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
