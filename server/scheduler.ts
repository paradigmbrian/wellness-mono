/**
 * Simple in-memory scheduler for periodic tasks
 * In a production environment, this would be replaced with a proper job queue system
 */

import { storage } from "./storage";
import { processAppleHealthData } from "./apple-health";

type TaskFunction = () => Promise<void>;
type ScheduledTask = {
  id: string;
  interval: number; // milliseconds
  lastRun: number; // timestamp
  fn: TaskFunction;
  isRunning: boolean;
};

class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Check tasks every minute
    this.intervalId = setInterval(() => this.checkTasks(), 60 * 1000);
  }

  /**
   * Register a task to run at a specific interval
   */
  scheduleTask(id: string, intervalMinutes: number, fn: TaskFunction): void {
    this.tasks.set(id, {
      id,
      interval: intervalMinutes * 60 * 1000,
      lastRun: Date.now(),
      fn,
      isRunning: false
    });

    console.log(`Scheduled task "${id}" to run every ${intervalMinutes} minutes`);
  }

  /**
   * Remove a scheduled task
   */
  removeTask(id: string): void {
    this.tasks.delete(id);
  }

  /**
   * Check if any tasks need to be run
   */
  private async checkTasks(): Promise<void> {
    const now = Date.now();

    // Convert to array to avoid iterator issues
    const tasks = Array.from(this.tasks.entries());

    for (const [id, task] of tasks) {
      if (task.isRunning) continue;

      const timeSinceLastRun = now - task.lastRun;
      if (timeSinceLastRun >= task.interval) {
        try {
          // Mark task as running
          task.isRunning = true;
          
          console.log(`Running scheduled task "${id}"`);
          await task.fn();
          
          // Update last run time
          task.lastRun = Date.now();
        } catch (error) {
          console.error(`Error running scheduled task "${id}":`, error);
        } finally {
          // Mark task as finished
          task.isRunning = false;
        }
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Create scheduler instance
const scheduler = new Scheduler();

/**
 * Initialize scheduled tasks
 */
export function initScheduledTasks(): void {
  // Schedule daily Apple Health sync for all connected users
  // This runs once a day (1440 minutes) and syncs data for all users
  scheduler.scheduleTask('daily-apple-health-sync', 1440, async () => {
    try {
      console.log("Running daily Apple Health sync for all users...");
      
      // Get all users with connected Apple Health
      const allConnectedServices = await storage.getAllConnectedServices();
      const appleHealthUsers = allConnectedServices
        .filter(service => service.serviceName === 'apple_health' && service.isConnected === true);

      console.log(`Found ${appleHealthUsers.length} users with Apple Health connected`);
      
      // For each user, check if they have automatic sync enabled
      for (const service of appleHealthUsers) {
        const userId = service.userId;
        const authData = service.authData as { autoSync?: boolean; lastSyncData?: any };
        
        if (authData?.autoSync) {
          console.log(`Running auto-sync for user ${userId}`);
          
          try {
            // Retrieve the latest data from storage (in a real implementation,
            // this would come from the Apple HealthKit API)
            const latestData = authData.lastSyncData || {};
            
            // Process the data
            await processAppleHealthData(userId, latestData);
            
            // Update last synced timestamp
            await storage.upsertConnectedService({
              userId,
              serviceName: 'apple_health',
              lastSynced: new Date(),
              isConnected: true
            });
            
            console.log(`Auto-sync completed for user ${userId}`);
          } catch (error) {
            console.error(`Error syncing Apple Health data for user ${userId}:`, error);
          }
        }
      }
      
      console.log("Daily Apple Health sync completed");
    } catch (error) {
      console.error("Error in daily Apple Health sync:", error);
    }
  });
}

export default scheduler;