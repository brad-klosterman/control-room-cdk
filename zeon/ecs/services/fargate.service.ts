import { Duration } from 'aws-cdk-lib';
import { VirtualNode } from 'aws-cdk-lib/aws-appmesh';
import { Peer, Port, SecurityGroup, SecurityGroupProps } from 'aws-cdk-lib/aws-ec2';
import { IRepository, Repository } from 'aws-cdk-lib/aws-ecr';
import {
    AppMeshProxyConfiguration,
    Cluster,
    ContainerDefinition,
    ContainerDefinitionOptions,
    ContainerDependencyCondition,
    ContainerImage,
    FargateService,
    FargateServiceProps,
    FargateTaskDefinition,
    ListenerConfig,
    LogDriver,
    Protocol,
    UlimitName,
} from 'aws-cdk-lib/aws-ecs';
import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition';
import { ApplicationProtocol, ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Role } from 'aws-cdk-lib/aws-iam';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { getServiceConfig } from '../../config/seon.config';
import { AvailableServices, ServiceConfig } from '../../config/seon.config.interfaces';
import { MeshStack } from '../../mesh/mesh.stack';
import { ECSPipeline } from '../../pipeline/ecs.pipeline';
import { EnvoyContainer } from '../containers/envoy.container';

export class FargateMeshService extends Construct {
    service_namespace: AvailableServices;
    service_id: string;
    service_config: ServiceConfig;
    readonly log_group: ILogGroup;
    readonly virtual_node: VirtualNode;

    security_group: SecurityGroup;
    task_definition: FargateTaskDefinition;
    service: FargateService;

    main_container: ContainerDefinition;
    envoy_container: ContainerDefinition;
    xray_container: ContainerDefinition;

    constructor(
        mesh: MeshStack,
        id: string,
        props: {
            cluster: Cluster;
            execution_role: Role;
            log_group: ILogGroup;
            service_namespace: AvailableServices;
            task_role: Role;
        },
    ) {
        super(mesh, id);

        this.service_namespace = props.service_namespace;
        this.service_id = mesh.base_name + '-' + this.service_namespace;
        this.log_group = props.log_group;

        this.virtual_node = mesh.getVirtualNode(props.service_namespace);

        this.service_config = getServiceConfig(this.service_namespace);

        this.configureSecurityGroup({
            allowAllOutbound: true,
            securityGroupName: this.service_id + '-security-group',
            vpc: mesh.service_discovery.network.vpc,
        });

        this.security_group.addIngressRule(Peer.anyIpv4(), Port.tcp(mesh.main_port));

        this.allowIpv4IngressForTcpPorts([80, 443, 8080]); // todo better port security

        this.configureTaskDefinition(
            {
                cpu: this.service_config.task_props.cpu,
                executionRole: props.execution_role,
                family: this.service_id,
                memoryLimitMiB: this.service_config.task_props.memoryLimitMiB,
                taskRole: props.task_role,
            },
            [mesh.main_port],
        );

        /**
         * Main Container
         */
        this.main_container = this.configureContainer('main-container', {
            environment: {
                ...this.service_config.main_container.environment,
                XRAY_APP_NAME: `${mesh.mesh.meshName}/${this.virtual_node.virtualNodeName}`,
            },
            essential: true,
            image: ContainerImage.fromRegistry('amazon/amazon-ecs-sample'), // todo
            portMappings: [
                {
                    containerPort: mesh.main_port,
                    hostPort: mesh.main_port, // todo
                    protocol: Protocol.TCP,
                },
            ],
        });

        /**
         * Envoy Container
         */
        this.envoy_container = this.configureContainer('envoy-container', {
            ...new EnvoyContainer(mesh, this.service_id + '-envoy-sidecar', {
                app_ports: [mesh.main_port],
                enableXrayTracing: true,
                virtualNodeArn: this.virtual_node.virtualNodeArn,
            }).options,
        });

        this.envoy_container.addUlimits({
            hardLimit: 15000,
            name: UlimitName.NOFILE,
            softLimit: 15000,
        });

        /**
         * XRay Container
         */
        this.xray_container = this.configureContainer('xray-container', {
            image: ContainerImage.fromRegistry('public.ecr.aws/xray/aws-xray-daemon:latest'),
            // X-Ray traffic should not go through Envoy proxy
            portMappings: [
                {
                    containerPort: 2000,
                    protocol: Protocol.UDP,
                },
            ],
            user: '1337',
        });

        this.configureContainerDependencies();

        this.configureService({
            assignPublicIp: true,
            capacityProviderStrategies: [
                {
                    base: 1,
                    capacityProvider: 'FARGATE',
                    weight: 1,
                },
                {
                    capacityProvider: 'FARGATE_SPOT',
                    weight: 1,
                },
            ],
            circuitBreaker: { rollback: true },
            cluster: props.cluster,
            desiredCount: this.service_config.desired_count,
            maxHealthyPercent: this.service_config.max_healthy_percent,
            minHealthyPercent: this.service_config.min_healthy_percent,
            securityGroups: [this.security_group],
            serviceName: this.service_id,
            taskDefinition: this.task_definition,
        });

        if (this.service_config.discovery_type === 'DNS') {
            const listener = mesh.service_discovery.getListener(this.service_namespace);

            this.service.registerLoadBalancerTargets({
                containerName: this.main_container.containerName,
                containerPort: mesh.main_port,
                listener: ListenerConfig.applicationListener(listener, {
                    // conditions: [ListenerCondition.hostHeaders([this.service_config.host_header])],
                    healthCheck: {
                        healthyHttpCodes: '200,301,302',
                        healthyThresholdCount: 2,
                        interval: Duration.seconds(60),
                        path: this.service_config.health_check_url,
                        port: mesh.main_port.toString(),
                        timeout: Duration.seconds(20),
                        unhealthyThresholdCount: 2,
                    },
                    // priority: this.service_config.priority,
                    protocol: ApplicationProtocol.HTTP,
                }),
                newTargetGroupId: this.service_id + '-target-group',
            });
        } else if (this.service_config.discovery_type === 'CLOUDMAP') {
            this.service.associateCloudMapService({
                container: this.main_container,
                containerPort: mesh.main_port,
                service: mesh.service_discovery.getCloudMapService(this.service_namespace),
            });
        }

        this.configurePipeline({
            container: { name: this.main_container.containerName },
            github: this.service_config.main_container.github,
        });
    }

    private allowIpv4IngressForTcpPorts = (ports: number[]): void => {
        ports.forEach(port => this.security_group.addIngressRule(Peer.anyIpv4(), Port.tcp(port)));
    };

    configureSecurityGroup(security_group_props: SecurityGroupProps) {
        this.security_group = new SecurityGroup(
            this,
            this.service_id + '-security-group',
            security_group_props,
        );
    }

    configureTaskDefinition(task_definition_props: FargateTaskDefinitionProps, ports: number[]) {
        this.task_definition = new FargateTaskDefinition(
            this,
            this.service_id + '-task-definition',
            {
                ...task_definition_props,
                proxyConfiguration: new AppMeshProxyConfiguration({
                    containerName: this.service_id + '-envoy-container',
                    properties: {
                        appPorts: ports,
                        egressIgnoredIPs: ['169.254.170.2', '169.254.169.254'],
                        ignoredUID: 1337,
                        proxyEgressPort: 15001,
                        proxyIngressPort: 15000,
                    },
                }),
            },
        );
    }

    configureContainer(container_id: string, container_options: ContainerDefinitionOptions) {
        const container_name = this.service_id + '-' + container_id;

        return this.task_definition.addContainer(container_name, {
            containerName: container_name,
            logging: LogDriver.awsLogs({
                logGroup: this.log_group,
                streamPrefix: this.service_namespace + '-' + container_id,
            }),
            ...container_options,
        });
    }

    configureContainerDependencies() {
        this.main_container.addContainerDependencies({
            condition: ContainerDependencyCondition.HEALTHY,
            container: this.envoy_container,
        });

        this.main_container.addContainerDependencies({
            condition: ContainerDependencyCondition.START,
            container: this.xray_container,
        });

        this.envoy_container.addContainerDependencies({
            condition: ContainerDependencyCondition.START,
            container: this.xray_container,
        });
    }

    configureService(service_props: FargateServiceProps) {
        this.service = new FargateService(this, this.service_id, service_props);
    }

    configurePipeline(props: {
        container: { name: string };
        github: { branch: string; repo: string };
    }) {
        const ecr_repo_name = this.service_id.toLowerCase() + '-ecr';

        const ecr_repo: IRepository = Repository.fromRepositoryName(
            this,
            ecr_repo_name,
            ecr_repo_name,
        );

        new ECSPipeline(this.service, this.service_id + '-pipeline', {
            ...props,
            ecr: ecr_repo,
            pipeline_name: this.service_id,
        });
    }
}

// const target_group = new ApplicationTargetGroup(
//     this,
//     this.service_id + '-target-group',
//     {
//         deregistrationDelay: cdk.Duration.seconds(30),
//         healthCheck: {
//             healthyHttpCodes: '200,301,302',
//             healthyThresholdCount: 2,
//             interval: cdk.Duration.seconds(60),
//             path: this.service_config.health_check_url,
//             port: this.main_container.containerPort.toString(),
//             timeout: cdk.Duration.seconds(20),
//             unhealthyThresholdCount: 2,
//         },
//         port: 80,
//         protocol: ApplicationProtocol.HTTP,
//         // stickinessCookieDuration: cdk.Duration.hours(1), // todo
//         targets: [
//             this.service.loadBalancerTarget({
//                 containerName: this.main_container.containerName,
//                 containerPort: this.main_container.containerPort,
//             }),
//         ],
//         vpc: mesh.service_discovery.network.vpc,
//     },
// );
//
// listener.addAction(this.service_id + '-listener-action', {
//     action: ListenerAction.forward([target_group]),
//     conditions: [
//         ListenerCondition.hostHeaders([this.service_config.host_header]),
//         ListenerCondition.pathPatterns([this.service_config.path]),
//     ],
//     priority: this.service_config.priority,
// });

// this.service.registerLoadBalancerTargets({
//     containerName: this.main_container.containerName,
//     containerPort: mesh.main_port,
//     listener: ecs.ListenerConfig.applicationListener(listener, {
//         conditions: [ListenerCondition.hostHeaders([this.service_config.host_header])],
//         healthCheck: {
//             healthyHttpCodes: '200,301,302',
//             healthyThresholdCount: 2,
//             interval: Duration.seconds(60),
//             path: this.service_config.health_check_url,
//             port: mesh.main_port.toString(),
//             timeout: Duration.seconds(20),
//             unhealthyThresholdCount: 2,
//         },
//         priority: this.service_config.priority,
//         protocol: ApplicationProtocol.HTTP,
//     }),
//     newTargetGroupId: this.service_id + '-target-group',
// });

// listener.addTargets(this.service_id + '-target-group', {
//     // this might not work bc
//     // conditions: [ListenerCondition.hostHeaders([this.service_config.host_header])],
//     healthCheck: {
//         healthyHttpCodes: '200,301,302',
//         healthyThresholdCount: 2,
//         interval: Duration.seconds(60),
//         path: this.service_config.health_check_url,
//         port: mesh.main_port.toString(),
//         timeout: Duration.seconds(20),
//         unhealthyThresholdCount: 2,
//     },
//     port: mesh.main_port,
//     priority: this.service_config.priority,
//     protocol: ApplicationProtocol.HTTP,
//     targets: [this.service],
// });
