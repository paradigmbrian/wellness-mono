import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Brain, 
  TrendingUp, 
  LineChart, 
  Sparkles,
  RefreshCw
} from "lucide-react";

interface InsightCard {
  id: number;
  content: string;
  category: string;
  severity: string;
  createdAt: string;
  isRead: boolean;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "sleep":
      return <TrendingUp className="h-5 w-5" />;
    case "nutrition":
      return <LineChart className="h-5 w-5" />;
    case "activity":
      return <TrendingUp className="h-5 w-5" />;
    case "lab_results":
      return <Info className="h-5 w-5" />;
    default:
      return <Brain className="h-5 w-5" />;
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "info":
      return <Info className="h-5 w-5 text-white" />;
    case "success":
      return <CheckCircle className="h-5 w-5 text-white" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-white" />;
    case "alert":
      return <AlertTriangle className="h-5 w-5 text-white" />;
    default:
      return <Info className="h-5 w-5 text-white" />;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "info":
      return "bg-secondary";
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "alert":
      return "bg-destructive";
    default:
      return "bg-secondary";
  }
}

function getCategoryBadge(category: string) {
  const formatCategory = (cat: string) => {
    return cat.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  switch (category) {
    case "sleep":
      return <Badge variant="outline" className="bg-secondary/10 text-secondary">{formatCategory(category)}</Badge>;
    case "nutrition":
      return <Badge variant="outline" className="bg-primary/10 text-primary">{formatCategory(category)}</Badge>;
    case "activity":
      return <Badge variant="outline" className="bg-accent/10 text-accent">{formatCategory(category)}</Badge>;
    case "lab_results":
      return <Badge variant="outline" className="bg-warning/10 text-warning">{formatCategory(category)}</Badge>;
    default:
      return <Badge variant="outline">{formatCategory(category)}</Badge>;
  }
}

export default function Insights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: insights, isLoading } = useQuery({
    queryKey: ["/api/ai-insights"],
    enabled: !!user,
  });

  const generateInsights = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai-insights/generate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      toast({
        title: "New insights generated",
        description: "AI has analyzed your health data and generated new insights.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate insights",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/ai-insights/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
    },
  });

  const filteredInsights = activeCategory
    ? insights?.filter((insight: InsightCard) => insight.category === activeCategory)
    : insights;

  // Get unique categories from insights
  const categories = insights
    ? Array.from(new Set(insights.map((insight: InsightCard) => insight.category)))
    : [];

  return (
    <DashboardLayout
      title="AI Insights"
      description="AI-powered analysis of your health data"
    >
      <div className="mb-6">
        <Card className="bg-gradient-to-r from-secondary to-secondary-dark rounded-xl overflow-hidden shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="text-white mb-4 sm:mb-0">
              <h2 className="text-xl font-semibold flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI-Powered Health Insights
              </h2>
              <p className="text-secondary-light text-sm mt-1">
                Get personalized analysis and recommendations based on your health data
              </p>
            </div>
            <Button
              onClick={() => generateInsights.mutate()}
              disabled={generateInsights.isPending}
              className="bg-white text-secondary font-medium px-5 py-2 rounded-lg shadow-sm hover:bg-opacity-90 transition-colors"
            >
              {generateInsights.isPending ? (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate New Insights
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={activeCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
        >
          All Insights
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="flex items-center"
          >
            {getCategoryIcon(category)}
            <span className="ml-2">
              {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
            </span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="ml-4 flex-1">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex justify-between mt-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInsights?.length > 0 ? (
        <div className="space-y-4">
          {filteredInsights.map((insight: InsightCard) => (
            <Card key={insight.id}>
              <CardContent className="p-5">
                <div className="flex">
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full ${getSeverityColor(insight.severity)} flex items-center justify-center`}>
                    {getSeverityIcon(insight.severity)}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center">
                        {getCategoryBadge(insight.category)}
                        {!insight.isRead && (
                          <Badge variant="default" className="ml-2 bg-primary">New</Badge>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">
                        {format(new Date(insight.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-base font-medium text-neutral-800">{insight.content}</p>
                    
                    {!insight.isRead && (
                      <div className="flex justify-end mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          onClick={() => markAsRead.mutate(insight.id)}
                        >
                          Mark as read
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Brain className="h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-lg font-medium text-neutral-800 mb-2">No insights yet</h3>
            <p className="text-neutral-500 text-center mb-6 max-w-md">
              {activeCategory 
                ? `You don't have any insights in the ${activeCategory.replace('_', ' ')} category yet.` 
                : "Connect your health devices and upload your lab results to get personalized insights."}
            </p>
            <Button onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending}>
              {generateInsights.isPending ? (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Insights
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
