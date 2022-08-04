#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import createALBStack from './alb/alb.stack';
import { createCache } from './cache.stack/cache.stack';
import { createECSClusterStack } from './ecs/ecs.cluster.stack';
import createECSServiceStack from './ecs/ecs.service.stack';
import {
    ALARMS_SERVICE_CONFIG,
    APP,
    certificate_identifier,
    CONTROL_ROOM_CONFIG,
    DOMAIN_NAME,
    FEDERATION_SERVICE_CONFIG,
    SSP_SERVICE_CONFIG,
    SUBSCRIPTIONS_SERVICE_CONFIG,
    WORKFORCE_SERVICE_CONFIG,
} from './seon.app.config';
import createVPCStack from './vpc/vpc.stack';
import { createWebAppStack } from './webapp/webapp.stack';

const domain_certificate_arn = `arn:aws:acm:${APP.props?.env?.region}:${APP.props?.env?.account}:certificate/${certificate_identifier}`;

const { vpc } = createVPCStack({
    app_props: APP.props,
    cidr: '10.0.0.0/16',
    maxAzs: 3,
    name: APP.name + '-VPC',
    natGateways: 1,
    scope: APP.cdk,
});

const { cluster } = createECSClusterStack({
    app_props: APP.props,
    name: APP.name + '-CLUSTER',
    scope: APP.cdk,
    vpc,
});

const { endpoint } = createCache({
    app_props: APP.props,
    cache_name: APP.name + '-CACHE',
    cache_properties: {
        // atRestEncryptionEnabled: true,
        // multiAzEnabled: true,
        cacheNodeType: 'cache.t3.micro',

        engine: 'Redis',
        engineVersion: '6.2',
        // numCacheClusters: 1,
        numNodeGroups: 1,

        replicasPerNodeGroup: 1,
        replicationGroupDescription: APP.name + '-REDIS_REP_GROUP',
        // cacheParameterGroupName: 'keyevent',
        // primaryClusterId: cluster.clusterName,
    },
    scope: APP.cdk,
    vpc,
});

const stack = new cdk.Stack(APP.cdk, APP.name + '-STACK', APP.props);

const { alb, alb_security_group, https_listener, security_group, zone } = createALBStack({
    app_name: APP.name,
    domain_certificate_arn,
    domain_name: DOMAIN_NAME,
    stack,
    vpc,
});

const resources = {
    alb,
    alb_security_group,
    cluster,
    https_listener,
    security_group,
    stack,
    vpc,
    zone,
};

createECSServiceStack({
    ...resources,
    containers: FEDERATION_SERVICE_CONFIG.containers,
    service_name: FEDERATION_SERVICE_CONFIG.name,
    service_params: FEDERATION_SERVICE_CONFIG.service_params,
    sub_domain: FEDERATION_SERVICE_CONFIG.sub_domain,
    task_params: FEDERATION_SERVICE_CONFIG.task_params,
});

createECSServiceStack({
    ...resources,
    containers: SUBSCRIPTIONS_SERVICE_CONFIG.containers,
    service_name: SUBSCRIPTIONS_SERVICE_CONFIG.name,
    service_params: SUBSCRIPTIONS_SERVICE_CONFIG.service_params,
    sub_domain: SUBSCRIPTIONS_SERVICE_CONFIG.sub_domain,
    task_params: SUBSCRIPTIONS_SERVICE_CONFIG.task_params,
});

createECSServiceStack({
    ...resources,
    containers: ALARMS_SERVICE_CONFIG.containers,
    service_name: ALARMS_SERVICE_CONFIG.name,
    service_params: ALARMS_SERVICE_CONFIG.service_params,
    sub_domain: ALARMS_SERVICE_CONFIG.sub_domain,
    task_params: ALARMS_SERVICE_CONFIG.task_params,
});

createECSServiceStack({
    ...resources,
    containers: SSP_SERVICE_CONFIG.containers,
    service_name: SSP_SERVICE_CONFIG.name,
    service_params: SSP_SERVICE_CONFIG.service_params,
    sub_domain: SSP_SERVICE_CONFIG.sub_domain,
    task_params: SSP_SERVICE_CONFIG.task_params,
});

createECSServiceStack({
    ...resources,
    containers: WORKFORCE_SERVICE_CONFIG.containers,
    service_name: WORKFORCE_SERVICE_CONFIG.name,
    service_params: WORKFORCE_SERVICE_CONFIG.service_params,
    sub_domain: WORKFORCE_SERVICE_CONFIG.sub_domain,
    task_params: WORKFORCE_SERVICE_CONFIG.task_params,
});

// createWebAppStack({
//     app_props: APP.props,
//     branch: CONTROL_ROOM_CONFIG.branch,
//     domain_name: DOMAIN_NAME,
//     environment_variables: CONTROL_ROOM_CONFIG.env,
//     repo: CONTROL_ROOM_CONFIG.repo,
//     scope: APP.cdk,
//     sub_domain: CONTROL_ROOM_CONFIG.sub_domain,
//     web_app_name: CONTROL_ROOM_CONFIG.name,
// });

APP.cdk.synth();
