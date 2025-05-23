import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, varchar, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// Define the bloodworkMarkers table below after the labResults table to avoid circular references

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"),
  subscriptionTier: varchar("subscription_tier").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lab results table
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: varchar("description"),
  fileUrl: varchar("file_url"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  resultDate: date("result_date"),
  status: varchar("status").default("pending"), // pending, normal, review, abnormal
  data: jsonb("data"),
  processed: boolean("processed").default(false), // Track if we've already processed this for markers
});

// Blood work markers table for tracking lab values over time
export const bloodworkMarkers = pgTable("bloodwork_markers", {
  id: serial("id").primaryKey(),
  labResultId: integer("lab_result_id").notNull().references(() => labResults.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(), // e.g., "Cholesterol", "Glucose", "HDL"
  value: varchar("value").notNull(), // The measured value as string to handle diverse formats
  unit: varchar("unit").notNull(), // e.g., "mg/dL", "mmol/L"
  minRange: varchar("min_range"), // Lower end of normal range
  maxRange: varchar("max_range"), // Upper end of normal range
  isAbnormal: boolean("is_abnormal").default(false),
  category: varchar("category"), // e.g., "Lipids", "Metabolic", "Thyroid"
  timestamp: timestamp("timestamp").defaultNow(),
  resultDate: varchar("result_date").notNull(), // String date format for flexibility
});

// Health metrics table
export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  steps: integer("steps"),
  caloriesBurned: integer("calories_burned"),
  restingHeartRate: integer("resting_heart_rate"),
  activeMinutes: integer("active_minutes"),
  weight: numeric("weight"), // in pounds
  sleepDuration: integer("sleep_duration"), // in minutes
  deepSleepDuration: integer("deep_sleep_duration"), // in minutes
  lightSleepDuration: integer("light_sleep_duration"), // in minutes
  protein: integer("protein"), // in grams
  carbs: integer("carbs"), // in grams
  fats: integer("fats"), // in grams
  source: varchar("source").default("manual"), // manual, apple_health, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Insights table
export const aiInsights = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  category: varchar("category").notNull(), // sleep, nutrition, activity, general, etc.
  severity: varchar("severity").default("info"), // info, warning, alert, success
  createdAt: timestamp("created_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

// Health events table
export const healthEvents = pgTable("health_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: varchar("description"),
  date: date("date").notNull(),
  time: varchar("time"),
  location: varchar("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Connected services table
export const connectedServices = pgTable("connected_services", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  serviceName: varchar("service_name").notNull(), // apple_health, lab_partner, my_health_records, etc.
  isConnected: boolean("is_connected").default(false),
  lastSynced: timestamp("last_synced"),
  authData: jsonb("auth_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define insert schemas for each table
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertLabResultSchema = createInsertSchema(labResults).omit({
  id: true,
  processed: true,
});

export const insertBloodworkMarkerSchema = createInsertSchema(bloodworkMarkers).omit({
  id: true,
  timestamp: true,
});

export const insertHealthMetricSchema = createInsertSchema(healthMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertHealthEventSchema = createInsertSchema(healthEvents).omit({
  id: true,
  createdAt: true,
});

// Workouts table
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  startTime: varchar("start_time"), // stored as "HH:MM" format
  endTime: varchar("end_time"),     // stored as "HH:MM" format
  activityType: varchar("activity_type").notNull(), // e.g., "running", "cycling", "strength", etc.
  plannedDistance: numeric("planned_distance"), // in km or miles
  actualDistance: numeric("actual_distance"),   // in km or miles
  plannedDuration: integer("planned_duration"), // in minutes
  actualDuration: integer("actual_duration"),   // in minutes
  intensity: varchar("intensity"), // e.g., "easy", "moderate", "hard"
  feelingScore: integer("feeling_score"), // 1-10 rating
  notes: text("notes"),
  isCompleted: boolean("is_completed").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern"), // e.g., "weekly", "monthly"
  recurringDays: text("recurring_days"),         // e.g., "1,3,5" for Mon,Wed,Fri
  tssScore: integer("tss_score"),                // Training Stress Score
  caloriesBurned: integer("calories_burned"),
  averageHeartRate: integer("average_heart_rate"),
  maxHeartRate: integer("max_heart_rate"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workout Sets table for strength training
export const workoutSets = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull().references(() => workouts.id),
  exerciseName: varchar("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  weight: numeric("weight"), // in kg or lbs
  reps: integer("reps"),
  duration: integer("duration"), // in seconds, for timed exercises
  restTime: integer("rest_time"), // in seconds
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConnectedServiceSchema = createInsertSchema(connectedServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Workout schemas
export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkoutSetSchema = createInsertSchema(workoutSets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types for each table
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResults.$inferSelect;

export type InsertBloodworkMarker = z.infer<typeof insertBloodworkMarkerSchema>;
export type BloodworkMarker = typeof bloodworkMarkers.$inferSelect;

export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type HealthMetric = typeof healthMetrics.$inferSelect;

export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;

export type InsertHealthEvent = z.infer<typeof insertHealthEventSchema>;
export type HealthEvent = typeof healthEvents.$inferSelect;

export type InsertConnectedService = z.infer<typeof insertConnectedServiceSchema>;
export type ConnectedService = typeof connectedServices.$inferSelect;

export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

export type InsertWorkoutSet = z.infer<typeof insertWorkoutSetSchema>;
export type WorkoutSet = typeof workoutSets.$inferSelect;
