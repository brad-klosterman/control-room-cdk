import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as route53 from "@aws-cdk/aws-route53";

import configureCloudMap from "./constructs/configureCloudMap";
import configureECSCluster from "./constructs/configureECSCluster";

const configureVPC = (
  baseName: string,
  vpcMaxAzs: number,
  vpcCidr: string,
  natGateways: number
): ec2.IVpc => {
  if (vpcMaxAzs > 0 && vpcCidr.length > 0) {
    const vpc = new ec2.Vpc(this, baseName, {
      maxAzs: vpcMaxAzs,
      cidr: vpcCidr,
      natGateways: natGateways,
    });
    return vpc;
  } else {
    console.error("please check the options: VPCMaxAzs, VPCCIDR, NATGateway");
    process.exit(1);
  }
};

/** Constructs the stack with given properties.
 * @param scope               The CDK app
 * @param stackName           The application identifier
 */
export const createVPC = (scope: cdk.App, stackName: string) => {
  const stack = new cdk.Stack(scope, stackName, props);

  const vpc = this.createVpc(
    this.stackConfig.VPCName,
    this.stackConfig.VPCMaxAzs,
    this.stackConfig.VPCCIDR,
    this.stackConfig.NATGatewayCount
  );
  this.putParameter(
    "VPCName",
    `${this.projectPrefix}/${this.stackConfig.VPCName}`
  );

  const ecsCluster = this.createEcsCluster(
    this.stackConfig.ECSClusterName,
    vpc
  );
  this.putParameter("ECSClusterName", ecsCluster.clusterName);

  const cloudMapNamespacce = this.createCloudMapNamespace(ecsCluster);
  this.putParameter("CloudMapNamespaceName", cloudMapNamespacce.namespaceName);
  this.putParameter("CloudMapNamespaceArn", cloudMapNamespacce.namespaceArn);
  this.putParameter("CloudMapNamespaceId", cloudMapNamespacce.namespaceId);

  return stack;
};
