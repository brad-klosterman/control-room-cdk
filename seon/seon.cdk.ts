#!/usr/bin/env node
import 'source-map-support/register';

import {
    APP,
    DOMAIN_NAME,
    FEDERATION_SERVICE_CONFIG,
    SUBSCRIPTIONS_SERVICE_CONFIG,
    ALARMS_SERVICE_CONFIG,
    SSP_SERVICE_CONFIG,
    WORKFORCE_SERVICE_CONFIG,
} from './seon.app.config';
import createVPCStack from './vpc/vpc.stack';
import createECSClusterStack from './ecs/ecs.cluster.stack';
import createALBStack from './alb/alb.stack';
import createECSServiceStack from './ecs/ecs.service.stack';
import { createCache } from './cache.stack/cache.stack';

/*
 * Construct VPCStack
 * SEON_stage_VPC_STACK
 *
 */

const { vpc } = createVPCStack({
    scope: APP.cdk,
    app_props: APP.props,
    maxAzs: 3,
    cidr: '10.0.0.0/16',
    natGateways: 1,
    name: APP.name + '-VPC',
});

/*
 * Construct CECSClusterStack
 * SEON_stage_ECSCluster_STACK
 *
 */

const { cluster } = createECSClusterStack({
    scope: APP.cdk,
    app_props: APP.props,
    name: APP.name + '-ECSCluster',
    vpc,
});

/*
 * Construct ALBStack
 *
 */

const { alb, https_listener, zone } = createALBStack({
    scope: APP.cdk,
    app_props: APP.props,
    app_name: APP.name,
    domain_name: DOMAIN_NAME,
    vpc,
});

/*
 * Construct CacheStack
 *
 */

createCache({
    scope: APP.cdk,
    app_props: APP.props,
    vpc,
    cluster,
    cache_name: APP.name + '-CACHE',
    cache_properties: {
        replicationGroupDescription: APP.name + '-REDIS_REP_GROUP',
        // atRestEncryptionEnabled: true,
        // multiAzEnabled: true,
        cacheNodeType: 'cache.t3.micro',
        engine: 'Redis',
        engineVersion: '6.2',
        // numCacheClusters: 1,
        numNodeGroups: 1,
        replicasPerNodeGroup: 1,
        // cacheParameterGroupName: 'keyevent',
        // primaryClusterId: cluster.clusterName,
    },
});

/*
 * Construct ESC Services
 *
 */

createECSServiceStack({
    scope: APP.cdk,
    app_props: APP.props,
    service_name: FEDERATION_SERVICE_CONFIG.name,
    sub_domain: FEDERATION_SERVICE_CONFIG.sub_domain,
    https_listener,
    cluster,
    containers: FEDERATION_SERVICE_CONFIG.containers,
    task_params: FEDERATION_SERVICE_CONFIG.task_params,
    service_params: FEDERATION_SERVICE_CONFIG.service_params,
    alb,
    zone,
});
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
