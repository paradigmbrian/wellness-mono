import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Flame, Heart, Plus, Utensils, Watch } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

// Form schema for adding manual activity
const activitySchema = z.object({
  date: z.string().min(1, "Date is required"),
  steps: z.coerce.number().int().min(0).optional(),
  caloriesBurned: z.coerce.number().int().min(0).optional(),
  activeMinutes: z.coerce.number().int().min(0).optional(),
  restingHeartRate: z.coerce.number().int().min(30).max(200).optional(),
  sleepDuration: z.coerce.number().int().min(0).optional(),
  deepSleepDuration: z.coerce.number().int().min(0).optional(),
  lightSleepDuration: z.coerce.number().int().min(0).optional(),
  protein: z.coerce.number().int().min(0).optional(),
  carbs: z.coerce.number().int().min(0).optional(),
  fats: z.coerce.number().int().min(0).optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function Activity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("week");
  
  // Date range state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Calculate date range based on selected tab
  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;
    
    switch(activeTab) {
      case "month":
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
      case "week":
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      default: // day
        startDate = currentDate;
        endDate = currentDate;
    }
    
    return {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };
  };
  
  const { startDate, endDate } = getDateRange();
  
  // Query health metrics based on date range
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/health-metrics", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/health-metrics?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error("Failed to fetch health metrics");
      return response.json();
    },
    enabled: !!user,
  });
  
  // Get latest metrics for today's view
  const { data: latestMetric } = useQuery({
    queryKey: ["/api/health-metrics/latest"],
    enabled: !!user && activeTab === "day",
  });
  
  // Form for adding manual metrics
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      steps: undefined,
      caloriesBurned: undefined,
      activeMinutes: undefined,
      restingHeartRate: undefined,
      sleepDuration: undefined,
      deepSleepDuration: undefined,
      lightSleepDuration: undefined,
      protein: undefined,
      carbs: undefined,
      fats: undefined,
    },
  });
  
  // Add manual activity metrics
  const addActivity = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      // Convert sleep minutes if both sleep durations are provided
      if (data.deepSleepDuration !== undefined && data.lightSleepDuration !== undefined) {
        data.sleepDuration = data.deepSleepDuration + data.lightSleepDuration;
      }
      
      const response = await apiRequest("POST", "/api/health-metrics", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics/latest"] });
      toast({
        title: "Activity added",
        description: "Your health metrics have been successfully recorded.",
      });
      setIsDialogOpen(false);
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ActivityFormValues) => {
    addActivity.mutate(data);
  };
  
  // Navigation between time periods
  const navigatePrevious = () => {
    switch(activeTab) {
      case "month":
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        break;
      case "week":
        setCurrentDate(subDays(currentDate, 7));
        break;
      default: // day
        setCurrentDate(subDays(currentDate, 1));
    }
  };
  
  const navigateNext = () => {
    switch(activeTab) {
      case "month":
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        break;
      case "week":
        setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
        break;
      default: // day
        setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    }
  };
  
  // Format data for charts
  const formatChartData = () => {
    if (!metrics) return [];
    
    return metrics.map((metric: any) => ({
      date: format(new Date(metric.date), "MMM dd"),
      steps: metric.steps,
      calories: metric.caloriesBurned,
      activeMinutes: metric.activeMinutes,
      sleep: metric.sleepDuration ? metric.sleepDuration / 60 : 0, // Convert to hours
      heartRate: metric.restingHeartRate,
      protein: metric.protein,
      carbs: metric.carbs,
      fats: metric.fats,
    }));
  };
  
  const chartData = formatChartData();
  
  // Get the current metric for day view
  const getCurrentMetric = () => {
    if (activeTab !== "day") return null;
    
    if (latestMetric && isSameDay(new Date(latestMetric.date), currentDate)) {
      return latestMetric;
    }
    
    if (metrics && metrics.length > 0) {
      return metrics.find((m: any) => isSameDay(new Date(m.date), currentDate));
    }
    
    return null;
  };
  
  const currentMetric = getCurrentMetric();
  
  // Calculate totals for the current period
  const calculateTotals = () => {
    if (!metrics || metrics.length === 0) return null;
    
    return metrics.reduce(
      (acc: any, metric: any) => ({
        totalSteps: acc.totalSteps + (metric.steps || 0),
        totalCalories: acc.totalCalories + (metric.caloriesBurned || 0),
        totalActiveMinutes: acc.totalActiveMinutes + (metric.activeMinutes || 0),
        avgHeartRate: acc.avgHeartRate + (metric.restingHeartRate || 0),
        avgSleep: acc.avgSleep + (metric.sleepDuration || 0),
        totalProtein: acc.totalProtein + (metric.protein || 0),
        totalCarbs: acc.totalCarbs + (metric.carbs || 0),
        totalFats: acc.totalFats + (metric.fats || 0),
        count: acc.count + 1,
      }),
      {
        totalSteps: 0,
        totalCalories: 0,
        totalActiveMinutes: 0,
        avgHeartRate: 0,
        avgSleep: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        count: 0,
      }
    );
  };
  
  const totals = calculateTotals();
  
  // Period date display
  const periodDisplay = activeTab === "day" 
    ? format(currentDate, "MMMM d, yyyy")
    : activeTab === "week" 
      ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")}`
      : format(currentDate, "MMMM yyyy");

  return (
    <DashboardLayout 
      title="Activity" 
      description="Track and visualize your health and fitness activities"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={navigatePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium min-w-[150px] text-center">
                  {periodDisplay}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={navigateNext}
                  disabled={isSameDay(currentDate, new Date()) && activeTab === "day"}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Health Metrics</DialogTitle>
                      <DialogDescription>
                        Manually record your health and fitness data for the day
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type="date" {...field} max={format(new Date(), "yyyy-MM-dd")} />
                                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="steps"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Steps</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="caloriesBurned"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Calories Burned</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="activeMinutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Active Minutes</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="restingHeartRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Resting Heart Rate (BPM)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="deepSleepDuration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deep Sleep (minutes)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="lightSleepDuration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Light Sleep (minutes)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="protein"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Protein (g)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carbs (g)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="fats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fats (g)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit" disabled={addActivity.isPending}>
                            {addActivity.isPending ? "Saving..." : "Save Metrics"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Day View */}
            <TabsContent value="day" className="mt-0">
              {isLoading ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {Array(4).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6 flex flex-col items-center">
                        <Skeleton className="h-24 w-24 rounded-full mb-4" />
                        <Skeleton className="h-5 w-24 mb-1" />
                        <Skeleton className="h-4 w-36" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : currentMetric ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {/* Steps */}
                  <Card>
                    <CardContent className="p-6 flex flex-col items-center">
                      <ProgressCircle 
                        value={currentMetric.steps || 0} 
                        max={10000} 
                        size={100} 
                        className="mb-4"
                        foreground="hsl(var(--primary))"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-neutral-800">
                            {currentMetric.steps?.toLocaleString() || 0}
                          </span>
                        </div>
                      </ProgressCircle>
                      <h3 className="font-semibold text-neutral-800 flex items-center">
                        <Flame className="h-4 w-4 mr-1 text-primary" />
                        Steps
                      </h3>
                      <p className="text-sm text-neutral-500 text-center mt-1">
                        {currentMetric.steps ? 
                          `${Math.round(currentMetric.steps / 10000 * 100)}% of daily goal` : 
                          "No steps recorded"}
                      </p>
                    </CardContent>
                  </Card>
            
                  {/* Calories */}
                  <Card>
                    <CardContent className="p-6 flex flex-col items-center">
                      <ProgressCircle 
                        value={currentMetric.caloriesBurned || 0} 
                        max={2500} 
                        size={100} 
                        className="mb-4"
                        foreground="hsl(var(--primary))"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-neutral-800">
                            {currentMetric.caloriesBurned?.toLocaleString() || 0}
                          </span>
                        </div>
                      </ProgressCircle>
                      <h3 className="font-semibold text-neutral-800 flex items-center">
                        <Flame className="h-4 w-4 mr-1 text-primary" />
                        Calories
                      </h3>
                      <p className="text-sm text-neutral-500 text-center mt-1">
                        {currentMetric.caloriesBurned ? 
                          `${Math.round(currentMetric.caloriesBurned / 2500 * 100)}% of daily goal` : 
                          "No calories recorded"}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Active Minutes */}
                  <Card>
                    <CardContent className="p-6 flex flex-col items-center">
                      <ProgressCircle 
                        value={currentMetric.activeMinutes || 0} 
                        max={60} 
                        size={100} 
                        className="mb-4"
                        foreground="hsl(var(--primary))"
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-neutral-800">
                            {currentMetric.activeMinutes || 0}
                          </span>
                        </div>
                      </ProgressCircle>
                      <h3 className="font-semibold text-neutral-800 flex items-center">
                        <Watch className="h-4 w-4 mr-1 text-primary" />
                        Active Minutes
                      </h3>
                      <p className="text-sm text-neutral-500 text-center mt-1">
                        {currentMetric.activeMinutes ? 
                          `${Math.round(currentMetric.activeMinutes / 60 * 100)}% of daily goal` : 
                          "No activity recorded"}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Heart Rate */}
                  <Card>
                    <CardContent className="p-6 flex flex-col items-center">
                      <ProgressCircle 
                        value={Math.min(currentMetric.restingHeartRate || 0, 100)} 
                        max={100} 
                        size={100} 
                        className="mb-4"
                        foreground={
                          currentMetric.restingHeartRate && currentMetric.restingHeartRate > 80 
                            ? "hsl(var(--destructive))" 
                            : "hsl(var(--primary))"
                        }
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-neutral-800">
                            {currentMetric.restingHeartRate || "-"}
                          </span>
                          <span className="text-xs text-neutral-500">bpm</span>
                        </div>
                      </ProgressCircle>
                      <h3 className="font-semibold text-neutral-800 flex items-center">
                        <Heart className="h-4 w-4 mr-1 text-primary" />
                        Resting Heart Rate
                      </h3>
                      <p className="text-sm text-neutral-500 text-center mt-1">
                        {currentMetric.restingHeartRate ? 
                          (currentMetric.restingHeartRate < 60 ? "Excellent" : 
                           currentMetric.restingHeartRate < 70 ? "Good" : 
                           currentMetric.restingHeartRate < 80 ? "Average" : "Elevated") : 
                          "No data recorded"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No activity data for {format(currentDate, "MMMM d, yyyy")}</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity Data
                  </Button>
                </div>
              )}
              
              {currentMetric && (
                <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-2">
                  {/* Sleep */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sleep Duration</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center py-4">
                      {currentMetric.sleepDuration ? (
                        <div className="text-center">
                          <div className="flex items-end justify-center mb-4">
                            <span className="text-4xl font-bold text-primary">
                              {Math.floor(currentMetric.sleepDuration / 60)}
                            </span>
                            <span className="text-xl font-medium text-neutral-500 mb-1 ml-1">hrs</span>
                            <span className="text-xl font-medium text-primary ml-2">
                              {currentMetric.sleepDuration % 60}
                            </span>
                            <span className="text-xl font-medium text-neutral-500 mb-1 ml-1">min</span>
                          </div>
                          <div className="flex justify-center space-x-6">
                            {currentMetric.deepSleepDuration && (
                              <div className="text-center">
                                <p className="text-sm text-neutral-500">Deep Sleep</p>
                                <p className="text-xl font-medium">
                                  {Math.floor(currentMetric.deepSleepDuration / 60)}h {currentMetric.deepSleepDuration % 60}m
                                </p>
                              </div>
                            )}
                            {currentMetric.lightSleepDuration && (
                              <div className="text-center">
                                <p className="text-sm text-neutral-500">Light Sleep</p>
                                <p className="text-xl font-medium">
                                  {Math.floor(currentMetric.lightSleepDuration / 60)}h {currentMetric.lightSleepDuration % 60}m
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-neutral-500">No sleep data recorded</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Nutrition */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Nutrition</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center py-4">
                      {(currentMetric.protein || currentMetric.carbs || currentMetric.fats) ? (
                        <div className="flex justify-around w-full">
                          <div className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-bold text-primary">
                                {currentMetric.protein || 0}
                              </span>
                              <span className="text-sm text-neutral-500">g</span>
                            </div>
                            <p className="text-neutral-600 font-medium mt-2 flex items-center justify-center">
                              <Utensils className="h-4 w-4 mr-1" />
                              Protein
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-bold text-primary">
                                {currentMetric.carbs || 0}
                              </span>
                              <span className="text-sm text-neutral-500">g</span>
                            </div>
                            <p className="text-neutral-600 font-medium mt-2 flex items-center justify-center">
                              <Utensils className="h-4 w-4 mr-1" />
                              Carbs
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-bold text-primary">
                                {currentMetric.fats || 0}
                              </span>
                              <span className="text-sm text-neutral-500">g</span>
                            </div>
                            <p className="text-neutral-600 font-medium mt-2 flex items-center justify-center">
                              <Utensils className="h-4 w-4 mr-1" />
                              Fats
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-neutral-500">No nutrition data recorded</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Week View */}
            <TabsContent value="week" className="mt-0">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Steps & Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="steps" fill="hsl(var(--primary))" name="Steps" />
                            <Bar yAxisId="right" dataKey="activeMinutes" fill="hsl(var(--secondary))" name="Active Minutes" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No activity data for this week</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Calories & Heart Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" domain={[40, 120]} />
                            <Tooltip />
                            <Legend />
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="calories" 
                              stroke="hsl(var(--primary))" 
                              name="Calories Burned" 
                              strokeWidth={2}
                              activeDot={{ r: 8 }}
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="heartRate" 
                              stroke="hsl(var(--destructive))" 
                              name="Heart Rate" 
                              strokeWidth={2}
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No data for this week</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sleep Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 12]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="sleep" fill="hsl(var(--primary))" name="Sleep (hours)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No sleep data for this week</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Nutrition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="protein" stackId="nutrition" fill="hsl(var(--primary))" name="Protein (g)" />
                            <Bar dataKey="carbs" stackId="nutrition" fill="hsl(var(--secondary))" name="Carbs (g)" />
                            <Bar dataKey="fats" stackId="nutrition" fill="hsl(var(--muted))" name="Fats (g)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No nutrition data for this week</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {totals && (
                <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Flame className="h-8 w-8 text-primary mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Weekly Steps</h3>
                        <p className="text-3xl font-bold text-primary">{totals.totalSteps.toLocaleString()}</p>
                        <p className="text-sm text-neutral-500">
                          Avg: {Math.round(totals.totalSteps / totals.count).toLocaleString()} per day
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Flame className="h-8 w-8 text-primary mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Weekly Calories</h3>
                        <p className="text-3xl font-bold text-primary">{totals.totalCalories.toLocaleString()}</p>
                        <p className="text-sm text-neutral-500">
                          Avg: {Math.round(totals.totalCalories / totals.count).toLocaleString()} per day
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Watch className="h-8 w-8 text-primary mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Active Minutes</h3>
                        <p className="text-3xl font-bold text-primary">{totals.totalActiveMinutes}</p>
                        <p className="text-sm text-neutral-500">
                          Avg: {Math.round(totals.totalActiveMinutes / totals.count)} per day
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Heart className="h-8 w-8 text-primary mb-2" />
                        <h3 className="text-lg font-semibold mb-1">Avg Heart Rate</h3>
                        <p className="text-3xl font-bold text-primary">
                          {totals.count > 0 ? Math.round(totals.avgHeartRate / totals.count) : "-"}
                        </p>
                        <p className="text-sm text-neutral-500">BPM resting</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Month View */}
            <TabsContent value="month" className="mt-0">
              <div className="grid gap-6 grid-cols-1 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Activity Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[400px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="steps" 
                              stroke="hsl(var(--primary))" 
                              name="Steps" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 8 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="calories" 
                              stroke="hsl(var(--secondary))" 
                              name="Calories" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 8 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="activeMinutes" 
                              stroke="hsl(var(--accent))" 
                              name="Active Minutes" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center">
                        <p className="text-neutral-500">No activity data for this month</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Sleep Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 12]} />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="sleep" 
                              stroke="hsl(var(--primary))" 
                              name="Sleep (hours)" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No sleep data for this month</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Heart Rate Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis domain={[40, 120]} />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="heartRate" 
                              stroke="hsl(var(--destructive))" 
                              name="Resting Heart Rate" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No heart rate data for this month</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {totals && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Monthly Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-neutral-600 mb-2">Total Steps</h3>
                          <p className="text-3xl font-bold text-primary">{totals.totalSteps.toLocaleString()}</p>
                          <p className="text-sm text-neutral-500 mt-1">
                            Daily Avg: {Math.round(totals.totalSteps / totals.count).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-neutral-600 mb-2">Total Calories</h3>
                          <p className="text-3xl font-bold text-primary">{totals.totalCalories.toLocaleString()}</p>
                          <p className="text-sm text-neutral-500 mt-1">
                            Daily Avg: {Math.round(totals.totalCalories / totals.count).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-neutral-600 mb-2">Active Minutes</h3>
                          <p className="text-3xl font-bold text-primary">{totals.totalActiveMinutes}</p>
                          <p className="text-sm text-neutral-500 mt-1">
                            Daily Avg: {Math.round(totals.totalActiveMinutes / totals.count)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-neutral-600 mb-2">Sleep Average</h3>
                          <p className="text-3xl font-bold text-primary">
                            {totals.count > 0 
                              ? `${Math.floor((totals.avgSleep / totals.count) / 60)}h ${Math.round((totals.avgSleep / totals.count) % 60)}m` 
                              : "-"}
                          </p>
                          <p className="text-sm text-neutral-500 mt-1">
                            per night
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}