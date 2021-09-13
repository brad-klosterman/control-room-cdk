import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";

import configureTaskDefinition from "./configureTaskDefinition";
import createHttpsRedirect from "./createHttpsRedirect";
import { ITag, ISourcedContainer } from "../interfaces";

const configureClusterAndServices = (
  stackName: string,
  stack: cdk.Stack,
  cluster: ecs.Cluster,
  certificate: acm.ICertificate,
  containerProperties: ISourcedContainer[],
  tags: ITag[]
) => {
  const services = containerProperties.map(
    (container) =>
      new ecs.FargateService(stack, `${container.id}FargateService`, {
        cluster,
        taskDefinition: configureTaskDefinition(
          `${container.id}`,
          stack,
          container,
          tags
        ),
      })
  );

  const loadBalancer = new loadBalancerV2.ApplicationLoadBalancer(
    stack,
    `${stackName}LoadBalancer`,
    {
      vpc: cluster.vpc,
      internetFacing: true,
    }
  );
  
  createHttpsRedirect(stackName, stack, loadBalancer);

  const listener = loadBalancer.addListener(`${stackName}HttpsListener`, {
    port: 443,
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
        // priority: 10 + i * 10,
        // conditions: containerProperties[i].conditions,
      }),
    })
  );

  // listener.addAction(`${stackName}FixedResponse`, {
  //   action: loadBalancerV2.ListenerAction.fixedResponse(404, {
  //     messageBody: "Not Found",
  //   }),
  // });
  return { loadBalancer, services };
};

export default configureClusterAndServices;
