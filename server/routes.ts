import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateHealthInsights, analyzeLabResults, generateHealthPlan, extractBloodworkMarkers } from "./openai";
import { 
  createCustomer,
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  SUBSCRIPTION_PRICES
} from "./stripe";
import { uploadFileToS3, deleteFileFromS3 } from "./aws-s3";
import multer from "multer";
import path from "path";
import fs from "fs";

// Setup multer for file uploads
const upload = multer({ 
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/json',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, TIFF, JSON, CSV, and Excel files are allowed.'), false);
    }
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Subscription routes
  app.post('/api/subscription/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tier, billingPeriod } = req.body;
      
      // Construct the full price key based on tier and billing period
      const priceKey = `${tier}_${billingPeriod || 'monthly'}`;
      
      if (!Object.keys(SUBSCRIPTION_PRICES).includes(priceKey)) {
        return res.status(400).json({ message: "Invalid subscription tier or billing period" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create or get customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await createCustomer(user.email || `user-${userId}@example.com`, 
          user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined);
        stripeCustomerId = customer.id;
      }
      
      // Create subscription
      // Ensure the price key exists in SUBSCRIPTION_PRICES
      if (!SUBSCRIPTION_PRICES[priceKey as keyof typeof SUBSCRIPTION_PRICES]) {
        return res.status(400).json({ message: `Invalid price key: ${priceKey}` });
      }
      
      const subscription = await createSubscription(
        stripeCustomerId, 
        SUBSCRIPTION_PRICES[priceKey as keyof typeof SUBSCRIPTION_PRICES]
      );
      
      // Extract the base tier name without the billing period suffix
      const baseTier = tier;
      
      // Update user with subscription info
      await storage.updateUserSubscription(
        userId,
        stripeCustomerId,
        subscription.id,
        subscription.status,
        baseTier
      );
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: `Failed to create subscription: ${error.message}` });
    }
  });
  
  app.post('/api/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      
      await cancelSubscription(user.stripeSubscriptionId);
      
      // Update user subscription status
      await storage.updateUserSubscription(
        userId,
        user.stripeCustomerId || "",
        user.stripeSubscriptionId,
        "canceled",
        "free"
      );
      
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: `Failed to cancel subscription: ${error.message}` });
    }
  });

  // Lab results routes
  app.get('/api/lab-results', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await storage.getLabResults(userId);
      res.json(results);
    } catch (error: any) {
      console.error("Error fetching lab results:", error);
      res.status(500).json({ message: `Failed to fetch lab results: ${error.message}` });
    }
  });
  
  app.get('/api/lab-results/:id', isAuthenticated, async (req: any, res) => {
    try {
      const labResult = await storage.getLabResult(Number(req.params.id));
      
      if (!labResult) {
        return res.status(404).json({ message: "Lab result not found" });
      }
      
      if (labResult.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized access to lab result" });
      }
      
      res.json(labResult);
    } catch (error: any) {
      console.error("Error fetching lab result:", error);
      res.status(500).json({ message: `Failed to fetch lab result: ${error.message}` });
    }
  });
  
  app.post('/api/lab-results/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, resultDate, category } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Upload the file to S3 with user ID in the path
      const s3FileUrl = await uploadFileToS3(
        req.file.path,
        req.file.mimetype,
        req.file.originalname,
        userId
      );
      
      console.log(`File uploaded to S3: ${s3FileUrl}`);
      
      // Prepare initial data structure with category if provided
      const initialData = category ? { category } : {};
      
      // Create the lab result entry with S3 URL
      const labResult = await storage.createLabResult({
        userId,
        title,
        description,
        fileUrl: s3FileUrl,
        resultDate: resultDate ? new Date(resultDate) : undefined,
        status: 'pending',
        processed: false,
        data: initialData
      });
      
      // If there's JSON data, try to analyze it or merge with existing data
      if (req.body.data) {
        try {
          let analysisData;
          try {
            const parsedData = JSON.parse(req.body.data);
            analysisData = await analyzeLabResults(parsedData);
          } catch (parseErr) {
            // If not parseable or analysis fails, keep existing data with category
            analysisData = initialData;
          }
          
          // Update the lab result with the analysis
          await storage.updateLabResult(labResult.id, {
            status: analysisData.status || 'pending',
            data: analysisData
          });
          
          // Create an AI insight if this is a bloodwork result with abnormal findings
          if (analysisData && 
              typeof analysisData === 'object' && 
              'status' in analysisData && 
              'interpretation' in analysisData && 
              analysisData.status !== 'normal') {
            await storage.createAiInsight({
              userId,
              content: `Your lab result "${title}" has been analyzed and requires attention. ${analysisData.interpretation}`,
              category: 'lab_results',
              severity: analysisData.status === 'abnormal' ? 'alert' : 'warning'
            });
          }
        } catch (err) {
          console.error("Error analyzing lab data:", err);
          // Continue without analysis
        }
      }
      
      res.json(labResult);
    } catch (error: any) {
      console.error("Error uploading lab result:", error);
      
      // Clean up temporary file if it exists
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: `Failed to upload lab result: ${error.message}` });
    }
  });
  
  app.delete('/api/lab-results/:id', isAuthenticated, async (req: any, res) => {
    try {
      const labResult = await storage.getLabResult(Number(req.params.id));
      
      if (!labResult) {
        return res.status(404).json({ message: "Lab result not found" });
      }
      
      if (labResult.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized access to lab result" });
      }
      
      // Delete the file from S3 if it exists
      if (labResult.fileUrl && labResult.fileUrl.includes('s3.amazonaws.com')) {
        try {
          await deleteFileFromS3(labResult.fileUrl);
          console.log(`File deleted from S3: ${labResult.fileUrl}`);
        } catch (s3Error) {
          console.error("Error deleting file from S3:", s3Error);
          // Continue with deletion even if S3 deletion fails
        }
      } 
      // Fallback for local files (transitional period)
      else if (labResult.fileUrl && labResult.fileUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), labResult.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deleteLabResult(labResult.id);
      res.json({ message: "Lab result deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting lab result:", error);
      res.status(500).json({ message: `Failed to delete lab result: ${error.message}` });
    }
  });

  // Bloodwork markers routes
  app.get('/api/bloodwork-markers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate, name } = req.query;
      
      let markers;
      if (name) {
        markers = await storage.getBloodworkMarkersByName(userId, name as string);
      } else {
        markers = await storage.getBloodworkMarkers(
          userId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      }
      
      res.json(markers);
    } catch (error: any) {
      console.error("Error fetching bloodwork markers:", error);
      res.status(500).json({ message: `Failed to fetch bloodwork markers: ${error.message}` });
    }
  });
  
  app.get('/api/lab-results/:id/bloodwork-markers', isAuthenticated, async (req: any, res) => {
    try {
      const labResultId = Number(req.params.id);
      const labResult = await storage.getLabResult(labResultId);
      
      if (!labResult) {
        return res.status(404).json({ message: "Lab result not found" });
      }
      
      if (labResult.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized access to lab result data" });
      }
      
      const markers = await storage.getBloodworkMarkersByLabResult(labResultId);
      res.json(markers);
    } catch (error: any) {
      console.error("Error fetching bloodwork markers for lab result:", error);
      res.status(500).json({ message: `Failed to fetch bloodwork markers: ${error.message}` });
    }
  });
  
  // Background task to process lab results and extract bloodwork markers
  app.post('/api/lab-results/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Find unprocessed lab results for this user
      const labResults = await storage.getLabResults(userId);
      const unprocessedResults = labResults.filter(result => 
        !result.processed && result.fileUrl && result.fileUrl.length > 0
      );
      
      if (unprocessedResults.length === 0) {
        return res.json({ message: "No unprocessed lab results found", count: 0 });
      }
      
      // Process each unprocessed result
      const processPromises = unprocessedResults.map(async (labResult) => {
        try {
          console.log(`Processing lab result ${labResult.id} from ${labResult.fileUrl}`);
          
          // Skip if no file URL
          if (!labResult.fileUrl) {
            console.error(`Lab result ${labResult.id} has no file URL`);
            await storage.updateLabResultProcessed(labResult.id, true);
            return null;
          }
          
          // Extract markers from the lab result file using a properly formatted date
          const resultDate = labResult.resultDate || 
                            new Date(labResult.uploadedAt).toISOString().split('T')[0];
          
          const markers = await extractBloodworkMarkers(
            labResult.fileUrl, 
            labResult.userId,
            labResult.id,
            resultDate
          );
          
          if (markers && markers.length > 0) {
            // Store the extracted markers
            const storedMarkers = await storage.batchCreateBloodworkMarkers(markers);
            console.log(`Created ${storedMarkers.length} bloodwork markers for lab result ${labResult.id}`);
            
            // Create an insight if any abnormal values were found
            const abnormalMarkers = storedMarkers.filter(marker => marker.isAbnormal);
            if (abnormalMarkers.length > 0) {
              const markerNames = abnormalMarkers.map(m => m.name).join(', ');
              await storage.createAiInsight({
                userId,
                content: `Found ${abnormalMarkers.length} abnormal values in your lab result "${labResult.title}": ${markerNames}`,
                category: 'lab_results',
                severity: 'warning'
              });
            }
            
            // Mark the lab result as processed
            await storage.updateLabResultProcessed(labResult.id, true);
            return { labResultId: labResult.id, processed: true, markerCount: storedMarkers.length };
          } else {
            // No markers were found, but still mark as processed to avoid repeated attempts
            await storage.updateLabResultProcessed(labResult.id, true);
            return { labResultId: labResult.id, processed: true, markerCount: 0 };
          }
        } catch (error) {
          console.error(`Error processing lab result ${labResult.id}:`, error);
          return { labResultId: labResult.id, processed: false, error: error.message };
        }
      });
      
      const results = await Promise.all(processPromises);
      res.json({ 
        message: "Processed lab results", 
        count: results.length,
        results
      });
    } catch (error: any) {
      console.error("Error processing lab results:", error);
      res.status(500).json({ message: `Failed to process lab results: ${error.message}` });
    }
  });

  // Health metrics routes
  app.get('/api/health-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const metrics = await storage.getHealthMetrics(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching health metrics:", error);
      res.status(500).json({ message: `Failed to fetch health metrics: ${error.message}` });
    }
  });
  
  app.get('/api/health-metrics/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const metric = await storage.getLatestHealthMetric(userId);
      res.json(metric || null);
    } catch (error: any) {
      console.error("Error fetching latest health metric:", error);
      res.status(500).json({ message: `Failed to fetch latest health metric: ${error.message}` });
    }
  });
  
  app.post('/api/health-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const metricData = req.body;
      
      // Add userId to the metric data
      metricData.userId = userId;
      
      const metric = await storage.createHealthMetric(metricData);
      res.json(metric);
    } catch (error: any) {
      console.error("Error creating health metric:", error);
      res.status(500).json({ message: `Failed to create health metric: ${error.message}` });
    }
  });
  
  app.post('/api/health-metrics/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { metrics } = req.body;
      
      if (!Array.isArray(metrics)) {
        return res.status(400).json({ message: "Invalid metrics data. Expected an array." });
      }
      
      // Add userId to each metric
      const metricsWithUserId = metrics.map(metric => ({
        ...metric,
        userId
      }));
      
      const createdMetrics = await storage.batchCreateHealthMetrics(metricsWithUserId);
      res.json(createdMetrics);
    } catch (error: any) {
      console.error("Error creating batch health metrics:", error);
      res.status(500).json({ message: `Failed to create batch health metrics: ${error.message}` });
    }
  });

  // AI Insights routes
  app.get('/api/ai-insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      
      const insights = await storage.getAiInsights(userId, limit);
      res.json(insights);
    } catch (error: any) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ message: `Failed to fetch AI insights: ${error.message}` });
    }
  });
  
  app.post('/api/ai-insights/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user health data
      const healthMetrics = await storage.getHealthMetrics(userId);
      const labResults = await storage.getLabResults(userId);
      
      // Generate insights
      const { insights } = await generateHealthInsights(healthMetrics, labResults);
      
      // Save insights to database
      const savedInsights = [];
      for (const insight of insights) {
        const savedInsight = await storage.createAiInsight({
          userId,
          content: insight.content,
          category: insight.category,
          severity: insight.severity
        });
        savedInsights.push(savedInsight);
      }
      
      res.json(savedInsights);
    } catch (error: any) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ message: `Failed to generate AI insights: ${error.message}` });
    }
  });
  
  app.post('/api/ai-insights/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markAiInsightAsRead(Number(req.params.id));
      res.json({ message: "Insight marked as read" });
    } catch (error: any) {
      console.error("Error marking insight as read:", error);
      res.status(500).json({ message: `Failed to mark insight as read: ${error.message}` });
    }
  });

  // Health events routes
  app.get('/api/health-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const events = await storage.getHealthEvents(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching health events:", error);
      res.status(500).json({ message: `Failed to fetch health events: ${error.message}` });
    }
  });
  
  app.post('/api/health-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = req.body;
      
      // Add userId to the event data
      eventData.userId = userId;
      
      const event = await storage.createHealthEvent(eventData);
      res.json(event);
    } catch (error: any) {
      console.error("Error creating health event:", error);
      res.status(500).json({ message: `Failed to create health event: ${error.message}` });
    }
  });
  
  app.put('/api/health-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = Number(req.params.id);
      const userId = req.user.claims.sub;
      const eventData = req.body;
      
      // Ensure the event belongs to the user
      const event = await storage.updateHealthEvent(eventId, {
        ...eventData,
        userId
      });
      
      if (!event) {
        return res.status(404).json({ message: "Health event not found" });
      }
      
      res.json(event);
    } catch (error: any) {
      console.error("Error updating health event:", error);
      res.status(500).json({ message: `Failed to update health event: ${error.message}` });
    }
  });
  
  app.delete('/api/health-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = Number(req.params.id);
      
      const success = await storage.deleteHealthEvent(eventId);
      
      if (!success) {
        return res.status(404).json({ message: "Health event not found" });
      }
      
      res.json({ message: "Health event deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting health event:", error);
      res.status(500).json({ message: `Failed to delete health event: ${error.message}` });
    }
  });

  // Connected services routes
  app.get('/api/connected-services', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const services = await storage.getConnectedServices(userId);
      res.json(services);
    } catch (error: any) {
      console.error("Error fetching connected services:", error);
      res.status(500).json({ message: `Failed to fetch connected services: ${error.message}` });
    }
  });
  
  app.post('/api/connected-services/:serviceName/connect', isAuthenticated, async (req: any, res) => {
    const { serviceName } = req.params;
    try {
      const userId = req.user.claims.sub;
      const { authData } = req.body;
      
      const service = await storage.upsertConnectedService({
        userId,
        serviceName,
        isConnected: true,
        lastSynced: new Date(),
        authData
      });
      
      res.json(service);
    } catch (error: any) {
      console.error(`Error connecting ${serviceName}:`, error);
      res.status(500).json({ message: `Failed to connect ${serviceName}: ${error.message}` });
    }
  });
  
  // Apple Health data sync endpoint
  app.post('/api/connected-services/apple_health/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ message: "No Apple Health data provided" });
      }
      
      // Import the necessary functions from the apple-health module
      const { validateAppleHealthData, processAppleHealthData } = await import('./apple-health');
      
      // Validate the incoming data
      const validatedData = validateAppleHealthData(data);
      
      // Process the Apple Health data
      const result = await processAppleHealthData(userId, validatedData);
      
      // Update the connected service record
      await storage.upsertConnectedService({
        userId,
        serviceName: 'apple_health',
        isConnected: true,
        lastSynced: new Date()
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing Apple Health data:", error);
      res.status(500).json({ message: `Failed to sync Apple Health data: ${error.message}` });
    }
  });
  
  app.post('/api/connected-services/:serviceName/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { serviceName } = req.params;
      
      const success = await storage.disconnectService(userId, serviceName);
      
      if (!success) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json({ message: `${serviceName} disconnected successfully` });
    } catch (error: any) {
      console.error(`Error disconnecting ${req.params.serviceName}:`, error);
      res.status(500).json({ message: `Failed to disconnect ${req.params.serviceName}: ${error.message}` });
    }
  });

  // Health plan route
  app.get('/api/health-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user health data
      const user = await storage.getUser(userId);
      const healthMetrics = await storage.getHealthMetrics(userId);
      const labResults = await storage.getLabResults(userId);
      const insights = await storage.getAiInsights(userId);
      
      // Generate health plan
      const userData = {
        user,
        healthMetrics,
        labResults,
        insights
      };
      
      const healthPlan = await generateHealthPlan(userData);
      res.json(healthPlan);
    } catch (error: any) {
      console.error("Error generating health plan:", error);
      res.status(500).json({ message: `Failed to generate health plan: ${error.message}` });
    }
  });

  // Workout routes
  app.get('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const workouts = await storage.getWorkouts(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      
      res.json(workouts);
    } catch (error: any) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: `Failed to fetch workouts: ${error.message}` });
    }
  });
  
  app.get('/api/workouts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      const workout = await storage.getWorkoutById(workoutId);
      
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Security check - make sure the workout belongs to the current user
      if (workout.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(workout);
    } catch (error: any) {
      console.error("Error fetching workout:", error);
      res.status(500).json({ message: `Failed to fetch workout: ${error.message}` });
    }
  });
  
  app.post('/api/workouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workoutData = req.body;
      
      const workout = await storage.createWorkout({
        ...workoutData,
        userId
      });
      
      res.status(201).json(workout);
    } catch (error: any) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: `Failed to create workout: ${error.message}` });
    }
  });
  
  app.put('/api/workouts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      const existingWorkout = await storage.getWorkoutById(workoutId);
      
      if (!existingWorkout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Security check - make sure the workout belongs to the current user
      if (existingWorkout.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedWorkout = await storage.updateWorkout(workoutId, req.body);
      res.json(updatedWorkout);
    } catch (error: any) {
      console.error("Error updating workout:", error);
      res.status(500).json({ message: `Failed to update workout: ${error.message}` });
    }
  });
  
  app.delete('/api/workouts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      const existingWorkout = await storage.getWorkoutById(workoutId);
      
      if (!existingWorkout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Security check - make sure the workout belongs to the current user
      if (existingWorkout.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deleteWorkout(workoutId);
      
      if (success) {
        res.json({ message: "Workout deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete workout" });
      }
    } catch (error: any) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ message: `Failed to delete workout: ${error.message}` });
    }
  });
  
  // Workout Sets routes
  app.get('/api/workouts/:workoutId/sets', isAuthenticated, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.workoutId);
      const workout = await storage.getWorkoutById(workoutId);
      
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Security check - make sure the workout belongs to the current user
      if (workout.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const sets = await storage.getWorkoutSets(workoutId);
      res.json(sets);
    } catch (error: any) {
      console.error("Error fetching workout sets:", error);
      res.status(500).json({ message: `Failed to fetch workout sets: ${error.message}` });
    }
  });
  
  app.post('/api/workouts/:workoutId/sets', isAuthenticated, async (req: any, res) => {
    try {
      const workoutId = parseInt(req.params.workoutId);
      const workout = await storage.getWorkoutById(workoutId);
      
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Security check - make sure the workout belongs to the current user
      if (workout.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Handle single set or batch creation
      if (Array.isArray(req.body)) {
        // Batch create
        const setsData = req.body.map(set => ({
          ...set,
          workoutId
        }));
        
        const sets = await storage.batchCreateWorkoutSets(setsData);
        res.status(201).json(sets);
      } else {
        // Single set
        const setData = req.body;
        const set = await storage.createWorkoutSet({
          ...setData,
          workoutId
        });
        
        res.status(201).json(set);
      }
    } catch (error: any) {
      console.error("Error creating workout set:", error);
      res.status(500).json({ message: `Failed to create workout set: ${error.message}` });
    }
  });
  
  app.put('/api/workout-sets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const setId = parseInt(req.params.id);
      const workoutSet = await storage.updateWorkoutSet(setId, req.body);
      
      if (!workoutSet) {
        return res.status(404).json({ message: "Workout set not found" });
      }
      
      // Get the parent workout to check ownership
      const workout = await storage.getWorkoutById(workoutSet.workoutId);
      
      if (!workout || workout.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(workoutSet);
    } catch (error: any) {
      console.error("Error updating workout set:", error);
      res.status(500).json({ message: `Failed to update workout set: ${error.message}` });
    }
  });
  
  app.delete('/api/workout-sets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const setId = parseInt(req.params.id);
      const success = await storage.deleteWorkoutSet(setId);
      
      if (success) {
        res.json({ message: "Workout set deleted successfully" });
      } else {
        res.status(404).json({ message: "Workout set not found" });
      }
    } catch (error: any) {
      console.error("Error deleting workout set:", error);
      res.status(500).json({ message: `Failed to delete workout set: ${error.message}` });
    }
  });

  // Create an HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
