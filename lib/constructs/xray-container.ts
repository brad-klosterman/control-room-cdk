import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { MeshStack } from '../stacks/mesh-components';
import { XrayContainerProps } from '../utils';

export class XrayContainer extends Construct {
    public readonly options: ecs.ContainerDefinitionOptions;

    constructor(mesh: MeshStack, id: string, props: XrayContainerProps) {
        super(mesh, id);

        this.options = {
            containerName: 'xray',
            image: ecs.ContainerImage.fromRegistry(this.node.tryGetContext('IMAGE_XRAY')),
            logging: ecs.LogDriver.awsLogs({
                logGroup: mesh.serviceDiscovery.base.logGroup,
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
