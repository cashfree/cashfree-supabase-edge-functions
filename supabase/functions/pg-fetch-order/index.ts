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
    // Get environment variables
    const clientId = Deno.env.get('CASHFREE_CLIENT_ID');
    const clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    const environment = Deno.env.get('CASHFREE_ENVIRONMENT') || 'SANDBOX';

    if (!clientId || !clientSecret) {
      throw new Error('Missing Cashfree credentials in environment variables');
    }

    // Set Cashfree API base URL based on environment
    const baseUrl = environment === 'PRODUCTION'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

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

      // Fetch order using Cashfree API direct HTTP call
      const apiUrl = `${baseUrl}/pg/orders/${orderId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Cashfree API error: ${response.status} - ${errorData.message || 'Unknown error'}`
        );
      }

      const orderData = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          data: orderData,
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
