import { storage } from "./storage";
import { InsertHealthMetric } from "@shared/schema";

// Types for Apple Health data
export interface AppleHealthData {
  activities?: Activity[];
  sleepAnalysis?: SleepAnalysis[];
  bodyMass?: BodyMeasurement[];
  activeEnergy?: ActiveEnergy[];
  basalEnergy?: BasalEnergy[];
  nutrition?: NutritionData[];
  heartRate?: HeartRateData[];
}

interface Activity {
  date: string;
  steps: number;
  activeEnergyBurned: number;
  activeMinutes: number;
}

interface SleepAnalysis {
  date: string;
  totalSleepDuration: number;
  deepSleepDuration: number;
  lightSleepDuration: number;
}

interface BodyMeasurement {
  date: string;
  weight: number; // in pounds
}

interface ActiveEnergy {
  date: string;
  calories: number;
}

interface BasalEnergy {
  date: string;
  calories: number;
}

interface NutritionData {
  date: string;
  protein: number; // in grams
  carbs: number; // in grams
  fats: number; // in grams
}

interface HeartRateData {
  date: string;
  restingHeartRate: number;
}

/**
 * Process Apple Health data for a user
 * @param userId The user ID
 * @param healthData The Apple Health data to process
 * @returns A summary of the processed data
 */
export async function processAppleHealthData(userId: string, healthData: AppleHealthData): Promise<{
  metricsAdded: number;
  daysProcessed: number;
  summary: string;
}> {
  try {
    // Track metrics for each day
    const dailyMetrics: Map<string, InsertHealthMetric> = new Map();

    // Process activities data (steps, active minutes)
    if (healthData.activities && healthData.activities.length > 0) {
      for (const activity of healthData.activities) {
        if (!dailyMetrics.has(activity.date)) {
          dailyMetrics.set(activity.date, {
            userId,
            date: activity.date,
            source: "apple_health",
          });
        }
        
        const metric = dailyMetrics.get(activity.date)!;
        metric.steps = activity.steps;
        metric.activeMinutes = activity.activeMinutes;
        
        // Active calories
        if (activity.activeEnergyBurned) {
          metric.caloriesBurned = activity.activeEnergyBurned;
        }
      }
    }

    // Process sleep data
    if (healthData.sleepAnalysis && healthData.sleepAnalysis.length > 0) {
      for (const sleep of healthData.sleepAnalysis) {
        if (!dailyMetrics.has(sleep.date)) {
          dailyMetrics.set(sleep.date, {
            userId,
            date: sleep.date,
            source: "apple_health",
          });
        }
        
        const metric = dailyMetrics.get(sleep.date)!;
        metric.sleepDuration = sleep.totalSleepDuration;
        metric.deepSleepDuration = sleep.deepSleepDuration;
        metric.lightSleepDuration = sleep.lightSleepDuration;
      }
    }

    // Process weight data
    if (healthData.bodyMass && healthData.bodyMass.length > 0) {
      for (const body of healthData.bodyMass) {
        if (!dailyMetrics.has(body.date)) {
          dailyMetrics.set(body.date, {
            userId,
            date: body.date,
            source: "apple_health",
          });
        }
        
        const metric = dailyMetrics.get(body.date)!;
        // numeric in PostgreSQL needs to be a string in our schema
        metric.weight = body.weight.toString();
      }
    }

    // Process heart rate data
    if (healthData.heartRate && healthData.heartRate.length > 0) {
      for (const heart of healthData.heartRate) {
        if (!dailyMetrics.has(heart.date)) {
          dailyMetrics.set(heart.date, {
            userId,
            date: heart.date,
            source: "apple_health",
          });
        }
        
        const metric = dailyMetrics.get(heart.date)!;
        metric.restingHeartRate = heart.restingHeartRate;
      }
    }

    // Process nutrition data
    if (healthData.nutrition && healthData.nutrition.length > 0) {
      for (const nutrition of healthData.nutrition) {
        if (!dailyMetrics.has(nutrition.date)) {
          dailyMetrics.set(nutrition.date, {
            userId,
            date: nutrition.date,
            source: "apple_health",
          });
        }
        
        const metric = dailyMetrics.get(nutrition.date)!;
        metric.protein = nutrition.protein;
        metric.carbs = nutrition.carbs;
        metric.fats = nutrition.fats;
      }
    }

    // Convert the map to an array of metrics
    const metricsArray = Array.from(dailyMetrics.values());
    
    // Store the health metrics in the database
    if (metricsArray.length > 0) {
      await storage.batchCreateHealthMetrics(metricsArray);
    }

    // Generate a summary of the sync
    const summary = `Synced data from Apple Health: ${metricsArray.length} days of data processed. ` +
      `Including steps, activity, sleep, weight, heart rate, and nutrition data.`;

    // Create an insight for the user
    await storage.createAiInsight({
      userId,
      content: `Your Apple Health data has been successfully synced. ${metricsArray.length} days of health data are now available in your dashboard.`,
      category: "activity",
      severity: "success"
    });

    // Update the last synced date
    await storage.upsertConnectedService({
      userId,
      serviceName: "apple_health",
      isConnected: true,
      lastSynced: new Date()
    });

    // Return statistics
    return {
      metricsAdded: metricsArray.length,
      daysProcessed: metricsArray.length,
      summary
    };
  } catch (error) {
    console.error("Error processing Apple Health data:", error);
    throw new Error(`Failed to process Apple Health data: ${error}`);
  }
}

/**
 * Validate Apple Health data structure
 * @param data Data to validate
 */
export function validateAppleHealthData(data: any): AppleHealthData {
  // Basic validation of required structure
  if (!data || typeof data !== "object") {
    throw new Error("Invalid Apple Health data: Expected an object");
  }

  // Create a validated health data object
  const healthData: AppleHealthData = {};

  // Validate activities
  if (data.activities) {
    if (!Array.isArray(data.activities)) {
      throw new Error("Invalid activities data: Expected an array");
    }
    healthData.activities = data.activities.map((activity: any) => ({
      date: validateDate(activity.date),
      steps: validateNumber(activity.steps),
      activeEnergyBurned: validateNumber(activity.activeEnergyBurned),
      activeMinutes: validateNumber(activity.activeMinutes)
    }));
  }

  // Validate sleep
  if (data.sleepAnalysis) {
    if (!Array.isArray(data.sleepAnalysis)) {
      throw new Error("Invalid sleep data: Expected an array");
    }
    healthData.sleepAnalysis = data.sleepAnalysis.map((sleep: any) => ({
      date: validateDate(sleep.date),
      totalSleepDuration: validateNumber(sleep.totalSleepDuration),
      deepSleepDuration: validateNumber(sleep.deepSleepDuration),
      lightSleepDuration: validateNumber(sleep.lightSleepDuration)
    }));
  }

  // Validate body mass
  if (data.bodyMass) {
    if (!Array.isArray(data.bodyMass)) {
      throw new Error("Invalid body mass data: Expected an array");
    }
    healthData.bodyMass = data.bodyMass.map((body: any) => ({
      date: validateDate(body.date),
      weight: validateNumber(body.weight)
    }));
  }

  // Validate heart rate
  if (data.heartRate) {
    if (!Array.isArray(data.heartRate)) {
      throw new Error("Invalid heart rate data: Expected an array");
    }
    healthData.heartRate = data.heartRate.map((heart: any) => ({
      date: validateDate(heart.date),
      restingHeartRate: validateNumber(heart.restingHeartRate)
    }));
  }

  // Validate nutrition
  if (data.nutrition) {
    if (!Array.isArray(data.nutrition)) {
      throw new Error("Invalid nutrition data: Expected an array");
    }
    healthData.nutrition = data.nutrition.map((nutrition: any) => ({
      date: validateDate(nutrition.date),
      protein: validateNumber(nutrition.protein),
      carbs: validateNumber(nutrition.carbs),
      fats: validateNumber(nutrition.fats)
    }));
  }

  return healthData;
}

/**
 * Validate a date string
 */
function validateDate(date: any): string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }
  return date;
}

/**
 * Validate that a value is a number
 */
function validateNumber(value: any): number {
  if (value === undefined || value === null) {
    return 0;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return 0;
  }
  
  return num;
}