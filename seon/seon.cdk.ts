#!/usr/bin/env node
import 'source-map-support/register';

import createALBStack from './alb/alb.stack';
import { createCache } from './cache.stack/cache.stack';
import { createECSClusterStack } from './ecs/ecs.cluster.stack';
import createECSServiceStack from './ecs/ecs.service.stack';
import {
    ALARMS_SERVICE_CONFIG,
    APP,
    CONTROL_ROOM_CONFIG,
    DOMAIN_NAME,
    FEDERATION_SERVICE_CONFIG,
    SSP_SERVICE_CONFIG,
    SUBSCRIPTIONS_SERVICE_CONFIG,
    WORKFORCE_SERVICE_CONFIG,
} from './seon.app.config';
import createVPCStack from './vpc/vpc.stack';
import { createWebAppStack } from './webapp/webapp.stack';

/*
 * Construct VPCStack
 * SEON_stage_VPC_STACK
 *
 */

const { vpc } = createVPCStack({
    app_props: APP.props,
    cidr: '10.0.0.0/16',
    maxAzs: 3,
    name: APP.name + '-VPC',
    natGateways: 1,
    scope: APP.cdk,
});

/*
 * Construct CECSClusterStack
 * SEON_stage_ECSCluster_STACK
 *
 */

const { cluster } = createECSClusterStack({
    app_props: APP.props,
    name: APP.name + '-ECSCluster',
    scope: APP.cdk,
    vpc,
});

/*
 * Construct ALBStack
 *
 */

const { alb, https_listener, services_target_group, zone } = createALBStack({
    app_name: APP.name,
    app_props: APP.props,
    domain_name: DOMAIN_NAME,
    scope: APP.cdk,
    vpc,
});

/*
 * Construct CacheStack
 *
 */

createWebAppStack({
    app_props: APP.props,
    branch: CONTROL_ROOM_CONFIG.branch,
    domain_name: DOMAIN_NAME,
    environment_variables: CONTROL_ROOM_CONFIG.env,
    repo: CONTROL_ROOM_CONFIG.repo,
    scope: APP.cdk,
    sub_domain: CONTROL_ROOM_CONFIG.sub_domain,
    web_app_name: CONTROL_ROOM_CONFIG.name,
});

/*
 * Construct CacheStack
 *
 */

createCache({
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
    cluster,
    scope: APP.cdk,
    vpc,
});

/*
 * Construct ESC Services
 *
 */

// createECSServiceStack({
//     alb,
//     app_props: APP.props,
//     cluster,
//     containers: FEDERATION_SERVICE_CONFIG.containers,
//     https_listener,
//     scope: APP.cdk,
//     service_name: FEDERATION_SERVICE_CONFIG.name,
//     service_params: FEDERATION_SERVICE_CONFIG.service_params,
//     services_target_group,
//     sub_domain: FEDERATION_SERVICE_CONFIG.sub_domain,
//     task_params: FEDERATION_SERVICE_CONFIG.task_params,
//     zone,
// });
//
// createECSServiceStack({
//     scope: APP.cdk,
//     app_props: APP.props,
//     service_name: SUBSCRIPTIONS_SERVICE_CONFIG.name,
//     sub_domain: SUBSCRIPTIONS_SERVICE_CONFIG.sub_domain,
//     https_listener,
//     cluster,
//     containers: SUBSCRIPTIONS_SERVICE_CONFIG.containers,
//     task_params: SUBSCRIPTIONS_SERVICE_CONFIG.task_params,
//     service_params: SUBSCRIPTIONS_SERVICE_CONFIG.service_params,
//     alb,
//     zone,
// });
//
// createECSServiceStack({
//     scope: APP.cdk,
//     app_props: APP.props,
//     service_name: ALARMS_SERVICE_CONFIG.name,
//     sub_domain: ALARMS_SERVICE_CONFIG.sub_domain,
//     https_listener,
//     cluster,
//     containers: ALARMS_SERVICE_CONFIG.containers,
//     task_params: ALARMS_SERVICE_CONFIG.task_params,
//     service_params: ALARMS_SERVICE_CONFIG.service_params,
//     alb,
//     zone,
// });
//
// createECSServiceStack({
//     scope: APP.cdk,
//     app_props: APP.props,
//     service_name: SSP_SERVICE_CONFIG.name,
//     sub_domain: SSP_SERVICE_CONFIG.sub_domain,
//     https_listener,
//     cluster,
//     containers: SSP_SERVICE_CONFIG.containers,
//     task_params: SSP_SERVICE_CONFIG.task_params,
//     service_params: SSP_SERVICE_CONFIG.service_params,
//     alb,
//     zone,
// });
//
// createECSServiceStack({
//     scope: APP.cdk,
//     app_props: APP.props,
//     service_name: WORKFORCE_SERVICE_CONFIG.name,
//     sub_domain: WORKFORCE_SERVICE_CONFIG.sub_domain,
//     https_listener,
//     cluster,
//     containers: WORKFORCE_SERVICE_CONFIG.containers,
//     task_params: WORKFORCE_SERVICE_CONFIG.task_params,
//     service_params: WORKFORCE_SERVICE_CONFIG.service_params,
//     alb,
//     zone,
// });

APP.cdk.synth();
