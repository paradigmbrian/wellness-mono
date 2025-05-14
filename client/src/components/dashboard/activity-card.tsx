import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, MapPin, Heart } from "lucide-react";

export function ActivityCard() {
  const { user } = useAuth();
  
  const { data: latestMetric, isLoading } = useQuery({
    queryKey: ["/api/health-metrics/latest"],
    enabled: !!user,
  });
  
  const isOnTrack = latestMetric && latestMetric.steps > 6000;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Activity</CardTitle>
              <p className="text-sm text-neutral-500">Today</p>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Skeleton className="h-10 w-10 rounded-full mx-auto mb-2" />
              <Skeleton className="h-5 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
            <div>
              <Skeleton className="h-10 w-10 rounded-full mx-auto mb-2" />
              <Skeleton className="h-5 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
            <div>
              <Skeleton className="h-10 w-10 rounded-full mx-auto mb-2" />
              <Skeleton className="h-5 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Activity</CardTitle>
            <p className="text-sm text-neutral-500">Today</p>
          </div>
          <Badge variant={isOnTrack ? "default" : "outline"} className="font-normal">
            {isOnTrack ? "On track" : "Below target"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary mx-auto">
              <Flame className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold mt-2">
              {latestMetric?.caloriesBurned?.toLocaleString() || "0"}
            </p>
            <p className="text-xs text-neutral-500">Calories</p>
          </div>
          <div>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary/10 text-secondary mx-auto">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold mt-2">
              {latestMetric?.steps?.toLocaleString() || "0"}
            </p>
            <p className="text-xs text-neutral-500">Steps</p>
          </div>
          <div>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/10 text-accent mx-auto">
              <Heart className="h-5 w-5" />
            </div>
            <p className="text-lg font-semibold mt-2">
              {latestMetric?.restingHeartRate || "0"}
            </p>
            <p className="text-xs text-neutral-500">BPM</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
