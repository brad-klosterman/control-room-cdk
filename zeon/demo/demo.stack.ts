import { join } from 'path';

import { Duration, RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-applicationautoscaling';
import {
    AttributeType,
    BillingMode,
    ITable,
    ProjectionType,
    Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { AccountRootPrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { IQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { BaseStack } from '../base/base.stack';

export class DemoStack extends BaseStack {
    public readonly alarms_table: Table;
    public readonly responders_table: Table;
    public readonly devices_table: Table;
    assignment_queue: IQueue;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /**
         * Alarms Table
         * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html
         */
        this.alarms_table = new Table(this, this.base_name + '-alarms-table', {
            billingMode: BillingMode.PROVISIONED,
            partitionKey: { name: 'id', type: AttributeType.NUMBER },
            pointInTimeRecovery: true,
            readCapacity: 1,
            removalPolicy: RemovalPolicy.DESTROY,
            sortKey: { name: 'date_created', type: AttributeType.STRING },
            tableName: 'alarms',
            writeCapacity: 1,
        });

        this.alarms_table.grantReadData(new AccountRootPrincipal());

        const write_auto_scaling = this.alarms_table.autoScaleWriteCapacity({
            maxCapacity: 2,
            minCapacity: 1,
        });

        write_auto_scaling.scaleOnUtilization({
            targetUtilizationPercent: 75,
        });

        write_auto_scaling.scaleOnSchedule('scale-up', {
            minCapacity: 2,
            schedule: Schedule.cron({ hour: '9', minute: '0' }),
        });

        write_auto_scaling.scaleOnSchedule('scale-down', {
            maxCapacity: 2,
            schedule: Schedule.cron({ hour: '14', minute: '0' }),
        });

        /**
         * Responders Table
         */
        this.responders_table = new Table(this, this.base_name + '-responders-table', {
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: 'id', type: AttributeType.NUMBER },
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.DESTROY,
            sortKey: { name: 'name', type: AttributeType.STRING },
            tableName: 'responders',
        });

        this.responders_table.addLocalSecondaryIndex({
            indexName: 'assigned_device_id',
            projectionType: ProjectionType.ALL,
            sortKey: { name: 'assigned_device_id', type: AttributeType.NUMBER },
        });

        this.responders_table.grantReadData(new AccountRootPrincipal());

        /**
         * Devices Table
         */
        this.devices_table = new Table(this, this.base_name + '-devices-table', {
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: 'id', type: AttributeType.NUMBER },
            pointInTimeRecovery: true,
            removalPolicy: RemovalPolicy.DESTROY,
            tableName: 'devices',
        });

        this.devices_table.grantReadData(new AccountRootPrincipal());

        /**
         * Event Bus
         * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events-readme.html
         */
        const bus = new EventBus(this, this.base_name + '-event-bus', {
            eventBusName: 'event-bus',
        });

        // create a rule that listens for the db being updated

        // the

        /**
         * Assignment Queue
         */
        this.assignment_queue = new Queue(this, this.base_name + '-assignment-queue', {
            queueName: 'assignment-queue',
            visibilityTimeout: Duration.seconds(30),
        });

        // consumer.addEventSource(
        //     new SqsEventSource(this.assignment_queue, {
        //         batchSize: 1,
        //     }),
        // );
    }
}
