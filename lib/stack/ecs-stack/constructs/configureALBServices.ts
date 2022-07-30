import * as acm from '@aws-cdk/aws-certificatemanager';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as loadBalancerV2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';

import { IALBProperties, ISourcedContainer, ITag } from '../interfaces';
import configureTaskDefinition from './configureTaskDefinition';
import createHttpsRedirect from './createHttpsRedirect';

/** A task definition is required to run Docker containers in Amazon ECS.
 * Fargate, you no longer have to provision, configure, or scale clusters of virtual machines to run containers.
 * @param stack                 The CDK stack
 * @param containerProperties   The container parameters
 * @param tags                  The tags to apply
 */

const configureALBServices = (
    stackName: string,
    stack: cdk.Stack,
    cluster: ecs.Cluster,
    certificate: acm.ICertificate,
    containerProperties: ISourcedContainer[],
    alb: IALBProperties,
    tags?: ITag[],
) => {
    let listener: loadBalancerV2.ApplicationListener;

    const services = containerProperties.map(
        container =>
            new ecs.FargateService(stack, `${container.id}FargateService`, {
                assignPublicIp: false,
                cluster,
                desiredCount: alb.instanceCount,
                maxHealthyPercent: 200,
                minHealthyPercent: 100,
                serviceName: stackName,
                taskDefinition: configureTaskDefinition({
                    containerProperties: container,
                    stack,
                    tags: tags,
                }),
            }),
    );

    const loadBalancer = new loadBalancerV2.ApplicationLoadBalancer(stack, `LoadBalancer`, {
        internetFacing: true,
        vpc: cluster.vpc,
    });

    if (alb.protocol === 'HTTPS') {
        createHttpsRedirect(stackName, stack, loadBalancer);

        listener = loadBalancer.addListener(`HttpsListener`, {
            certificates: [loadBalancerV2.ListenerCertificate.fromArn(certificate.certificateArn)],
            open: true,
            port: 443,
        });
    } else {
        listener = loadBalancer.addListener(`HttpListener`, {
            open: true,
            port: 80,
        });
    }

    services.forEach((service, i) =>
        service.registerLoadBalancerTargets({
            containerName: `${containerProperties[i].id}Container`,
            containerPort: containerProperties[i].containerPort,
            listener: ecs.ListenerConfig.applicationListener(listener, {
                conditions: containerProperties[i].conditions,
                healthCheck: {
                    interval: cdk.Duration.seconds(300),
                    path: containerProperties[i].healthCheck,
                    port: containerProperties[i].containerPort.toString(),
                    timeout: cdk.Duration.seconds(10),
                },
                priority: 10 + i * 10,
                protocol: loadBalancerV2.ApplicationProtocol.HTTP,
            }),
            newTargetGroupId: `${containerProperties[i].id}TargetGroup`,
        }),
    );

    listener.addAction(`FixedResponse`, {
        action: loadBalancerV2.ListenerAction.fixedResponse(404, {
            messageBody: 'SEON GATEWAY DEFAULT GROUP',
        }),
    });

    return { loadBalancer, services };
};

export default configureALBServices;
