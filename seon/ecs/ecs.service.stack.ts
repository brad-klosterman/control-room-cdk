import { aws_applicationautoscaling } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs/lib/fargate/fargate-task-definition';
import * as loadBalancerV2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

import { ServiceParams, TaskDefContainer } from '../seon.app.interfaces';
import { sourceECR } from './ecr';
import configurePipeline from './ecs.pipeline';

/*
 *
 * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
 *
 */

export const createECSServiceStack = ({
    alb,
    alb_security_group,
    cluster,
    containers,
    https_listener,
    security_group,
    service_name,
    service_params,
    stack,
    sub_domain,
    task_params,
    vpc,
    zone,
}: {
    alb: loadBalancerV2.ApplicationLoadBalancer;
    alb_security_group: ec2.SecurityGroup;
    cluster: ecs.Cluster;
    containers: TaskDefContainer[];
    https_listener: loadBalancerV2.ApplicationListener;
    security_group: ec2.SecurityGroup;
    service_name: string;
    service_params: ServiceParams;
    stack: cdk.Stack;
    sub_domain: string;
    task_params: FargateTaskDefinitionProps;
    vpc: ec2.IVpc;
    zone: route53.IHostedZone;
}) => {
    const task_role = new iam.Role(stack, service_name + '-taskrole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const task_definition = new ecs.FargateTaskDefinition(stack, service_name + '-TASKDEF', {
        cpu: task_params.cpu,
        family: service_name + '-TASKDEF',
        memoryLimitMiB: task_params.memoryLimitMiB,
        taskRole: task_role,
        // runtimePlatform
    });

    const execution_role_policy = new iam.PolicyStatement({
        actions: [
            'ecr:GetAuthorizationToken',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'dynamodb:GetItem',
            'dynamodb:UpdateItem',
            'xray:PutTraceSegments',
        ],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
    });

    task_definition.addToExecutionRolePolicy(execution_role_policy);

    const sourced_containers = containers.map(container => {
        const containerPort = parseInt(container.environment.HOST_PORT);

        const ecr_repo = sourceECR({ ecr_name: container.name + '-ecr', stack });

        task_definition
            .addContainer(container.name, {
                environment: container.environment,
                // image: ecs.ContainerImage.fromEcrRepository(ecr_repo),
                image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
                logging: new ecs.AwsLogDriver({ streamPrefix: container.name }),
            })
            .addPortMappings({
                containerPort,
                protocol: ecs.Protocol.TCP,
            });

        return {
            ...container,
            ecr: ecr_repo,
        };
    });

    /*
     * Security Group
     *
     */

    // security groups to allow connections from the application load balancer to the fargate containers
    const ecs_sg = new ec2.SecurityGroup(stack, service_name + '-SG', {
        allowAllOutbound: true,
        vpc,
    });

    ecs_sg.connections.allowFrom(
        alb_security_group,
        ec2.Port.allTcp(),
        `ALB to Service (${service_name}) SG`,
    );

    const ecs_service = new ecs.FargateService(stack, service_name, {
        assignPublicIp: true,
        capacityProviderStrategies: [
            {
                base: 1,
                capacityProvider: 'FARGATE',
                weight: 1,
            },
            {
                capacityProvider: 'FARGATE_SPOT',
                weight: 1,
            },
        ],
        circuitBreaker: { rollback: true },
        cluster,
        desiredCount: service_params.desiredCount,
        maxHealthyPercent: service_params.maxHealthyPercent,
        minHealthyPercent: service_params.minHealthyPercent,
        securityGroups: [security_group, ecs_sg],
        serviceName: service_name,
        taskDefinition: task_definition,
    });

    sourced_containers.map((sourced_container, index) => {
        const target_group = new loadBalancerV2.ApplicationTargetGroup(
            stack,
            sourced_container.name + '-tg',
            {
                deregistrationDelay: cdk.Duration.seconds(30),
                healthCheck: {
                    healthyHttpCodes: '200,301,302',
                    healthyThresholdCount: 5,
                    interval: cdk.Duration.seconds(300),
                    path: sourced_container.health_check_url,
                    port: sourced_container.environment.HOST_PORT,
                    timeout: cdk.Duration.seconds(20),
                    unhealthyThresholdCount: 2,
                },
                port: 80,
                protocol: loadBalancerV2.ApplicationProtocol.HTTP,
                stickinessCookieDuration: cdk.Duration.hours(1), // todo ?
                targets: [
                    ecs_service.loadBalancerTarget({
                        containerName: sourced_container.name,
                        containerPort: parseInt(sourced_container.environment.HOST_PORT),
                    }),
                ],
                vpc,
            },
        );

        https_listener.addAction(sourced_container.name + '-LISTENER-ACTION', {
            action: loadBalancerV2.ListenerAction.forward([target_group]),
            conditions: [
                loadBalancerV2.ListenerCondition.hostHeaders([sub_domain]),
                // loadBalancerV2.ListenerCondition.pathPatterns([sourced_container.url_path]),
            ],
            priority: service_params.priority + index,
        });
    });

    const scaling = ecs_service.autoScaleTaskCount({ maxCapacity: 6 });
    const cpu_utilization = ecs_service.metricCpuUtilization();

    /*
     * scale out when CPU utilization exceeds 50%
     * increase scale out speed if CPU utilization exceeds 70%
     * scale in again when CPU utilization falls below 10%.
     */

    scaling.scaleOnMetric(service_name + '-ASCALE_CPU', {
        adjustmentType: aws_applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
        metric: cpu_utilization,
        scalingSteps: [
            { change: -1, upper: 10 },
            { change: +1, lower: 50 },
            { change: +3, lower: 70 },
        ],
    });

    const pipeline = configurePipeline({
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

/*

let applicationLoadBalancerPathListenerRule = new elb.ApplicationListenerRule(this, 'PathListenerRule', {
      listener: applicationLoadBalancerListener,
      priority: 1,
      conditions:[
        elb.ListenerCondition.httpRequestMethods(['POST']),
        elb.ListenerCondition.pathPatterns(['/test'])
      ],
      action: elb.ListenerAction.forward([applicationLoadBalancerTargetGroup])

main_listener.add_action(  # REDIRECT EVERYTHING WWW. TO NON-WWW
            "redirectWwwToNonWwwAction",
            conditions=[
                elbv2.ListenerCondition.host_headers(
                    values=[f"www.{airflows_host}"]
                )
            ],
            action=elbv2.ListenerAction.redirect(host=airflows_host),
            priority=1,
        )

    const service_target_group = https_listener.addTargets(service_name + '-TG', {
        conditions: [loadBalancerV2.ListenerCondition.hostHeaders([sub_domain])],
        healthCheck: {
            healthyHttpCodes: '200,301,302',
            healthyThresholdCount: 5,
            interval: cdk.Duration.seconds(300),
            path: containers[0].health_check_url,
            port: containers[0].environment.HOST_PORT,
            timeout: cdk.Duration.seconds(20),
            unhealthyThresholdCount: 2,
        },
        port: 443,
        priority: service_params.priority,
        targets: [
            ecs_service.loadBalancerTarget({
                containerName: containers[0].name,
                containerPort: parseInt(containers[0].environment.HOST_PORT),
            }),
        ],
    });
    
    const target_rule = new loadBalancerV2.CfnListenerRule(
            stack,
            sourced_container.name + '-target-rule',
            {
                actions: [
                    {
                        targetGroupArn: target_group.targetGroupArn,
                        type: 'forward',
                    },
                ],
                conditions: [
                    {
                        field: 'host-header',
                        pathPatternConfig: {
                            values: [sub_domain],
                        },
                    },
                    {
                        field: 'path-pattern',
                        pathPatternConfig: {
                            values: [sourced_container.url_path],
                        },
                    },
                ],
                listenerArn: https_listener.listenerArn,
                priority: service_params.priority + index,
            },
        );
 */
