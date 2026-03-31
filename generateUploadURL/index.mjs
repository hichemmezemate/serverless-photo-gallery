import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: "eu-north-1" });
const BUCKET_NAME = "gallery-raw-photos-1774813406";

export const handler = async (event) => {
    const fileName = event.queryStringParameters?.fileName || `image-${Date.now()}.jpg`;
    const fileKey = `uploads/${Date.now()}-${fileName}`;

    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || "unknown";

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        ContentType: "image/jpeg",
        Metadata: {
            userid: userId 
        }
    });

    try {
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({ uploadUrl, fileKey }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Impossible de générer l'URL" }),
        };
    }
};