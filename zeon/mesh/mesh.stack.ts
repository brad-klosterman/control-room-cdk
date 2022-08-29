import { StackProps } from 'aws-cdk-lib';
import {
    Backend,
    DnsResponseType,
    HttpRoutePathMatch,
    IpPreference,
    Mesh,
    MeshFilterType,
    RouteSpec,
    ServiceDiscovery,
    TlsCertificate,
    TlsMode,
    VirtualNode,
    VirtualNodeListener,
    VirtualNodeProps,
    VirtualRouter,
    VirtualService,
    VirtualServiceProvider,
} from 'aws-cdk-lib/aws-appmesh';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';

import { BaseStack } from '../base/base.stack';
import { AvailableServices } from '../config/seon.config.interfaces';
import { DiscoveryStack } from '../discovery/discovery.stack';

export class MeshStack extends BaseStack {
    readonly service_discovery: DiscoveryStack;

    /**
     *  Appmesh:
     * - A logical boundary for network traffic between the services that reside within it.
     *
     * - CDK Docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appmesh-readme.html
     * - SEON Mesh: https://eu-central-1.console.aws.amazon.com/appmesh/meshes?region=eu-central-1
     */
    readonly mesh: Mesh;

    /**
     * Defines a listener for the microservices virtual nodes.
     * - Listening on main port 4000
     */
    readonly virtual_node_listener: VirtualNodeListener;

    /**
     * * https://docs.aws.amazon.com/app-mesh/latest/userguide/tls.html
     */
    readonly tls_certificate: Certificate;

    /**
     * A virtual node acts as a logical pointer to a particular task group (ECS)
     * - Accept inbound traffic by specifying a listener
     * - Outbound traffic that your virtual node expects to send should be specified as a back end.
     */
    federation_virtual_node: VirtualNode;

    /**
     * Routes traffic from the Federation Gateway Virtual Service to the Subgraphs
     */
    federation_subgraph_router: VirtualRouter;
    federation_subgraph_service: VirtualService;

    /**
     * Routes traffic from the Federation Gateway to the uplink virtual node
     */
    apollo_uplink_virtual_node: VirtualNode;

    /**
     * Routes traffic from the Federation Gateway to the uplink virtual node
     */
    apollo_uplink_service: VirtualService;

    /**
     * Routes traffic from the Federation Gateway to the uplink virtual node
     */
    external_virtual_node: VirtualNode;

    /**
     * Routes traffic from the Federation Gateway to the uplink virtual node
     */
    external_service: VirtualService;

    alarms_virtual_node: VirtualNode;
    workforce_virtual_node: VirtualNode;
    ssp_virtual_node: VirtualNode;

    constructor(service_discovery: DiscoveryStack, id: string, props?: StackProps) {
        super(service_discovery, id, props);

        this.service_discovery = service_discovery;

        this.mesh = new Mesh(this, this.base_name + '-mesh', {
            egressFilter: MeshFilterType.DROP_ALL, // ALLOW_SPECIFIED
            meshName: this.base_name + '-mesh',
        });

        this.virtual_node_listener = VirtualNodeListener.http({
            port: this.main_port,
        });

        /**
         * Federation Gateway Microservice Virtual Node
         */
        this.federation_virtual_node = new VirtualNode(this, this.base_name + '-federation-vn', {
            ...this.buildVirtualNodeProps(this.federation_service_namespace),
        });

        /**
         * Federation Gateways Subgraphs Router
         */
        this.federation_subgraph_router = this.configureVirtualRouter({
            router_name: 'federation-subgraph-router',
        });

        /**
         * Federation Gateway Backend for the Subgraph Router
         */
        this.federation_subgraph_service = this.configureVirtualService(
            this.federation_service_namespace,
            VirtualServiceProvider.virtualRouter(this.federation_subgraph_router),
        );

        /**
         * Routes traffic to the Apollo Uplink external API
         */
        this.apollo_uplink_virtual_node = new VirtualNode(this, this.base_name + '-apollo-uplink', {
            listeners: [
                VirtualNodeListener.tcp({
                    port: 443,
                }),
            ],
            mesh: this.mesh,
            serviceDiscovery: ServiceDiscovery.dns(
                'aws.uplink.api.apollographql.com',
                DnsResponseType.LOAD_BALANCER,
                IpPreference.IPV4_ONLY,
            ),
            virtualNodeName: 'apollo-uplink',
        });

        /**
         * Federation Gateway Backend to the Apollo Uplink virtual node
         */
        this.apollo_uplink_service = new VirtualService(
            this,
            this.base_name + '-apollo-uplink-vs',
            {
                virtualServiceName: 'aws.uplink.api.apollographql.com',
                virtualServiceProvider: VirtualServiceProvider.virtualNode(
                    this.apollo_uplink_virtual_node,
                ),
            },
        );

        this.external_virtual_node = new VirtualNode(this, this.base_name + '-external-vn', {
            listeners: [
                VirtualNodeListener.tcp({
                    port: 443,
                }),
            ],
            mesh: this.mesh,
            serviceDiscovery: ServiceDiscovery.dns(
                'mocki.io',
                DnsResponseType.LOAD_BALANCER,
                IpPreference.IPV4_ONLY,
            ),
            virtualNodeName: 'external',
        });

        /**
         * Routes traffic from the Federation Gateway to the external virtual node
         */
        this.external_service = new VirtualService(this, this.base_name + '-external-vs', {
            virtualServiceName: 'mocki.io',
            virtualServiceProvider: VirtualServiceProvider.virtualNode(this.external_virtual_node),
        });

        /**
         * Add the backend services to the Federated Gateway
         */
        this.federation_virtual_node.addBackend(
            Backend.virtualService(this.federation_subgraph_service),
        );

        this.federation_virtual_node.addBackend(Backend.virtualService(this.external_service));
        this.federation_virtual_node.addBackend(Backend.virtualService(this.apollo_uplink_service));

        this.configureSubGraphs();
    }

    private configureVirtualRouter({ router_name }: { router_name: string }): VirtualRouter {
        return new VirtualRouter(this, this.base_name + '-' + router_name, {
            listeners: [this.virtual_node_listener],
            mesh: this.mesh,
            virtualRouterName: router_name,
        });
    }

    private configureVirtualService(
        service_namespace: string,
        provider: VirtualServiceProvider,
    ): VirtualService {
        const virtual_service_name =
            service_namespace + '.' + this.service_discovery.private_hosted_zone.zoneName;

        const virtual_service = new VirtualService(
            this,
            this.base_name + '-' + service_namespace + '-vs',
            {
                virtualServiceName: virtual_service_name,
                virtualServiceProvider: provider,
            },
        );

        /**
         * Create an A record to the hosted zone to avoid the IP address lookup error.
         * https://docs.aws.amazon.com/app-mesh/latest/userguide/troubleshoot-connectivity.html
         */
        new ARecord(this, virtual_service_name + '-a-record', {
            recordName: virtual_service_name,
            target: RecordTarget.fromIpAddresses('10.10.10.10'),
            zone: this.service_discovery.private_hosted_zone,
        });

        return virtual_service;
    }

    // private configureExternalRoute({
    //     name,
    //     path_match,
    //     url,
    // }: {
    //     name: string;
    //     path_match: HttpRoutePathMatch;
    //     url: string;
    // }): RouteSpec {
    //     const external_virtual_node = new VirtualNode(this, this.base_name + '-' + name, {
    //         listeners: [this.virtual_node_listener],
    //         mesh: this.mesh,
    //         serviceDiscovery: ServiceDiscovery.dns(url),
    //         virtualNodeName: name,
    //     });
    //
    //     return (this.apollo_uplink_route_spec = RouteSpec.http({
    //         match: {
    //             path: path_match,
    //         },
    //         weightedTargets: [
    //             {
    //                 virtualNode: external_virtual_node,
    //                 weight: 1,
    //             },
    //         ],
    //     }));
    // }

    private configureSubGraphs() {
        this.sub_graphs.forEach(sub_graph => {
            const subgraph_virtual_node = new VirtualNode(
                this,
                sub_graph + '-vn',
                this.buildVirtualNodeProps(sub_graph),
            );

            this.federation_subgraph_router.addRoute(this.base_name + '-' + sub_graph + '-route', {
                routeName: sub_graph + '-route',
                routeSpec: RouteSpec.http({
                    match: {
                        path: HttpRoutePathMatch.startsWith(`/${sub_graph}`),
                    },
                    weightedTargets: [
                        {
                            virtualNode: subgraph_virtual_node,
                            weight: 1,
                        },
                    ],
                }),
            });

            if (sub_graph === this.alarms_service_namespace) {
                this.alarms_virtual_node = subgraph_virtual_node;
            }

            if (sub_graph === this.workforce_service_namespace) {
                this.workforce_virtual_node = subgraph_virtual_node;
            }

            if (sub_graph === this.ssp_service_namespace) {
                this.ssp_virtual_node = subgraph_virtual_node;
            }
        });
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
}
