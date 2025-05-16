import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { CheckCircle, X, CreditCard, AlertTriangle } from "lucide-react";

// Stripe Elements
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Make sure to call `loadStripe` outside of a component's render to avoid recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_placeholder",
);

function CheckoutForm({ selectedPlan }: { selectedPlan: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription/success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Payment succeeded
      toast({
        title: "Subscription successful",
        description: `You've successfully subscribed to the ${selectedPlan} plan.`,
      });
      navigate("/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-md p-4 bg-neutral-50">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      <div className="bg-neutral-50 p-3 rounded-md border">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Total</span>
          <span className="font-bold">
            {selectedPlan === "basic"
              ? "$9.99"
              : selectedPlan === "pro"
                ? "$19.99"
                : "$29.99"}
            <span className="text-sm font-normal text-neutral-500">
              {" "}
              /month
            </span>
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          By subscribing, you agree to our terms of service. You can cancel
          anytime.
        </p>
      </div>

      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscribe Now
          </div>
        )}
      </Button>
    </form>
  );
}

function SubscriptionPlan({
  paymentCycle,
  name,
  price,
  features,
  isPopular = false,
  isCurrentPlan = false,
  onSelect,
  isSelected,
}: {
  paymentCycle: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSelect: () => void;
  isSelected: boolean;
}) {
  return (
    <Card
      className={`border ${isSelected ? "border-primary ring-2 ring-primary/10" : ""} ${isPopular ? "shadow-md" : ""}`}
    >
      <CardHeader className="pb-3">
        {isPopular && (
          <Badge className="w-fit mb-2 bg-primary">Most Popular</Badge>
        )}
        {isCurrentPlan && (
          <Badge variant="outline" className="w-fit mb-2">
            Current Plan
          </Badge>
        )}
        <CardTitle className="text-xl">{name}</CardTitle>
        <div className="flex items-baseline">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-sm text-neutral-500 ml-1">/month</span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          onClick={onSelect}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan
            ? "Current Plan"
            : isSelected
              ? "Selected"
              : "Select Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string>(
    user?.subscriptionTier || "basic",
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const currentPlan = user?.subscriptionTier || "free";
  const isSubscriptionActive = user?.subscriptionStatus === "active";

  const createSubscription = useMutation({
    mutationFn: async ({
      tier,
      billingPeriod,
    }: {
      tier: string;
      billingPeriod: string;
    }) => {
      const response = await apiRequest("POST", "/api/subscription/create", {
        tier,
        billingPeriod,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error) => {
      toast({
        title: "Error creating subscription",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error cancelling subscription",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
  };

  const handleSubscribe = () => {
    createSubscription.mutate({
      tier: selectedPlan,
      billingPeriod: billingPeriod,
    });
  };

  const handleCancelSubscription = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel your subscription? You'll lose access to premium features.",
      )
    ) {
      cancelSubscription.mutate();
    }
  };

  // Plans data
  const plans = {
    basic: {
      name: "Basic Plan",
      price: "$10",
      features: [
        "Health metrics dashboard",
        "Up to 10 lab result uploads/month",
        "Basic health analytics",
        "Access to AI insights",
        "Email support",
      ],
    },
    pro: {
      name: "Pro Plan",
      price: "$20",
      features: [
        "Everything in Basic",
        "Unlimited lab result uploads",
        "Advanced health analytics",
        "Personalized recommendations",
        "Priority email support",
        "Health trends analysis",
        "Premium AI insights",
        "Advanced data visualization",
      ],
      isPopular: true,
    },
  };

  return (
    <DashboardLayout
      title="Subscription Plans"
      description="Choose the right plan for your health journey"
    >
      {isSubscriptionActive && (
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-primary to-primary-dark rounded-xl overflow-hidden shadow-sm">
            <CardContent className="p-6">
              <div className="text-white">
                <h2 className="text-xl font-semibold">
                  Your Current Subscription
                </h2>
                <p className="text-primary-light text-sm mt-1">
                  You are subscribed to the{" "}
                  {plans[currentPlan as keyof typeof plans]?.name}
                </p>

                {user?.subscriptionExpiresAt && (
                  <p className="text-sm mt-2 text-white/80">
                    Renews on{" "}
                    {format(
                      new Date(user.subscriptionExpiresAt),
                      "MMMM d, yyyy",
                    )}
                  </p>
                )}

                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="bg-white/20 text-white border-white/40 hover:bg-white/30"
                    onClick={handleCancelSubscription}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {clientSecret ? (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <CardDescription>
              Enter your payment details to subscribe to the{" "}
              {plans[selectedPlan as keyof typeof plans]?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm selectedPlan={selectedPlan} />
            </Elements>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex justify-center">
            <Tabs value={billingPeriod} onValueChange={setBillingPeriod}>
              <TabsList>
                <TabsTrigger value="monthly">Monthly Billing</TabsTrigger>
                <TabsTrigger value="annual">
                  Annual Billing (Save 20%)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6 max-w-4xl mx-auto">
            <SubscriptionPlan
              paymentCycle={billingPeriod === "monthly" ? "monthly" : "yearly"}
              name={plans.basic.name}
              price={billingPeriod === "monthly" ? plans.basic.price : "$100"}
              features={plans.basic.features}
              isCurrentPlan={currentPlan === "basic" && isSubscriptionActive}
              onSelect={() => handleSelectPlan("basic")}
              isSelected={selectedPlan === "basic"}
            />

            <SubscriptionPlan
              paymentCycle={billingPeriod === "monthly" ? "monthly" : "yearly"}
              name={plans.pro.name}
              price={billingPeriod === "monthly" ? plans.pro.price : "$120"}
              features={plans.pro.features}
              isPopular={plans.pro.isPopular}
              isCurrentPlan={currentPlan === "pro" && isSubscriptionActive}
              onSelect={() => handleSelectPlan("pro")}
              isSelected={selectedPlan === "pro"}
            />
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleSubscribe}
              disabled={
                createSubscription.isPending ||
                (currentPlan === selectedPlan && isSubscriptionActive)
              }
            >
              {createSubscription.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Processing...
                </div>
              ) : (
                <>
                  Subscribe to {plans[selectedPlan as keyof typeof plans]?.name}
                </>
              )}
            </Button>
          </div>
        </>
      )}

      <div className="mt-12">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Frequently Asked Questions
        </h3>
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                How does the subscription work?
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 text-sm text-neutral-600">
              Our subscription plans are billed either monthly or annually. You
              can cancel anytime, and your subscription will remain active until
              the end of the current billing period.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                Can I change plans later?
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 text-sm text-neutral-600">
              Yes, you can upgrade or downgrade your plan at any time. When
              upgrading, you'll be charged the prorated difference for the
              remainder of your billing cycle.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                How do I cancel my subscription?
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 text-sm text-neutral-600">
              You can cancel your subscription at any time from your account
              settings. Your plan will remain active until the end of your
              current billing period.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                Is there a free trial?
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 text-sm text-neutral-600">
              We offer a 14-day free trial for new users to try our Pro plan. No
              credit card is required for the trial.
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
