import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  CheckCircle, 
  User,
  Menu 
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileHeader() {
  return (
    <div className="md:hidden bg-white border-b border-neutral-100 sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-neutral-800">FitHealth</h1>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-neutral-500">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export function MobileNavigation() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-100 z-10">
      <div className="grid grid-cols-5 h-16">
        <Link href="/">
          <a className={`flex flex-col items-center justify-center ${
            location === "/" || location === "/dashboard" 
              ? "text-primary" 
              : "text-neutral-500"
          }`}>
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-xs mt-1">Dashboard</span>
          </a>
        </Link>

        <Link href="/lab-results">
          <a className={`flex flex-col items-center justify-center ${
            location === "/lab-results" 
              ? "text-primary" 
              : "text-neutral-500"
          }`}>
            <FileText className="h-6 w-6" />
            <span className="text-xs mt-1">Lab Results</span>
          </a>
        </Link>

        <Link href="/insights">
          <a className={`flex flex-col items-center justify-center ${
            location === "/insights" 
              ? "text-primary" 
              : "text-neutral-500"
          }`}>
            <CheckCircle className="h-6 w-6" />
            <span className="text-xs mt-1">Insights</span>
          </a>
        </Link>

        <Link href="/activity">
          <a className={`flex flex-col items-center justify-center ${
            location === "/activity" 
              ? "text-primary" 
              : "text-neutral-500"
          }`}>
            <BarChart3 className="h-6 w-6" />
            <span className="text-xs mt-1">Activity</span>
          </a>
        </Link>

        <Link href="/settings">
          <a className={`flex flex-col items-center justify-center ${
            location === "/settings" 
              ? "text-primary" 
              : "text-neutral-500"
          }`}>
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </a>
        </Link>
      </div>
    </div>
  );
}
