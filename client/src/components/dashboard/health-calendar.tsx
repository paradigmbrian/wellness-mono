import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { CalendarIcon, MoreHorizontal, Plus } from "lucide-react";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  location: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export function HealthCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/health-events"],
    enabled: !!user,
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      location: "",
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const response = await apiRequest("POST", "/api/health-events", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-events"] });
      toast({
        title: "Event created",
        description: "Your health event has been added to the calendar.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/health-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-events"] });
      toast({
        title: "Event deleted",
        description: "The health event has been removed from your calendar.",
      });
      setSelectedEventId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormValues) => {
    createEvent.mutate(data);
  };

  // Get upcoming events, sorted by date
  const upcomingEvents = events
    ? events
        .filter((event: any) => new Date(event.date) >= new Date())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
    : [];

  return (
    <Card className="h-full">
      <CardHeader className="p-5 border-b border-neutral-100 flex justify-between items-center">
        <CardTitle className="text-base font-semibold">Health Calendar</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-primary">
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Health Event</DialogTitle>
              <DialogDescription>
                Add a new event to your health calendar such as appointments, check-ups, or reminders.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual Physical" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Regular check-up" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="date" {...field} />
                            <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. Thompson's Office" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createEvent.isPending}>
                    {createEvent.isPending ? "Adding..." : "Add Event"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="p-5">
        <div className="space-y-4">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="ml-4">
                      <Skeleton className="h-5 w-36 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event: any) => {
              const eventDate = new Date(event.date);
              const today = new Date();
              const tomorrow = addDays(today, 1);
              const isToday = format(eventDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              const isTomorrow = format(eventDate, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd");
              
              const backgroundClass = isToday 
                ? "bg-primary/5" 
                : isTomorrow 
                  ? "bg-secondary/5" 
                  : "bg-neutral-50";

              return (
                <div key={event.id} className={`flex items-center justify-between p-3 ${backgroundClass} rounded-lg`}>
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 flex flex-col items-center justify-center rounded-lg bg-white shadow-sm">
                      <span className="text-xs font-medium text-neutral-500">
                        {format(eventDate, "MMM").toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-neutral-800">{format(eventDate, "dd")}</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-800">{event.title}</p>
                      <p className="text-xs text-neutral-500">
                        {event.location ? `${event.location}, ` : ""}
                        {event.time ? event.time : "All day"}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-neutral-400 hover:text-neutral-700"
                        onClick={() => setSelectedEventId(event.id)}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{event.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteEvent.mutate(event.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteEvent.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })
          ) : (
            <div className="text-center p-4 text-neutral-500">No upcoming health events</div>
          )}

          <Button
            variant="outline"
            className="w-full py-2 border-dashed flex items-center justify-center"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Health Event
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
