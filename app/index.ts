#!/usr/bin/env node
import "source-map-support/register";

import createVPC from "../lib/stack/vpc-stack";
import createECSStack from "../lib/stack/ecs-stack";
import createCache from "../lib/stack/cache-stack";

import {
  APP,
  GATEWAY_STACK,
  AGENTS_STACK,
  SUBSCRIPTIONS_STACK,
  ALARMS_STACK,
  SSP_STACK,
  RTC_STACK,
  RDRONE_STACK,
} from "./config";

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
  cluster,
  cacheName: APP.name + "CACHE",
  cacheProperties: {
    replicationGroupDescription: APP.name + "REDIS_REP_GROUP",
    // atRestEncryptionEnabled: true,
    // multiAzEnabled: true,
    cacheNodeType: "cache.m6g.large",
    engine: "Redis",
    engineVersion: "6.x",
    // numCacheClusters: 1,
    numNodeGroups: 1,
    replicasPerNodeGroup: 1,
    cacheParameterGroupName: "keyevent",
    // primaryClusterId: cluster.clusterName,
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
  alb: GATEWAY_STACK.alb,
  tags: GATEWAY_STACK.tags,
});

// Construct SUBSCRIPTIONS_STACKGateway
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: SUBSCRIPTIONS_STACK.name,
  containers: SUBSCRIPTIONS_STACK.containers,
  dns: SUBSCRIPTIONS_STACK.dns,
  alb: SUBSCRIPTIONS_STACK.alb,
  tags: SUBSCRIPTIONS_STACK.tags,
});

// Construct AGENTS_STACKGateway
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: AGENTS_STACK.name,
  containers: AGENTS_STACK.containers,
  dns: AGENTS_STACK.dns,
  alb: AGENTS_STACK.alb,
  tags: AGENTS_STACK.tags,
});

// Construct ALARMS_STACKGateway
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: ALARMS_STACK.name,
  containers: ALARMS_STACK.containers,
  dns: ALARMS_STACK.dns,
  alb: ALARMS_STACK.alb,
  tags: ALARMS_STACK.tags,
});

// Construct SSP and SSPCustomers Stack
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: SSP_STACK.name,
  containers: SSP_STACK.containers,
  dns: SSP_STACK.dns,
  alb: SSP_STACK.alb,
  tags: SSP_STACK.tags,
});

// Construct RTC Stack
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: RTC_STACK.name,
  containers: RTC_STACK.containers,
  dns: RTC_STACK.dns,
  alb: RTC_STACK.alb,
  tags: RTC_STACK.tags,
});

// Construct RDRONE Stack
createECSStack({
  scope: APP.cdk,
  props: APP.props,
  vpc,
  cluster,
  stackName: RDRONE_STACK.name,
  containers: RDRONE_STACK.containers,
  dns: RDRONE_STACK.dns,
  alb: RDRONE_STACK.alb,
  tags: RDRONE_STACK.tags,
});

APP.cdk.synth();
