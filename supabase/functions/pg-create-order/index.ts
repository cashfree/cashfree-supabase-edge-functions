import { serve } from 'http/server.ts';

// CORS headers for handling cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    if (req.method === 'POST') {
      // Parse request body
      const requestBody = await req.json();

      // Validate required fields
      const {
        order_amount,
        order_currency,
        order_id,
        customer_details,
        order_meta,
      } = requestBody;

      if (!order_amount || !order_currency || !order_id || !customer_details) {
        return new Response(
          JSON.stringify({
            error:
              'Missing required fields: order_amount, order_currency, order_id, customer_details',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Prepare order request
      const orderRequest = {
        order_amount: parseFloat(order_amount.toString()),
        order_currency: order_currency || 'INR',
        order_id: order_id,
        customer_details: {
          customer_id: customer_details.customer_id,
          customer_phone: customer_details.customer_phone,
          customer_email: customer_details.customer_email || undefined,
          customer_name: customer_details.customer_name || undefined,
        },
        order_meta: {
          return_url: order_meta?.return_url ||
            `${req.headers.get('origin')}/payment-success?order_id={order_id}`,
          notify_url: order_meta?.notify_url || undefined,
          payment_methods: order_meta?.payment_methods || undefined,
        },
      };

      // Create order using Cashfree SDK - try both v5+ and v4 method patterns
      let response: { data?: unknown };
      try {
        // Try v5+ instance method
        response =
          await (cashfree as unknown as {
            PGCreateOrder: (req: unknown) => Promise<{ data?: unknown }>;
          }).PGCreateOrder(orderRequest);
      } catch {
        // Try v4 static method with API version
        response =
          await (cashfree as unknown as {
            PGCreateOrder: (
              version: string,
              req: unknown,
            ) => Promise<{ data?: unknown }>;
          }).PGCreateOrder('2023-08-01', orderRequest);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: response.data,
          message: 'Order created successfully',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    } else if (req.method === 'GET') {
      // Get order by order_id from query parameters
      const url = new URL(req.url);
      const orderId = url.searchParams.get('order_id');

      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Missing order_id parameter' }),
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
        response =
          await (cashfree as unknown as {
            PGFetchOrder: (orderId: string) => Promise<{ data?: unknown }>;
          }).PGFetchOrder(orderId);
      } catch {
        // Try v4 static method with API version
        response =
          await (cashfree as unknown as {
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
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('Error in pg-create-order function:', error);

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
