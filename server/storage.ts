import { 
  type User, 
  type UpsertUser,
  type LabResult,
  type InsertLabResult,
  type BloodworkMarker,
  type InsertBloodworkMarker,
  type HealthMetric,
  type InsertHealthMetric,
  type AiInsight,
  type InsertAiInsight,
  type HealthEvent,
  type InsertHealthEvent,
  type ConnectedService,
  type InsertConnectedService,
  type Workout,
  type InsertWorkout,
  type WorkoutSet,
  type InsertWorkoutSet
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, stripeCustomerId: string, stripeSubscriptionId: string, status: string, tier: string, expiresAt?: Date): Promise<User>;
  
  // Lab results operations
  getLabResults(userId: string): Promise<LabResult[]>;
  getLabResult(id: number): Promise<LabResult | undefined>;
  createLabResult(labResult: InsertLabResult): Promise<LabResult>;
  updateLabResult(id: number, labResult: Partial<InsertLabResult>): Promise<LabResult | undefined>;
  deleteLabResult(id: number): Promise<boolean>;
  updateLabResultProcessed(id: number, processed: boolean): Promise<LabResult | undefined>;
  
  // Bloodwork markers operations
  getBloodworkMarkers(userId: string, startDate?: Date, endDate?: Date): Promise<BloodworkMarker[]>;
  getBloodworkMarkersByName(userId: string, name: string): Promise<BloodworkMarker[]>;
  getBloodworkMarkersByLabResult(labResultId: number): Promise<BloodworkMarker[]>;
  createBloodworkMarker(marker: InsertBloodworkMarker): Promise<BloodworkMarker>;
  batchCreateBloodworkMarkers(markers: InsertBloodworkMarker[]): Promise<BloodworkMarker[]>;
  
  // Health metrics operations
  getHealthMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<HealthMetric[]>;
  getLatestHealthMetric(userId: string): Promise<HealthMetric | undefined>;
  createHealthMetric(healthMetric: InsertHealthMetric): Promise<HealthMetric>;
  batchCreateHealthMetrics(healthMetrics: InsertHealthMetric[]): Promise<HealthMetric[]>;
  
  // AI Insights operations
  getAiInsights(userId: string, limit?: number): Promise<AiInsight[]>;
  createAiInsight(aiInsight: InsertAiInsight): Promise<AiInsight>;
  markAiInsightAsRead(id: number): Promise<boolean>;
  
  // Health events operations
  getHealthEvents(userId: string, startDate?: Date, endDate?: Date): Promise<HealthEvent[]>;
  createHealthEvent(healthEvent: InsertHealthEvent): Promise<HealthEvent>;
  updateHealthEvent(id: number, healthEvent: Partial<InsertHealthEvent>): Promise<HealthEvent | undefined>;
  deleteHealthEvent(id: number): Promise<boolean>;
  
  // Connected services operations
  getConnectedServices(userId: string): Promise<ConnectedService[]>;
  getAllConnectedServices(): Promise<ConnectedService[]>;
  getConnectedService(userId: string, serviceName: string): Promise<ConnectedService | undefined>;
  upsertConnectedService(connectedService: InsertConnectedService): Promise<ConnectedService>;
  disconnectService(userId: string, serviceName: string): Promise<boolean>;
  
  // Workout operations
  getWorkouts(userId: string, startDate?: string, endDate?: string): Promise<Workout[]>;
  getWorkoutById(id: number): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout | undefined>;
  deleteWorkout(id: number): Promise<boolean>;
  
  // Workout Sets operations
  getWorkoutSets(workoutId: number): Promise<WorkoutSet[]>;
  createWorkoutSet(workoutSet: InsertWorkoutSet): Promise<WorkoutSet>;
  updateWorkoutSet(id: number, workoutSet: Partial<InsertWorkoutSet>): Promise<WorkoutSet | undefined>;
  deleteWorkoutSet(id: number): Promise<boolean>;
  batchCreateWorkoutSets(workoutSets: InsertWorkoutSet[]): Promise<WorkoutSet[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private labResults: Map<number, LabResult> = new Map();
  private bloodworkMarkers: Map<number, BloodworkMarker> = new Map();
  private healthMetrics: Map<number, HealthMetric> = new Map();
  private aiInsights: Map<number, AiInsight> = new Map();
  private healthEvents: Map<number, HealthEvent> = new Map();
  private connectedServices: Map<string, ConnectedService> = new Map();
  private workouts: Map<number, Workout> = new Map();
  private workoutSets: Map<number, WorkoutSet> = new Map();
  
  private nextLabResultId = 1;
  private nextBloodworkMarkerId = 1;
  private nextHealthMetricId = 1;
  private nextAiInsightId = 1;
  private nextHealthEventId = 1;
  private nextConnectedServiceId = 1;
  private nextWorkoutId = 1;
  private nextWorkoutSetId = 1;

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const existingUser = this.users.get(userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      stripeCustomerId: existingUser?.stripeCustomerId || null,
      stripeSubscriptionId: existingUser?.stripeSubscriptionId || null,
      subscriptionStatus: existingUser?.subscriptionStatus || "inactive",
      subscriptionTier: existingUser?.subscriptionTier || "free",
      subscriptionExpiresAt: existingUser?.subscriptionExpiresAt || null,
      createdAt: existingUser?.createdAt || now,
      updatedAt: now
    };
    
    this.users.set(userData.id, user);
    return user;
  }

  async updateUserSubscription(
    userId: string, 
    stripeCustomerId: string, 
    stripeSubscriptionId: string, 
    status: string, 
    tier: string,
    expiresAt?: Date
  ): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: status,
      subscriptionTier: tier,
      subscriptionExpiresAt: expiresAt || null,
      updatedAt: new Date()
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Lab results operations
  async getLabResults(userId: string): Promise<LabResult[]> {
    return Array.from(this.labResults.values())
      .filter(result => result.userId === userId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async getLabResult(id: number): Promise<LabResult | undefined> {
    return this.labResults.get(id);
  }

  async createLabResult(labResult: InsertLabResult): Promise<LabResult> {
    const id = this.nextLabResultId++;
    const now = new Date();
    
    const newLabResult: LabResult = {
      id,
      ...labResult,
      uploadedAt: labResult.uploadedAt || now,
    };
    
    this.labResults.set(id, newLabResult);
    return newLabResult;
  }

  async updateLabResult(id: number, labResult: Partial<InsertLabResult>): Promise<LabResult | undefined> {
    const existingResult = this.labResults.get(id);
    if (!existingResult) {
      return undefined;
    }
    
    const updatedResult: LabResult = {
      ...existingResult,
      ...labResult
    };
    
    this.labResults.set(id, updatedResult);
    return updatedResult;
  }

  async deleteLabResult(id: number): Promise<boolean> {
    return this.labResults.delete(id);
  }
  
  async updateLabResultProcessed(id: number, processed: boolean): Promise<LabResult | undefined> {
    const existingResult = this.labResults.get(id);
    if (!existingResult) {
      return undefined;
    }
    
    const updatedResult: LabResult = {
      ...existingResult,
      processed
    };
    
    this.labResults.set(id, updatedResult);
    return updatedResult;
  }
  
  // Bloodwork markers operations
  async getBloodworkMarkers(userId: string, startDate?: Date, endDate?: Date): Promise<BloodworkMarker[]> {
    const markers = Array.from(this.bloodworkMarkers.values())
      .filter(marker => marker.userId === userId);
    
    if (startDate && endDate) {
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      return markers.filter(marker => {
        const markerDate = new Date(marker.resultDate).getTime();
        return markerDate >= startTimestamp && markerDate <= endTimestamp;
      });
    } else if (startDate) {
      const startTimestamp = startDate.getTime();
      return markers.filter(marker => {
        const markerDate = new Date(marker.resultDate).getTime();
        return markerDate >= startTimestamp;
      });
    } else if (endDate) {
      const endTimestamp = endDate.getTime();
      return markers.filter(marker => {
        const markerDate = new Date(marker.resultDate).getTime();
        return markerDate <= endTimestamp;
      });
    }
    
    return markers;
  }
  
  async getBloodworkMarkersByName(userId: string, name: string): Promise<BloodworkMarker[]> {
    return Array.from(this.bloodworkMarkers.values())
      .filter(marker => marker.userId === userId && marker.name === name)
      .sort((a, b) => {
        const dateA = new Date(a.resultDate).getTime();
        const dateB = new Date(b.resultDate).getTime();
        return dateA - dateB; // Sort by date ascending
      });
  }
  
  async getBloodworkMarkersByLabResult(labResultId: number): Promise<BloodworkMarker[]> {
    return Array.from(this.bloodworkMarkers.values())
      .filter(marker => marker.labResultId === labResultId);
  }
  
  async createBloodworkMarker(marker: InsertBloodworkMarker): Promise<BloodworkMarker> {
    const id = this.nextBloodworkMarkerId++;
    
    const newMarker: BloodworkMarker = {
      id,
      userId: marker.userId,
      labResultId: marker.labResultId,
      name: marker.name,
      value: marker.value,
      unit: marker.unit,
      resultDate: marker.resultDate,
      minRange: marker.minRange || null,
      maxRange: marker.maxRange || null,
      isAbnormal: marker.isAbnormal || false,
      category: marker.category || null,
      timestamp: new Date()
    };
    
    this.bloodworkMarkers.set(id, newMarker);
    return newMarker;
  }
  
  async batchCreateBloodworkMarkers(markers: InsertBloodworkMarker[]): Promise<BloodworkMarker[]> {
    return Promise.all(markers.map(marker => this.createBloodworkMarker(marker)));
  }

  // Health metrics operations
  async getHealthMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<HealthMetric[]> {
    const metrics = Array.from(this.healthMetrics.values())
      .filter(metric => metric.userId === userId);
    
    if (startDate) {
      const startTimestamp = startDate.getTime();
      return metrics.filter(metric => new Date(metric.date).getTime() >= startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = endDate.getTime();
      return metrics.filter(metric => new Date(metric.date).getTime() <= endTimestamp);
    }
    
    return metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getLatestHealthMetric(userId: string): Promise<HealthMetric | undefined> {
    const userMetrics = Array.from(this.healthMetrics.values())
      .filter(metric => metric.userId === userId);
    
    if (userMetrics.length === 0) {
      return undefined;
    }
    
    return userMetrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  async createHealthMetric(healthMetric: InsertHealthMetric): Promise<HealthMetric> {
    const id = this.nextHealthMetricId++;
    const now = new Date();
    
    const newMetric: HealthMetric = {
      id,
      ...healthMetric,
      createdAt: now
    };
    
    this.healthMetrics.set(id, newMetric);
    return newMetric;
  }

  async batchCreateHealthMetrics(healthMetricsData: InsertHealthMetric[]): Promise<HealthMetric[]> {
    const results: HealthMetric[] = [];
    
    for (const metricData of healthMetricsData) {
      const newMetric = await this.createHealthMetric(metricData);
      results.push(newMetric);
    }
    
    return results;
  }

  // AI Insights operations
  async getAiInsights(userId: string, limit: number = 10): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values())
      .filter(insight => insight.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async createAiInsight(aiInsight: InsertAiInsight): Promise<AiInsight> {
    const id = this.nextAiInsightId++;
    const now = new Date();
    
    const newInsight: AiInsight = {
      id,
      ...aiInsight,
      createdAt: now,
      isRead: false
    };
    
    this.aiInsights.set(id, newInsight);
    return newInsight;
  }

  async markAiInsightAsRead(id: number): Promise<boolean> {
    const insight = this.aiInsights.get(id);
    if (!insight) {
      return false;
    }
    
    this.aiInsights.set(id, {
      ...insight,
      isRead: true
    });
    
    return true;
  }

  // Health events operations
  async getHealthEvents(userId: string, startDate?: Date, endDate?: Date): Promise<HealthEvent[]> {
    const events = Array.from(this.healthEvents.values())
      .filter(event => event.userId === userId);
    
    if (startDate) {
      const startTimestamp = startDate.getTime();
      return events.filter(event => new Date(event.date).getTime() >= startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = endDate.getTime();
      return events.filter(event => new Date(event.date).getTime() <= endTimestamp);
    }
    
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async createHealthEvent(healthEvent: InsertHealthEvent): Promise<HealthEvent> {
    const id = this.nextHealthEventId++;
    const now = new Date();
    
    const newEvent: HealthEvent = {
      id,
      ...healthEvent,
      createdAt: now
    };
    
    this.healthEvents.set(id, newEvent);
    return newEvent;
  }

  async updateHealthEvent(id: number, healthEvent: Partial<InsertHealthEvent>): Promise<HealthEvent | undefined> {
    const existingEvent = this.healthEvents.get(id);
    if (!existingEvent) {
      return undefined;
    }
    
    const updatedEvent: HealthEvent = {
      ...existingEvent,
      ...healthEvent
    };
    
    this.healthEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteHealthEvent(id: number): Promise<boolean> {
    return this.healthEvents.delete(id);
  }

  // Connected services operations
  async getConnectedServices(userId: string): Promise<ConnectedService[]> {
    return Array.from(this.connectedServices.values())
      .filter(service => service.userId === userId);
  }

  async getAllConnectedServices(): Promise<ConnectedService[]> {
    return Array.from(this.connectedServices.values());
  }

  async getConnectedService(userId: string, serviceName: string): Promise<ConnectedService | undefined> {
    const services = Array.from(this.connectedServices.values());
    return services.find(service => service.userId === userId && service.serviceName === serviceName);
  }

  async upsertConnectedService(connectedService: InsertConnectedService): Promise<ConnectedService> {
    const { userId, serviceName } = connectedService;
    const existingService = await this.getConnectedService(userId, serviceName);
    const now = new Date();
    
    if (existingService) {
      const updatedService: ConnectedService = {
        ...existingService,
        ...connectedService,
        updatedAt: now
      };
      
      this.connectedServices.set(`${userId}:${serviceName}`, updatedService);
      return updatedService;
    } else {
      const id = this.nextConnectedServiceId++;
      
      const newService: ConnectedService = {
        id,
        ...connectedService,
        createdAt: now,
        updatedAt: now
      };
      
      this.connectedServices.set(`${userId}:${serviceName}`, newService);
      return newService;
    }
  }

  async disconnectService(userId: string, serviceName: string): Promise<boolean> {
    const service = await this.getConnectedService(userId, serviceName);
    if (!service) {
      return false;
    }
    
    const updatedService: ConnectedService = {
      ...service,
      isConnected: false,
      updatedAt: new Date()
    };
    
    this.connectedServices.set(`${userId}:${serviceName}`, updatedService);
    return true;
  }

  // Workout operations
  async getWorkouts(userId: string, startDate?: string, endDate?: string): Promise<Workout[]> {
    const workouts = Array.from(this.workouts.values())
      .filter(workout => workout.userId === userId);
    
    if (startDate && endDate) {
      return workouts.filter(workout => {
        const workoutDate = workout.date;
        return workoutDate >= startDate && workoutDate <= endDate;
      });
    }
    
    return workouts;
  }

  async getWorkoutById(id: number): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const id = this.nextWorkoutId++;
    const now = new Date();
    
    const newWorkout: Workout = {
      id,
      ...workout,
      createdAt: now,
      updatedAt: now
    };
    
    this.workouts.set(id, newWorkout);
    return newWorkout;
  }

  async updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const existingWorkout = this.workouts.get(id);
    
    if (!existingWorkout) {
      return undefined;
    }
    
    const updatedWorkout: Workout = {
      ...existingWorkout,
      ...workout,
      updatedAt: new Date()
    };
    
    this.workouts.set(id, updatedWorkout);
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    // First delete all related workout sets
    Array.from(this.workoutSets.values())
      .filter(set => set.workoutId === id)
      .forEach(set => this.workoutSets.delete(set.id));
    
    return this.workouts.delete(id);
  }

  // Workout Sets operations
  async getWorkoutSets(workoutId: number): Promise<WorkoutSet[]> {
    return Array.from(this.workoutSets.values())
      .filter(set => set.workoutId === workoutId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  async createWorkoutSet(workoutSet: InsertWorkoutSet): Promise<WorkoutSet> {
    const id = this.nextWorkoutSetId++;
    const now = new Date();
    
    const newWorkoutSet: WorkoutSet = {
      id,
      ...workoutSet,
      createdAt: now,
      updatedAt: now
    };
    
    this.workoutSets.set(id, newWorkoutSet);
    return newWorkoutSet;
  }

  async updateWorkoutSet(id: number, workoutSet: Partial<InsertWorkoutSet>): Promise<WorkoutSet | undefined> {
    const existingWorkoutSet = this.workoutSets.get(id);
    
    if (!existingWorkoutSet) {
      return undefined;
    }
    
    const updatedWorkoutSet: WorkoutSet = {
      ...existingWorkoutSet,
      ...workoutSet,
      updatedAt: new Date()
    };
    
    this.workoutSets.set(id, updatedWorkoutSet);
    return updatedWorkoutSet;
  }

  async deleteWorkoutSet(id: number): Promise<boolean> {
    return this.workoutSets.delete(id);
  }

  async batchCreateWorkoutSets(workoutSets: InsertWorkoutSet[]): Promise<WorkoutSet[]> {
    return Promise.all(workoutSets.map(set => this.createWorkoutSet(set)));
  }
}

export const storage = new MemStorage();
