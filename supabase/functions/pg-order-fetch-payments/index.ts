import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// CORS headers for handling cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    // Get environment variables
    const clientId = Deno.env.get("CASHFREE_CLIENT_ID");
    const clientSecret = Deno.env.get("CASHFREE_CLIENT_SECRET");
    const environment = Deno.env.get("CASHFREE_ENVIRONMENT") || "PRODUCTION";
    if (!clientId || !clientSecret) {
      throw new Error("Missing Cashfree credentials in environment variables");
    }
    // Parse request body to get order ID
    const requestBody = await req.json();
    const { orderId } = requestBody;
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    // Determine API URL based on environment
    const apiUrl = environment === "PRODUCTION"
      ? `https://api.cashfree.com/pg/orders/${orderId}/payments`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}/payments`;
    // Make request to Cashfree API
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
    });
    const paymentsData = await response.json();
    if (!response.ok) {
      console.error("Cashfree API error:", paymentsData);
      throw new Error(
        paymentsData.message || "Failed to fetch payment details",
      );
    }
    // Return success response
    const responseData = {
      success: true,
      payments: paymentsData,
    };
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Payments fetch error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Failed to fetch payment details",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});
