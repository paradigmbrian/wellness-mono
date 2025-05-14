import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FileUploader } from "@/components/upload/file-uploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";

export default function LabResultsUpload() {
  return (
    <DashboardLayout
      title="Upload Lab Results"
      description="Upload and analyze your medical lab results"
    >
      <div className="mb-6">
        <Link href="/lab-results">
          <Button variant="ghost" className="pl-0 flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Lab Results
          </Button>
        </Link>
        
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            All uploaded files are encrypted and stored securely. For best results, upload clear, high-quality documents in PDF format.
          </AlertDescription>
        </Alert>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Lab Results</CardTitle>
            <CardDescription>
              Upload your lab results to track your health metrics over time and receive AI-powered insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader />
          </CardContent>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported File Types</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              <ul className="list-disc pl-5 space-y-1">
                <li>PDF documents (.pdf)</li>
                <li>Images (.jpg, .jpeg, .png, .tiff)</li>
                <li>Structured data (.json, .csv, .xls, .xlsx)</li>
              </ul>
              <p className="mt-3">Maximum file size: 10MB</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Upload your lab result file</li>
                <li>Our AI analyzes the data and extracts key metrics</li>
                <li>View your results with insights and recommendations</li>
                <li>Track changes over time in your health dashboard</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
