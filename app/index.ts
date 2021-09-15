#!/usr/bin/env node
import "source-map-support/register";

import createVPC from "../lib/stack/vpc-stack";
import createECSStack from "../lib/stack/ecs-stack";
import createCache from "../lib/stack/cache-stack";

import { APP, GATEWAY_STACK } from "./config";

// Construct VPCStack
const { vpc, cluster, cloudMapNamespace } = createVPC({
  scope: APP.cdk,
  props: APP.props,
  cloudName: APP.name + "CLOUD_SPACE",
  clusterName: APP.name + "CLUSTER",

  vpcProperties: {
    vpcName: APP.name + "VPC",
    vpcMaxAzs: 3,
    vpcCidr: "10.0.0.0/16",
    natGateways: 1,
  },
});

// Construct RedisStack
createCache({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cacheName: APP.name + "CACHE",
  cacheProperties: {
    replicationGroupDescription: APP.name + "REDIS_REP_GROUP",
    atRestEncryptionEnabled: true,
    multiAzEnabled: true,
    cacheNodeType: "cache.m6g.large",
    engine: "Redis",
    engineVersion: "6.x",
    numNodeGroups: 1,
  },
});

// Construct SEONGateway Stack
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: GATEWAY_STACK.name,
  containers: GATEWAY_STACK.containers,
  dns: GATEWAY_STACK.dns,
  tags: GATEWAY_STACK.tags,
});

APP.cdk.synth();
