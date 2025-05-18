import { useState, useCallback, useRef, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
// For PDF processing
import * as PDFJS from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Form validation schema
const uploadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  resultDate: z.string().optional(),
  category: z.string().min(1, "Category is required"),
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
      category: "bloodwork", // Default to bloodwork
    },
  });

  // Initialize PDF worker
  useEffect(() => {
    PDFJS.GlobalWorkerOptions.workerSrc = 
      `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS.version}/pdf.worker.min.js`;
  }, []);

  // File upload handling with react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Create preview for image files
      const preview = file.type.startsWith("image/") 
        ? URL.createObjectURL(file) 
        : "";
      
      // Process PDF if it's a DEXA scan
      if (file.type === "application/pdf" && form.getValues().category === "dexa") {
        processDexa(file);
      } else {
        // Just use the file directly for other formats
        setFileInfo({
          file,
          preview,
        });
      }
      
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
  }, [form]);
  
  // Process DEXA scan - extract only pages 2-3
  const processDexa = async (file: File) => {
    try {
      // Show processing message
      toast({
        title: "Processing DEXA scan",
        description: "Extracting key pages for better analysis...",
      });
      
      // Read the file
      const fileArrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = PDFJS.getDocument({ data: fileArrayBuffer });
      const pdf = await loadingTask.promise;
      
      // Get the total number of pages
      const numPages = pdf.numPages;
      
      if (numPages < 2) {
        // If there are fewer than 2 pages, just use the original file
        toast({
          title: "DEXA scan processed",
          description: "File will be uploaded as is (only 1 page detected)",
        });
        
        setFileInfo({
          file,
          preview: "",
        });
        return;
      }
      
      // We want to extract pages 2 and 3 (or just page 2 if there are only 2 pages)
      const pagesToExtract = numPages >= 3 ? [2, 3] : [2];
      
      // Create a new PDF document
      const pdfDoc = await PDFLib.PDFDocument.create();
      
      // Load the original PDF
      const originalPdfBytes = new Uint8Array(fileArrayBuffer);
      const originalPdf = await PDFLib.PDFDocument.load(originalPdfBytes);
      
      // Copy the desired pages
      for (const pageNum of pagesToExtract) {
        try {
          if (pageNum <= numPages) {
            const [copiedPage] = await pdfDoc.copyPages(originalPdf, [pageNum - 1]);
            pdfDoc.addPage(copiedPage);
          }
        } catch (err) {
          console.error(`Error copying page ${pageNum}:`, err);
        }
      }
      
      // Save the new PDF
      const reducedPdfBytes = await pdfDoc.save();
      
      // Create a new file with the reduced PDF
      const reducedFile = new File([reducedPdfBytes], `${file.name.replace('.pdf', '')}_pages2-3.pdf`, {
        type: "application/pdf",
      });
      
      toast({
        title: "DEXA scan processed",
        description: `Extracted key pages for better analysis`,
      });
      
      // Update the file info with the reduced PDF
      setFileInfo({
        file: reducedFile,
        preview: "",
      });
    } catch (error) {
      console.error("Error processing DEXA scan:", error);
      
      toast({
        title: "Error processing DEXA scan",
        description: "Using original file instead",
        variant: "destructive",
      });
      
      // If there's an error, use the original file
      setFileInfo({
        file,
        preview: "",
      });
    }
  };

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
      
      // Always include the category
      formData.append("category", values.category);
      
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
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isUploading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select test type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bloodwork">Blood Work</SelectItem>
                          <SelectItem value="dexa">DEXA Scan</SelectItem>
                          <SelectItem value="hormonal">Hormonal Panel</SelectItem>
                        </SelectContent>
                      </Select>
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