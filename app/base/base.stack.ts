import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class BaseStack extends Stack {
    readonly environment: string;
    readonly base_name: string;
    readonly domain_name: string;
    readonly domain_certificate_arn: string;
    readonly vpc: ec2.Vpc;
    readonly log_group: logs.LogGroup;

    readonly apollo_graph_ref: string;
    readonly apollo_key: string;
    readonly redis_host_address: string;
    readonly seon_restapi_baseurl: string;

    readonly federation_service = 'federation';
    readonly subscriptions_service = 'subscriptions';
    readonly alarms_service = 'alarms';
    readonly workforce_service = 'workforce';
    readonly ssp_service = 'ssp';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.environment = this.node.tryGetContext('ENVIRONMENT');
        this.base_name = 'SEON' + this.environment;
        this.domain_name = 'seon-gateway.com';

        this.domain_certificate_arn = `arn:aws:acm:${this.region}:${
            this.account
        }:certificate/${this.node.tryGetContext('certificate_identifier')}`;

        this.vpc = new ec2.Vpc(this, this.base_name + 'VPC', {
            cidr: '10.0.0.0/16',
        });

        this.log_group = new logs.LogGroup(this, this.base_name + 'LOG-GROUP', {
            logGroupName: this.base_name,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_DAY,
        });

        this.apollo_graph_ref = this.node.tryGetContext('APOLLO_GRAPH_REF');
        this.apollo_key = this.node.tryGetContext('APOLLO_KEY');
        this.redis_host_address = this.node.tryGetContext('REDIS_HOST_ADDRESS');
        this.seon_restapi_baseurl = this.node.tryGetContext('SEON_RESTAPI_BASEURL');
    }
}
