import { Duration } from 'aws-cdk-lib';
import { VirtualNode } from 'aws-cdk-lib/aws-appmesh';
import { SecurityGroupProps } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import {
    ContainerDefinitionOptions,
    ContainerImage,
    FargateServiceProps,
    LogDriver,
} from 'aws-cdk-lib/aws-ecs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition';
import { ApplicationProtocol, ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { getServiceConfig } from '../../config/seon.config';
import { AvailableServices, ServiceConfig } from '../../config/seon.config.interfaces';
import { MeshStack } from '../../mesh/mesh.stack';
import { ECSPipeline } from '../../pipeline/ecs.pipeline';
import { EnvoyContainer } from '../containers/envoy.container';

export class FargateService extends Construct {
    service_namespace: AvailableServices;
    service_id: string;
    service_config: ServiceConfig;
    log_group: ILogGroup;

    // SERVICE MESH
    readonly virtual_node: VirtualNode;

    security_group: ec2.SecurityGroup;
    task_definition: ecs.FargateTaskDefinition;
    service: ecs.FargateService;

    main_container: ecs.ContainerDefinition;
    envoy_container: ecs.ContainerDefinition;
    xray_container: ecs.ContainerDefinition;

    constructor(
        mesh: MeshStack,
        id: string,
        props: {
            cluster: ecs.Cluster;
            execution_role: iam.Role;
            log_group: ILogGroup;
            service_namespace: AvailableServices;
            task_role: iam.Role;
        },
    ) {
        super(mesh, id);

        this.service_namespace = props.service_namespace;
        this.service_id = mesh.base_name + '-' + this.service_namespace;
        this.log_group = props.log_group;

        // SERVICE MESH or could Create
        this.virtual_node = mesh.getVirtualNode(props.service_namespace);

        this.getServiceConfig();

        this.configureSecurityGroup({
            securityGroupName: this.service_id + '-security-group',
            vpc: mesh.service_discovery.network.vpc,
        });

        this.security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(mesh.main_port));

        this.allowIpv4IngressForTcpPorts([80, 443, 8080]); // todo

        this.configureTaskDefinition(
            {
                cpu: this.service_config.task_props.cpu,
                executionRole: props.execution_role,
                family: this.service_config.task_props.family,
                memoryLimitMiB: this.service_config.task_props.memoryLimitMiB,
                taskRole: props.task_role,
            },
            [mesh.main_port],
        );

        // MAIN CONTAINER
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
                    protocol: ecs.Protocol.TCP,
                },
            ],
        });

        // ENVOY CONTAINER
        this.envoy_container = this.configureContainer('envoy-container', {
            ...new EnvoyContainer(mesh, this.service_id + '-envoy-sidecar', {
                app_ports: [mesh.main_port],
                appMeshResourceArn: this.virtual_node.virtualNodeArn,
                enableXrayTracing: true,
            }).options,
        });

        this.envoy_container.addUlimits({
            hardLimit: 15000,
            name: ecs.UlimitName.NOFILE,
            softLimit: 15000,
        });

        // XRAY CONTAINER
        this.xray_container = this.configureContainer('xray-container', {
            image: ecs.ContainerImage.fromRegistry('public.ecr.aws/xray/aws-xray-daemon:latest'),
            // X-Ray traffic should not go through Envoy proxy
            portMappings: [
                {
                    containerPort: 2000,
                    protocol: ecs.Protocol.UDP,
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

            listener.addTargets(this.service_id + '-target-group', {
                conditions: [ListenerCondition.hostHeaders([this.service_config.host_header])],
                healthCheck: {
                    healthyHttpCodes: '200,301,302',
                    healthyThresholdCount: 2,
                    interval: Duration.seconds(60),
                    path: this.service_config.health_check_url,
                    port: mesh.main_port.toString(),
                    timeout: Duration.seconds(20),
                    unhealthyThresholdCount: 2,
                },
                port: mesh.main_port,
                priority: this.service_config.priority,
                protocol: ApplicationProtocol.HTTP,
                targets: [this.service],
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
        ports.forEach(port =>
            this.security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(port)),
        );
    };

    getServiceConfig() {
        this.service_config = getServiceConfig(this.service_namespace);
    }

    configureSecurityGroup(security_group_props: SecurityGroupProps) {
        this.security_group = new ec2.SecurityGroup(
            this,
            this.service_id + '-security-group',
            security_group_props,
        );
    }

    configureTaskDefinition(task_definition_props: FargateTaskDefinitionProps, ports: number[]) {
        this.task_definition = new ecs.FargateTaskDefinition(
            this,
            this.service_id + '-task-definition',
            {
                ...task_definition_props,
                proxyConfiguration: new ecs.AppMeshProxyConfiguration({
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
            condition: ecs.ContainerDependencyCondition.HEALTHY,
            container: this.envoy_container,
        });

        this.main_container.addContainerDependencies({
            condition: ecs.ContainerDependencyCondition.START,
            container: this.xray_container,
        });

        this.envoy_container.addContainerDependencies({
            condition: ecs.ContainerDependencyCondition.START,
            container: this.xray_container,
        });
    }

    configureService(service_props: FargateServiceProps) {
        this.service = new ecs.FargateService(this, this.service_id, service_props);
    }

    configurePipeline(props: {
        container: { name: string };
        github: { branch: string; repo: string };
    }) {
        const ecr_repo_name = this.service_id.toLowerCase() + '-ecr';

        const ecr_repo: ecr.IRepository = ecr.Repository.fromRepositoryName(
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
