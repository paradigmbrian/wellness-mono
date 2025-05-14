import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { FlaskConical, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function LabResultsCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: labResults, isLoading } = useQuery({
    queryKey: ["/api/lab-results"],
    enabled: !!user,
  });

  const deleteLabResult = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lab-results/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
    },
  });

  // Get the most recent results for visualization
  const recentResults = labResults ? labResults.slice(0, 5) : [];

  // Sample data for visualization - in a real app, this would use actual lab result values
  const chartData = [
    { name: "Cholesterol", value: 185, normal: 200 },
    { name: "Glucose", value: 92, normal: 100 },
    { name: "HDL", value: 55, normal: 40 },
    { name: "LDL", value: 110, normal: 130 },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="p-5 border-b border-neutral-100 flex justify-between items-center">
        <CardTitle className="text-base font-semibold">Recent Lab Results</CardTitle>
        <Link href="/lab-results">
          <Button variant="link" className="h-auto p-0">
            View All
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-5">
        <div className="space-y-4">
          <div className="h-52 w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                  <Bar dataKey="normal" fill="#f0f0f0" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2">
            {isLoading ? (
              Array(2)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center p-2 hover:bg-neutral-50 rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-lg mr-3" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
            ) : recentResults.length > 0 ? (
              recentResults.map((result: any) => (
                <div
                  key={result.id}
                  className="flex items-center p-2 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FlaskConical className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800">{result.title}</p>
                    <p className="text-xs text-neutral-500">
                      Uploaded on {format(new Date(result.uploadedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <Badge
                      variant={
                        result.status === "normal"
                          ? "success"
                          : result.status === "review"
                          ? "warning"
                          : result.status === "abnormal"
                          ? "destructive"
                          : "outline"
                      }
                      className="font-normal"
                    >
                      {result.status === "normal"
                        ? "Normal"
                        : result.status === "review"
                        ? "Review"
                        : result.status === "abnormal"
                        ? "Abnormal"
                        : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-neutral-500">No lab results yet</div>
            )}
          </div>

          <Link href="/lab-results/upload">
            <Button
              variant="outline"
              className="w-full py-2 border-dashed flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-1" />
              Upload New Results
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
