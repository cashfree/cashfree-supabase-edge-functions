// This file handles getting order status from Cashfree and updating our database
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return json({
        error: "Order ID is required",
      }, 400);
    }
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Get Cashfree credentials
    const cashfreeAppId = Deno.env.get("CASHFREE_APP_ID");
    const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY");
    const cfEnv = Deno.env.get("CASHFREE_ENVIRONMENT");
    if (!cashfreeAppId || !cashfreeSecretKey) {
      throw new Error("Cashfree credentials not configured");
    }
    let cashfreeUrl = "https://api.cashfree.com/pg/orders";
    if (!!cfEnv && cfEnv.toLowerCase() == "sandbox") {
      cashfreeUrl = "https://sandbox.cashfree.com/pg/orders";
    }
    // Call Cashfree API to get order status
    const headers = {
      "Content-Type": "application/json",
      "x-client-id": cashfreeAppId,
      "x-client-secret": cashfreeSecretKey,
      "x-api-version": "2025-01-01",
    };
    const response = await fetch(cashfreeUrl, {
      method: "GET",
      headers,
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Cashfree API error: ${response.status} ${response.statusText}`,
      );
    }
    const cashfreeOrder = JSON.parse(responseText);
    // Update order status in our database
    const { error: updateError } = await supabase.from("orders").update({
      status: cashfreeOrder.order_status.toLowerCase(),
    }).eq("id", order_id);
    if (updateError) {
      throw updateError;
    }
    return json({
      success: true,
      order_id: cashfreeOrder.order_id,
      status: cashfreeOrder.order_status,
      amount: cashfreeOrder.order_amount,
      currency: cashfreeOrder.order_currency,
    });
  } catch (error) {
    return json({
      error: "Failed to get order status",
      details: error.message,
    }, 500);
  }
});
