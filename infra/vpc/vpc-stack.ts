import * as cdk from "@aws-cdk/core";

import configureVPC from "./constructs/configureVPC";
import configureECSCluster from "./constructs/configureECSCluster";
import configureCloudMap from "./constructs/configureCloudMap";
import putParameter from "./constructs/putParameter";

import { IVPCProperties } from "./interfaces";

/** Constructs the stack with given properties.
 * @param scope                 The CDK app
 * @param appName               The application identifier
 * @param stackName             The stack identifier
 * @param clusterName           The cluster identifier
 * @param props                 The CDK stack properties
 * @param vpcProperties         IVPCProperties
 */
export const createVPC = ({
  scope,
  cloudName,
  clusterName,
  props,
  vpcProperties,
}: {
  scope: cdk.App;
  cloudName: string;
  clusterName: string;
  props: cdk.StackProps;
  vpcProperties: IVPCProperties;
}) => {
  const stack = new cdk.Stack(scope, vpcProperties.vpcName + "STACK", props);

  const vpc = configureVPC({
    stack,
    ...vpcProperties,
  });

  putParameter({
    stack,
    paramKey: vpcProperties.vpcName + "NAME",
    paramValue: vpcProperties.vpcName,
  });

  const cluster = configureECSCluster({ vpc, stack, clusterName });

  putParameter({
    stack,
    paramKey: clusterName + "NAME",
    paramValue: cluster.clusterName,
  });

  const cloudMapNamespace = configureCloudMap({
    cluster,
    nameSpace: cloudName,
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
