import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WelcomeCard } from "@/components/dashboard/welcome-card";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { ActivityCard } from "@/components/dashboard/activity-card";
import { SleepCard } from "@/components/dashboard/sleep-card";
import { NutritionCard } from "@/components/dashboard/nutrition-card";
import { HealthTrends } from "@/components/dashboard/health-trends";
import { LabResultsCard } from "@/components/dashboard/lab-results-card";
import { AiInsightsCard } from "@/components/dashboard/ai-insights-card";
import { HealthCalendar } from "@/components/dashboard/health-calendar";
import { ConnectedServices } from "@/components/dashboard/connected-services";
import { SubscriptionInfo } from "@/components/dashboard/subscription-info";

export default function Dashboard() {
  return (
    <DashboardLayout
      title="Dashboard"
      description="Your health metrics at a glance"
    >
      {/* Welcome card */}
      <WelcomeCard />

      {/* Health score overview */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <HealthScoreCard />
        <ActivityCard />
        <SleepCard />
        <NutritionCard />
      </div>

      {/* Health trends section */}
      <HealthTrends />

      {/* Three-column layout */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <LabResultsCard />
        <AiInsightsCard />
        <HealthCalendar />
      </div>

      {/* Connected services */}
      <ConnectedServices />

      {/* Subscription info */}
      <SubscriptionInfo />
    </DashboardLayout>
  );
}
