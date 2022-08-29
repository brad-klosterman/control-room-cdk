import { RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IManagedPolicy } from 'aws-cdk-lib/aws-iam/lib/managed-policy';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { BaseStack } from '../base/base.stack';

export class NetworkStack extends BaseStack {
    /**
     * AWS Virtual Private Cloud: Virtual Network where we define and manage AWS resources
     * - Provides security by means of network partitioning
     * - Availability Zones: Distinct locations that are engineered to be isolated from failures in other zones
     * - Subnet: A range of IP addresses in our VPC.
     * - NAT Gateway: Allows instances in a private subnet to connect to services outside our VPC
     *
     * * User Guide: https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html
     * * NAT Gateway: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
     * * AWS CDK: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
     * * SEON VPC: https://eu-central-1.console.aws.amazon.com/vpc/home?region=eu-central-1#vpcs:
     */
    readonly vpc: Vpc;

    /**
     * log_group
     * - Defines a CloudWatch log group
     * * SEON Log Groups: https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#logsV2:log-groups
     */
    readonly log_group: LogGroup;

    /**
     * cluster
     */
    readonly cluster: Cluster;

    /**
     * task_role
     */
    readonly task_role: Role;

    /**
     * execution_role
     */
    readonly execution_role: Role;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /**
         * Configure the VPC
         */
        this.vpc = new Vpc(this, this.base_name + '-vpc', {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'public',
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'internal',
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
            vpcName: this.base_name + '-vpc',
        });

        /**
         * Create a log group for all microservices
         */
        this.log_group = new LogGroup(this, this.base_name + '-log-group', {
            logGroupName: this.base_name,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
        });

        this.cluster = new Cluster(this, this.base_name + '-ecs-cluster', {
            clusterName: this.base_name + '-cluster',
            containerInsights: true,
            enableFargateCapacityProviders: true,
            vpc: this.vpc,
        });

        this.task_role = new Role(this, this.base_name + '-ecs-task-role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(
                1,
                'CloudWatchFullAccess',
                'AWSXRayDaemonWriteAccess',
                'AWSAppMeshEnvoyAccess',
            ),
        });

        this.execution_role = new Role(this, this.base_name + '-ecs-execution_role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(
                2,
                'CloudWatchFullAccess',
                'AmazonEC2ContainerRegistryReadOnly',
            ),
        });
    }

    private addManagedPolices = (
        logical_id: number,
        ...policy_names: string[]
    ): IManagedPolicy[] => {
        const policies: IManagedPolicy[] = [];

        policy_names.forEach(policy_name =>
            policies.push(
                ManagedPolicy.fromManagedPolicyArn(
                    this,
                    `${policy_name}${logical_id}Arn`,
                    `arn:aws:iam::aws:policy/${policy_name}`,
                ),
            ),
        );

        return policies;
    };
}
