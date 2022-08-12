import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { MeshStack } from '../../mesh/mesh.stack';
import { EnvoyContainer } from '../containers/envoy.container';
import { MicroserviceContainerOptions } from '../containers/microservice.container';
import { XrayContainerOptions } from '../containers/xray.container';

export enum ServiceDiscoveryType {
    CLOUDMAP = 'CLOUDMAP',
    DNS = 'DNS',
}

export interface FargateServiceProps {
    cluster: ecs.Cluster;
    execution_role: iam.Role;
    task_role: iam.Role;
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

        this.security_group.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(mesh.service_discovery.base.port),
        );

        const envoy_sidecar = new EnvoyContainer(mesh, service_id + 'ENVOY-CONTAINER', {
            app_ports: [mesh.service_discovery.base.port],
            appMeshResourceArn: 'mesh.backendV1VirtualNode.virtualNodeArn',
            enableXrayTracing: true,
            logStreamPrefix: service_id + '-envoy',
        });

        this.task_definition = new ecs.FargateTaskDefinition(this, service_id + 'TD', {
            executionRole: props.execution_role,
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
                        containerPort: mesh.service_discovery.base.port,
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

        this.service = new ecs.FargateService(this, service_id, {
            assignPublicIp: true,
            cluster: props.cluster,
            securityGroups: [this.security_group],
            serviceName: service_id,
            taskDefinition: this.task_definition,
        });

        this.service.associateCloudMapService({
            container: this.microservice_container,
            containerPort: mesh.service_discovery.base.port,
            service: mesh.service_discovery.getCloudMapService(service_id),
        });
    }
}
