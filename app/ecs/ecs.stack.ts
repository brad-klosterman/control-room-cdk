import { Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';

import { APP } from '../../seon/seon.app.config';
import { MeshStack } from '../mesh/mesh.stack';
import { FargateService } from './services/fargate.service';

export class ECSStack extends Stack {
    readonly cluster: ecs.Cluster;
    readonly task_role: iam.Role;
    readonly execution_role: iam.Role;

    constructor(mesh: MeshStack, id: string, props?: StackProps) {
        super(mesh, id, props);

        const base_name = mesh.service_discovery.base.base_name;
        const environment = mesh.service_discovery.base.environment;

        this.cluster = new ecs.Cluster(this, base_name + 'CLUSTER', {
            clusterName: base_name + 'CLUSTER',
            containerInsights: true,
            enableFargateCapacityProviders: true,
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

        const default_desired_count = environment === 'production' ? 2 : 1;
        const default_cpu = environment === 'production' ? 1024 : 256;
        const default_memory = environment === 'production' ? 2048 : 512;

        const shared_service_props = {
            cluster: this.cluster,
            execution_role: this.execution_role,
            service_params: {
                desiredCount: default_desired_count,
                maxHealthyPercent: 400,
                minHealthyPercent: 50,
            },
            task_params: {
                cpu: default_cpu,
                memoryLimitMiB: default_memory,
            },
            task_role: this.task_role,
        };

        const shared_environment_props = {
            APOLLO_GRAPH_REF: mesh.service_discovery.base.apollo_graph_ref,
            APOLLO_KEY: mesh.service_discovery.base.apollo_key,
            APP_ENVIRONMENT: environment,
            HOST_PORT: '4000',
            NODE_ENV: environment,
            REDIS_HOST_ADDRESS: mesh.service_discovery.base.redis_host_address,
            SEON_RESTAPI_BASEURL: mesh.service_discovery.base.seon_restapi_baseurl,
        };

        const federation_service = new FargateService(mesh, base_name + 'FEDERATION', {
            ...shared_service_props,
            container: {
                branch: environment === 'production' ? 'main' : environment,
                environment: {
                    ...shared_environment_props,
                },
                health_check_url: '/.well-known/apollo/server-health', // no forward slash for xreay?
                repo: 'seon-federation-gateway',
                url_path: '/',
            },
            discovery_name: mesh.service_discovery.base.federation_service,
            discovery_type: 'DNS',
            port: 4000,
            priority: 10,
            virtual_node_arn: mesh.federation_virtual_node.virtualNodeArn,
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
