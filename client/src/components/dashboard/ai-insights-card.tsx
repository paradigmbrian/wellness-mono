import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Info, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface InsightIconProps {
  severity: string;
}

function InsightIcon({ severity }: InsightIconProps) {
  switch (severity) {
    case "info":
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
          <Info className="h-5 w-5 text-white" />
        </div>
      );
    case "success":
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-success flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-white" />
        </div>
      );
    case "warning":
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-warning flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
      );
    case "alert":
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-destructive flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
      );
    default:
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
          <Info className="h-5 w-5 text-white" />
        </div>
      );
  }
}

export function AiInsightsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Display most recent 3 insights
  const recentInsights = insights ? insights.slice(0, 3) : [];

  return (
    <Card className="h-full">
      <CardHeader className="p-5 border-b border-neutral-100 flex justify-between items-center">
        <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
        <span className="text-xs text-neutral-500">
          {insights?.length > 0 
            ? `Updated ${format(new Date(insights[0].createdAt), "MMM d")}`
            : "No insights yet"}
        </span>
      </CardHeader>

      <CardContent className="p-5">
        <div className="space-y-4">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="ml-4 flex-1">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ))
          ) : recentInsights.length > 0 ? (
            recentInsights.map((insight: any) => (
              <div key={insight.id} className="flex">
                <InsightIcon severity={insight.severity} />
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-neutral-800">{insight.content}</p>
                  <div className="mt-1 flex justify-between items-center">
                    <p className="text-xs text-neutral-500">
                      {format(new Date(insight.createdAt), "MMM d, yyyy")}
                    </p>
                    {!insight.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary"
                        onClick={() => markAsRead.mutate(insight.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-4 text-neutral-500">No insights available</div>
          )}

          <Button
            onClick={() => generateInsights.mutate()}
            disabled={generateInsights.isPending}
            className="w-full mt-2 py-2 bg-secondary/10 text-secondary font-medium rounded-lg hover:bg-secondary/20"
          >
            {generateInsights.isPending ? (
              <div className="flex items-center">
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Generating...
              </div>
            ) : (
              <div className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New Insights
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
