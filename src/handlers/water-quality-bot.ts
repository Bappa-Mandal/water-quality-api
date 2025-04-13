import { LexV2Event } from 'aws-lambda';

import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { table } from 'console';

const dynamoDb = new DynamoDBClient({ region: "us-east-1" });
const SENSOR_DATA_TABLE = process.env.SENSOR_DATA_TABLE || '';
const LAB_DATA_TABLE = process.env.LAB_DATA_TABLE || '';
const TEST_KIT_DATA_TABLE = process.env.TEST_KIT_DATA_TABLE || '';


export const handler = async (event: LexV2Event): Promise<any> => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const intentName = event.sessionState.intent.name;
    const slots = event.sessionState.intent.slots;

    const sampleSource = slots?.sampleSource?.value?.interpretedValue;
    let tableName = '';
    switch (sampleSource) {
        case "Test Kit":
            tableName = TEST_KIT_DATA_TABLE;
            break;
        case "Lab":
            tableName = LAB_DATA_TABLE;
            break;
        case "Sensor":
            tableName = SENSOR_DATA_TABLE;
            break;
        default:
            break;
    }

    try {
        switch (intentName) {
            case "GetChemicalParameter": {
                const sampleDate = slots?.sampleDate?.value?.interpretedValue as string;
                const waterParameter = slots?.chemicalParameter?.value?.interpretedValue;

                const command = new QueryCommand({
                    TableName: tableName,
                    IndexName: "sampleTimeStamp-index",
                    KeyConditionExpression:
                        "sampleTimeStamp = :start",
                    ExpressionAttributeValues: {
                        ":start": { S: sampleDate }
                    }
                });

                const response = await dynamoDb.send(command);
                let responseString = '';
                console.log(response);
                if (response.Items) {
                    response.Items.forEach(item => {
                        const unmarshalledItem = unmarshall(item);
                        console.log(unmarshalledItem);
                        responseString += `pH: ${unmarshalledItem.pH}, Chlorine: ${unmarshalledItem.chlorine}, Colour: ${unmarshalledItem.colour}\n`;
                    });
                } else {
                    console.log("No items found");
                }

                return buildResponse(`Results for ${sampleSource}: ${responseString}`, intentName);
            }

            case "GetTestsByDateRange": {
                const startDate = slots?.StartDate?.value?.interpretedValue;
                const endDate = slots?.EndDate?.value?.interpretedValue;

                if (!startDate || !endDate) throw new Error("Start and end dates are required");

                const command = new QueryCommand({
                    TableName: LAB_DATA_TABLE,
                    IndexName: "sourceType-sampleTimeStamp-index",
                    KeyConditionExpression: "sourceType = :sourceType AND sampleTimeStamp BETWEEN :start AND :end",
                    ExpressionAttributeValues: {
                        ":start": { S: startDate },
                        ":end": { S: endDate },
                        ":sourceType": { S: "sensor" }
                    }
                });

                const response = await dynamoDb.send(command);
                let responseString = '';
                console.log(response);
                if (response.Items) {
                    response.Items.forEach(item => {
                        const dataItem = unmarshall(item);
                        console.log(dataItem);
                        responseString += `Test Date: ${dataItem.sampleTimeStamp} labId: ${dataItem.labId} Test Passed :${dataItem.qualityControl.passed}  pH: ${dataItem.pH}, Chlorine: ${dataItem.chlorine}, Colour: ${dataItem.colour}||||||||||\r\n`;
                    });
                } else {
                    console.log("No items found");
                }

                return buildResponse(`Test Results between ${startDate} and ${endDate} \r\n||||||||||| ${responseString}`, intentName);
            }

            case "GetTestResultsByDate": {
                const sampleId = slots?.SampleId?.value?.interpretedValue;
                const date = slots?.Date?.value?.interpretedValue;

                if (!sampleId || !date) throw new Error("Sample ID and date are required");

                const { Items } = await dynamoDb.send(
                    new QueryCommand({
                        TableName: TEST_KIT_DATA_TABLE,
                        KeyConditionExpression: "sampleId = :id AND testDate = :date",
                        ExpressionAttributeValues: {
                            ":id": { S: sampleId },
                            ":date": { S: date },
                        },
                    })
                );

                if (!Items?.length) throw new Error("No results found");
                return buildResponse(`Results on ${date}: ${JSON.stringify(unmarshall(Items[0]))}`, intentName);
            }

            case "GetParameterTrend": {
                const sampleId = slots?.SampleId?.value?.interpretedValue;
                const parameter = slots?.ChemicalParameter?.value?.interpretedValue;
                const startDate = slots?.StartDate?.value?.interpretedValue;
                const endDate = slots?.EndDate?.value?.interpretedValue;

                if (!sampleId || !parameter || !startDate || !endDate) {
                    throw new Error("Sample ID, parameter, and date range are required");
                }

                const { Items } = await dynamoDb.send(
                    new QueryCommand({
                        TableName: SENSOR_DATA_TABLE,
                        KeyConditionExpression: "sampleId = :id AND testDate BETWEEN :start AND :end",
                        ExpressionAttributeValues: {
                            ":id": { S: sampleId },
                            ":start": { S: startDate },
                            ":end": { S: endDate },
                        },
                    })
                );

                const trend = Items?.map(item => {
                    const record = unmarshall(item);
                    return {
                        date: record.testDate,
                        value: record[parameter]
                    };
                }) || [];

                return buildResponse(`Trend for ${parameter}: ${JSON.stringify({ sampleId, trend })}`, intentName);
            }

            default:
                return buildResponse("Intent not recognized", intentName);
        }
    } catch (error) {
        console.error("Error:", error);
        return buildResponse(`Error: ${'Not able to process'}`, intentName);
    }
};

function buildResponse(message: string, intentName: string): any {
    return {
        "sessionState": {
            "dialogAction": {
                "type": "Close"
            },
            "intent": {
                "confirmationState": "Confirmed",
                "name": intentName,
                "state": "Fulfilled"
            }
        },
        "messages": [
            {
                "contentType": "PlainText",
                "content": message
            }
        ]
    }
}