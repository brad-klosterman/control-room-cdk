import { StackProps } from 'aws-cdk-lib';
import {
    Backend,
    HeaderMatch,
    HttpRoutePathMatch,
    Mesh,
    MeshFilterType,
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

    federation_virtual_node: VirtualNode;
    federation_virtual_router: VirtualRouter;
    federation_virtual_service: VirtualService;

    alarms_virtual_node: VirtualNode;
    workforce_virtual_node: VirtualNode;
    ssp_virtual_node: VirtualNode;

    constructor(service_discovery: DiscoveryStack, id: string, props?: StackProps) {
        super(service_discovery, id, props);

        this.service_discovery = service_discovery;

        /**
         * A service mesh is a logical boundary for network traffic between the services that reside within it.
         */
        this.mesh = new Mesh(this, this.base_name + '-mesh', {
            egressFilter: MeshFilterType.ALLOW_ALL,
            meshName: this.base_name + '-mesh',
        });

        this.virtual_node_listener = VirtualNodeListener.http({
            port: this.main_port,
        });

        /**
         * Virtual router that handles traffic for a virtual service.
         */
        this.federation_virtual_router = new VirtualRouter(
            this,
            this.base_name + '-federation-vr',
            {
                listeners: [this.virtual_node_listener],
                mesh: this.mesh,
                virtualRouterName: this.base_name + '-federation-vr',
            },
        );

        /**
         * Define a backend service for the federation gateway
         */
        this.federation_virtual_service = new VirtualService(
            this,
            this.base_name + '-federation-vs',
            {
                virtualServiceName:
                    this.federation_service_namespace + '.' + this.private_domain_namespace,
                virtualServiceProvider: VirtualServiceProvider.virtualRouter(
                    this.federation_virtual_router,
                ),
            },
        );

        /**
         * A virtual node acts as a logical pointer to a particular task group (ECS)
         * - Accept inbound traffic by specifying a listener
         * - Outbound traffic that your virtual node expects to send should be specified as a back end.
         */

        this.federation_virtual_node = new VirtualNode(
            this,
            this.base_name + '-federation-vn',
            this.buildVirtualNodeProps(this.federation_service_namespace),
        );

        this.federation_virtual_node.addBackend(
            Backend.virtualService(this.federation_virtual_service),
        );

        // SUB GRAPHS

        this.configureSubGraphs();
    }

    private buildVirtualNodeProps = (service_namespace: AvailableServices): VirtualNodeProps => {
        return {
            listeners: [this.virtual_node_listener],
            mesh: this.mesh,
            serviceDiscovery: this.service_discovery.getNodeDiscovery(service_namespace),
            virtualNodeName: service_namespace + '-vn',
        };
    };

    public getVirtualNode(service_namespace: AvailableServices): VirtualNode {
        switch (service_namespace) {
            case this.federation_service_namespace:
                return this.federation_virtual_node;
            case this.alarms_service_namespace:
                return this.alarms_virtual_node;
            case this.workforce_service_namespace:
                return this.workforce_virtual_node;
            case this.ssp_service_namespace:
                return this.ssp_virtual_node;
            default:
                return this.federation_virtual_node;
        }
    }

    private configureSubGraphs() {
        this.sub_graphs.forEach(sub_graph => {
            const virtual_node = new VirtualNode(
                this,
                sub_graph + '-vn',
                this.buildVirtualNodeProps(sub_graph),
            );

            this.federation_virtual_router.addRoute(this.base_name + '-' + sub_graph + '-route', {
                routeName: sub_graph + '-route',
                routeSpec: RouteSpec.http({
                    match: {
                        path: HttpRoutePathMatch.startsWith(`/${sub_graph}`),
                    },
                    weightedTargets: [
                        {
                            virtualNode: virtual_node,
                            weight: 1,
                        },
                    ],
                }),
            });

            if (sub_graph === this.alarms_service_namespace) {
                this.alarms_virtual_node = virtual_node;
            }

            if (sub_graph === this.workforce_service_namespace) {
                this.workforce_virtual_node = virtual_node;
            }

            if (sub_graph === this.ssp_service_namespace) {
                this.ssp_virtual_node = virtual_node;
            }
        });
    }
}

// headers: [
//     HeaderMatch.valueIs(
//         'mesh-route',
//         `https://${sub_graph}.development.seon-gateway.com/graphql`,
//     ),
// ],
