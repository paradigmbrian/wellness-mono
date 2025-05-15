import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { User, Shield, Bell, Globe, Key, CreditCard, LogOut, CheckCircle } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] = useState(true);
  const [isAppNotificationsEnabled, setIsAppNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const isLoading = !user;

  const { data: connectedServices } = useQuery({
    queryKey: ["/api/connected-services"],
    enabled: !!user,
  });

  const appleHealthConnected = connectedServices?.some(
    (service: any) => service.serviceName === "apple_health" && service.isConnected
  );

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would save notifications preferences
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulated network delay
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = async () => {
    try {
      // In a real app, this would trigger a data export
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated network delay
      
      toast({
        title: "Data export requested",
        description: "Your data export is being prepared and will be emailed to you.",
      });
      setIsExportDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error exporting data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your account and preferences"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64 space-y-4">
          <div className="sticky top-6">
            <Tabs
              orientation="vertical"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="flex flex-col h-auto w-full bg-white border rounded-md p-1 shadow-sm">
                <TabsTrigger value="profile" className="justify-start text-left px-3 py-2 mb-1">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="account" className="justify-start text-left px-3 py-2 mb-1">
                  <Shield className="h-4 w-4 mr-2" />
                  Account Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="justify-start text-left px-3 py-2 mb-1">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="connected" className="justify-start text-left px-3 py-2 mb-1">
                  <Globe className="h-4 w-4 mr-2" />
                  Connected Services
                </TabsTrigger>
                <TabsTrigger value="subscription" className="justify-start text-left px-3 py-2">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="mt-6">
              <a href="/api/logout">
                <Button variant="outline" className="w-full justify-start">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </a>
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-6">
          <TabsContent value="profile" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={user?.email || ''} 
                        disabled
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          defaultValue={user?.firstName || ''} 
                          placeholder="Your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          defaultValue={user?.lastName || ''} 
                          placeholder="Your last name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profileImage">Profile Image</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full overflow-hidden bg-neutral-200">
                          {user?.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-xl font-semibold">
                              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                        <Button variant="outline">Change Image</Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button disabled={isSaving} onClick={saveSettings}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="account" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-base font-medium mb-2">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                  </div>
                  <Button className="mt-4">Update Password</Button>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-2">Data & Privacy</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Export Your Data</p>
                        <p className="text-sm text-neutral-500">Download all your health data</p>
                      </div>
                      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">Export Data</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Export Health Data</DialogTitle>
                            <DialogDescription>
                              Your data will be exported and sent to your email address. This process may take a few minutes.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Health metrics and activity data</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>Lab results and medical records</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-primary" />
                              <span>AI-generated insights and recommendations</span>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                            <Button onClick={exportData}>Confirm Export</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-neutral-500">Permanently delete your account and all data</p>
                      </div>
                      <Button variant="destructive">Delete Account</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-neutral-500">Receive notifications via email</p>
                    </div>
                    <Switch 
                      checked={isEmailNotificationsEnabled} 
                      onCheckedChange={setIsEmailNotificationsEnabled} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">App Notifications</p>
                      <p className="text-sm text-neutral-500">Receive in-app notifications</p>
                    </div>
                    <Switch 
                      checked={isAppNotificationsEnabled} 
                      onCheckedChange={setIsAppNotificationsEnabled} 
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Notification Types</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">AI Insights</p>
                      <p className="text-sm text-neutral-500">Notify when new AI insights are available</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lab Results</p>
                      <p className="text-sm text-neutral-500">Notify when lab results are processed</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Health Alerts</p>
                      <p className="text-sm text-neutral-500">Notify for important health metrics changes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Subscription Updates</p>
                      <p className="text-sm text-neutral-500">Notify about subscription status changes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={saveSettings} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="connected" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>Manage your connected health services and devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border border-neutral-100 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-black flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Apple Health</p>
                          <p className="text-sm text-neutral-500">
                            {appleHealthConnected 
                              ? "Connected and syncing" 
                              : "Connect to sync health data from your Apple devices"}
                          </p>
                        </div>
                      </div>
                      <Button variant={appleHealthConnected ? "outline" : "default"}>
                        {appleHealthConnected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border border-neutral-100 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">My Health Records</p>
                          <p className="text-sm text-neutral-500">Import your medical records</p>
                        </div>
                      </div>
                      <Button>Connect</Button>
                    </div>
                  </div>
                  
                  <div className="border border-neutral-100 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-purple-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-14a3 3 0 00-3 3v2H7a1 1 0 000 2h1v1a1 1 0 01-1 1 1 1 0 100 2h6a1 1 0 100-2H9.83c.11-.313.17-.65.17-1v-1h1a1 1 0 100-2h-1V7a1 1 0 112 0 1 1 0 102 0 3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Lab Partner</p>
                          <p className="text-sm text-neutral-500">Auto-import lab results</p>
                        </div>
                      </div>
                      <Button>Connect</Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-2">Data Permissions</h3>
                  <p className="text-sm text-neutral-500 mb-4">
                    Control what data is shared with connected services
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Health Metrics</p>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Lab Results</p>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Sleep Data</p>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Nutrition Data</p>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="subscription" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage your subscription plan and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-neutral-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {user?.subscriptionTier === "pro" ? "Pro Plan" : 
                         user?.subscriptionTier === "premium" ? "Premium Plan" : 
                         user?.subscriptionTier === "basic" ? "Basic Plan" : "Free Plan"}
                      </h3>
                      <p className="text-sm text-neutral-500 mt-1">
                        {user?.subscriptionStatus === "active"
                          ? "Your subscription is active"
                          : "Your subscription is inactive"}
                      </p>
                    </div>
                    <Badge
                      variant={user?.subscriptionStatus === "active" ? "default" : "outline"}
                    >
                      {user?.subscriptionStatus === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  {user?.subscriptionExpiresAt && (
                    <p className="text-sm text-neutral-500 mt-2">
                      Renews on {format(new Date(user.subscriptionExpiresAt), "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-base font-medium mb-2">Plan Features</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <span className="text-sm">AI-powered health insights</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <span className="text-sm">Unlimited lab result uploads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      <span className="text-sm">Health metrics dashboard</span>
                    </div>
                    {(user?.subscriptionTier === "pro" || user?.subscriptionTier === "premium") && (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <span className="text-sm">Advanced health analytics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <span className="text-sm">Personalized recommendations</span>
                        </div>
                      </>
                    )}
                    {user?.subscriptionTier === "premium" && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <span className="text-sm">Priority support</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/subscription">
                    <Button className="w-full sm:w-auto">
                      {user?.subscriptionStatus === "active" ? "Manage Subscription" : "Upgrade Plan"}
                    </Button>
                  </Link>
                  
                  {user?.subscriptionStatus === "active" && (
                    <Button variant="outline" className="w-full sm:w-auto">Cancel Subscription</Button>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-2">Billing History</h3>
                  
                  {user?.subscriptionStatus === "active" ? (
                    <div className="border rounded-md divide-y">
                      <div className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">Pro Plan - Monthly</p>
                          <p className="text-xs text-neutral-500">May 15, 2023</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">$19.99</p>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Receipt
                          </Button>
                        </div>
                      </div>
                      <div className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">Pro Plan - Monthly</p>
                          <p className="text-xs text-neutral-500">April 15, 2023</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">$19.99</p>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Receipt
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">No billing history available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </div>
    </DashboardLayout>
  );
}
