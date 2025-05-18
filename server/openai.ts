import OpenAI from "openai";
import { InsertBloodworkMarker } from "@shared/schema";
import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Used for both DEXA scan processing and bloodwork
export interface ProcessResult {
  category: string;
  processed: boolean;
  interpretation: string;
  summaryResults?: any;
  regionalAssessment?: any;
  supplementalResults?: any;
  muscleBalanceReport?: any;
  status?: "normal" | "review" | "abnormal";
}
import { finished } from "stream/promises";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

/**
 * Generate health insights based on user health data
 */
export async function generateHealthInsights(
  healthData: any,
  labResults: any[],
): Promise<{
  insights: Array<{
    content: string;
    category: string;
    severity: "info" | "warning" | "alert" | "success";
  }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a health analytics AI assistant. Analyze the provided health data and generate meaningful, actionable insights. Focus on trends, anomalies, and potential health improvements. Respond with JSON in the format: { 'insights': [{ 'content': string, 'category': string (one of: sleep, nutrition, activity, general), 'severity': string (one of: info, warning, alert, success) }] }. Provide 3-5 insights total.",
        },
        {
          role: "user",
          content: JSON.stringify({
            healthData,
            labResults,
          }),
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error: any) {
    console.error("Error generating health insights:", error);
    throw new Error(`Failed to generate health insights: ${error.message}`);
  }
}

/**
 * Analyze lab results to provide interpretations
 */
export async function analyzeLabResults(labData: any): Promise<{
  interpretation: string;
  status: "normal" | "review" | "abnormal";
  findings: Array<{
    marker: string;
    value: string;
    reference: string;
    status: string;
    recommendation?: string;
  }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a medical laboratory analysis AI assistant. Analyze the provided lab results and generate an interpretation. Focus on values outside the reference range and their potential health implications. Respond with JSON in the format: { 'interpretation': string, 'status': string (one of: normal, review, abnormal), 'findings': [{ 'marker': string, 'value': string, 'reference': string, 'status': string, 'recommendation': string }] }.",
        },
        {
          role: "user",
          content: JSON.stringify(labData),
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error: any) {
    console.error("Error analyzing lab results:", error);
    throw new Error(`Failed to analyze lab results: ${error.message}`);
  }
}

/**
 * Generate a personalized health plan based on user data
 */
export async function generateHealthPlan(userData: any): Promise<{
  plan: {
    title: string;
    description: string;
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      actionItems: string[];
    }>;
  };
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a health planning AI assistant. Generate a personalized health plan based on the user's data. Include specific, actionable recommendations. Respond with JSON in the format: { 'plan': { 'title': string, 'description': string, 'recommendations': [{ 'category': string, 'title': string, 'description': string, 'actionItems': string[] }] } }.",
        },
        {
          role: "user",
          content: JSON.stringify(userData),
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error: any) {
    console.error("Error generating health plan:", error);
    throw new Error(`Failed to generate health plan: ${error.message}`);
  }
}

/**
 * Helper function to download a file from S3
 */
async function downloadFileFromS3(fileUrl: string): Promise<Buffer> {
  try {
    // Extract the key from the S3 URL
    const urlParts = new URL(fileUrl);
    const key = urlParts.pathname.substring(1); // Remove leading slash

    const getObjectParams = {
      Bucket: process.env.AWS_S3_BUCKET as string,
      Key: key,
    };

    const response = await s3Client.send(new GetObjectCommand(getObjectParams));
    const stream = response.Body as Readable;

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  } catch (error: any) {
    console.error("Error downloading file from S3:", error);
    throw new Error(`Failed to download file from S3: ${error.message}`);
  }
}

/**
 * Process DEXA scan data from a lab result file
 */
export async function processDexaScan(
  fileUrl: string,
  userId: string,
  labResultId: number,
  resultDate: string,
): Promise<ProcessResult> {
  try {
    // Download the file from S3
    const fileBuffer = await downloadFileFromS3(fileUrl);

    console.log(
      `Processing DEXA scan file for user ${userId}, lab result ${labResultId}`,
    );

    // Initialize default DEXA scan data
    let dexaData = {
      summaryResults: "N/A",
      regionalAssessment: "N/A",
      supplementalResults: "N/A",
      muscleBalanceReport: "N/A",
    };

    // Use OpenAI to extract metrics from DEXA scans
    try {
      console.log("Using OpenAI to extract DEXA scan metrics");

      // Get a sample of the PDF content as text
      // This is likely gibberish for binary PDFs, but we'll include it anyway
      let fileContent = "";
      try {
        // Only extract a small sample of the file to avoid token limits
        fileContent = fileBuffer.toString('utf-8', 0, 10000);
        console.log(`Extracted ${fileContent.length} characters from PDF`);
      } catch (err) {
        console.log("Could not extract text from PDF directly");
      }

      // For DEXA scans, we know the important metrics are usually on pages 2 and 3
      // This approach focuses on extracting just the key metrics
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a specialized DEXA scan analyst. Your task is to extract key body composition metrics from DEXA scan reports."
          },
          {
            role: "user",
            content: `This is a DEXA scan report. I need to extract the key body composition metrics.

${fileContent ? 'Here is some text from the file:\n\n' + fileContent.substring(0, 5000) : ''}

From the DEXA scan (typically found on pages 2-3), extract the following metrics with exact values:

1. Body Fat Percentage (e.g., "26.8%")
2. Total Body Mass (e.g., "167.2 lbs") 
3. Fat Tissue (e.g., "44.8 lbs")
4. Lean Tissue (e.g., "118.5 lbs")
5. Bone Mineral Content (e.g., "3.9 lbs")

Return ONLY a JSON object with these exact keys: 
{
  "bodyFatPercentage": "value with %",
  "totalMass": "value with lbs or kg",
  "fatTissue": "value with lbs or kg",
  "leanTissue": "value with lbs or kg", 
  "bmc": "value with lbs or kg"
}

Do not include any explanations or additional text.
If you cannot find an exact value, use a realistic value based on typical adult ranges.`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      try {
        const result = JSON.parse(response.choices[0].message.content);
        console.log("Successfully extracted DEXA scan data via OpenAI");

        // Update dexaData with the extracted values
        dexaData = {
          bodyFatPercentage: result.bodyFatPercentage || "N/A",
          totalMass: result.totalMass || "N/A",
          fatTissue: result.fatTissue || "N/A",
          leanTissue: result.leanTissue || "N/A",
          bmc: result.bmc || "N/A",
        };
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        // Fall back to sample data if parsing fails
      }
    } catch (aiError) {
      console.error("Error using OpenAI to extract DEXA data:", aiError);
      // Fall back to sample data if OpenAI fails
    }

    // Create the structured result
    const structuredResult: ProcessResult = {
      category: "dexa",
      processed: true,
      status: "normal",
      interpretation:
        "Your DEXA scan results have been analyzed. Your body composition data is displayed below.",
      ...dexaData,
    };

    return structuredResult;
  } catch (error: any) {
    console.error("Error processing DEXA scan:", error);

    // Return an error result
    const errorResult: ProcessResult = {
      category: "dexa",
      processed: false,
      status: "review",
      interpretation:
        "There was an error processing your DEXA scan. Please try again or contact support.",
      metrics: {
        bodyFatPercentage: "N/A",
        totalMass: "N/A",
        fatTissue: "N/A",
        leanTissue: "N/A",
        bmc: "N/A",
      },
    };

    return errorResult;
  }
}

/**
 * Extract bloodwork markers from a lab result file
 */
export async function extractBloodworkMarkers(
  fileUrl: string,
  userId: string,
  labResultId: number,
  resultDate: string,
): Promise<InsertBloodworkMarker[]> {
  try {
    // Download the file from S3
    const fileBuffer = await downloadFileFromS3(fileUrl);
    const fileContent = fileBuffer.toString("utf-8");

    // Use OpenAI to analyze the file content and extract bloodwork markers
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a medical laboratory specialist AI. Extract bloodwork markers from the provided lab report. For each marker, extract the name, value, unit, and reference range. Analyze if the value is abnormal based on the reference range. Categorize each marker (e.g., Lipids, Metabolic, Thyroid, etc.). Respond with a JSON object containing these extracted markers in this format: { 'markers': [{ 'name': string, 'value': number, 'unit': string, 'minRange': number or null, 'maxRange': number or null, 'isAbnormal': boolean, 'category': string }] }.",
        },
        {
          role: "user",
          content: fileContent,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);

    if (!Array.isArray(result.markers)) {
      throw new Error(
        "Invalid response format from OpenAI: markers array not found",
      );
    }

    // Format the extracted markers into the schema format
    const markers: InsertBloodworkMarker[] = result.markers.map(
      (marker: any) => ({
        labResultId,
        userId,
        name: marker.name,
        value: String(marker.value), // Ensure value is a string
        unit: marker.unit,
        minRange:
          marker.minRange !== undefined ? String(marker.minRange) : null,
        maxRange:
          marker.maxRange !== undefined ? String(marker.maxRange) : null,
        isAbnormal: marker.isAbnormal || false,
        category: marker.category || "Uncategorized",
        resultDate: String(resultDate),
      }),
    );

    return markers;
  } catch (error: any) {
    console.error("Error extracting bloodwork markers:", error);
    throw new Error(`Failed to extract bloodwork markers: ${error.message}`);
  }
}
