import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { MeshStack } from '../../mesh/mesh.stack';
import { XrayContainerProps } from './container.interfaces';

export class XrayContainerOptions extends Construct {
    public readonly options: ecs.ContainerDefinitionOptions;

    constructor(mesh: MeshStack, id: string, props: XrayContainerProps) {
        super(mesh, id);

        this.options = {
            containerName: id,
            image: ecs.ContainerImage.fromRegistry(this.node.tryGetContext('IMAGE_XRAY')),
            logging: ecs.LogDriver.awsLogs({
                logGroup: mesh.service_discovery.base.log_group,
                streamPrefix: props.logStreamPrefix,
            }),
            portMappings: [
                {
                    containerPort: 2000,
                    protocol: ecs.Protocol.UDP,
                },
            ],
            user: '1337',
        };
    }
}
