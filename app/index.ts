#!/usr/bin/env node
import 'source-map-support/register';

import createCache from '../lib/stack/cache-stack';
import createECSStack from '../lib/stack/ecs-stack';
import createVPC from '../lib/stack/vpc-stack';
import {
    AGENTS_STACK,
    ALARMS_STACK,
    APP,
    GATEWAY_STACK,
    RDRONE_STACK,
    RTC_STACK,
    SSP_STACK,
    SUBSCRIPTIONS_STACK,
} from './config';

// Construct VPCStack
const { cloudMapNamespace, cluster, vpc } = createVPC({
    cloudName: APP.name + 'CLOUD_SPACE',
    clusterName: APP.name + 'CLUSTER',
    props: APP.props,
    scope: APP.cdk,

    vpcProperties: {
        natGateways: 1,
        vpcCidr: '10.0.0.0/16',
        vpcMaxAzs: 3,
        vpcName: APP.name + 'VPC',
    },
});

// Construct RedisStack
createCache({
    cacheName: APP.name + 'CACHE',
    cacheProperties: {
        // atRestEncryptionEnabled: true,
        // multiAzEnabled: true,
        cacheNodeType: 'cache.m6g.large',

        engine: 'Redis',
        cacheParameterGroupName: 'keyevent',
        engineVersion: '6.x',

        // numCacheClusters: 1,
numNodeGroups: 1,
        
        replicationGroupDescription: APP.name + 'REDIS_REP_GROUP',
        replicasPerNodeGroup: 1,
        // primaryClusterId: cluster.clusterName,
    },
    cluster,
    props: APP.props,
    scope: APP.cdk,
    vpc,
});

// Construct SEONGateway Stack
createECSStack({
    alb: GATEWAY_STACK.alb,
    cluster,
    containers: GATEWAY_STACK.containers,
    dns: GATEWAY_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: GATEWAY_STACK.name,
    tags: GATEWAY_STACK.tags,
    vpc,
});

// Construct SUBSCRIPTIONS_STACKGateway
createECSStack({
    alb: SUBSCRIPTIONS_STACK.alb,
    cluster,
    containers: SUBSCRIPTIONS_STACK.containers,
    dns: SUBSCRIPTIONS_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: SUBSCRIPTIONS_STACK.name,
    tags: SUBSCRIPTIONS_STACK.tags,
    vpc,
});

// Construct AGENTS_STACKGateway
createECSStack({
    alb: AGENTS_STACK.alb,
    cluster,
    containers: AGENTS_STACK.containers,
    dns: AGENTS_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: AGENTS_STACK.name,
    tags: AGENTS_STACK.tags,
    vpc,
});

// Construct ALARMS_STACKGateway
createECSStack({
    alb: ALARMS_STACK.alb,
    cluster,
    containers: ALARMS_STACK.containers,
    dns: ALARMS_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: ALARMS_STACK.name,
    tags: ALARMS_STACK.tags,
    vpc,
});

// Construct SSP and SSPCustomers Stack
createECSStack({
    alb: SSP_STACK.alb,
    cluster,
    containers: SSP_STACK.containers,
    dns: SSP_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: SSP_STACK.name,
    tags: SSP_STACK.tags,
    vpc,
});

// Construct RTC Stack
createECSStack({
    alb: RTC_STACK.alb,
    cluster,
    containers: RTC_STACK.containers,
    dns: RTC_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: RTC_STACK.name,
    tags: RTC_STACK.tags,
    vpc,
});

// Construct RDRONE Stack
createECSStack({
    alb: RDRONE_STACK.alb,
    cluster,
    containers: RDRONE_STACK.containers,
    dns: RDRONE_STACK.dns,
    props: APP.props,
    scope: APP.cdk,
    stackName: RDRONE_STACK.name,
    tags: RDRONE_STACK.tags,
    vpc,
});

APP.cdk.synth();
