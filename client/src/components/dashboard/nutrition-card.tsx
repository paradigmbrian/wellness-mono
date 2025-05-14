import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export function NutritionCard() {
  const { user } = useAuth();
  
  const { data: latestMetric, isLoading } = useQuery({
    queryKey: ["/api/health-metrics/latest"],
    enabled: !!user,
  });
  
  // Targets
  const proteinTarget = 90;
  const carbsTarget = 180;
  const fatsTarget = 60;
  
  // Current values
  const protein = latestMetric?.protein || 0;
  const carbs = latestMetric?.carbs || 0;
  const fats = latestMetric?.fats || 0;
  
  // Progress percentages
  const proteinProgress = Math.min(100, Math.round((protein / proteinTarget) * 100));
  const carbsProgress = Math.min(100, Math.round((carbs / carbsTarget) * 100));
  const fatsProgress = Math.min(100, Math.round((fats / fatsTarget) * 100));
  
  // Overall nutrition status
  const totalProgress = (proteinProgress + carbsProgress + fatsProgress) / 3;
  const nutritionStatus = 
    totalProgress >= 80 ? "Good" :
    totalProgress >= 60 ? "Average" : "Below target";
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Nutrition</CardTitle>
              <p className="text-sm text-neutral-500">Today</p>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
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
            <CardTitle className="text-base font-semibold">Nutrition</CardTitle>
            <p className="text-sm text-neutral-500">Today</p>
          </div>
          <Badge 
            variant={nutritionStatus === "Good" ? "success" : nutritionStatus === "Average" ? "warning" : "outline"} 
            className="font-normal"
          >
            {nutritionStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Protein</span>
              <span className="font-medium">{protein}g / {proteinTarget}g</span>
            </div>
            <Progress value={proteinProgress} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Carbs</span>
              <span className="font-medium">{carbs}g / {carbsTarget}g</span>
            </div>
            <Progress value={carbsProgress} className="h-2" color="accent" />
          </div>
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Fats</span>
              <span className="font-medium">{fats}g / {fatsTarget}g</span>
            </div>
            <Progress value={fatsProgress} className="h-2" color="secondary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
