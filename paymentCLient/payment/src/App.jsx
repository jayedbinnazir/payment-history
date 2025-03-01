import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutForm from "./components/CheckoutForm";
import SuccessPage from "./components/SuccessPage";
import ErrorPage from "./components/ErrorPage";

// Load Stripe public key
// const stripePromise = loadStripe("pk_test_51QrtufChQ6de35ikc8rqZzrkkIekAgVi1l8OxuAM8LCytDFcOUoXoTYcCLfPSEeegjwsuxBFu3HY9V30HY7ypo7900dCQdhRjP"); bag-server
// const stripePromise = loadStripe("pk_test_51QrtufChQ6de35ikc8rqZzrkkIekAgVi1l8OxuAM8LCytDFcOUoXoTYcCLfPSEeegjwsuxBFu3HY9V30HY7ypo7900dCQdhRjP");
const stripePromise = loadStripe("pk_test_51Qu97XLRxtgMcWu6qxoeucMQtaSpMDxhAei9LKbwpXCqeNIf1Kna2UIXfKZ7AifCpuuKvZqV3OUNJUbmzs6eCuuM00iJiOsgCZ");

function App() {
  return (
    <Router>
      <Routes>
        {/* Checkout page with Stripe Elements */}
        <Route
          path="/"
          element={
            <Elements stripe={stripePromise}>
              <CheckoutForm />
            </Elements>
          }
        />

        {/* Success page */}
        <Route path="/success" element={<SuccessPage />} />

        {/* Error page */}
        <Route path="/error" element={<ErrorPage />} />
      </Routes>
    </Router>
  );
}

export default App;