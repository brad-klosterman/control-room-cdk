import { APIGatewayProxyResultV2, SNSEvent } from 'aws-cdk-lib/aws-lambda';

/**
 * The lambda function gathers the SNS records into an object and prints them to the console.
 */
export async function main(event: SNSEvent): Promise<APIGatewayProxyResultV2> {
    const records = event.Records.map(
        (record: { Sns: { Message: any; Subject: any; Type: any } }) => {
            const { Message, Subject, Type } = record.Sns;

            return { message: Message, subject: Subject, type: Type };
        },
    );

    console.log('records: 👉', JSON.stringify(records, null, 2));

    return {
        body: JSON.stringify({ records }),
        statusCode: 2000,
    };
}
