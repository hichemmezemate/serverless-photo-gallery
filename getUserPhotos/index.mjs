import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: "eu-north-1" });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
    // Récupérer le sub Cognito depuis le JWT
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Non autorisé" })
        };
    }

    try {
        const result = await ddbDocClient.send(new QueryCommand({
            TableName: "GalleryMetadata",
            KeyConditionExpression: "UserId = :uid",
            ExpressionAttributeValues: { ":uid": userId },
            ScanIndexForward: false // plus récent en premier
        }));

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({ photos: result.Items })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: "Erreur serveur" })
        };
    }
};

const corsHeaders = () => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*"
});