require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(bodyParser.json());
app.use(cors());

// In-memory database for sellers and payments
const db = {
  sellers: [],
  payments: [],
};

// 📌 Create a seller account
app.post("/api/sellers", async (req, res) => {
  const { name, email } = req.body;

  try {
    // Create a Stripe Connect account for the seller
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Save the seller in the database
    const seller = { id: db.sellers.length + 1, name, email, stripeAccountId: account.id };
    db.sellers.push(seller);

    res.status(201).json({ success: true, seller });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📌 Fetch a seller by ID
app.get("/api/sellers/:id", async (req, res) => {
  const sellerId = parseInt(req.params.id);

  try {
    const seller = db.sellers.find((s) => s.id === sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    res.status(200).json({ success: true, seller });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/attach-payment-method", async (req, res) => {
  const { paymentMethodId, sellerStripeAccountId, name, email, phone } = req.body;

  try {
    // Step 1: Create a Customer in the connected account
    const customer = await stripe.customers.create(
      {
        email,
        name,
        phone,
        payment_method: paymentMethodId,
      },
      { stripeAccount: sellerStripeAccountId } // ✅ Correct way to pass stripeAccount
    );

    res.status(200).json({ success: true, customerId: customer.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 📌 Create a payment for a specific seller (with correct PaymentMethod handling)
app.post("/api/payment", async (req, res) => {
  const { paymentMethodId, sellerStripeAccountId, name, email, phone, address } = req.body;

  try {
    // Step 1: Retrieve or create a Customer in the connected account
    const customers = await stripe.customers.list({ email }, { stripeAccount: sellerStripeAccountId });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0]; // Use existing customer
    } else {
      customer = await stripe.customers.create(
        {
          email,
          name,
          phone,
          payment_method: paymentMethodId,
        },
        { stripeAccount: sellerStripeAccountId }
      );
    }

    // Step 2: Create PaymentIntent for seller
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: 5000, // $50 in cents
        currency: "usd",
        customer: customer.id,
        payment_method: paymentMethodId,
        confirm: true,
        receipt_email: email,
        metadata: { name, phone, address },
        application_fee_amount: 500, // Platform fee
        transfer_data: { destination: sellerStripeAccountId },
      },
      { stripeAccount: sellerStripeAccountId }
    );

    db.payments.push({
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      sellerStripeAccountId,
      status: paymentIntent.status,
    });

    res.status(200).json({ success: true, paymentIntent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 📌 Webhook for Payment Confirmation
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      const payment = db.payments.find((p) => p.paymentIntentId === paymentIntent.id);
      if (payment) {
        payment.status = "succeeded";
      }
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
