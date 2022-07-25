import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Effect } from 'aws-cdk-lib/aws-iam';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition';

import { ServiceParams, TaskDefContainer } from '../seon.app.interfaces';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { sourceECR } from './ecr';
import configurePipeline from './ecs.pipeline';

export const createECSServiceStack = ({
    scope,
    app_props,
    service_name,
    alb,
    zone,
    sub_domain,
    https_listener,
    cluster,
    containers,
    task_params,
    service_params,
}: {
    scope: cdk.App;
    app_props: cdk.StackProps;
    service_name: string;
    alb: loadBalancerV2.ApplicationLoadBalancer;
    zone: route53.IHostedZone;
    sub_domain: string;
    https_listener: loadBalancerV2.ApplicationListener;
    cluster: ecs.Cluster;
    containers: TaskDefContainer[];
    task_params: FargateTaskDefinitionProps;
    service_params: ServiceParams;
}) => {
    const stack = new cdk.Stack(scope, service_name + '-STACK', app_props);

    const task_definition = new ecs.FargateTaskDefinition(stack, service_name + '-TASKDEF', {
        family: service_name + '-TASKDEF',
        cpu: task_params.cpu,
        memoryLimitMiB: task_params.memoryLimitMiB,
        // runtimePlatform
    });

    task_definition.addToTaskRolePolicy(
        new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
            resources: ['*'],
        })
    );

    const ecs_service = new ecs.FargateService(stack, service_name + '-FARGATE', {
        serviceName: service_name,
        cluster,
        assignPublicIp: false,
        desiredCount: service_params.desiredCount,
        minHealthyPercent: service_params.minHealthyPercent,
        maxHealthyPercent: service_params.maxHealthyPercent,
        taskDefinition: task_definition,
        capacityProviderStrategies: [
            {
                capacityProvider: 'FARGATE_SPOT',
                weight: 0,
            },
            {
                capacityProvider: 'FARGATE',
                weight: 1,
            },
        ],
    });

    const sourced_containers = containers.map(container => {
        const containerPort = parseInt(container.environment.HOST_PORT);

        const sourced_container = sourceECR({ stack, ecr_name: container.name + '-ECR' });

        task_definition
            .addContainer(container.name, {
                image: ecs.ContainerImage.fromEcrRepository(sourced_container),
                environment: container.environment,
                logging: new ecs.AwsLogDriver({ streamPrefix: container.name }),
            })
            .addPortMappings({
                containerPort,
                protocol: ecs.Protocol.TCP,
            });

        https_listener.addTargets(service_name + '-TG', {
            targetGroupName: service_name + '-TG',
            priority: 10,
            conditions: [loadBalancerV2.ListenerCondition.hostHeaders([sub_domain])],
            port: 80,
            targets: [
                ecs_service.loadBalancerTarget({
                    containerName: container.name,
                    containerPort,
                }),
            ],
            healthCheck: {
                interval: cdk.Duration.seconds(300),
                path: container.health_check_url,
                port: container.environment.HOST_PORT,
                timeout: cdk.Duration.seconds(20),
            },
        });

        return {
            ...container,
            ecr: sourced_container,
        };
    });

    configurePipeline({
        stack,
        cluster,
        service: ecs_service,
        service_name,
        sourced_containers,
    })

    new route53.ARecord(stack, service_name + `-ALIAS_RECORD_API`, {
        recordName: sub_domain,
        zone,
        target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(alb)),
    });

    return {
        ecs_service,
    };
};

export default createECSServiceStack;
