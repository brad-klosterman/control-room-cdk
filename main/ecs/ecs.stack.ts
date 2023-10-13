import { StackProps } from 'aws-cdk-lib';
import { Cluster } from 'aws-cdk-lib/aws-ecs';

import { BaseStack } from '../base/base.stack';
import { MeshStack } from '../mesh/mesh.stack';
import { FargateMeshService } from './services/fargate.service';

export class ECSStack extends BaseStack {
    readonly cluster: Cluster;

    constructor(mesh: MeshStack, id: string, props?: StackProps) {
        super(mesh, id, props);

        const shared_props = {
            cluster: mesh.service_discovery.network.cluster,
            execution_role: mesh.service_discovery.network.execution_role,
            log_group: mesh.service_discovery.network.log_group,
            task_role: mesh.service_discovery.network.task_role,
        };

        new FargateMeshService(mesh, this.base_name + '-' + this.federation_service_namespace, {
            ...shared_props,
            service_namespace: this.federation_service_namespace,
        });

        new FargateMeshService(mesh, this.base_name + '-' + this.alarms_service_namespace, {
            ...shared_props,
            service_namespace: this.alarms_service_namespace,
        });

        new FargateMeshService(mesh, this.base_name + '-' + this.workforce_service_namespace, {
            ...shared_props,
            service_namespace: this.workforce_service_namespace,
        });

        new FargateMeshService(mesh, this.base_name + '-' + this.ssp_service_namespace, {
            ...shared_props,
            service_namespace: this.ssp_service_namespace,
        });
    }
}
