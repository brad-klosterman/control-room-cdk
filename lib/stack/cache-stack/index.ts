import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elasticache from "@aws-cdk/aws-elasticache";

import configureRedis from "./constructs/configureRedis";

/** Constructs the stack with given properties.
 * @param scope                 The CDK app
 * @param cacheName             The CDK stack identifier
 * @param props                 The CDK stack properties
 */
export const createCache = ({
  scope,
  props,
  vpc,
  cacheName,
  cacheProperties,
}: {
  scope: cdk.App;
  props: cdk.StackProps;
  vpc: ec2.IVpc;
  cacheName: string;
  cacheProperties: elasticache.CfnReplicationGroupProps;
}) => {
  const stack = new cdk.Stack(scope, cacheName + "STACK", props);

  // Define a group for telling Elasticache which subnets to put cache nodes in.
  const subnetGroup = new elasticache.CfnSubnetGroup(
    stack,
    cacheName + "SUBNET_GROUP",
    {
      cacheSubnetGroupName: cacheName + "SNGroup",
      description: cacheName + " Elasticache Subnet Group",
      subnetIds: vpc.privateSubnets.map(function (subnet) {
        return subnet.subnetId;
      }),
    }
  );

  const securityGroup = new ec2.SecurityGroup(stack, cacheName + "SG", {
    vpc: vpc,
    description: "SecurityGroup associated with the ElastiCache Redis Cluster",
    // allowAllOutbound: false,
  });

  // securityGroup.connections.allowFrom(scope, ec2.Port.tcp(6379), 'Redis ingress 6379');
  // securityGroup.connections.allowTo(lambdaSecurityGroup, ec2.Port.tcp(6379), 'Redis egress 6379');

  new ec2.Connections({
    securityGroups: [securityGroup],
    defaultPort: new ec2.Port({
      protocol: ec2.Protocol.TCP,
      fromPort: 6379,
      toPort: 6379,
      stringRepresentation: "ec-sg-connection",
    }),
  });

  const redis = configureRedis({    
    stack,
    cacheName,
    cacheProperties: {
      ...cacheProperties,
      cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
      securityGroupIds: [securityGroup.securityGroupId],
    },
  });

  redis.node.addDependency(subnetGroup)
  // redis.addDependsOn(subnetGroup);

  // const redisUrl =
  //   "redis://" +
  //   redis.attrReadEndPointAddresses +
  //   ":" +
  //   redis.attrReadEndPointPorts;

  // new cdk.CfnOutput(stack, cacheName + "REDIS", {
  //   value: redisUrl,
  // });

  return {
    redis,
  };
};

export default createCache;
