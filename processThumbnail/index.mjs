import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import sharp from "sharp";

const s3 = new S3Client({ region: "eu-north-1" });
const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const THUMB_BUCKET = "gallery-thumbnails-1774813418";

export const handler = async (event) => {
    const srcBucket = event.Records[0].s3.bucket.name;
    const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const fileName = srcKey.split('/').pop();
    const destKey = `thumb-${fileName}`;

    try {
        const headResult = await s3.send(new HeadObjectCommand({
            Bucket: srcBucket,
            Key: srcKey
        }));
        const userId = headResult.Metadata?.userid || "unknown";
        console.log("UserId récupéré :", userId);

        const response = await s3.send(new GetObjectCommand({ Bucket: srcBucket, Key: srcKey }));
        const chunks = [];
        for await (const chunk of response.Body) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const resizedBuffer = await sharp(buffer).resize(200).toBuffer();

        await s3.send(new PutObjectCommand({
            Bucket: THUMB_BUCKET,
            Key: destKey,
            Body: resizedBuffer,
            ContentType: "image/jpeg"
        }));

        await ddbDocClient.send(new PutCommand({
            TableName: "GalleryMetadata",
            Item: {
                UserId: userId, 
                PhotoId: srcKey,
                ThumbnailKey: destKey,
                ThumbnailUrl: `https://${THUMB_BUCKET}.s3.eu-north-1.amazonaws.com/${destKey}`,
                CreatedAt: new Date().toISOString()
            }
        }));

        console.log(`DynamoDB mis à jour pour ${srcKey} — userId: ${userId}`);
    } catch (error) {
        console.error("Erreur:", error);
        throw error;
    }
};