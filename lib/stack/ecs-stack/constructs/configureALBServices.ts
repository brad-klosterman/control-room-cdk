import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";

import configureTaskDefinition from "./configureTaskDefinition";
import createHttpsRedirect from "./createHttpsRedirect";
import { ITag, ISourcedContainer } from "../interfaces";

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
  tags?: ITag[]
) => {
  const services = containerProperties.map(
    (container) =>
      new ecs.FargateService(stack, `${container.id}FargateService`, {
        cluster,
        // assignPublicIp: true,
        desiredCount: 5,
        taskDefinition: configureTaskDefinition({
          stack,
          containerProperties: container,
          tags: tags,
        }),
      })
  );

  const loadBalancer = new loadBalancerV2.ApplicationLoadBalancer(
    stack,
    `LoadBalancer`,
    {
      vpc: cluster.vpc,
      internetFacing: true,
    }
  );

  createHttpsRedirect(stackName, stack, loadBalancer);

  const listener = loadBalancer.addListener(`HttpsListener`, {
    port: 443,
    open: true,
    certificates: [
      loadBalancerV2.ListenerCertificate.fromArn(certificate.certificateArn),
    ],
  });

  services.forEach((service, i) =>
    service.registerLoadBalancerTargets({
      containerName: `${containerProperties[i].id}Container`,
      containerPort: containerProperties[i].containerPort,
      newTargetGroupId: `${containerProperties[i].id}TargetGroup`,
      listener: ecs.ListenerConfig.applicationListener(listener, {
        protocol: loadBalancerV2.ApplicationProtocol.HTTP,
        priority: 10 + i * 10,
        conditions: containerProperties[i].conditions,
        healthCheck: {
          interval: cdk.Duration.seconds(300),
          path: "/.well-known/apollo/server-health",
          port: containerProperties[i].containerPort.toString(),
          timeout: cdk.Duration.seconds(10),
        },
      }),
    })
  );

  listener.addAction(`FixedResponse`, {
    action: loadBalancerV2.ListenerAction.fixedResponse(404, {
      messageBody: "SEON GATEWAY DEFAULT GROUP",
    }),
  });

  return { loadBalancer, services };
};

export default configureALBServices;
