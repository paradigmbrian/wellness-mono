import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  User,
  Shield,
  Bell,
  Globe,
  Key,
  CreditCard,
  LogOut,
  CheckCircle,
  Calendar,
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] =
    useState(true);
  const [isAppNotificationsEnabled, setIsAppNotificationsEnabled] =
    useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const isLoading = !user;

  const { data: connectedServices } = useQuery({
    queryKey: ["/api/connected-services"],
    enabled: !!user,
  });

  const appleHealthConnected = connectedServices?.some(
    (service: any) =>
      service.serviceName === "apple_health" && service.isConnected,
  );

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would save notifications preferences
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulated network delay

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
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulated network delay

      toast({
        title: "Data export requested",
        description:
          "Your data export is being prepared and will be emailed to you.",
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
      <Tabs
        orientation="vertical"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-64 space-y-4">
            <div className="sticky top-6">
              <TabsList className="flex flex-col h-auto w-full bg-white border rounded-md p-1 shadow-sm">
                <TabsTrigger
                  value="profile"
                  className="justify-start text-left px-3 py-2 mb-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="account"
                  className="justify-start text-left px-3 py-2 mb-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Account Security
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="justify-start text-left px-3 py-2 mb-1"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="connected"
                  className="justify-start text-left px-3 py-2 mb-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Connected Services
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="justify-start text-left px-3 py-2"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </TabsTrigger>
              </TabsList>

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
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
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
                        <Input id="email" value={user?.email || ""} disabled />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            defaultValue={user?.firstName || ""}
                            placeholder="Your first name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            defaultValue={user?.lastName || ""}
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
                                {user?.firstName?.charAt(0) ||
                                  user?.email?.charAt(0) ||
                                  "U"}
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
                  <CardDescription>
                    Manage your password and account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-base font-medium">
                      Two-Factor Authentication
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          Two-factor authentication is disabled
                        </p>
                        <p className="text-sm text-neutral-500">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button>
                        <Shield className="h-4 w-4 mr-2" />
                        Enable
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button disabled={isSaving} onClick={saveSettings}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex flex-col space-y-1">
                        <Label
                          htmlFor="email-notifications"
                          className="font-medium"
                        >
                          Email Notifications
                        </Label>
                        <p className="text-sm text-neutral-500">
                          Receive email notifications about health alerts and
                          updates
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={isEmailNotificationsEnabled}
                        onCheckedChange={setIsEmailNotificationsEnabled}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex flex-col space-y-1">
                        <Label
                          htmlFor="app-notifications"
                          className="font-medium"
                        >
                          App Notifications
                        </Label>
                        <p className="text-sm text-neutral-500">
                          Receive notifications within the app for important
                          updates
                        </p>
                      </div>
                      <Switch
                        id="app-notifications"
                        checked={isAppNotificationsEnabled}
                        onCheckedChange={setIsAppNotificationsEnabled}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button disabled={isSaving} onClick={saveSettings}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="connected" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Connected Services</CardTitle>
                  <CardDescription>
                    Manage your connected health services and devices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium">Apple Health</h3>
                        <p className="text-sm text-neutral-500">
                          Connect to import your health data
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {appleHealthConnected ? (
                        <>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Connected
                          </Badge>
                          <Link href="/apple-health">
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <Link href="/apple-health">
                          <Button variant="outline" size="sm">
                            Connect
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-4">
                      <h3 className="text-base font-medium">Data Export</h3>
                      <p className="text-sm text-neutral-500">
                        Export all your health data in a JSON format
                      </p>
                    </div>

                    <Dialog
                      open={isExportDialogOpen}
                      onOpenChange={setIsExportDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline">Export Data</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Health Data</DialogTitle>
                          <DialogDescription>
                            This will export all your health data in JSON
                            format. The export file will be emailed to you once
                            ready.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <p className="text-sm">The export will include:</p>
                          <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                            <li>Health metrics</li>
                            <li>Lab results</li>
                            <li>Activity data</li>
                            <li>Health events</li>
                          </ul>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsExportDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={exportData}>Export</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plan</CardTitle>
                  <CardDescription>
                    Manage your subscription and billing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Current Plan</h3>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-medium">
                        {user?.subscriptionTier === "pro" ? "PRO" : "Free"}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {user?.subscriptionTier === "pro"
                            ? "Pro Plan"
                            : "Basic Plan"}
                        </h4>
                        <p className="text-sm text-neutral-500">
                          {user?.subscriptionStatus === "active"
                            ? "Your subscription is active"
                            : user?.subscriptionStatus === "trial"
                              ? "Your free trial is active"
                              : user?.subscriptionStatus === "cancelled"
                                ? "Your subscription will end soon"
                                : "No active subscription"}
                        </p>
                        {user?.subscriptionStatus === "active" &&
                          user?.subscriptionExpiresAt && (
                            <p className="text-xs text-neutral-400 mt-1">
                              Renews on{" "}
                              {new Date(
                                user.subscriptionExpiresAt,
                              ).toLocaleDateString()}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Available Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`border rounded-lg p-4 ${user?.subscriptionTier === "basic" ? "border-blue-200 bg-blue-50" : "border-neutral-200"}`}
                      >
                        <h4 className="font-medium">Basic</h4>
                        <div className="my-2">
                          <span className="text-2xl font-bold">Free</span>
                        </div>
                        <ul className="text-sm space-y-2 mb-4">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Track basic health metrics</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Upload lab results</span>
                          </li>
                        </ul>
                        {user?.subscriptionTier === "basic" ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Current Plan
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            Downgrade
                          </Button>
                        )}
                      </div>

                      <div
                        className={`border rounded-lg p-4 ${user?.subscriptionTier === "pro" ? "border-blue-200 bg-blue-50" : "border-neutral-200"}`}
                      >
                        <h4 className="font-medium">Pro</h4>
                        <div className="my-2">
                          <span className="text-2xl font-bold">$10</span>
                          <span className="text-sm text-neutral-500">
                            /month
                          </span>
                        </div>
                        <ul className="text-sm space-y-2 mb-4">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Everything in Basic</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>AI-powered health insights</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Apple Health integration</span>
                          </li>
                        </ul>
                        {user?.subscriptionTier === "pro" ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Current Plan
                          </Badge>
                        ) : user?.subscriptionStatus === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            Change Plan
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full">
                            Upgrade
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Link href="/subscription">
                      <Button>
                        {user?.subscriptionStatus === "active"
                          ? "Manage Subscription"
                          : "Upgrade Plan"}
                      </Button>
                    </Link>

                    {user?.subscriptionStatus === "active" && (
                      <Button variant="outline" className="w-full sm:w-auto">
                        Cancel Subscription
                      </Button>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-base font-medium mb-2">
                      Billing History
                    </h3>

                    {user?.subscriptionStatus === "active" ? (
                      <div className="border rounded-md divide-y">
                        <div className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">
                              Pro Plan - Monthly
                            </p>
                            <p className="text-xs text-neutral-500">
                              May 15, 2023
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">$19.99</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              Receipt
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">
                              Pro Plan - Monthly
                            </p>
                            <p className="text-xs text-neutral-500">
                              April 15, 2023
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">$19.99</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              Receipt
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">
                        No billing history available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
