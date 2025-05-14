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

export const insertConnectedServiceSchema = createInsertSchema(connectedServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define types for each table
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResults.$inferSelect;

export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type HealthMetric = typeof healthMetrics.$inferSelect;

export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;

export type InsertHealthEvent = z.infer<typeof insertHealthEventSchema>;
export type HealthEvent = typeof healthEvents.$inferSelect;

export type InsertConnectedService = z.infer<typeof insertConnectedServiceSchema>;
export type ConnectedService = typeof connectedServices.$inferSelect;
