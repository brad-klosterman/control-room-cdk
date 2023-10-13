import * as path from 'path';
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
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { EventBus, Rule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { BatchJob, SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { AccountRootPrincipal } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource, SqsDlq, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription, SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { IQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import { BaseStack } from '../base/base.stack';

export class DemoStack extends BaseStack {
    /**
     * Dynamo DB Table
     * * CDK: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html
     * * SEON: https://eu-central-1.console.aws.amazon.com/dynamodbv2/home?region=eu-central-1#tables
     */
    public readonly alarms_table: Table;
    public readonly responders_table: Table;
    public readonly devices_table: Table;

    /**
     * SNS Subscriptions: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns_subscriptions-readme.html
     */

    /**
     * SQS https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs-readme.html
     */
    responders_queue: IQueue;

    /**
     * Event Bridge
     * - Delivers a near real-time stream of system events that describe changes in AWS resources.
     * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events-readme.html
     */

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
         * Define an EventBridge EventBus
         * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events-readme.html
         */
        const bus = new EventBus(this, this.base_name + '-event-bus', {
            eventBusName: 'seon-event-bus',
        });

        /**
         * It is possible to archive all or some events sent to an event bus. It is then possible to replay these events.
         */
        bus.archive('bus-archive', {
            archiveName: 'archive',
            description: 'Bus Archive',
            eventPattern: {
                account: [],
            },
            retention: Duration.days(365),
        });

        /**
         * SNS Topic
         */
        const topic = new Topic(this, 'sns-topic', {
            displayName: 'Alarm Handeling',
            topicName: 'alarm-handeling',
        });

        const alarm_created_rule = new Rule(this, 'alarm-created-rule', {
            description: 'When Alarms microservice created and Alarm',
            enabled: true,
            eventBus: bus,
            eventPattern: {
                detailType: ['alarm_created'],
                source: ['development.seon-gateway.alarms:4000'],
            },
            ruleName: 'alarm_created',
        });

        /**
         * Responders Queue
         */
        this.responders_queue = new Queue(this, this.base_name + '-responders-queue', {
            queueName: 'responders-queue',
        });

        // subscribe queue to topic
        topic.addSubscription(new SqsSubscription(this.responders_queue));

        /**
         * You can write Lambda functions to process change events from a DynamoDB Table.
         * An event is emitted to a DynamoDB stream (if configured) whenever a write
         * (Put, Delete, Update) operation is performed against the table.
         */

        const deadLetterQueue = new Queue(this, 'deadLetterQueue');

        // create lambda function
        const lambda_fn = new NodejsFunction(this, 'my-lambda', {
            entry: path.join(__dirname, `,/lamda.ts`),
            handler: 'main',
            memorySize: 1024,
            runtime: lambda.Runtime.NODEJS_14_X,
            timeout: Duration.seconds(5),
        });

        lambda_fn.addEventSource(
            new DynamoEventSource(this.alarms_table, {
                batchSize: 5,
                bisectBatchOnError: true,
                onFailure: new SqsDlq(deadLetterQueue),
                retryAttempts: 10,
                startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            }),
        );

        // subscribe Lambda to SNS topic
        topic.addSubscription(new LambdaSubscription(lambda_fn));

        const rule = new Rule(this, 'Rule', {
            schedule: Schedule.expression('rate(1 minute)'),
        });

        // rule.addTarget(topic);

        /*

        const jobQueue = new batch.JobQueue(this, 'MyQueue', {
            computeEnvironments: [
                {
                    computeEnvironment: new batch.ComputeEnvironment(this, 'ComputeEnvironment', {
                        managed: false,
                    }),
                    order: 1,
                },
            ],
        });

        const jobDefinition = new JobDefinition(this, 'MyJob', {
            container: {
                image: ContainerImage.fromRegistry('test-repo'),
            },
        });

        const queue = new Queue(this, 'Queue');

        const rule = new Rule(this, 'Rule', {
            schedule: Schedule.rate(Duration.hours(1)),
        });

        rule.addTarget(
            new BatchJob(
                jobQueue.jobQueueArn,
                jobQueue,
                jobDefinition.jobDefinitionArn,
                jobDefinition,
                {
                    deadLetterQueue: queue,
                    event: RuleTargetInput.fromObject({ SomeParam: 'SomeValue' }),
                    maxEventAge: Duration.hours(2),
                    retryAttempts: 2,
                },
            ),
        );

        8?
         */
    }
}
