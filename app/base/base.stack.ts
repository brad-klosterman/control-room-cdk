import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class BaseStack extends Stack {
    readonly environment: string;

    readonly base_name: string;

    readonly vpc: ec2.Vpc;

    readonly log_group: logs.LogGroup;

    readonly port: number;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.environment = this.node.tryGetContext('ENVIRONMENT');
        this.base_name = 'SEON' + this.environment;

        this.vpc = new ec2.Vpc(this, this.base_name + 'VPC', {
            cidr: '10.0.0.0/16',
        });

        this.log_group = new logs.LogGroup(this, this.base_name + 'LOG-GROUP', {
            logGroupName: this.base_name,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_DAY,
        });

        this.port = parseInt(this.node.tryGetContext('CONTAINER_PORT'), 10);
    }
}
