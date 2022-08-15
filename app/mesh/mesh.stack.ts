import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as appmesh from 'aws-cdk-lib/aws-appmesh';

import { DiscoveryStack } from '../discovery/discovery.stack';

export class MeshStack extends Stack {
    readonly service_discovery: DiscoveryStack;
    readonly mesh: appmesh.Mesh;
    readonly virtual_node_listener: appmesh.VirtualNodeListener;
    readonly federation_virtual_node: appmesh.VirtualNode;
    readonly federation_virtual_router: appmesh.VirtualRouter;
    readonly federation_virtual_service: appmesh.VirtualService;

    constructor(service_discovery: DiscoveryStack, id: string, props?: StackProps) {
        super(service_discovery, id, props);

        this.service_discovery = service_discovery;

        const base_name = this.service_discovery.base.base_name;

        this.mesh = new appmesh.Mesh(this, base_name + 'MESH', {
            meshName: base_name + 'MESH',
        });

        this.virtual_node_listener = appmesh.VirtualNodeListener.http({
            port: 4000,
        });

        this.federation_virtual_node = new appmesh.VirtualNode(
            this,
            this.stackName + 'federation_virtual_node',
            this.buildVirtualNodeProps(this.service_discovery.base.federation_service),
        );
    }

    private buildVirtualNodeProps = (service_name: string): appmesh.VirtualNodeProps => {
        return {
            listeners: [this.virtual_node_listener],
            mesh: this.mesh,
            serviceDiscovery: this.service_discovery.getServiceDiscovery(service_name),
            virtualNodeName: service_name + '-vn',
        };
    };
}
