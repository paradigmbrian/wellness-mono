import { Switch, Route, Link } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import LabResults from "@/pages/lab-results";
import UploadLabResult from "@/pages/lab-results/upload";
import Activity from "@/pages/activity";
import Insights from "@/pages/insights";
import Settings from "@/pages/settings";
import Subscription from "@/pages/subscription";
import AppleHealth from "@/pages/apple-health";
import WorkoutCalendar from "@/pages/workout-calendar";
import NotFound from "@/pages/not-found";
import { useAuth } from "./hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Create a landing page component
function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Welcome to FitHealth
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your comprehensive health dashboard for tracking fitness metrics, lab results, and getting AI-powered health insights.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            className="px-8 py-6 text-lg font-semibold" 
            size="lg" 
            onClick={() => window.location.href = "/api/login"}
          >
            Sign In
          </Button>
          <Button 
            className="px-8 py-6 text-lg font-semibold" 
            variant="outline" 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
          >
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
}

// Create a protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Landing />;
  }
  
  return <Component />;
}

function App() {
  return (
    <TooltipProvider>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/lab-results" component={() => <ProtectedRoute component={LabResults} />} />
        <Route path="/lab-results/upload" component={() => <ProtectedRoute component={UploadLabResult} />} />
        <Route path="/activity" component={() => <ProtectedRoute component={Activity} />} />
        <Route path="/insights" component={() => <ProtectedRoute component={Insights} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route path="/subscription" component={() => <ProtectedRoute component={Subscription} />} />
        <Route path="/apple-health" component={() => <ProtectedRoute component={AppleHealth} />} />
        <Route path="/workout-calendar" component={() => <ProtectedRoute component={WorkoutCalendar} />} />
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  );
}

export default App;
