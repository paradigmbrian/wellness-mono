import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Upload } from "lucide-react";
import { format } from "date-fns";

export function FileUploader() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resultDate, setResultDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Take the first file
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      // If no title is set, use the file name (without extension)
      if (!title) {
        const fileName = acceptedFiles[0].name.split(".")[0];
        setTitle(fileName.charAt(0).toUpperCase() + fileName.slice(1));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/tiff": [".tiff", ".tif"],
      "application/json": [".json"],
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !title || !user) return;
      
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("resultDate", resultDate);

      try {
        const response = await fetch("/api/lab-results/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "Your lab result has been uploaded and processed.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      
      // Reset form
      setFile(null);
      setTitle("");
      setDescription("");
      setResultDate(format(new Date(), "yyyy-MM-dd"));
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!title) {
      toast({
        title: "Title required",
        description: "Please provide a title for this lab result.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <Upload className="h-12 w-12 text-neutral-400 mb-3" />
                {file ? (
                  <div>
                    <p className="font-medium text-neutral-800">{file.name}</p>
                    <p className="text-sm text-neutral-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-neutral-800">Drag & drop your file here</p>
                    <p className="text-sm text-neutral-500 mt-1">
                      or click to browse (max 10MB)
                    </p>
                    <p className="text-xs text-neutral-400 mt-2">
                      Supported formats: PDF, JPG, PNG, TIFF, JSON, CSV, Excel
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Blood Test Results"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Annual blood work from Dr. Smith"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="resultDate">Result Date</Label>
                <div className="relative">
                  <Input
                    id="resultDate"
                    type="date"
                    value={resultDate}
                    onChange={(e) => setResultDate(e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setTitle("");
                  setDescription("");
                  setResultDate(format(new Date(), "yyyy-MM-dd"));
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !file || !title}
                className="min-w-[120px]"
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Uploading
                  </div>
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
