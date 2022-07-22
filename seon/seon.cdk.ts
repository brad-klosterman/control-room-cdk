#!/usr/bin/env node
import 'source-map-support/register';

import { APP, DOMAIN_NAME, FEDERATION_SERVICE_CONFIG } from './seon.app.config';
import createVPCStack from './vpc/vpc.stack';
import createECSClusterStack from './ecs/ecs.cluster.stack';
import createALBStack from './alb/alb.stack';
import createECSServiceStack from './ecs/ecs.service.stack';

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
    name: APP.name + '_VPC',
});

/*
 * Construct CECSClusterStack
 * SEON_stage_ECSCluster_STACK
 *
 */

const { cluster } = createECSClusterStack({
    scope: APP.cdk,
    app_props: APP.props,
    name: APP.name + '_ECSCluster',
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
    zone
});

APP.cdk.synth();
