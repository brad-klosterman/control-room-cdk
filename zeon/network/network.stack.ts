import { RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IManagedPolicy } from 'aws-cdk-lib/aws-iam/lib/managed-policy';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { BaseStack } from '../base/base.stack';

export class NetworkStack extends BaseStack {
    readonly vpc: Vpc;
    readonly log_group: LogGroup;
    readonly cluster: Cluster;
    readonly task_role: Role;
    readonly execution_role: Role;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.vpc = this.configureVPC(this.base_name + '-vpc');

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

    private configureVPC(vpc_name: string) {
        /**
         * The VPC will have 2 AZs, 2 NAT gateways, and an internet gateway
         */
        return new Vpc(this, vpc_name, {
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
            vpcName: vpc_name,
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
