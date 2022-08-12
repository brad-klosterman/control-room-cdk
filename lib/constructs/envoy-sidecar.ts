import { Duration } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { MeshStack } from '../stacks/mesh-components';
import { EnvoyContainerProps } from '../utils';

export class EnvoySidecar extends Construct {
    public readonly options: ecs.ContainerDefinitionOptions;

    constructor(mesh: MeshStack, id: string, props: EnvoyContainerProps) {
        super(mesh, id);

        this.options = {
            containerName: 'envoy',
            environment: {
                APPMESH_RESOURCE_ARN: props.appMeshResourceArn,
                ENABLE_ENVOY_STATS_TAGS: '1',
                ENABLE_ENVOY_XRAY_TRACING: props.enableXrayTracing ? '1' : '0',
                ENVOY_LOG_LEVEL: 'debug',
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -s http://localhost:9901/server_info | grep state | grep -q LIVE',
                ],
                interval: Duration.seconds(5),
                retries: 10,
                timeout: Duration.seconds(10),
            },
            image: ecs.ContainerImage.fromRegistry(this.node.tryGetContext('IMAGE_ENVOY')),
            logging: ecs.LogDriver.awsLogs({
                logGroup: mesh.serviceDiscovery.base.logGroup,
                streamPrefix: props.logStreamPrefix,
            }),
            portMappings: [
                {
                    containerPort: 9901,
                    protocol: ecs.Protocol.TCP,
                },
                {
                    containerPort: 15000,
                    protocol: ecs.Protocol.TCP,
                },
                {
                    containerPort: 15001,
                    protocol: ecs.Protocol.TCP,
                },
            ],
            user: '1337',
        };
    }

    public static buildAppMeshProxy = (...appPorts: number[]): ecs.AppMeshProxyConfiguration => {
        return new ecs.AppMeshProxyConfiguration({
            containerName: 'envoy',
            properties: {
                appPorts: appPorts,
                egressIgnoredIPs: ['169.254.170.2', '169.254.169.254'],
                ignoredUID: 1337,
                proxyEgressPort: 15001,
                proxyIngressPort: 15000,
            },
        });
    };
}
