import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Activity, 
  Clock, 
  AlertCircle, 
  Award, 
  BarChart,
  Check,
  X,
  Trash,
  Edit,
  Repeat,
  Info
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Form schema for adding/editing a workout
const workoutSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  activityType: z.string().min(1, "Activity type is required"),
  description: z.string().optional(),
  plannedDistance: z.coerce.number().optional(),
  plannedDuration: z.coerce.number().optional(),
  intensity: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  recurringDays: z.string().optional()
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

// Form schema for adding workout sets
const workoutSetSchema = z.object({
  exerciseName: z.string().min(1, "Exercise name is required"),
  setNumber: z.coerce.number().min(1, "Set number is required"),
  weight: z.coerce.number().optional(),
  reps: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  restTime: z.coerce.number().optional(),
  notes: z.string().optional()
});

type WorkoutSetFormValues = z.infer<typeof workoutSetSchema>;

// Activity type options
const activityTypes = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "strength", label: "Strength Training" },
  { value: "yoga", label: "Yoga" },
  { value: "hiit", label: "HIIT" },
  { value: "walking", label: "Walking" },
  { value: "hiking", label: "Hiking" },
  { value: "rowing", label: "Rowing" },
  { value: "pilates", label: "Pilates" },
  { value: "stretching", label: "Stretching" },
  { value: "crossfit", label: "CrossFit" },
  { value: "other", label: "Other" }
];

// Intensity options
const intensityOptions = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "max", label: "Maximum" }
];

// Recurring pattern options
const recurringPatternOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }
];

// Day options for recurring workouts
const dayOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" }
];

export default function WorkoutCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workoutSets, setWorkoutSets] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Date range calculation
  const getDateRange = () => {
    let startDate = startOfWeek(calendarDate, { weekStartsOn: 1 });
    let endDate = endOfWeek(calendarDate, { weekStartsOn: 1 });
    
    if (viewMode === 'day') {
      startDate = calendarDate;
      endDate = calendarDate;
    } else if (viewMode === 'month') {
      // Extend the range to include the whole month and surrounding weeks
      startDate = startOfWeek(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1), { weekStartsOn: 1 });
      endDate = endOfWeek(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0), { weekStartsOn: 1 });
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  };

  const { startDate, endDate } = getDateRange();
  
  // Query all workouts from API
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['/api/workouts', startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/workouts?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to fetch workouts');
      return response.json();
    },
    enabled: !!user
  });

  // Query workout sets for a specific workout
  const fetchWorkoutSets = async (workoutId: number) => {
    if (!workoutId) return [];
    
    try {
      const response = await fetch(`/api/workouts/${workoutId}/sets`);
      if (!response.ok) throw new Error('Failed to fetch workout sets');
      return response.json();
    } catch (error) {
      console.error('Error fetching workout sets:', error);
      return [];
    }
  };
  
  // Load workout sets when a workout is selected
  useEffect(() => {
    if (selectedWorkout?.id) {
      fetchWorkoutSets(selectedWorkout.id).then(setWorkoutSets);
    } else {
      setWorkoutSets([]);
    }
  }, [selectedWorkout]);
  
  // Form for adding/editing a workout
  const workoutForm = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      title: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: '',
      endTime: '',
      activityType: '',
      description: '',
      plannedDistance: undefined,
      plannedDuration: undefined,
      intensity: '',
      notes: '',
      isRecurring: false,
      recurringPattern: '',
      recurringDays: ''
    }
  });
  
  // Form for adding a workout set
  const workoutSetForm = useForm<WorkoutSetFormValues>({
    resolver: zodResolver(workoutSetSchema),
    defaultValues: {
      exerciseName: '',
      setNumber: workoutSets.length + 1,
      weight: undefined,
      reps: undefined,
      duration: undefined,
      restTime: undefined,
      notes: ''
    }
  });
  
  // Reset workout form when dialog is opened/closed
  useEffect(() => {
    if (!isWorkoutDialogOpen) {
      setEditMode(false);
      setSelectedWorkout(null);
      workoutForm.reset({
        title: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        activityType: '',
        description: '',
        plannedDistance: undefined,
        plannedDuration: undefined,
        intensity: '',
        notes: '',
        isRecurring: false,
        recurringPattern: '',
        recurringDays: ''
      });
    }
  }, [isWorkoutDialogOpen, selectedDate, workoutForm]);
  
  // Load workout data into form when editing
  useEffect(() => {
    if (selectedWorkout && editMode) {
      workoutForm.reset({
        title: selectedWorkout.title,
        date: selectedWorkout.date,
        startTime: selectedWorkout.startTime || '',
        endTime: selectedWorkout.endTime || '',
        activityType: selectedWorkout.activityType,
        description: selectedWorkout.description || '',
        plannedDistance: selectedWorkout.plannedDistance || undefined,
        plannedDuration: selectedWorkout.plannedDuration || undefined,
        intensity: selectedWorkout.intensity || '',
        notes: selectedWorkout.notes || '',
        isRecurring: selectedWorkout.isRecurring || false,
        recurringPattern: selectedWorkout.recurringPattern || '',
        recurringDays: selectedWorkout.recurringDays || ''
      });
      
      setIsWorkoutDialogOpen(true);
    }
  }, [selectedWorkout, editMode, workoutForm]);
  
  // Reset workout set form when dialog is opened/closed
  useEffect(() => {
    if (!isSetDialogOpen) {
      workoutSetForm.reset({
        exerciseName: '',
        setNumber: workoutSets.length + 1,
        weight: undefined,
        reps: undefined,
        duration: undefined,
        restTime: undefined,
        notes: ''
      });
    }
  }, [isSetDialogOpen, workoutSets.length, workoutSetForm]);
  
  // Create workout mutation
  const createWorkout = useMutation({
    mutationFn: async (data: WorkoutFormValues) => {
      const response = await apiRequest('POST', '/api/workouts', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      toast({
        title: 'Workout Added',
        description: 'Your workout has been successfully added to the calendar.',
      });
      setIsWorkoutDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to add workout',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update workout mutation
  const updateWorkout = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: WorkoutFormValues }) => {
      const response = await apiRequest('PUT', `/api/workouts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      toast({
        title: 'Workout Updated',
        description: 'Your workout has been successfully updated.',
      });
      setIsWorkoutDialogOpen(false);
      setEditMode(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to update workout',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Delete workout mutation
  const deleteWorkout = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/workouts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      toast({
        title: 'Workout Deleted',
        description: 'Your workout has been successfully deleted.',
      });
      setSelectedWorkout(null);
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete workout',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Create workout set mutation
  const createWorkoutSet = useMutation({
    mutationFn: async ({ workoutId, data }: { workoutId: number, data: WorkoutSetFormValues }) => {
      const response = await apiRequest('POST', `/api/workouts/${workoutId}/sets`, data);
      return response.json();
    },
    onSuccess: () => {
      if (selectedWorkout?.id) {
        fetchWorkoutSets(selectedWorkout.id).then(setWorkoutSets);
      }
      toast({
        title: 'Set Added',
        description: 'Your workout set has been successfully added.',
      });
      setIsSetDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to add workout set',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update workout completion status
  const updateWorkoutCompletion = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number, isCompleted: boolean }) => {
      const response = await apiRequest('PUT', `/api/workouts/${id}`, { isCompleted });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      setSelectedWorkout(data);
      toast({
        title: data.isCompleted ? 'Workout Completed' : 'Workout Marked as Incomplete',
        description: data.isCompleted 
          ? 'Great job! Your workout has been marked as complete.' 
          : 'Your workout has been marked as incomplete.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update workout status',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Delete workout set mutation
  const deleteWorkoutSet = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/workout-sets/${id}`);
      return response.json();
    },
    onSuccess: () => {
      if (selectedWorkout?.id) {
        fetchWorkoutSets(selectedWorkout.id).then(setWorkoutSets);
      }
      toast({
        title: 'Set Deleted',
        description: 'Your workout set has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete workout set',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Handle workout form submission
  const onWorkoutSubmit = (data: WorkoutFormValues) => {
    if (editMode && selectedWorkout) {
      updateWorkout.mutate({ id: selectedWorkout.id, data });
    } else {
      createWorkout.mutate(data);
    }
  };
  
  // Handle workout set form submission
  const onWorkoutSetSubmit = (data: WorkoutSetFormValues) => {
    if (!selectedWorkout) return;
    
    createWorkoutSet.mutate({
      workoutId: selectedWorkout.id,
      data
    });
  };
  
  // Generate calendar days
  const generateCalendarDays = () => {
    let startDate: Date;
    let endDate: Date;
    let days: Date[] = [];
    
    if (viewMode === 'week') {
      startDate = startOfWeek(calendarDate, { weekStartsOn: 1 });
      endDate = endOfWeek(calendarDate, { weekStartsOn: 1 });
      
      // Generate all days in the week
      let day = startDate;
      while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
      }
    } else if (viewMode === 'day') {
      days = [calendarDate];
    }
    
    return days;
  };
  
  // Select a workout
  const handleSelectWorkout = (workout: any) => {
    setSelectedWorkout(workout);
  };

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return '';
    
    return time;
  };
  
  // Get workout by date
  const getWorkoutsByDate = (date: Date) => {
    if (!workouts) return [];
    
    return workouts.filter((workout: any) => {
      return isSameDay(parseISO(workout.date), date);
    });
  };
  
  // Get activity type label
  const getActivityTypeLabel = (value: string) => {
    const activityType = activityTypes.find(type => type.value === value);
    return activityType ? activityType.label : value;
  };
  
  // Get intensity label
  const getIntensityLabel = (value: string) => {
    const intensity = intensityOptions.find(option => option.value === value);
    return intensity ? intensity.label : value;
  };
  
  // Navigate to previous period
  const navigatePrevious = () => {
    if (viewMode === 'day') {
      setCalendarDate(subDays(calendarDate, 1));
    } else if (viewMode === 'week') {
      setCalendarDate(subDays(calendarDate, 7));
    } else {
      // Month view
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    }
  };
  
  // Navigate to next period
  const navigateNext = () => {
    if (viewMode === 'day') {
      setCalendarDate(addDays(calendarDate, 1));
    } else if (viewMode === 'week') {
      setCalendarDate(addDays(calendarDate, 7));
    } else {
      // Month view
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    }
  };
  
  // Navigate to today
  const navigateToday = () => {
    setCalendarDate(new Date());
  };
  
  // Calendar days for the current view
  const calendarDays = generateCalendarDays();

  // Activity color based on type
  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      running: 'bg-blue-100 border-blue-400 text-blue-700',
      cycling: 'bg-green-100 border-green-400 text-green-700',
      swimming: 'bg-cyan-100 border-cyan-400 text-cyan-700',
      strength: 'bg-purple-100 border-purple-400 text-purple-700',
      yoga: 'bg-orange-100 border-orange-400 text-orange-700',
      hiit: 'bg-red-100 border-red-400 text-red-700',
      walking: 'bg-teal-100 border-teal-400 text-teal-700',
      hiking: 'bg-emerald-100 border-emerald-400 text-emerald-700',
      rowing: 'bg-sky-100 border-sky-400 text-sky-700',
      pilates: 'bg-amber-100 border-amber-400 text-amber-700',
      stretching: 'bg-lime-100 border-lime-400 text-lime-700',
      crossfit: 'bg-rose-100 border-rose-400 text-rose-700',
      other: 'bg-gray-100 border-gray-400 text-gray-700'
    };
    
    return colors[type] || colors.other;
  };

  return (
    <DashboardLayout
      title="Workout Calendar"
      description="Schedule, track, and manage your workouts"
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="text-sm font-medium">
              {viewMode === 'day' ? (
                format(calendarDate, 'MMMM d, yyyy')
              ) : viewMode === 'week' ? (
                `${format(startOfWeek(calendarDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(calendarDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
              ) : (
                format(calendarDate, 'MMMM yyyy')
              )}
            </div>
          </div>
          
          <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Workout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Workout' : 'Add New Workout'}</DialogTitle>
                <DialogDescription>
                  {editMode 
                    ? 'Update your workout details below.' 
                    : 'Fill in the details below to add a new workout to your calendar.'}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...workoutForm}>
                <form onSubmit={workoutForm.handleSubmit(onWorkoutSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={workoutForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workout Title</FormLabel>
                          <FormControl>
                            <Input placeholder="5K Run" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={workoutForm.control}
                      name="activityType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select activity type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activityTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={workoutForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="pl-3 text-left font-normal flex justify-between items-center"
                                >
                                  {field.value ? format(parseISO(field.value), "PPP") : "Pick a date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? parseISO(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={workoutForm.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={workoutForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={workoutForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your workout plan" 
                            className="resize-none min-h-[80px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={workoutForm.control}
                      name="plannedDistance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distance (km/mi)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={workoutForm.control}
                      name="plannedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={workoutForm.control}
                      name="intensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intensity</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select intensity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {intensityOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={workoutForm.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              id="isRecurring"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="isRecurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Recurring Workout
                            </label>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {workoutForm.watch("isRecurring") && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={workoutForm.control}
                        name="recurringPattern"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurrence Pattern</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select pattern" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {recurringPatternOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {workoutForm.watch("recurringPattern") === "weekly" && (
                        <FormField
                          control={workoutForm.control}
                          name="recurringDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recurring Days</FormLabel>
                              <FormControl>
                                <div className="flex flex-wrap gap-2">
                                  {dayOptions.map((day) => {
                                    const isSelected = field.value?.split(',').includes(day.value);
                                    return (
                                      <Badge 
                                        key={day.value}
                                        variant={isSelected ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => {
                                          const currentValues = field.value ? field.value.split(',').filter(Boolean) : [];
                                          if (isSelected) {
                                            // Remove value
                                            field.onChange(currentValues.filter(v => v !== day.value).join(','));
                                          } else {
                                            // Add value
                                            field.onChange([...currentValues, day.value].join(','));
                                          }
                                        }}
                                      >
                                        {day.label.substring(0, 1)}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                  
                  <FormField
                    control={workoutForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes about your workout" 
                            className="resize-none min-h-[80px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    {editMode && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={() => {
                          if (selectedWorkout?.id && window.confirm('Are you sure you want to delete this workout?')) {
                            deleteWorkout.mutate(selectedWorkout.id);
                            setIsWorkoutDialogOpen(false);
                          }
                        }}
                        disabled={createWorkout.isPending || updateWorkout.isPending}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                    <Button type="submit" disabled={createWorkout.isPending || updateWorkout.isPending}>
                      {createWorkout.isPending || updateWorkout.isPending ? 'Saving...' : (editMode ? 'Update Workout' : 'Add Workout')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Calendar View */}
        {viewMode === 'month' ? (
          <div className="calendar-month-view">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={calendarDate}
              onMonthChange={setCalendarDate}
              className="rounded-md border"
              components={{
                Day: ({ day, ...props }) => {
                  const dayWorkouts = day ? getWorkoutsByDate(day) : [];
                  return (
                    <div {...props} className="relative p-0">
                      <div className="calendar-cell">
                        <div className="calendar-date">{format(day, 'd')}</div>
                        <div className="workout-list max-h-20 overflow-hidden">
                          {dayWorkouts.slice(0, 3).map((workout: any) => (
                            <div 
                              key={workout.id}
                              className={`text-xs p-1 mb-1 rounded truncate border ${getActivityColor(workout.activityType)} ${workout.isCompleted ? 'opacity-60' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectWorkout(workout);
                              }}
                            >
                              {workout.title}
                            </div>
                          ))}
                          {dayWorkouts.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayWorkouts.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              }}
            />
          </div>
        ) : (
          <div className="calendar-view grid grid-cols-1 gap-4">
            {/* Week or Day View */}
            {calendarDays.map((day) => (
              <Card key={day.toISOString()} className="overflow-hidden">
                <CardHeader className="bg-muted/50 p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {format(day, 'EEEE')}
                      </CardTitle>
                      <CardDescription>
                        {format(day, 'MMMM d, yyyy')}
                      </CardDescription>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedDate(day);
                        setIsWorkoutDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getWorkoutsByDate(day).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No workouts scheduled for this day
                        </div>
                      ) : (
                        getWorkoutsByDate(day).map((workout: any) => (
                          <div 
                            key={workout.id}
                            className={`p-3 rounded-md border cursor-pointer transition-colors ${getActivityColor(workout.activityType)} ${selectedWorkout?.id === workout.id ? 'ring-2 ring-primary' : ''} ${workout.isCompleted ? 'opacity-70' : ''}`}
                            onClick={() => handleSelectWorkout(workout)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium">
                                {workout.title}
                                {workout.isRecurring && (
                                  <Badge variant="outline" className="ml-2">
                                    <Repeat className="h-3 w-3 mr-1" />
                                    Recurring
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                {workout.isCompleted ? (
                                  <Badge variant="success" className="text-xs">Completed</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Scheduled</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center text-sm space-x-3">
                              <span className="flex items-center">
                                <Activity className="h-3 w-3 mr-1" />
                                {getActivityTypeLabel(workout.activityType)}
                              </span>
                              {(workout.startTime || workout.endTime) && (
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(workout.startTime)}
                                  {workout.endTime && ` - ${formatTime(workout.endTime)}`}
                                </span>
                              )}
                              {workout.intensity && (
                                <span className="flex items-center">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {getIntensityLabel(workout.intensity)}
                                </span>
                              )}
                              {workout.plannedDuration && (
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {workout.plannedDuration} min
                                </span>
                              )}
                              {workout.plannedDistance && (
                                <span className="flex items-center">
                                  <BarChart className="h-3 w-3 mr-1" />
                                  {workout.plannedDistance} km
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Workout Detail Panel */}
        {selectedWorkout && (
          <Card className="mt-6">
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{selectedWorkout.title}</CardTitle>
                  <CardDescription>
                    {format(parseISO(selectedWorkout.date), 'EEEE, MMMM d, yyyy')}
                    {selectedWorkout.startTime && ` at ${formatTime(selectedWorkout.startTime)}`}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditMode(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant={selectedWorkout.isCompleted ? "destructive" : "default"} 
                    size="sm"
                    onClick={() => {
                      updateWorkoutCompletion.mutate({
                        id: selectedWorkout.id,
                        isCompleted: !selectedWorkout.isCompleted
                      });
                    }}
                  >
                    {selectedWorkout.isCompleted ? (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Mark Incomplete
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Mark Complete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={getActivityColor(selectedWorkout.activityType)}>
                  <Activity className="h-3 w-3 mr-1" />
                  {getActivityTypeLabel(selectedWorkout.activityType)}
                </Badge>
                {selectedWorkout.intensity && (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {getIntensityLabel(selectedWorkout.intensity)}
                  </Badge>
                )}
                {selectedWorkout.plannedDuration && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedWorkout.plannedDuration} min
                  </Badge>
                )}
                {selectedWorkout.plannedDistance && (
                  <Badge variant="outline">
                    <BarChart className="h-3 w-3 mr-1" />
                    {selectedWorkout.plannedDistance} km
                  </Badge>
                )}
                {selectedWorkout.isRecurring && (
                  <Badge variant="outline">
                    <Repeat className="h-3 w-3 mr-1" />
                    {selectedWorkout.recurringPattern === 'daily' 
                      ? 'Daily' 
                      : selectedWorkout.recurringPattern === 'weekly'
                        ? 'Weekly'
                        : 'Monthly'}
                  </Badge>
                )}
              </div>
              
              {selectedWorkout.description && (
                <div className="mb-4">
                  <h3 className="font-medium mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedWorkout.description}</p>
                </div>
              )}
              
              {selectedWorkout.notes && (
                <div className="mb-4">
                  <h3 className="font-medium mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{selectedWorkout.notes}</p>
                </div>
              )}
              
              {/* Workout Sets (for strength training) */}
              {selectedWorkout.activityType === 'strength' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Workout Sets</h3>
                    <Dialog open={isSetDialogOpen} onOpenChange={setIsSetDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Set
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Workout Set</DialogTitle>
                          <DialogDescription>
                            Add exercise details for your strength training workout.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...workoutSetForm}>
                          <form onSubmit={workoutSetForm.handleSubmit(onWorkoutSetSubmit)} className="space-y-4">
                            <FormField
                              control={workoutSetForm.control}
                              name="exerciseName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Exercise Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Bench Press" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={workoutSetForm.control}
                                name="setNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Set Number</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={workoutSetForm.control}
                                name="weight"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Weight (kg/lbs)</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.5" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={workoutSetForm.control}
                                name="reps"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Repetitions</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={workoutSetForm.control}
                                name="duration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Duration (seconds)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <FormField
                              control={workoutSetForm.control}
                              name="restTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rest Time (seconds)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="60" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={workoutSetForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Any notes about this set" 
                                      className="resize-none" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <DialogFooter>
                              <Button type="submit" disabled={createWorkoutSet.isPending}>
                                {createWorkoutSet.isPending ? 'Adding...' : 'Add Set'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {workoutSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No sets added yet. Add sets to track your strength training exercises.
                    </p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Set</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Exercise</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Weight</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Reps</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Time</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Rest</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {workoutSets
                            .sort((a, b) => a.setNumber - b.setNumber)
                            .map((set) => (
                              <tr key={set.id}>
                                <td className="px-3 py-2 text-sm">{set.setNumber}</td>
                                <td className="px-3 py-2 text-sm font-medium">{set.exerciseName}</td>
                                <td className="px-3 py-2 text-sm">{set.weight || '-'}</td>
                                <td className="px-3 py-2 text-sm">{set.reps || '-'}</td>
                                <td className="px-3 py-2 text-sm">{set.duration ? `${set.duration}s` : '-'}</td>
                                <td className="px-3 py-2 text-sm">{set.restTime ? `${set.restTime}s` : '-'}</td>
                                <td className="px-3 py-2 text-sm">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this set?')) {
                                        deleteWorkoutSet.mutate(set.id);
                                      }
                                    }}
                                  >
                                    <Trash className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* Workout Tracking Status */}
              {selectedWorkout.isCompleted && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                  <div className="bg-green-100 rounded-full p-1 mr-3">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Workout Completed</p>
                    <p className="text-sm text-green-600">
                      Great job! You've completed this workout.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Workout Tips based on activity type */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center">
                <div className="bg-blue-100 rounded-full p-1 mr-3">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">Workout Tips</p>
                  <p className="text-sm text-blue-600">
                    {selectedWorkout.activityType === 'running' && 'Remember to warm up properly and maintain good posture while running.'}
                    {selectedWorkout.activityType === 'cycling' && 'Check your bike setup and wear a helmet. Stay visible to traffic.'}
                    {selectedWorkout.activityType === 'swimming' && 'Focus on your breathing technique and proper form for each stroke.'}
                    {selectedWorkout.activityType === 'strength' && 'Start with a proper warm-up and focus on form before increasing weight.'}
                    {selectedWorkout.activityType === 'yoga' && 'Move mindfully and listen to your body. Don\'t force any poses.'}
                    {selectedWorkout.activityType === 'hiit' && 'Give maximum effort during work intervals and fully recover during rest periods.'}
                    {selectedWorkout.activityType === 'walking' && 'Maintain good posture and comfortable pace. Enjoy the outdoors!'}
                    {!['running', 'cycling', 'swimming', 'strength', 'yoga', 'hiit', 'walking'].includes(selectedWorkout.activityType) && 
                      'Stay hydrated and listen to your body. Rest if you feel any pain.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <style jsx>{`
        .calendar-cell {
          min-height: 100px;
          padding: 4px;
        }
        
        .calendar-date {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .workout-list {
          font-size: 0.75rem;
        }
      `}</style>
    </DashboardLayout>
  );
}