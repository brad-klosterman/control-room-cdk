import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";

import putParameter from "./putParameter";

const configureECSCluster = ({
  vpc,
  stack,
  clusterName,
}: {
  vpc: ec2.IVpc;
  stack: cdk.Stack;
  clusterName: string;
}): ecs.Cluster => {
  const cluster = new ecs.Cluster(stack, clusterName, {
    clusterName: clusterName,
    vpc: vpc,
    containerInsights: true,
  });

  putParameter({
    stack,
    paramKey: clusterName + "CLUSTER_NAME",
    paramValue: cluster.clusterName,
  });

  return cluster;
};

export default configureECSCluster;
