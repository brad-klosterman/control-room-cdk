import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import { Effect } from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

import { ISourcedContainer, ITag } from '../interfaces';
import { configureExecutionRole, createTaskRole } from './configureRoles';

/** A task definition is required to run Docker containers in Amazon ECS.
 * The Docker image to use with (each) container in your task
 * How much CPU and memory to use with each task or each container within a task
 * The Docker networking mode to use for the containers in your task
 * The logging configuration to use for your tasks
 * Whether the task should continue to run if the container finishes or fails
 * The IAM role that the tasks uses to make API requests to AWS services
 * Execution role allows ECS to create the task, pull images, publish logs
 *
 * @param stack                 The CDK stack
 * @param containerProperties   The container parameters
 * @param tags                  The tags to apply
 */

const configureTaskDefinition = ({
    containerProperties: container,
    stack,
    tags,
}: {
    containerProperties: ISourcedContainer;
    stack: cdk.Stack;
    tags?: ITag[];
}) => {
    const taskDefinition = new ecs.FargateTaskDefinition(stack, container.id + 'TaskDefinition', {
        cpu: 1024,
        memoryLimitMiB: 2048,
        // executionRole: configureExecutionRole({
        //   stack,
        //   baseName: container.id,
        // }),
    });

    taskDefinition
        .addContainer(`${container.id}Container`, {
            // image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
            // memoryLimitMiB: 256,
            environment: container.environment,

            image: ecs.ContainerImage.fromEcrRepository(container.ecrRepo),
            logging: new ecs.AwsLogDriver({ streamPrefix: container.id }),
        })
        .addPortMappings({
            containerPort: container.containerPort,
            protocol: ecs.Protocol.TCP,
        });

    taskDefinition.addToTaskRolePolicy(
        new iam.PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
            effect: Effect.ALLOW,
            resources: ['*'],
        }),
    );

    tags && tags.forEach(tag => cdk.Tags.of(taskDefinition).add(tag.name, tag.value));

    return taskDefinition;
};

export default configureTaskDefinition;
