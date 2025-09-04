import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
console.log("🚀 pg-create-order function loaded at", new Date().toISOString());
// CORS headers for handling cross-origin requests
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};
serve(async (req) => {
    console.log("=== pg-create-order function invoked ===");
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        console.log("Handling CORS preflight request");
        return new Response("ok", {
            headers: corsHeaders,
        });
    }
    try {
        console.log("=== Starting payment order creation ===");
        // Get environment variables with detailed logging
        const clientId = Deno.env.get("CASHFREE_CLIENT_ID");
        const clientSecret = Deno.env.get("CASHFREE_CLIENT_SECRET");
        const environment = Deno.env.get("CASHFREE_ENVIRONMENT") ||
            "PRODUCTION";
        console.log("Environment check:", {
            hasClientId: !!clientId,
            clientIdLength: clientId?.length || 0,
            hasClientSecret: !!clientSecret,
            clientSecretLength: clientSecret?.length || 0,
            environment: environment,
        });
        if (!clientId || !clientSecret) {
            console.error("❌ Missing Cashfree credentials");
            return new Response(
                JSON.stringify({
                    success: false,
                    error:
                        "Missing Cashfree credentials in environment variables",
                    details: {
                        hasClientId: !!clientId,
                        hasClientSecret: !!clientSecret,
                    },
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
        // Parse request body with error handling
        console.log("📝 Parsing request body...");
        let requestBody;
        try {
            requestBody = await req.json();
            console.log(
                "✅ Request body parsed successfully:",
                JSON.stringify(requestBody, null, 2),
            );
        } catch (parseError) {
            console.error("❌ Failed to parse request body:", parseError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Invalid JSON in request body",
                    details: parseError.message,
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                    status: 400,
                },
            );
        }
        const { orderAmount, customerDetails } = requestBody;
        // Validate required fields
        console.log("🔍 Validating required fields...");
        if (!orderAmount || !customerDetails) {
            console.error("❌ Missing required fields:", {
                hasOrderAmount: !!orderAmount,
                hasCustomerDetails: !!customerDetails,
            });
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Order amount and customer details are required",
                    details: {
                        hasOrderAmount: !!orderAmount,
                        hasCustomerDetails: !!customerDetails,
                    },
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                    status: 400,
                },
            );
        }
        if (
            !customerDetails.customerEmail || !customerDetails.customerPhone ||
            !customerDetails.customerName
        ) {
            console.error("❌ Missing customer details:", {
                hasEmail: !!customerDetails.customerEmail,
                hasPhone: !!customerDetails.customerPhone,
                hasName: !!customerDetails.customerName,
            });
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Customer email, phone, and name are required",
                    details: {
                        hasEmail: !!customerDetails.customerEmail,
                        hasPhone: !!customerDetails.customerPhone,
                        hasName: !!customerDetails.customerName,
                        receivedData: customerDetails,
                    },
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                    status: 400,
                },
            );
        }
        // Generate unique order ID
        const orderId = `order_${Date.now()}_${
            Math.random().toString(36).substr(2, 9)
        }`;
        // Generate valid customer ID (alphanumeric + underscores/hyphens only)
        const customerId = `customer_${Date.now()}_${
            Math.random().toString(36).substr(2, 6)
        }`;
        // Prepare payment payload
        const paymentPayload = {
            order_id: orderId,
            order_amount: parseFloat(orderAmount),
            order_currency: "INR",
            customer_details: {
                customer_id: customerId,
                customer_email: customerDetails.customerEmail,
                customer_phone: customerDetails.customerPhone,
                customer_name: customerDetails.customerName,
            },
        };
        console.log("Creating payment order:", paymentPayload);
        // Determine API URL based on environment
        const apiUrl = environment === "PRODUCTION"
            ? "https://api.cashfree.com/pg/orders"
            : "https://sandbox.cashfree.com/pg/orders";
        console.log("Making API request to Cashfree:", {
            url: apiUrl,
            environment,
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
        });
        // Make request to Cashfree API
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-version": "2023-08-01",
                "x-client-id": clientId,
                "x-client-secret": clientSecret,
            },
            body: JSON.stringify(paymentPayload),
        });
        console.log("Cashfree API response status:", response.status);
        console.log(
            "Cashfree API response headers:",
            Object.fromEntries(response.headers.entries()),
        );
        let responseData;
        const responseText = await response.text();
        console.log("Cashfree API raw response:", responseText);
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(
                "Failed to parse Cashfree response as JSON:",
                parseError,
            );
            throw new Error(
                `Invalid JSON response from Cashfree: ${responseText}`,
            );
        }
        console.log(
            "Cashfree API parsed response:",
            JSON.stringify(responseData, null, 2),
        );
        if (!response.ok) {
            console.error("Cashfree API error details:", {
                status: response.status,
                statusText: response.statusText,
                responseData: responseData,
            });
            // Return detailed error information
            const errorMessage = responseData?.message ||
                responseData?.error_description ||
                responseData?.errors?.[0]?.message ||
                `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(`Cashfree API Error: ${errorMessage}`);
        }
        console.log("Payment order created successfully:", responseData);
        // Return success response
        return new Response(
            JSON.stringify({
                success: true,
                orderId: responseData.order_id,
                paymentSessionId: responseData.payment_session_id,
                orderAmount: responseData.order_amount,
                orderCurrency: responseData.order_currency,
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
                status: 200,
            },
        );
    } catch (error) {
        console.error("💥 Payment order creation error details:", {
            errorName: error?.name,
            errorMessage: error?.message,
            errorStack: error?.stack,
            timestamp: new Date().toISOString(),
        });
        // Always return a detailed error response
        return new Response(
            JSON.stringify({
                success: false,
                error: error?.message || "Unknown error occurred",
                errorType: error?.name || "UnknownError",
                timestamp: new Date().toISOString(),
                debug: true,
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
