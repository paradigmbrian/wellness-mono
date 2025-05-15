import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, Activity, Heart, AlertCircle, Calendar, Settings, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AppleHealth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [selectedTab, setSelectedTab] = useState("connect");
  const [isUploading, setIsUploading] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    metricsAdded: number;
    daysProcessed: number;
    summary: string;
  } | null>(null);
  
  // Fetch connected service status
  const { data: connectedServices } = useQuery({
    queryKey: ["/api/connected-services"],
  });
  
  // Check if Apple Health is connected and get autoSync setting
  useEffect(() => {
    if (connectedServices) {
      const appleHealthService = connectedServices.find(
        (service: any) => service.serviceName === 'apple_health'
      );
      
      if (appleHealthService?.authData && typeof appleHealthService.authData === 'object') {
        // Set auto-sync state from saved preferences
        setAutoSync(appleHealthService.authData.autoSync === true);
        
        // If connected, switch to the upload tab by default
        if (appleHealthService.isConnected && selectedTab === "connect") {
          setSelectedTab("upload");
        }
      }
    }
  }, [connectedServices, selectedTab]);
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if it's a JSON file
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a JSON file exported from Apple Health.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Read the file
      const fileData = await readFileAsJSON(file);
      
      // Send the data to the server
      const response = await apiRequest(
        "POST",
        "/api/connected-services/apple_health/sync",
        { data: fileData }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to sync Apple Health data");
      }
      
      const result = await response.json();
      setUploadResult(result);
      
      // Show success message
      toast({
        title: "Apple Health data synced",
        description: `Successfully synced data: ${result.metricsAdded} metrics from ${result.daysProcessed} days.`,
      });
      
      // Invalidate health metrics queries
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connected-services"] });
      
      // Switch to the results tab
      setSelectedTab("results");
    } catch (error: any) {
      console.error("Error syncing Apple Health data:", error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync Apple Health data",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Read file as JSON
  const readFileAsJSON = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          resolve(data);
        } catch (error) {
          reject(new Error("Invalid JSON file"));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsText(file);
    });
  };
  
  // Handle auto-sync settings update
  const handleAutoSyncChange = async (enabled: boolean) => {
    setIsSavingSettings(true);
    
    try {
      // Get the existing service data first
      const services = connectedServices || [];
      const appleHealthService = services.find(
        (service: any) => service.serviceName === 'apple_health'
      );
      
      // Prepare the auth data, preserving any existing data
      const authData = {
        ...(appleHealthService?.authData || {}),
        autoSync: enabled,
      };
      
      // Update the service settings
      const response = await apiRequest(
        "POST", 
        "/api/connected-services/apple_health/connect", 
        { authData }
      );
      
      if (!response.ok) {
        throw new Error("Failed to update sync settings");
      }
      
      // Update local state
      setAutoSync(enabled);
      
      // Invalidate connected services query
      queryClient.invalidateQueries({ queryKey: ["/api/connected-services"] });
      
      toast({
        title: enabled ? "Auto-sync enabled" : "Auto-sync disabled",
        description: enabled 
          ? "Your Apple Health data will be automatically synced daily." 
          : "Auto-sync has been turned off.",
      });
    } catch (error: any) {
      toast({
        title: "Settings update failed",
        description: error.message || "Failed to update sync settings",
        variant: "destructive",
      });
      // Revert UI state on error
      setAutoSync(!enabled);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Connect Apple Health
  const handleConnectAppleHealth = async () => {
    console.log("Connecting to Apple Health...");
    try {
      // Connect with initial settings
      console.log("Sending connection request...");
      const response = await apiRequest(
        "POST", 
        "/api/connected-services/apple_health/connect", 
        { authData: { connected: true, autoSync: false } }
      );
      
      console.log("Response received:", response);
      
      if (!response.ok) {
        throw new Error("Failed to connect to Apple Health");
      }
      
      // Invalidate connected services query
      console.log("Connection successful, invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["/api/connected-services"] });
      
      toast({
        title: "Connected to Apple Health",
        description: "Your Apple Health account is now connected. You can now sync your data.",
      });
      
      // Switch to the upload tab
      setSelectedTab("upload");
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Apple Health",
        variant: "destructive",
      });
    }
  };
  
  return (
    <DashboardLayout title="Apple Health Integration">
      <div className="flex flex-col max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Apple Health Integration</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="connect">1. Connect</TabsTrigger>
            <TabsTrigger value="upload">2. Upload Data</TabsTrigger>
            <TabsTrigger value="settings">3. Settings</TabsTrigger>
            <TabsTrigger value="results">4. Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connect">
            <Card>
              <CardHeader>
                <CardTitle>Connect to Apple Health</CardTitle>
                <CardDescription>
                  Link your Apple Health account to import your health data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-neutral-50 rounded-lg">
                  <div className="h-16 w-16 flex-shrink-0 rounded-full bg-black flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium">Apple Health</h3>
                    <p className="text-sm text-neutral-500">
                      Connect your Apple Health data to get insights on your health trends,
                      activity, sleep, nutrition, and more.
                    </p>
                  </div>
                  <Button onClick={handleConnectAppleHealth}>
                    Connect Apple Health
                  </Button>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    To use this feature, you need to export your Apple Health data from your iPhone.
                    Follow the steps in the next tab after connecting.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Apple Health Data</CardTitle>
                <CardDescription>
                  Export your data from the Apple Health app and upload it here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">How to export your Apple Health data:</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Open the Health app on your iPhone</li>
                    <li>Tap your profile picture in the top right corner</li>
                    <li>Scroll down and tap "Export All Health Data"</li>
                    <li>The export process may take a few minutes</li>
                    <li>Share the exported ZIP file to your computer</li>
                    <li>Extract the ZIP file and locate the "export.xml" file</li>
                    <li>Convert the XML file to JSON using an online converter or app</li>
                    <li>Upload the JSON file below</li>
                  </ol>
                </div>
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-lg p-8 space-y-4">
                  <FileUp className="h-12 w-12 text-neutral-400" />
                  <div className="text-center">
                    <h4 className="text-base font-medium">Upload Health Data JSON</h4>
                    <p className="text-sm text-neutral-500">
                      The file should contain your Apple Health export data in JSON format
                    </p>
                  </div>
                  <label htmlFor="apple-health-file">
                    <input
                      id="apple-health-file"
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button className="mt-4" disabled={isUploading}>
                      {isUploading ? "Uploading..." : "Select JSON File"}
                    </Button>
                  </label>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Privacy Notice</AlertTitle>
                  <AlertDescription>
                    Your health data is private and will only be used to provide insights
                    within your account. We never share your health data with third parties.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
                <CardDescription>
                  Configure how your Apple Health data is synced
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="auto-sync" className="font-medium">
                        Automatic Daily Sync
                      </Label>
                      <p className="text-sm text-neutral-500">
                        Automatically sync your Apple Health data once per day
                      </p>
                    </div>
                    <Switch
                      id="auto-sync"
                      checked={autoSync}
                      onCheckedChange={handleAutoSyncChange}
                      disabled={isSavingSettings}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="rounded-lg border border-neutral-100 p-4">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 text-blue-500" />
                      <h3 className="text-lg font-medium">Sync Schedule</h3>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">
                      {autoSync 
                        ? "Your data will be synced automatically once per day. The sync happens in the background and includes any new data that has been added since the last sync."
                        : "Automatic sync is currently disabled. Your data will only be updated when you manually upload new Apple Health files."}
                    </p>
                    
                    {!autoSync && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => handleAutoSyncChange(true)}
                        disabled={isSavingSettings}
                      >
                        Enable Auto-Sync
                      </Button>
                    )}
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Automatic sync requires that you've already uploaded Apple Health data at least once.
                    This data serves as the baseline for future syncs.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Sync Results</CardTitle>
                <CardDescription>
                  Summary of your Apple Health data import
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {uploadResult ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center space-x-2">
                            <Activity className="h-5 w-5 text-green-500" />
                            <h3 className="text-lg font-medium">Metrics Added</h3>
                          </div>
                          <p className="text-3xl font-bold mt-2">{uploadResult.metricsAdded}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <h3 className="text-lg font-medium">Days Processed</h3>
                          </div>
                          <p className="text-3xl font-bold mt-2">{uploadResult.daysProcessed}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center space-x-2">
                            <Heart className="h-5 w-5 text-red-500" />
                            <h3 className="text-lg font-medium">Data Categories</h3>
                          </div>
                          <p className="text-3xl font-bold mt-2">
                            {uploadResult.summary.includes("steps") ? "4+" : "0"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Summary</h3>
                      <p className="text-neutral-600">{uploadResult.summary}</p>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setSelectedTab("upload")}>
                        Upload More Data
                      </Button>
                      <Button onClick={() => navigate("/dashboard")}>
                        View on Dashboard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-neutral-500">
                      No sync results yet
                    </h3>
                    <p className="text-neutral-400 mt-2">
                      Connect and upload your Apple Health data to see results
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSelectedTab("upload")}
                    >
                      Go to Upload
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}