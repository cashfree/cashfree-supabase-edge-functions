// Supabase Edge Function: pg-create-order
// Creates an order record and initializes a Cashfree sandbox payment session
// Uses secrets: CASHFREE_APP_ID, CASHFREE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: corsHeaders,
        });
    }
    const cfAppId = Deno.env.get("CASHFREE_APP_ID");
    const cfSecret = Deno.env.get("CASHFREE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cfEnv = Deno.env.get("CASHFREE_ENVIRONMENT");
    let cfUrl = "https://api.cashfree.com/pg/orders";
    if (!!cfEnv && cfEnv.toLowerCase() == "sandbox") {
        cfUrl = "https://sandbox.cashfree.com/pg/orders";
    }
    if (!supabaseUrl || !serviceRoleKey) {
        return json({
            success: false,
            error: "Supabase configuration is missing",
        }, 500);
    }
    if (!cfAppId || !cfSecret) {
        return json({
            success: false,
            error: "Missing Cashfree credentials in environment variables",
        }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
        },
    });
    try {
        const body = await req.json();
        if (
            !body || typeof body.orderAmount !== "number" ||
            body.orderAmount <= 0
        ) {
            return json({
                success: false,
                error: "Invalid amount",
            }, 400);
        }
        const currency = body.orderCurrency || "INR";
        const returnUrl = body.returnUrl || "";
        // 1) Create order in DB (service role bypasses RLS)
        const { data: orderRow, error: orderErr } = await supabase.from(
            "orders",
        ).insert({
            total_amount: body.orderAmount,
            status: "pending",
            return_url: returnUrl,
        }).select("id").single();
        if (orderErr || !orderRow) {
            console.error("DB order insert error:", orderErr);
            return json({
                success: false,
                error: "Failed to create order",
            }, 500);
        }
        const orderId = orderRow.id;
        // 2) Insert order items if provided
        if (Array.isArray(body.orderItems) && body.orderItems.length > 0) {
            const items = body.orderItems.map((it) => ({
                order_id: orderId,
                product_id: it.product_id,
                quantity: it.quantity,
                price: it.price,
            }));
            const { error: itemsErr } = await supabase.from("order_items")
                .insert(items);
            if (itemsErr) {
                console.error("DB order_items insert error:", itemsErr);
                // Not a fatal error for payment, but log it. We continue.
            }
        }
        // 3) Create Cashfree order - Using 2025 API
        const cfPayload = {
            order_id: orderId,
            order_amount: body.orderAmount,
            order_currency: currency,
            customer_details: {
                customer_id: body.customerDetails?.customerId || orderId,
                customer_phone: body.customerDetails?.customerPhone ||
                    "9999999999",
                customer_email: body.customerDetails?.customerEmail ||
                    "test@example.com",
                customer_name: body.customerDetails?.customerName ||
                    "Test Customer",
            },
            order_meta: {
                return_url: returnUrl
                    ? `${returnUrl}?order_id=${orderId}`
                    : undefined,
            },
            order_note: "Order from e-commerce checkout",
        };
        const cfRes = await fetch(cfUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-client-id": cfAppId,
                "x-client-secret": cfSecret,
                "x-api-version": "2025-01-01",
            },
            body: JSON.stringify(cfPayload),
        });
        let cfData;
        const responseText = await cfRes.text();
        try {
            cfData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Cashfree response as JSON:", e);
            cfData = {
                error: "Invalid JSON response",
                raw: responseText,
            };
        }
        if (!cfRes.ok) {
            await supabase.from("orders").update({
                status: "failed",
            }).eq("id", orderId);
            return json({
                success: false,
                error: cfData?.message || cfData?.error_description ||
                    `Cashfree API Error: ${cfRes.status} ${cfRes.statusText}`,
                details: {
                    status: cfRes.status,
                    statusText: cfRes.statusText,
                    response: cfData,
                },
            }, 500);
        }
        // Extract response data
        const cashfreeOrderId = cfData?.order_id;
        const paymentSessionId = cfData?.payment_session_id;
        // 4) Update order with payment refs
        const { error: updErr } = await supabase.from("orders").update({
            status: "created",
            cashfree_order_id: cashfreeOrderId || null,
            payment_session_id: paymentSessionId || null,
        }).eq("id", orderId);
        if (updErr) {
            console.error("DB order update error:", updErr);
        }
        return json({
            success: true,
            order_id: orderId,
            cashfree_order_id: cashfreeOrderId,
            payment_session_id: paymentSessionId,
        }, 200);
    } catch (e) {
        console.error("Unhandled error in pg-create-order:", e);
        return json({
            success: false,
            error: "Unexpected server error",
        }, 500);
    }
});
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
}
