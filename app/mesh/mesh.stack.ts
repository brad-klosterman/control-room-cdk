import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as appmesh from 'aws-cdk-lib/aws-appmesh';

import { DiscoveryStack } from '../discovery/discovery.stack';

export class MeshStack extends Stack {
    readonly service_discovery: DiscoveryStack;

    readonly base_name: string;

    readonly mesh_name: string;

    readonly mesh: appmesh.Mesh;

    readonly gateway: appmesh.VirtualGateway;

    constructor(service_discovery: DiscoveryStack, id: string, props?: StackProps) {
        super(service_discovery, id, props);

        this.service_discovery = service_discovery;

        this.base_name = this.service_discovery.base.base_name;

        this.mesh_name = this.base_name + 'MESH';

        this.mesh = new appmesh.Mesh(this, this.mesh_name, {
            meshName: this.mesh_name,
        });

        this.gateway = new appmesh.VirtualGateway(this, this.mesh_name + 'GATEWAY', {
            listeners: [
                appmesh.VirtualGatewayListener.http({
                    healthCheck: appmesh.HealthCheck.http({
                        interval: Duration.seconds(10),
                    }),
                    port: 443,
                }),
            ],
            mesh: this.mesh,
            virtualGatewayName: this.mesh_name + 'GATEWAY',
        });
    }
}
