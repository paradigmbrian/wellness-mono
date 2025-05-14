import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Use returnNull for 401 errors instead of throwing
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
