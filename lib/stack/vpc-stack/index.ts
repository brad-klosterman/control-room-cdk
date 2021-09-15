import * as cdk from "@aws-cdk/core";

import configureVPC from "./constructs/configureVPC";
import configureECSCluster from "./constructs/configureECSCluster";
import configureCloudMap from "./constructs/configureCloudMap";
import putParameter from "./constructs/putParameter";

import { IVPCProperties } from "./interfaces";

/** Constructs the stack with given properties.
 * @param scope                 The CDK app
 * @param props                 The CDK stack properties
 * @param appName               The application identifier
 * @param stackName             The stack identifier
 * @param clusterName           The cluster identifier
 * @param vpcProperties         IVPCProperties
 */
export const createVPC = ({
  scope,
  props,
  cloudName,
  clusterName,
  vpcProperties,
}: {
  scope: cdk.App;
  props: cdk.StackProps;
  cloudName: string;
  clusterName: string;
  vpcProperties: IVPCProperties;
}) => {
  const stack = new cdk.Stack(scope, vpcProperties.vpcName + "STACK", props);

  const vpc = configureVPC({
    stack,
    ...vpcProperties,
  });

  const cluster = configureECSCluster({ vpc, stack, clusterName });

  const cloudMapNamespace = configureCloudMap({
    cluster,
    nameSpace: cloudName,
  });

  putParameter({
    stack,
    paramKey: vpcProperties.vpcName + "NAME",
    paramValue: vpcProperties.vpcName,
  });

  putParameter({
    stack,
    paramKey: cloudName + "NS",
    paramValue: cloudMapNamespace.namespaceName,
  });

  putParameter({
    stack,
    paramKey: cloudName + "ARN",
    paramValue: cloudMapNamespace.namespaceArn,
  });
  putParameter({
    stack,
    paramKey: cloudName + "ID",
    paramValue: cloudMapNamespace.namespaceId,
  });

  return {
    vpc,
    cluster,
    cloudMapNamespace,
  };
};

export default createVPC;
