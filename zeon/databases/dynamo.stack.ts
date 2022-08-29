import * as cdk from 'aws-cdk-lib';
import * as appautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

import { BaseStack } from '../base/base.stack';

export class DynamoStack extends BaseStack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const table = new dynamodb.Table(this, id, {
            billingMode: dynamodb.BillingMode.PROVISIONED,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            pointInTimeRecovery: true,
            readCapacity: 1,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            sortKey: { name: 'first_name', type: dynamodb.AttributeType.STRING },
            tableName: 'order',
            writeCapacity: 1,
        });

        table.addLocalSecondaryIndex({
            indexName: 'statusIndex',
            projectionType: dynamodb.ProjectionType.ALL,
            sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
        });

        table.grantReadData(new iam.AccountRootPrincipal());

        const writeAutoScaling = table.autoScaleWriteCapacity({
            maxCapacity: 2,
            minCapacity: 1,
        });

        writeAutoScaling.scaleOnUtilization({
            targetUtilizationPercent: 75,
        });

        writeAutoScaling.scaleOnSchedule('scale-up', {
            minCapacity: 2,
            schedule: appautoscaling.Schedule.cron({ hour: '9', minute: '0' }),
        });

        writeAutoScaling.scaleOnSchedule('scale-down', {
            maxCapacity: 2,
            schedule: appautoscaling.Schedule.cron({ hour: '14', minute: '0' }),
        });
    }
}
