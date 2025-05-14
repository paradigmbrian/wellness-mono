import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Database, PlugZap } from "lucide-react";

interface ServiceIconProps {
  serviceName: string;
}

function ServiceIcon({ serviceName }: ServiceIconProps) {
  switch (serviceName) {
    case "apple_health":
      return (
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-black flex items-center justify-center">
          <Calendar className="h-7 w-7 text-white" />
        </div>
      );
    case "my_health_records":
      return (
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-blue-500 flex items-center justify-center">
          <Database className="h-7 w-7 text-white" />
        </div>
      );
    case "lab_partner":
      return (
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-purple-500 flex items-center justify-center">
          <PlugZap className="h-7 w-7 text-white" />
        </div>
      );
    default:
      return (
        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-neutral-500 flex items-center justify-center">
          <PlugZap className="h-7 w-7 text-white" />
        </div>
      );
  }
}

export function ConnectedServices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connectedServices, isLoading } = useQuery({
    queryKey: ["/api/connected-services"],
    enabled: !!user,
  });

  const connectService = useMutation({
    mutationFn: async ({ serviceName, authData }: { serviceName: string; authData?: any }) => {
      const response = await apiRequest("POST", `/api/connected-services/${serviceName}/connect`, { authData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connected-services"] });
      toast({
        title: "Service connected",
        description: "Your service has been successfully connected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to connect service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectService = useMutation({
    mutationFn: async (serviceName: string) => {
      await apiRequest("POST", `/api/connected-services/${serviceName}/disconnect`);
    },
    onSuccess: (_, serviceName) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connected-services"] });
      toast({
        title: "Service disconnected",
        description: `${formatServiceName(serviceName)} has been disconnected.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to disconnect service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatServiceName = (name: string): string => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleConnectAppleHealth = () => {
    // In a real implementation, this would handle the OAuth flow
    // For now, we'll simulate it with mock auth data
    connectService.mutate({ 
      serviceName: "apple_health",
      authData: { connected: true }
    });
  };

  // Services to display
  const services = [
    {
      name: "apple_health",
      displayName: "Apple Health",
      description: "Connect your Apple Health data",
    },
    {
      name: "my_health_records",
      displayName: "My Health Records",
      description: "Import your medical records",
    },
    {
      name: "lab_partner",
      displayName: "Lab Partner",
      description: "Auto-import lab results",
    },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-neutral-800 mb-4">Connected Services</h2>
      <Card>
        <CardHeader className="p-5 border-b border-neutral-100">
          <CardDescription>
            Link your devices and healthcare services to get more insights
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="border border-neutral-100 rounded-lg p-4 flex items-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="ml-4 flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                ))
            : services.map((service) => {
                const connectedService = connectedServices?.find(
                  (cs: any) => cs.serviceName === service.name
                );
                const isConnected = connectedService?.isConnected;
                
                return (
                  <div key={service.name} className="border border-neutral-100 rounded-lg p-4 flex items-center">
                    <ServiceIcon serviceName={service.name} />
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-neutral-800">{service.displayName}</p>
                        {isConnected ? (
                          <Badge variant="success" className="font-normal">
                            Connected
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              if (service.name === "apple_health") {
                                handleConnectAppleHealth();
                              } else {
                                connectService.mutate({ serviceName: service.name });
                              }
                            }}
                            disabled={connectService.isPending}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-neutral-500 mt-1">
                          {isConnected
                            ? `Last sync: ${
                                connectedService.lastSynced
                                  ? formatDistanceToNow(new Date(connectedService.lastSynced), {
                                      addSuffix: true,
                                    })
                                  : "Never"
                              }`
                            : service.description}
                        </p>
                        {isConnected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs hover:text-destructive"
                            onClick={() => disconnectService.mutate(service.name)}
                            disabled={disconnectService.isPending}
                          >
                            Disconnect
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
        </CardContent>
      </Card>
    </div>
  );
}
