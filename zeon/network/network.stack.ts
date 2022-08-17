import { RemovalPolicy, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { BaseStack } from '../base/base.stack';

export class NetworkStack extends BaseStack {
    readonly vpc: ec2.Vpc;
    readonly log_group: logs.LogGroup;
    readonly cluster: ecs.Cluster;
    readonly task_role: iam.Role;
    readonly execution_role: iam.Role;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, this.base_name + 'VPC', {
            cidr: '10.0.0.0/16',
        });

        this.log_group = new logs.LogGroup(this, this.base_name + '-log-group', {
            logGroupName: this.base_name,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_DAY,
        });

        this.cluster = new ecs.Cluster(this, this.base_name + '-ecs-cluster', {
            clusterName: this.base_name + 'CLUSTER',
            containerInsights: true,
            enableFargateCapacityProviders: true,
            vpc: this.vpc,
        });

        this.task_role = new iam.Role(this, this.base_name + '-ecs-task-role', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(
                1,
                'CloudWatchFullAccess',
                'AWSXRayDaemonWriteAccess',
                'AWSAppMeshEnvoyAccess',
            ),
        });

        this.execution_role = new iam.Role(this, this.base_name + '-ecs-execution_role', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(2, 'CloudWatchFullAccess'),
        });
    }

    private addManagedPolices = (
        logical_id: number,
        ...policy_names: string[]
    ): iam.IManagedPolicy[] => {
        const policies: iam.IManagedPolicy[] = [];

        policy_names.forEach(policy_name =>
            policies.push(
                iam.ManagedPolicy.fromManagedPolicyArn(
                    this,
                    `${policy_name}${logical_id}Arn`,
                    `arn:aws:iam::aws:policy/${policy_name}`,
                ),
            ),
        );

        return policies;
    };
}
