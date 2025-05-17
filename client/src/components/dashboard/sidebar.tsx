import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  LucideIcon,
  CheckCircle,
  Settings,
  LogOut,
  Heart,
  Calendar,
} from "lucide-react";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isActive?: boolean;
}

function SidebarLink({ href, icon: Icon, children, isActive }: SidebarLinkProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-md font-medium transition-colors cursor-pointer",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-neutral-700 hover:bg-neutral-50"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{children}</span>
      </div>
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className="md:w-64 bg-white border-r border-neutral-100 md:flex flex-col hidden">
      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-neutral-800">FitHealth</h1>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2">
        <div className="space-y-1">
          <SidebarLink
            href="/"
            icon={LayoutDashboard}
            isActive={location === "/" || location === "/dashboard"}
          >
            Dashboard
          </SidebarLink>

          <SidebarLink
            href="/lab-results"
            icon={FileText}
            isActive={location === "/lab-results"}
          >
            Lab Results
          </SidebarLink>

          <SidebarLink 
            href="/activity" 
            icon={BarChart3}
            isActive={location === "/activity"}
          >
            Activity
          </SidebarLink>

          <SidebarLink
            href="/workout-calendar"
            icon={Calendar}
            isActive={location === "/workout-calendar"}
          >
            Workout Calendar
          </SidebarLink>

          <SidebarLink
            href="/insights"
            icon={CheckCircle}
            isActive={location === "/insights"}
          >
            Insights
          </SidebarLink>

          <SidebarLink
            href="/settings"
            icon={Settings}
            isActive={location === "/settings"}
          >
            Settings
          </SidebarLink>
        </div>
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <div className="bg-neutral-50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-neutral-200 overflow-hidden">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                  {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "User"}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {user?.subscriptionTier === "pro" ? "Pro Plan" : 
                user?.subscriptionTier === "premium" ? "Premium Plan" : 
                  user?.subscriptionTier === "basic" ? "Basic Plan" : "Free Plan"}
            </span>
            <button 
              onClick={() => window.location.href = "/api/logout"} 
              className="text-neutral-500 hover:text-neutral-700"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
