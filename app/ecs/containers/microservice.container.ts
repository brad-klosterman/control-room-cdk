import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

import { MeshStack } from '../../mesh/mesh.stack';
import { MicroserviceContainerProps } from './container.interfaces';

export class MicroserviceContainerOptions extends Construct {
    public options: ecs.ContainerDefinitionOptions;

    constructor(mesh: MeshStack, id: string, props: MicroserviceContainerProps) {
        super(mesh, id);

        this.options = {
            containerName: id,
            environment: props.env,
            image: props.image,
            logging: ecs.LogDriver.awsLogs({
                logGroup: mesh.service_discovery.base.log_group,
                streamPrefix: props.logStreamPrefix,
            }),
            portMappings: props.portMappings,
        };
    }
}
