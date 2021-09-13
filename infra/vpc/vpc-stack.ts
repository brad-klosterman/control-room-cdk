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
  appName,
  clusterName,
  props,
  vpcProperties,
}: {
  scope: cdk.App;
  appName: string;
  clusterName: string;
  props: cdk.StackProps;
  vpcProperties: IVPCProperties;
}) => {
  const stack = new cdk.Stack(scope, vpcProperties.vpcName, props);

  const vpc = configureVPC({
    stack,
    ...vpcProperties,
  });

  putParameter({
    stack,
    paramKey: appName + "_VPCName",
    paramValue: vpcProperties.vpcName,
  });

  const cluster = configureECSCluster({ vpc, stack, clusterName });

  putParameter({
    stack,
    paramKey: appName + "_ECSClusterName",
    paramValue: cluster.clusterName,
  });

  const cloudMapNamespace = configureCloudMap({
    cluster,
    nameSpace: appName + "NameSpace",
  });

  putParameter({
    stack,
    paramKey: appName + "_CloudMapNamespaceName",
    paramValue: cloudMapNamespace.namespaceName,
  });

  putParameter({
    stack,
    paramKey: appName + "_CloudMapNamespaceArn",
    paramValue: cloudMapNamespace.namespaceArn,
  });
  putParameter({
    stack,
    paramKey: appName + "_CloudMapNamespaceId",
    paramValue: cloudMapNamespace.namespaceId,
  });

  return {
    vpc,
    cluster,
    cloudMapNamespace,
  };
};

export default createVPC;
