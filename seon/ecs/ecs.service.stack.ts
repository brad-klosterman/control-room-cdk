import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect } from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

import { ServiceParams, TaskDefContainer } from '../seon.app.interfaces';
import { sourceECR } from './ecr';
import configurePipeline from './ecs.pipeline';

/*
 *
 * https://docs.aws.amazon.com/cdk/api/v1/docs/aws-ecs-readme.html
 */

export const createECSServiceStack = ({
    alb,
    app_props,
    cluster,
    containers,
    https_listener,
    scope,
    service_name,
    service_params,
    services_target_group,
    sub_domain,
    task_params,
    zone,
}: {
    alb: loadBalancerV2.ApplicationLoadBalancer;
    app_props: cdk.StackProps;
    cluster: ecs.Cluster;
    containers: TaskDefContainer[];
    https_listener: loadBalancerV2.ApplicationListener;
    scope: cdk.App;
    service_name: string;
    service_params: ServiceParams;
    services_target_group: loadBalancerV2.ApplicationTargetGroup;
    sub_domain: string;
    task_params: FargateTaskDefinitionProps;
    zone: route53.IHostedZone;
}) => {
    const stack = new cdk.Stack(scope, service_name, app_props);

    const task_definition = new ecs.FargateTaskDefinition(stack, service_name + '-TASKDEF', {
        cpu: task_params.cpu,
        family: service_name + '-TASKDEF',
        memoryLimitMiB: task_params.memoryLimitMiB,
        // runtimePlatform
    });

    task_definition.addToTaskRolePolicy(
        new iam.PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
            effect: Effect.ALLOW,
            resources: ['*'],
        }),
    );

    const ecs_service = new ecs.FargateService(stack, service_name + '-FARGATE', {
        assignPublicIp: false,
        // cloudMapOptions
        capacityProviderStrategies: [
            {
                capacityProvider: 'FARGATE_SPOT',
                weight: 0,
            },
            {
                base: 1,
                capacityProvider: 'FARGATE',
                weight: 1,
            },
        ],

        circuitBreaker: { rollback: true },

        cluster,

        desiredCount: service_params.desiredCount,

        maxHealthyPercent: service_params.maxHealthyPercent,

        minHealthyPercent: service_params.minHealthyPercent,

        serviceName: service_name,

        taskDefinition: task_definition,
    });

    // Load balance incoming requests to this service target
    const service_target_group = https_listener.addTargets(service_name + '-TG', {
        conditions: [loadBalancerV2.ListenerCondition.hostHeaders([sub_domain])],
        port: 80,
        priority: service_params.priority,
        targetGroupName: service_name + '-TG',
        targets: [ecs_service],
    });

    // can add more than one container to the task
    const sourced_containers = containers.map(container => {
        const containerPort = parseInt(container.environment.HOST_PORT);

        const sourced_container = sourceECR({ ecr_name: container.name + '-ecr', stack });

        task_definition
            .addContainer(container.name, {
                environment: container.environment,
                image: ecs.ContainerImage.fromEcrRepository(sourced_container),
                logging: new ecs.AwsLogDriver({ streamPrefix: container.name }),
            })
            .addPortMappings({
                containerPort,
                protocol: ecs.Protocol.TCP,
            });

        // Return a load balancing target for this specific container and port.
        const container_target = ecs_service.loadBalancerTarget({
            containerName: container.name,
            containerPort,
        }); // add to target group

        // https_listener.addTargets(container.name + '-TG', {
        //     targetGroupName: container.name + '-TG',
        //     port: 80,
        //     targets: [
        //         ecs_service.loadBalancerTarget({
        //             containerName: container.name,
        //             containerPort,
        //         }),
        //     ],
        // });
        //
        // https_listener.addTargets(service_name + '-TG', {
        //     targetGroupName: service_name + '-TG',
        //     priority: 10,
        //     conditions: [loadBalancerV2.ListenerCondition.hostHeaders([sub_domain])],
        //     port: 80,
        //     targets: [
        //         ecs_service.loadBalancerTarget({
        //             containerName: container.name,
        //             containerPort,
        //         }),
        //     ],
        //     healthCheck: {
        //         interval: cdk.Duration.seconds(300),
        //         path: container.health_check_url,
        //         port: container.environment.HOST_PORT,
        //         timeout: cdk.Duration.seconds(20),
        //     },
        // });

        // ecs_service.registerLoadBalancerTargets({
        //     containerName: 'web',
        //     containerPort: 80,
        //     newTargetGroupId: 'ECS',
        //     listener: ecs.ListenerConfig.applicationListener(https_listener, {
        //         protocol: ecs.Protocol.TCP,
        //     }),
        // });

        return {
            ...container,
            ecr: sourced_container,
        };
    });

    configurePipeline({
        cluster,
        service: ecs_service,
        service_name,
        sourced_containers,
        stack,
    });

    new route53.ARecord(stack, service_name + `-ALIAS_RECORD_API`, {
        recordName: sub_domain,
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(alb)),
        zone,
    });

    return {
        ecs_service,
    };
};

export default createECSServiceStack;
