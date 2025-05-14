import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Moon } from "lucide-react";

function formatSleepDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function SleepCard() {
  const { user } = useAuth();
  
  const { data: latestMetric, isLoading } = useQuery({
    queryKey: ["/api/health-metrics/latest"],
    enabled: !!user,
  });
  
  const sleepDuration = latestMetric?.sleepDuration || 0;
  const deepSleep = latestMetric?.deepSleepDuration || 0;
  const lightSleep = latestMetric?.lightSleepDuration || 0;
  
  const targetSleep = 480; // 8 hours in minutes
  const sleepProgress = Math.round((sleepDuration / targetSleep) * 100);
  const sleepDifference = sleepDuration - targetSleep;
  
  const sleepStatus = 
    sleepDuration >= targetSleep ? "Good" :
    sleepDuration >= targetSleep * 0.85 ? "Improve" : "Low";
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Sleep</CardTitle>
              <p className="text-sm text-neutral-500">Last night</p>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 mb-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-7 w-24 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-full mb-2 rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
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
            <CardTitle className="text-base font-semibold">Sleep</CardTitle>
            <p className="text-sm text-neutral-500">Last night</p>
          </div>
          <Badge 
            variant={sleepStatus === "Good" ? "default" : "warning"} 
            className="font-normal"
          >
            {sleepStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0">
            <Moon className="h-8 w-8 text-secondary" />
          </div>
          <div className="flex-1">
            <span className="text-2xl font-semibold text-neutral-800">
              {formatSleepDuration(sleepDuration)}
            </span>
            <div className={`text-xs ${sleepDifference >= 0 ? 'text-success' : 'text-warning'}`}>
              {sleepDifference >= 0 
                ? `+${formatSleepDuration(sleepDifference)} from target` 
                : `-${formatSleepDuration(Math.abs(sleepDifference))} from target`}
            </div>
          </div>
        </div>
        <Progress value={sleepProgress} className="h-3 mb-2" />
        <div className="flex justify-between mt-2 text-xs text-neutral-500">
          <span>Deep: {formatSleepDuration(deepSleep)}</span>
          <span>Light: {formatSleepDuration(lightSleep)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
