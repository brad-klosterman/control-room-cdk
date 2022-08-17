import { Duration } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { MeshStack } from '../../mesh/mesh.stack';

export class EnvoyContainer extends Construct {
    public readonly options: ecs.ContainerDefinitionOptions;

    constructor(
        mesh: MeshStack,
        id: string,
        props: {
            app_ports: number[];
            appMeshResourceArn: string;
            enableXrayTracing: boolean;
        },
    ) {
        super(mesh, id);

        this.options = {
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
            image: ecs.ContainerImage.fromRegistry(
                'public.ecr.aws/appmesh/aws-appmesh-envoy:v1.22.2.1-prod',
            ),
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
}
