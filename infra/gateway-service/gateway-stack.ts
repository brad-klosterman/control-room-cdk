import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as route53 from "@aws-cdk/aws-route53";

import configureClusterAndServices from "./constructs/configureClusterAndServices";
import sourceContainerImages from "./constructs/sourceContainerImages";
import configurePipeline from "./constructs/configurePipeline";
import { ITag, IDomainProperties, IContainerProperties } from "./interfaces";

/** Constructs the stack with given properties.
 * @param scope               The CDK app
 * @param stackName           The application identifier
 * @param containerProperties Defines the tasks to run
 * @param domainProperties    Define the domain to be registered with Route 53
 * @param tags                The tags to apply to created services
 * @param props               The CDK stack properties
 * @param vpc                 The VPC to use. Leave as undefined if using a stack created VPC.
 */
export const createStack = (
  scope: cdk.App,
  stackName: string,
  containerProperties: IContainerProperties[],
  domainProperties: IDomainProperties,
  tags: ITag[],
  props: cdk.StackProps,
  vpc: ec2.IVpc,
  cluster: ecs.Cluster
) => {
  const stack = new cdk.Stack(scope, stackName, props);

  tags.forEach((tag) => cdk.Tags.of(stack).add(tag.name, tag.value));

  const certificate = acm.Certificate.fromCertificateArn(
    stack,
    `${stackName}Certificate`,
    domainProperties.domainCertificateArn
  );

  const sourcedContainers = sourceContainerImages(stack, containerProperties);

  const { loadBalancer, services } = configureClusterAndServices(
    stackName,
    stack,
    cluster,
    certificate,
    sourcedContainers,
    tags
  );

  configurePipeline({
    stack,
    stackName,
    cluster,
    services,
    sourcedContainers,
  });

  // Configure Pipeline

  const zone = route53.HostedZone.fromLookup(stack, `${stackName}Zone`, {
    domainName: domainProperties.domainName,
  });

  new route53.CnameRecord(stack, `${stackName}Site`, {
    zone,
    recordName: domainProperties.subdomainName,
    domainName: loadBalancer.loadBalancerDnsName,
  });

  // Output the DNS name where you can access your service
  new cdk.CfnOutput(stack, `${stackName}DNS`, {
    value: loadBalancer.loadBalancerDnsName,
  });
  new cdk.CfnOutput(stack, `SiteDNS`, {
    value: `${domainProperties.subdomainName}.${domainProperties.domainName}`,
  });
  return stack;
};
