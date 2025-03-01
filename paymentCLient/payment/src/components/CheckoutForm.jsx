import { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    cardholderName: "",
  });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const cardNumberElement = elements.getElement(CardNumberElement);

    const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardNumberElement,
      billing_details: {
        name: formData.cardholderName,
        email: formData.email,
        phone: formData.phone,
        address: {
          line1: formData.address,
          city: formData.city,
          country: formData.country,
          postal_code: formData.postalCode,
        },
      },
    });

    if (paymentMethodError) {
      setError(paymentMethodError.message);
      setProcessing(false);
      return;
    }

    try {
      const paymentResponse = await fetch("http://localhost:5000/api/v1/user/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "67b6a9b7e2fc6c5afd3f3819", // Replace with actual student ID
          courseId: "67b6c1b1bd72bd4c0e84ab65", // Replace with actual course ID
          paymentMethodId: paymentMethod.id,
          ...formData,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        navigate("/success");
      } else {
        setError(paymentData.error || "Payment failed.");
      }
    } catch (err) {
      setError("An error occurred while processing your payment.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} required />
      <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} required />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
      <input type="text" name="phone" placeholder="Phone" onChange={handleChange} required />
      <input type="text" name="address" placeholder="Address" onChange={handleChange} required />
      <input type="text" name="city" placeholder="City" onChange={handleChange} required />
      <input type="text" name="country" placeholder="Country" onChange={handleChange} required />
      <input type="text" name="postalCode" placeholder="Postal Code" onChange={handleChange} required />
      <CardNumberElement />
      <CardExpiryElement />
      <CardCvcElement />
      <input type="text" name="cardholderName" placeholder="Cardholder Name" onChange={handleChange} required />
      <button type="submit" disabled={processing || !stripe}>
        {processing ? "Processing..." : "Pay Now"}
      </button>
      {error && <p>{error}</p>}
    </form>
  );
};

export default CheckoutForm;