import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { MeshStack } from '../../mesh/mesh.stack';
import { EnvoyContainer } from '../containers/envoy.container';
import { MicroserviceContainerOptions } from '../containers/microservice.container';
import { XrayContainerOptions } from '../containers/xray.container';

export interface FargateServiceProps {
    cluster: ecs.Cluster;
    container: {
        branch: string;
        environment: { [key: string]: string };
        health_check_url: string;
        repo: string;
        url_path: string;
    };
    discovery_name: string;
    discovery_type: 'DNS' | 'CLOUDMAP';
    execution_role: iam.Role;
    port: number;
    priority: number;
    service_params: {
        desiredCount: number;
        maxHealthyPercent: number;
        minHealthyPercent: number;
    };
    task_params: {
        cpu: number;
        memoryLimitMiB: number;
    };
    task_role: iam.Role;
    virtual_node_arn: string;
}

export class FargateService extends Construct {
    task_definition: ecs.FargateTaskDefinition;
    service: ecs.FargateService;
    security_group: ec2.SecurityGroup;
    microservice_container: ecs.ContainerDefinition;
    envoy_container: ecs.ContainerDefinition;
    xray_container: ecs.ContainerDefinition;

    constructor(mesh: MeshStack, service_id: string, props: FargateServiceProps) {
        super(mesh, service_id);

        this.security_group = new ec2.SecurityGroup(this, service_id + 'TASK-SG', {
            vpc: mesh.service_discovery.base.vpc,
        });

        this.security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(props.port));

        // this.allowIpv4IngressForTcpPorts([80, 8080]);

        const envoy_sidecar = new EnvoyContainer(mesh, service_id + 'ENVOY-CONTAINER', {
            app_ports: [props.port],
            appMeshResourceArn: props.virtual_node_arn,
            enableXrayTracing: true,
            logStreamPrefix: service_id + '-envoy',
        });

        this.task_definition = new ecs.FargateTaskDefinition(this, service_id + 'TD', {
            cpu: props.task_params.cpu,
            executionRole: props.execution_role,
            memoryLimitMiB: props.task_params.memoryLimitMiB,
            // family: props.taskDefinitionFamily,
            proxyConfiguration: envoy_sidecar.proxy_config,
            taskRole: props.task_role,
        });

        this.microservice_container = this.task_definition.addContainer(
            service_id + 'MICROSERVICE-CONTAINER',
            new MicroserviceContainerOptions(mesh, service_id + 'MICROSERVICE-CONTAINER', {
                image: ecs.ContainerImage.fromRegistry(this.node.tryGetContext('IMAGE_BACKEND')),
                logStreamPrefix: service_id + '-microservice',
                portMappings: [
                    {
                        containerPort: props.port,
                        protocol: ecs.Protocol.TCP,
                    },
                ],
            }).options,
        );

        this.envoy_container = this.task_definition.addContainer(
            service_id + 'ENVOY-CONTAINER',
            envoy_sidecar.options,
        );

        this.envoy_container.addUlimits({
            hardLimit: 15000,
            name: ecs.UlimitName.NOFILE,
            softLimit: 15000,
        });

        this.microservice_container.addContainerDependencies({
            condition: ecs.ContainerDependencyCondition.HEALTHY,
            container: this.envoy_container,
        });

        // XRAY
        this.xray_container = this.task_definition.addContainer(
            service_id + 'XRAY',
            new XrayContainerOptions(mesh, service_id + 'XRAY', {
                logStreamPrefix: service_id + '-xray',
            }).options,
        );

        this.microservice_container.addContainerDependencies({
            condition: ecs.ContainerDependencyCondition.START,
            container: this.xray_container,
        });

        this.envoy_container.addContainerDependencies({
            condition: ecs.ContainerDependencyCondition.START,
            container: this.xray_container,
        });

        // FARGATE SERVICE
        this.service = new ecs.FargateService(this, service_id, {
            assignPublicIp: false,
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
            desiredCount: props.service_params.desiredCount,
            maxHealthyPercent: props.service_params.maxHealthyPercent,
            minHealthyPercent: props.service_params.minHealthyPercent,
            securityGroups: [this.security_group],
            serviceName: service_id,
            taskDefinition: this.task_definition,
        });

        if (props.discovery_type === 'DNS') {
            const listener = mesh.service_discovery.getListener(props.discovery_name);

            const target_group = new loadBalancerV2.ApplicationTargetGroup(
                this,
                service_id + 'TARGET-GROUP',
                {
                    deregistrationDelay: cdk.Duration.seconds(30),
                    healthCheck: {
                        healthyHttpCodes: '200,301,302',
                        healthyThresholdCount: 2,
                        interval: cdk.Duration.seconds(60),
                        path: props.container.health_check_url,
                        port: props.container.environment.HOST_PORT,
                        timeout: cdk.Duration.seconds(20),
                        unhealthyThresholdCount: 2,
                    },
                    port: 80,
                    protocol: loadBalancerV2.ApplicationProtocol.HTTP,
                    // stickinessCookieDuration: cdk.Duration.hours(1), // todo ?
                    targets: [
                        this.service.loadBalancerTarget({
                            containerName: service_id,
                            containerPort: props.port,
                        }),
                    ],
                    vpc: mesh.service_discovery.base.vpc,
                },
            );

            listener.addAction(service_id + 'LISTENER-ACTION', {
                action: loadBalancerV2.ListenerAction.forward([target_group]),
                conditions: [
                    loadBalancerV2.ListenerCondition.hostHeaders([props.discovery_name]),
                    loadBalancerV2.ListenerCondition.pathPatterns([props.container.url_path]),
                ],
                priority: props.priority,
            });
        } else if (props.discovery_type === 'CLOUDMAP') {
            this.service.associateCloudMapService({
                container: this.microservice_container,
                containerPort: props.port,
                service: mesh.service_discovery.getCloudMapService(props.discovery_name),
            });
        }
    }
    private allowIpv4IngressForTcpPorts = (ports: number[]): void => {
        ports.forEach(port =>
            this.security_group.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(port)),
        );
    };
}
