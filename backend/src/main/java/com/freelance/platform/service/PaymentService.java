package com.freelance.platform.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.json.JSONObject;

import java.math.BigDecimal;

@Service
public class PaymentService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    public Order createOrder(BigDecimal amountInRupees) throws RazorpayException {
        if (keyId == null || keyId.isEmpty() || keySecret == null || keySecret.isEmpty()) {
            throw new IllegalStateException("Razorpay keys are not configured properly.");
        }
        JSONObject orderRequest = new JSONObject();
        long amountInPaise = amountInRupees.multiply(new BigDecimal(100)).longValue();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "txn_" + System.currentTimeMillis());

        if ("rzp_test_mock".equals(keyId)) {
            orderRequest.put("id", "order_mock_" + System.currentTimeMillis());
            orderRequest.put("status", "created");
            return new Order(orderRequest);
        }

        RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
        return razorpay.orders.create(orderRequest);
    }

    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (keySecret == null || keySecret.isEmpty()) {
            return false;
        }
        if ("rzp_test_mock".equals(keyId)) {
            return true;
        }
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(options, keySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }
}
