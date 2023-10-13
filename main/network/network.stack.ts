import { RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { Rule } from 'aws-cdk-lib/aws-events';
import { CloudWatchLogGroup } from 'aws-cdk-lib/aws-events-targets';
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
     * ECS Cluster: A logical grouping of tasks or services
     * * SEON: https://eu-central-1.console.aws.amazon.com/ecs/v2/clusters?region=eu-central-1
     */
    readonly cluster: Cluster;

    /**
     * IAM Task Role: ECS Task role
     * - The ECS Task Role is used by the service that is deployed to ECS
     * * SEON: https://us-east-1.console.aws.amazon.com/iamv2/home?region=us-east-1#/home
     */
    readonly task_role: Role;

    /**
     * IAM Execution Role
     * - The ECS Execution Role is used by the ecs-agent which runs on ECS and is responsible for:
     *  -- Pulling down docker images from ECR
     *  -- Fetching the SSM Parameters from SSM for your Task (Secrets and LogConfigurations)
     *  -- Writing Logs to CloudWatch
     */
    readonly execution_role: Role;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        /**
         * VPC
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
         * CloudWatch Log Group
         */
        this.log_group = new LogGroup(this, this.base_name + '-log-group', {
            logGroupName: this.base_name,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
        });

        // const rule = new Rule(this, 'rule', {
        //     eventPattern: {
        //         source: ['aws.ec2'],
        //     },
        // });
        //
        // rule.addTarget(new CloudWatchLogGroup(this.log_group));

        /**
         * ECS Cluster
         */
        this.cluster = new Cluster(this, this.base_name + '-ecs-cluster', {
            clusterName: this.base_name + '-cluster',
            containerInsights: true,
            enableFargateCapacityProviders: true,
            vpc: this.vpc,
        });

        /**
         * IAM ECS Task Role
         */
        this.task_role = new Role(this, this.base_name + '-ecs-task-role', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(
                1,
                'CloudWatchFullAccess',
                'AWSXRayDaemonWriteAccess',
                'AWSAppMeshEnvoyAccess',
            ),
        });

        /**
         * IAM ECS Execution Role
         */
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
