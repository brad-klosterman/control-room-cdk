import { Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';

import { MeshStack } from '../mesh/mesh.stack';
import { FargateService } from './services/fargate.service';

export class ECSStack extends Stack {
    readonly cluster: ecs.Cluster;

    readonly task_role: iam.Role;

    readonly execution_role: iam.Role;

    constructor(mesh: MeshStack, id: string, props?: StackProps) {
        super(mesh, id, props);

        const base_name = mesh.service_discovery.base.base_name;

        this.cluster = new ecs.Cluster(this, base_name + 'CLUSTER', {
            clusterName: base_name + 'CLUSTER',
            vpc: mesh.service_discovery.base.vpc,
        });

        this.task_role = new iam.Role(this, base_name + 'ECS-TR', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(
                1,
                'CloudWatchFullAccess',
                'AWSXRayDaemonWriteAccess',
                'AWSAppMeshEnvoyAccess',
            ),
        });

        this.execution_role = new iam.Role(this, base_name + 'ECS-ER', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: this.addManagedPolices(2, 'CloudWatchFullAccess'),
        });

        const shared_service_props = {
            cluster: this.cluster,
            execution_role: this.execution_role,
            task_role: this.task_role,
        };

        const federation_service = new FargateService(mesh, base_name + 'FEDERATION', {
            ...shared_service_props,
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
