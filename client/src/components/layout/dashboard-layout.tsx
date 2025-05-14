import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader, MobileNavigation } from "@/components/dashboard/mobile-nav";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Mobile header */}
      <MobileHeader />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">{title}</h1>
            {description && <p className="text-neutral-500 mt-1">{description}</p>}
          </div>

          {/* Page content */}
          {children}
        </div>
      </main>

      {/* Mobile navigation */}
      <MobileNavigation />
    </div>
  );
}
