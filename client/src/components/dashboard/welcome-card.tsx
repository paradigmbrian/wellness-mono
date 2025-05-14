import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function WelcomeCard() {
  const { user } = useAuth();
  
  const { data: latestMetric } = useQuery({
    queryKey: ["/api/health-metrics/latest"],
    enabled: !!user,
  });
  
  const { data: connectedServices } = useQuery({
    queryKey: ["/api/connected-services"],
    enabled: !!user,
  });
  
  const appleHealthService = connectedServices?.find(
    (service) => service.serviceName === "apple_health" && service.isConnected
  );
  
  const lastSyncTime = appleHealthService?.lastSynced 
    ? formatDistanceToNow(new Date(appleHealthService.lastSynced), { addSuffix: true })
    : "Never";
  
  const firstName = user?.firstName || "there";
  
  return (
    <div className="mb-6 bg-gradient-to-r from-primary to-primary-dark rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="text-white mb-4 sm:mb-0">
          <h2 className="text-lg font-semibold">Welcome back, {firstName}!</h2>
          <p className="text-primary-light text-sm mt-1">
            Last sync: {appleHealthService ? lastSyncTime : "No devices synced"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {latestMetric && (
              <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-xs">
                <TrendingUp className="h-4 w-4 mr-1" />
                Daily activity on track
              </div>
            )}
            
            <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-xs">
              <Clock className="h-4 w-4 mr-1" />
              {user?.subscriptionStatus === "active" ? "Subscription active" : "Free plan"}
            </div>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <Link href="/health-plan">
            <Button className="w-full sm:w-auto bg-white text-primary font-medium px-5 py-2 rounded-lg shadow-sm hover:bg-opacity-90 transition-colors">
              View Health Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
