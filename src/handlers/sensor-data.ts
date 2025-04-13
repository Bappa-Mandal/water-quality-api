import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { SensorReading } from '../types/water-quality-type';
import { sensorDataValidator } from '../validator/sensor-data';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log(`Received event: ${JSON.stringify(event, null, 2)}`);

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Request body is missing' }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        let requestData: SensorReading;
        try {
            requestData = JSON.parse(event.body);
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid JSON format in request body' }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        const validationErrors = sensorDataValidator(requestData);
        if (validationErrors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Validation errors',
                    errors: validationErrors
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }

        const tableName = process.env.SENSOR_DATA_TABLE;
        if (!tableName) {
            throw new Error('DynamoDB table name not configured');
        }
        const dataid = requestData.deviceId + requestData.timestamp;
        const sampleTimeStamp = requestData.timestamp.substring(0, 10);
        const itemData = {
            ...requestData, dataid: dataid, sampleTimeStamp: sampleTimeStamp
        };
        const params = {
            TableName: tableName,
            Item: marshall(itemData),
        };

        await ddbClient.send(new PutItemCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Data successfully ingested',
                id: requestData.deviceId
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error: any) {
        console.error('Error processing request:', error);

        let errorMessage = 'Internal Server Error';
        let statusCode = 500;

        return {
            statusCode,
            body: JSON.stringify({
                message: errorMessage,
                error: error.message
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};