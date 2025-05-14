import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Function to upload file to S3
export async function uploadFileToS3(
  filePath: string,
  contentType: string,
  originalFilename: string,
  userId: string
): Promise<string> {
  const fileStream = fs.createReadStream(filePath);
  const fileExtension = originalFilename.split(".").pop() || "";
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  
  // Create path with user ID as prefix
  const s3ObjectKey = `${userId}/${uniqueFileName}`;
  
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: s3ObjectKey,
        Body: fileStream,
        ContentType: contentType,
        Metadata: {
          originalName: originalFilename,
          userId: userId
        },
      },
    });

    await upload.done();
    
    // Clean up the temporary file after upload
    fs.unlinkSync(filePath);
    
    // Return the S3 URL of the uploaded file
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3ObjectKey}`;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error(`Failed to upload file to S3: ${error}`);
  }
}

// Function to delete file from S3
export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract the key from the URL
    const urlParts = new URL(fileUrl);
    const key = urlParts.pathname.substring(1); // Remove leading slash
    
    // Import the DeleteObjectCommand 
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    
    // Send the delete command
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })
    );
    
    console.log(`File deleted successfully: ${key}`);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error(`Failed to delete file from S3: ${error}`);
  }
}