import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";

// Form validation schema
const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  resultDate: z.string().optional(),
});

export default function UploadLabResult() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ file: File; preview: string } | null>(null);
  const [jsonData, setJsonData] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      description: "",
      resultDate: new Date().toISOString().split("T")[0],
    },
  });

  // File upload handling with react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Create preview for image files
      const preview = file.type.startsWith("image/") 
        ? URL.createObjectURL(file) 
        : "";
      
      setFileInfo({
        file,
        preview,
      });
      
      // Try to parse JSON data if it's a JSON file
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (event.target?.result) {
              const jsonStr = event.target.result.toString();
              // Validate it's proper JSON by parsing
              JSON.parse(jsonStr);
              setJsonData(jsonStr);
            }
          } catch (error) {
            console.error("Failed to parse JSON file:", error);
            setJsonData(null);
          }
        };
        reader.readAsText(file);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/csv': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB max file size
    maxFiles: 1,
  });

  const removeFile = () => {
    if (fileInfo?.preview) URL.revokeObjectURL(fileInfo.preview);
    setFileInfo(null);
    setJsonData(null);
  };

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!fileInfo) {
      toast({
        title: "Missing file",
        description: "Please upload a file to continue",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", fileInfo.file);
      formData.append("title", values.title);
      
      if (values.description) {
        formData.append("description", values.description);
      }
      
      if (values.resultDate) {
        formData.append("resultDate", values.resultDate);
      }
      
      if (jsonData) {
        formData.append("data", jsonData);
      }

      // Simulate upload progress (will be replaced by actual upload progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 5;
          return next >= 90 ? 90 : next;
        });
      }, 300);

      const response = await fetch("/api/lab-results/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload lab result");
      }

      setUploadProgress(100);
      setUploadSuccess(true);

      toast({
        title: "Upload successful",
        description: "Your lab result has been uploaded successfully.",
      });

      // Navigate back to lab results after a short delay
      setTimeout(() => {
        navigate("/lab-results");
      }, 1500);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message);
      setUploadProgress(0);
      
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout
      title="Upload Lab Result"
      description="Upload your medical lab result documents for analysis"
    >
      <div className="max-w-2xl mx-auto">
        <Button
          variant="outline"
          className="mb-6"
          onClick={() => navigate("/lab-results")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lab Results
        </Button>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Annual Blood Work"
                          {...field}
                          disabled={isUploading}
                        />
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
                        <Textarea
                          placeholder="Add any additional details about this lab result"
                          {...field}
                          disabled={isUploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resultDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isUploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Lab Result Document</Label>
                  
                  {!fileInfo ? (
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? "border-primary bg-primary/5"
                          : "border-neutral-300 hover:border-primary"
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="h-10 w-10 mx-auto text-neutral-400 mb-4" />
                      <p className="text-sm font-medium mb-1">
                        Drag and drop your lab result file here, or click to browse
                      </p>
                      <p className="text-xs text-neutral-500">
                        Supported formats: PDF, JPG, PNG, JSON, CSV (Max. 10MB)
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <File className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{fileInfo.file.name}</p>
                            <p className="text-xs text-neutral-500">
                              {(fileInfo.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isUploading}
                          onClick={removeFile}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      {fileInfo.preview && (
                        <div className="mt-4 max-h-64 overflow-hidden rounded-md">
                          <img
                            src={fileInfo.preview}
                            alt="Preview"
                            className="max-w-full object-contain"
                          />
                        </div>
                      )}

                      {jsonData && (
                        <div className="mt-4">
                          <p className="text-xs text-neutral-500 mb-1">
                            JSON data detected. This will be analyzed automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="w-full bg-neutral-100 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-neutral-500 text-center">
                      {uploadProgress < 100
                        ? `Uploading: ${uploadProgress}%`
                        : "Processing..."}
                    </p>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="rounded-lg bg-green-50 p-4 flex items-center text-green-700">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <p className="text-sm">Upload successful! Redirecting...</p>
                  </div>
                )}

                {uploadError && (
                  <div className="rounded-lg bg-red-50 p-4 flex items-center text-red-700">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <p className="text-sm">{uploadError}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUploading || uploadSuccess}
                    className="w-full sm:w-auto"
                  >
                    {isUploading ? "Uploading..." : "Upload Lab Result"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}