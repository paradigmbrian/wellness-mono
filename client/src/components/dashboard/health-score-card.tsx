import { useQuery } from "@tanstack/react-query";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function calculateHealthScore(metrics: any) {
  if (!metrics || metrics.length === 0) return 70;
  
  // This is a simplified algorithm
  // In a real app, this would be more sophisticated and consider more factors
  let score = 70; // Base score
  
  const latestMetric = metrics[0];
  
  // Adjust for steps (target: 10,000 steps)
  if (latestMetric.steps) {
    score += (latestMetric.steps / 10000) * 5;
  }
  
  // Adjust for sleep (target: 8 hours)
  if (latestMetric.sleepDuration) {
    const sleepHours = latestMetric.sleepDuration / 60;
    const sleepScore = Math.min(5, (sleepHours / 8) * 5);
    score += sleepScore;
  }
  
  // Adjust for heart rate (lower is better in resting)
  if (latestMetric.restingHeartRate) {
    const heartScore = latestMetric.restingHeartRate < 60 ? 5 : 
                      latestMetric.restingHeartRate < 70 ? 4 :
                      latestMetric.restingHeartRate < 80 ? 3 :
                      latestMetric.restingHeartRate < 90 ? 2 : 1;
    score += heartScore;
  }
  
  // Cap at 100
  return Math.min(100, Math.round(score));
}

export function HealthScoreCard() {
  const { user } = useAuth();
  
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/health-metrics"],
    enabled: !!user,
  });
  
  const healthScore = calculateHealthScore(metrics);
  const scoreImprovement = 4; // This would be calculated based on historical data
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center">
          <Skeleton className="h-[100px] w-[100px] rounded-full mb-4" />
          <Skeleton className="h-5 w-[120px] mb-2" />
          <Skeleton className="h-4 w-[180px]" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center">
        <ProgressCircle 
          value={healthScore} 
          max={100} 
          size={100} 
          className="mb-4"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-neutral-800">{healthScore}</span>
            <span className="text-xs text-neutral-500">/ 100</span>
          </div>
        </ProgressCircle>
        <h3 className="font-semibold text-neutral-800">Health Score</h3>
        <p className="text-sm text-neutral-500 text-center mt-1">
          {healthScore < 60 ? "Needs improvement" :
           healthScore < 75 ? "Good" :
           healthScore < 90 ? "Very good" : "Excellent"}
          {scoreImprovement > 0 && `, improving by ${scoreImprovement}% this month`}
        </p>
      </CardContent>
    </Card>
  );
}
