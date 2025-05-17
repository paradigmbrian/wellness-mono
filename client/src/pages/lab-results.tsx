import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getStatusVariant } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore, addMonths } from "date-fns";
import { Download, FileText, MoreHorizontal, Plus, Trash2, TrendingUp, Calendar, Activity } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

export default function LabResults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("list");
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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
      toast({
        title: "Lab result deleted",
        description: "The lab result has been permanently removed.",
      });
      setSelectedResult(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadLabResult = async (fileUrl: string, title: string) => {
    try {
      const response = await fetch(fileUrl, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Your file will be downloaded shortly.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter lab results by category
  const getFilteredResults = () => {
    if (!labResults || selectedCategory === "all") {
      return labResults || [];
    }
    
    return labResults.filter((result: any) => {
      let resultCategory;
      
      // First check if data is a string that needs to be parsed (from our initialData)
      if (result.data && typeof result.data === 'string') {
        try {
          const parsedData = JSON.parse(result.data);
          resultCategory = parsedData.category;
        } catch (e) {
          // If parsing fails, proceed with other checks
        }
      }
      
      // If we didn't get a category from parsing, check other locations
      if (!resultCategory) {
        resultCategory = result.data?.category || result.category;
      }
      
      // Default to "other" if no category found
      if (!resultCategory) resultCategory = "other";
      
      return resultCategory.toLowerCase() === selectedCategory.toLowerCase();
    });
  };
  
  const filteredResults = getFilteredResults();
  
  // Process data for time-series visualizations
  const timeSeriesData = useMemo(() => {
    if (!labResults || labResults.length === 0) return [];
    
    // Get bloodwork markers that appear multiple times for trend analysis
    // First collect all markers across all lab results
    const allMarkers: Record<string, Array<{date: string, value: number, displayValue: string}>> = {};
    
    labResults.forEach((result: any) => {
      if (result.data?.findings && Array.isArray(result.data.findings)) {
        const resultDate = result.resultDate || new Date(result.uploadedAt).toISOString().split('T')[0];
        
        result.data.findings.forEach((finding: any) => {
          const markerName = finding.marker;
          if (!markerName) return;
          
          // Try to convert value to a number for charting
          let numericValue = parseFloat(finding.value);
          if (isNaN(numericValue)) {
            // Try to extract numeric part if the value contains units
            const match = finding.value.match(/^([\d.]+)/);
            if (match) {
              numericValue = parseFloat(match[1]);
            } else {
              return; // Skip if we can't extract a number
            }
          }
          
          if (!allMarkers[markerName]) {
            allMarkers[markerName] = [];
          }
          
          allMarkers[markerName].push({
            date: resultDate,
            value: numericValue,
            displayValue: finding.value
          });
        });
      }
    });
    
    // Keep only markers that have multiple data points for trends
    const trendableMarkers = Object.entries(allMarkers)
      .filter(([_, values]) => values.length > 1)
      .map(([name, values]) => ({
        name,
        values: values.sort((a, b) => a.date.localeCompare(b.date)) // Sort by date
      }));
      
    return trendableMarkers;
  }, [labResults]);
  
  // Sample charts data
  const resultStatusData = [
    { name: "Normal", value: labResults?.filter((r: any) => r.status === "normal").length || 0 },
    { name: "Review", value: labResults?.filter((r: any) => r.status === "review").length || 0 },
    { name: "Abnormal", value: labResults?.filter((r: any) => r.status === "abnormal").length || 0 },
    { name: "Pending", value: labResults?.filter((r: any) => r.status === "pending").length || 0 },
  ];

  const COLORS = ["#4CAF50", "#FF9800", "#F44336", "#9e9e9e"];

  // Sample markers data for visualization
  const sampleMarkers = [
    { name: "Cholesterol", normal: true, value: 195, reference: "< 200 mg/dL" },
    { name: "HDL", normal: true, value: 55, reference: "> 40 mg/dL" },
    { name: "LDL", normal: false, value: 145, reference: "< 130 mg/dL" },
    { name: "Triglycerides", normal: true, value: 120, reference: "< 150 mg/dL" },
    { name: "Glucose", normal: true, value: 92, reference: "70-99 mg/dL" },
  ];
  
  // DEXA scan sample data
  const sampleDexaData = {
    bodyFat: 22.5,
    leanMass: 148.3,
    boneDensity: 1.2,
    regions: [
      { name: "Arms", fat: 18.7, lean: 15.2 },
      { name: "Legs", fat: 21.3, lean: 42.1 },
      { name: "Trunk", fat: 24.8, lean: 67.5 },
    ]
  };
  
  // Hormonal panel sample data
  const sampleHormonalData = [
    { name: "Testosterone", value: 450, unit: "ng/dL", reference: "270-1070 ng/dL", normal: true },
    { name: "Estradiol", value: 24, unit: "pg/mL", reference: "10-40 pg/mL", normal: true },
    { name: "Cortisol", value: 18, unit: "μg/dL", reference: "5-23 μg/dL", normal: true },
    { name: "TSH", value: 1.8, unit: "mIU/L", reference: "0.4-4.0 mIU/L", normal: true },
    { name: "Free T4", value: 1.1, unit: "ng/dL", reference: "0.8-1.8 ng/dL", normal: true },
  ];
  
  // Utility function to render the appropriate content based on lab result type
  const renderLabResultContent = (result: any) => {
    const resultCategory = result.data?.category || result.category || "other";
    
    if (resultCategory.toLowerCase() === "dexa") {
      const dexaData = result.data?.dexaResults || sampleDexaData;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-neutral-50 p-4 rounded-lg text-center">
              <p className="text-sm text-neutral-500 mb-1">Body Fat</p>
              <p className="text-2xl font-semibold">{dexaData.bodyFat}%</p>
            </div>
            <div className="bg-neutral-50 p-4 rounded-lg text-center">
              <p className="text-sm text-neutral-500 mb-1">Lean Mass</p>
              <p className="text-2xl font-semibold">{dexaData.leanMass} lbs</p>
            </div>
            <div className="bg-neutral-50 p-4 rounded-lg text-center">
              <p className="text-sm text-neutral-500 mb-1">Bone Density</p>
              <p className="text-2xl font-semibold">{dexaData.boneDensity} g/cm²</p>
            </div>
          </div>
          
          {dexaData.regions && (
            <div>
              <h4 className="text-md font-medium mb-2">Body Composition by Region</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-neutral-500">Region</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-500">Fat %</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-500">Lean Mass (lbs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {dexaData.regions.map((region, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">{region.name}</td>
                        <td className="px-3 py-2">{region.fat}%</td>
                        <td className="px-3 py-2">{region.lean} lbs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    } 
    else if (resultCategory.toLowerCase() === "hormonal") {
      const hormonalData = result.data?.findings || sampleHormonalData;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Hormone</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Value</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Unit</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Reference Range</th>
                <th className="px-3 py-2 text-left font-medium text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {hormonalData.map((hormone: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-3 py-2 font-medium">{hormone.name}</td>
                  <td className="px-3 py-2">{hormone.value}</td>
                  <td className="px-3 py-2">{hormone.unit}</td>
                  <td className="px-3 py-2 text-neutral-500">{hormone.reference}</td>
                  <td className="px-3 py-2">
                    <Badge variant={hormone.normal ? "success" : "warning"} className="font-normal">
                      {hormone.normal ? "Normal" : "Out of Range"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    else if (resultCategory.toLowerCase() === "bloodwork" || resultCategory.toLowerCase() === "all" || !resultCategory) {
      return (
        result.data?.findings && (
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">Marker</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">Value</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">Reference</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.data.findings.map((finding: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-medium">{finding.marker}</td>
                    <td className="px-3 py-2">{finding.value}</td>
                    <td className="px-3 py-2 text-neutral-500">{finding.reference}</td>
                    <td className="px-3 py-2">
                      <Badge variant={getStatusVariant(finding.status)} className="font-normal">
                        {finding.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      );
    }
    
    // Default or other types
    return (
      <div>
        {result.description && (
          <p className="text-neutral-700 mb-4">{result.description}</p>
        )}
        
        {result.data?.summary && (
          <div className="bg-neutral-50 p-4 rounded-lg mb-4">
            <h4 className="text-md font-medium mb-2">Summary</h4>
            <p className="text-neutral-700">{result.data.summary}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout 
      title="Lab Results" 
      description="Upload and manage your medical lab results"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="w-full max-w-md">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            
            <div className="flex mt-4 mb-2 gap-2 overflow-x-auto pb-2">
              <Badge 
                variant={selectedCategory === "all" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setSelectedCategory("all")}
              >
                All Results
              </Badge>
              <Badge 
                variant={selectedCategory === "bloodwork" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setSelectedCategory("bloodwork")}
              >
                Blood Work
              </Badge>
              <Badge 
                variant={selectedCategory === "dexa" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setSelectedCategory("dexa")}
              >
                DEXA Scans
              </Badge>
              <Badge 
                variant={selectedCategory === "hormonal" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setSelectedCategory("hormonal")}
              >
                Hormonal Panels
              </Badge>
              <Badge 
                variant={selectedCategory === "other" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setSelectedCategory("other")}
              >
                Other Results
              </Badge>
            </div>
            
            <TabsContent value="list" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Skeleton className="h-6 w-40 mb-1" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-16 w-full rounded-md" />
                          <div className="mt-4 flex justify-between items-center">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-9 w-24" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : filteredResults?.length > 0 ? (
                <div className="space-y-4">
                  {filteredResults.map((result: any) => (
                    <Card key={result.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{result.title}</CardTitle>
                            <p className="text-sm text-neutral-500">
                              {result.resultDate 
                                ? format(new Date(result.resultDate), "MMMM d, yyyy")
                                : format(new Date(result.uploadedAt), "MMMM d, yyyy")}
                            </p>
                          </div>
                          <Badge variant={getStatusVariant(result.status)} className="font-normal">
                            {result.status === "normal" ? "Normal" :
                            result.status === "review" ? "Review" :
                            result.status === "abnormal" ? "Abnormal" : "Pending"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {renderLabResultContent(result)}
                        
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-neutral-500">
                            Uploaded on {format(new Date(result.uploadedAt), "MMMM d, yyyy")}
                          </p>
                          <div className="flex space-x-2">
                            {result.fileUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => downloadLabResult(result.fileUrl, result.title)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            )}
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => setSelectedResult(result)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Lab Result</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{selectedResult?.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteLabResult.mutate(selectedResult?.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleteLabResult.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <FileText className="h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-800 mb-2">No lab results yet</h3>
                    <p className="text-neutral-500 text-center mb-6 max-w-md">
                      Upload your lab results to get AI-powered insights and track your health metrics over time.
                    </p>
                    <Link href="/lab-results/upload">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Lab Results
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Results by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : labResults?.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={resultStatusData.filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) => `${name}: ${Math.round(percent * 100)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {resultStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} results`, ""]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No lab results to display</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Results Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : labResults?.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sampleMarkers}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={70}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name, props) => {
                                return [`${value}`, props.payload.name];
                              }}
                            />
                            <Bar 
                              dataKey="value" 
                              fill="hsl(var(--primary))"
                              name="Value"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">No lab results to display</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <Link href="/lab-results/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload New
          </Button>
        </Link>
      </div>
    </DashboardLayout>
  );
}
