import { StackProps } from 'aws-cdk-lib';
import {
    Backend,
    HttpRoutePathMatch,
    Mesh,
    RouteSpec,
    VirtualNode,
    VirtualNodeListener,
    VirtualNodeProps,
    VirtualRouter,
    VirtualService,
    VirtualServiceProvider,
} from 'aws-cdk-lib/aws-appmesh';

import { BaseStack } from '../base/base.stack';
import { AvailableServices } from '../config/seon.config.interfaces';
import { DiscoveryStack } from '../discovery/discovery.stack';

export class MeshStack extends BaseStack {
    readonly service_discovery: DiscoveryStack;
    readonly mesh: Mesh;
    readonly virtual_node_listener: VirtualNodeListener;
    readonly federation_virtual_node: VirtualNode;
    readonly federation_virtual_router: VirtualRouter;
    readonly federation_virtual_service: VirtualService;

    readonly alarms_virtual_node: VirtualNode;

    constructor(service_discovery: DiscoveryStack, id: string, props?: StackProps) {
        super(service_discovery, id, props);

        this.service_discovery = service_discovery;

        this.mesh = new Mesh(this, this.base_name + 'MESH', {
            meshName: this.base_name + 'MESH',
        });

        this.virtual_node_listener = VirtualNodeListener.http({
            port: this.main_port,
        });

        this.federation_virtual_node = new VirtualNode(
            this,
            this.base_name + this.federation_service_namespace + '-vn',
            this.buildVirtualNodeProps(this.federation_service_namespace),
        );

        this.alarms_virtual_node = new VirtualNode(
            this,
            this.base_name + this.alarms_service_namespace + '-vn',
            this.buildVirtualNodeProps(this.alarms_service_namespace),
        );

        // ROUTERS
        this.federation_virtual_router = new VirtualRouter(
            this,
            this.base_name + this.alarms_service_namespace + '-vr',
            {
                listeners: [this.virtual_node_listener],
                mesh: this.mesh,
                virtualRouterName: this.base_name + this.alarms_service_namespace + '-vr',
            },
        );

        // ROUTES
        this.federation_virtual_router.addRoute(
            this.base_name + this.alarms_service_namespace + '-route',
            {
                routeName: this.base_name + this.alarms_service_namespace + '-route',
                routeSpec: RouteSpec.http({
                    match: {
                        path: HttpRoutePathMatch.exactly(
                            'alarms.development.seon-gateway.com/graphql',
                        ),
                    },
                    weightedTargets: [
                        {
                            virtualNode: this.alarms_virtual_node,
                            weight: 1,
                        },
                    ],
                }),
            },
        );

        // SERVICES
        this.federation_virtual_service = new VirtualService(
            this,
            this.base_name + this.federation_service_namespace + '-vs',
            {
                virtualServiceName: this.federation_service_namespace + '.local', // hostedZone.zoneName
                virtualServiceProvider: VirtualServiceProvider.virtualRouter(
                    this.federation_virtual_router,
                ),
            },
        );

        // BACKENDS
        this.federation_virtual_node.addBackend(
            Backend.virtualService(this.federation_virtual_service),
        );

        // BACKENDS

        // backend to route to sub graphs

        // backend for sub graphs to route back to gateway
    }

    private buildVirtualNodeProps = (service_namespace: AvailableServices): VirtualNodeProps => {
        return {
            listeners: [this.virtual_node_listener],
            mesh: this.mesh,
            serviceDiscovery: this.service_discovery.getServiceDiscovery(service_namespace),
            virtualNodeName: service_namespace + '-vn',
        };
    };

    public getVirtualNode(service_namespace: AvailableServices): VirtualNode {
        switch (service_namespace) {
            case this.federation_service_namespace:
                return this.federation_virtual_node;
            case this.alarms_service_namespace:
                return this.alarms_virtual_node;
            default:
                return this.federation_virtual_node;
        }
    }
}
