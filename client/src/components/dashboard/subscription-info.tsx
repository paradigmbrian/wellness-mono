import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ShieldCheck, Zap } from "lucide-react";

export function SubscriptionInfo() {
  const { user } = useAuth();
  const isLoading = !user;

  const subscriptionTier = user?.subscriptionTier || "free";
  const isSubscribed = user?.subscriptionStatus === "active";
  
  // Determine card gradient based on subscription tier
  const getGradient = () => {
    switch (subscriptionTier) {
      case "premium":
        return "from-accent to-accent-dark";
      case "pro":
        return "from-secondary to-secondary-dark";
      case "basic":
        return "from-primary to-primary-dark";
      default:
        return "from-neutral-600 to-neutral-800";
    }
  };
  
  // Map subscription tier to readable name
  const getSubscriptionName = () => {
    switch (subscriptionTier) {
      case "premium":
        return "Premium Plan";
      case "pro":
        return "Pro Plan";
      case "basic":
        return "Basic Plan";
      default:
        return "Free Plan";
    }
  };
  
  // Subscription tagline
  const getSubscriptionTagline = () => {
    switch (subscriptionTier) {
      case "premium":
        return "Unlock the full potential of your health data";
      case "pro":
        return "You're getting the most out of your health data";
      case "basic":
        return "Enhance your fitness journey with our basic plan";
      default:
        return "Upgrade to get more features and insights";
    }
  };

  return (
    <div className="mb-6">
      <Card className={`bg-gradient-to-r ${getGradient()} rounded-xl overflow-hidden shadow-sm`}>
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="text-white mb-4 md:mb-0">
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-32 bg-white/20 mb-1" />
                <Skeleton className="h-5 w-64 bg-white/20" />
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold flex items-center">
                  {getSubscriptionName()}
                  {isSubscribed && <ShieldCheck className="h-5 w-5 ml-2" />}
                </h2>
                <p className={`text-${subscriptionTier === "free" ? "neutral-300" : subscriptionTier === "premium" ? "accent-light" : subscriptionTier === "pro" ? "secondary-light" : "primary-light"} text-sm mt-1`}>
                  {getSubscriptionTagline()}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <Link href="/subscription">
              <Button className="w-full sm:w-auto bg-white font-medium px-5 py-2 rounded-lg shadow-sm hover:bg-opacity-90 transition-colors text-foreground">
                {isSubscribed ? "Manage Subscription" : "Upgrade Plan"}
              </Button>
            </Link>
            {isSubscribed && (
              <Button className="w-full sm:w-auto bg-white/20 text-white font-medium px-5 py-2 rounded-lg hover:bg-white/30 transition-colors">
                <Zap className="h-4 w-4 mr-2" />
                View Benefits
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
