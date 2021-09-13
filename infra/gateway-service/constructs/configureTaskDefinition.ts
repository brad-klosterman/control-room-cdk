import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";

import { ITag, ISourcedContainer } from "../interfaces";

const configureTaskDefinition = (
  id: string,
  stack: cdk.Stack,
  containerProperties: ISourcedContainer,
  tags: ITag[]
) => {
  const taskDefinition = new ecs.FargateTaskDefinition(
    stack,
    `${id}TaskDefinition`,
    {
      cpu: 1024,
      memoryLimitMiB: 2048,
    }
  );
  taskDefinition
    .addContainer(`${id}Container`, {
      image:
        containerProperties.image,
      // memoryLimitMiB: 256,
      environment: containerProperties.environment,
      logging: new ecs.AwsLogDriver({ streamPrefix: `${id}` }),
    })
    .addPortMappings({
      containerPort: containerProperties.containerPort,
      protocol: ecs.Protocol.TCP,
    });
  tags.forEach((tag) => cdk.Tags.of(taskDefinition).add(tag.name, tag.value));
  return taskDefinition;
};

export default configureTaskDefinition;
