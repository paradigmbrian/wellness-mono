import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, subMonths } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type TimeRange = "30days" | "3months" | "6months";

export function HealthTrends() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [showWeight, setShowWeight] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showSleep, setShowSleep] = useState(true);

  // Calculate date range based on selected time range
  const getDateRange = () => {
    const endDate = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "3months":
        startDate = subMonths(endDate, 3);
        break;
      case "6months":
        startDate = subMonths(endDate, 6);
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/health-metrics", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/health-metrics?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch health metrics");
      return response.json();
    },
    enabled: !!user,
  });

  // Transform data for chart
  const chartData = metrics?.map((metric: any) => ({
    date: format(new Date(metric.date), "MMM dd"),
    weight: metric.weight,
    steps: metric.steps / 100, // Scale down steps for better visualization
    sleep: metric.sleepDuration / 60, // Convert to hours
    restingHR: metric.restingHeartRate,
  })) || [];

  // Calculate averages
  const calculateAverages = () => {
    if (!metrics || metrics.length === 0) return null;

    const totals = metrics.reduce(
      (acc: any, metric: any) => ({
        weight: acc.weight + (metric.weight || 0),
        steps: acc.steps + (metric.steps || 0),
        sleep: acc.sleep + (metric.sleepDuration || 0),
        restingHR: acc.restingHR + (metric.restingHeartRate || 0),
        count: acc.count + 1,
      }),
      { weight: 0, steps: 0, sleep: 0, restingHR: 0, count: 0 }
    );

    return {
      avgWeight: totals.count > 0 ? (totals.weight / totals.count).toFixed(1) : "N/A",
      avgSteps: totals.count > 0 ? Math.round(totals.steps / totals.count) : "N/A",
      avgSleep: totals.count > 0 ? (totals.sleep / totals.count / 60).toFixed(1) : "N/A", // Convert to hours
      avgRestingHR: totals.count > 0 ? Math.round(totals.restingHR / totals.count) : "N/A",
    };
  };

  const averages = calculateAverages();

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-neutral-800 mb-4">Health Trends</h2>
      <Card>
        <CardHeader className="border-b border-neutral-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant={timeRange === "30days" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("30days")}
              >
                Last 30 Days
              </Button>
              <Button
                variant={timeRange === "3months" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("3months")}
              >
                3 Months
              </Button>
              <Button
                variant={timeRange === "6months" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("6months")}
              >
                6 Months
              </Button>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weight"
                  checked={showWeight}
                  onCheckedChange={(checked) => setShowWeight(!!checked)}
                />
                <Label htmlFor="weight" className="text-sm cursor-pointer">
                  Weight
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activity"
                  checked={showActivity}
                  onCheckedChange={(checked) => setShowActivity(!!checked)}
                />
                <Label htmlFor="activity" className="text-sm cursor-pointer">
                  Activity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sleep"
                  checked={showSleep}
                  onCheckedChange={(checked) => setShowSleep(!!checked)}
                />
                <Label htmlFor="sleep" className="text-sm cursor-pointer">
                  Sleep
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {isLoading ? (
            <div className="h-[300px] w-full flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {showWeight && (
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      name="Weight (lbs)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showActivity && (
                    <Line
                      type="monotone"
                      dataKey="steps"
                      stroke="hsl(var(--secondary))"
                      name="Steps (x100)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showSleep && (
                    <Line
                      type="monotone"
                      dataKey="sleep"
                      stroke="hsl(var(--accent))"
                      name="Sleep (hours)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <div className="border border-neutral-100 rounded-lg p-3">
              <div className="text-sm text-neutral-500 mb-1">Avg. Weight</div>
              <div className="flex items-baseline">
                <span className="text-lg font-semibold text-neutral-800">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : averages?.avgWeight}
                </span>
                <span className="ml-1 text-sm text-neutral-500">lbs</span>
                {!isLoading && <span className="ml-2 text-xs text-success">▲ 0.3</span>}
              </div>
            </div>
            <div className="border border-neutral-100 rounded-lg p-3">
              <div className="text-sm text-neutral-500 mb-1">Avg. Steps</div>
              <div className="flex items-baseline">
                <span className="text-lg font-semibold text-neutral-800">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : averages?.avgSteps.toLocaleString()}
                </span>
                {!isLoading && <span className="ml-2 text-xs text-success">▲ 6%</span>}
              </div>
            </div>
            <div className="border border-neutral-100 rounded-lg p-3">
              <div className="text-sm text-neutral-500 mb-1">Avg. Sleep</div>
              <div className="flex items-baseline">
                <span className="text-lg font-semibold text-neutral-800">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : averages?.avgSleep}
                </span>
                <span className="ml-1 text-sm text-neutral-500">hours</span>
                {!isLoading && <span className="ml-2 text-xs text-warning">▼ 3%</span>}
              </div>
            </div>
            <div className="border border-neutral-100 rounded-lg p-3">
              <div className="text-sm text-neutral-500 mb-1">Resting HR</div>
              <div className="flex items-baseline">
                <span className="text-lg font-semibold text-neutral-800">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : averages?.avgRestingHR}
                </span>
                <span className="ml-1 text-sm text-neutral-500">bpm</span>
                {!isLoading && <span className="ml-2 text-xs text-success">▼ 2</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
