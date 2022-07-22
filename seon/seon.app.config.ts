import * as cdk from '@aws-cdk/core';
import { ServiceConfig } from './seon.app.interfaces';
const app = new cdk.App();
const ENVIRONMENT = app.node.tryGetContext('environment');
const REDIS_HOST_ADDRESS = app.node.tryGetContext('redis_url');
const APOLLO_KEY = app.node.tryGetContext('apollo_key');

if (ENVIRONMENT === undefined) {
    throw new Error('Environment must be given');
}

export const APP = {
    cdk: app,
    name: 'SEON_' + ENVIRONMENT,
    stage: ENVIRONMENT,
    props: {
        env: {
            account: '894556524073',
            region: 'eu-central-1',
            profile: 'seon',
        },
    },
};

export const DOMAIN_NAME = 'seon-gateway.com';

const SEON_RESTAPI_BASEURL =
    ENVIRONMENT === 'production' ? 'https://api.seon.network/' : 'https://api.staging.seon.network/';

const APOLLO_GRAPH_REF = 'SEON@' + ENVIRONMENT;

/*
 * FARGATE SERVICES
 *
 */

export const FEDERATION_SERVICE_CONFIG: ServiceConfig = {
    name: APP.name + '_FEDERATION',
    sub_domain: 'federation.' + ENVIRONMENT + '.' + DOMAIN_NAME,
    service_params: {
        desiredCount: 1,
        minHealthyPercent: 100,
        maxHealthyPercent: 200,
    },
    task_params: {
        cpu: 1024,
        memoryLimitMiB: 2048,
    },
    containers: [
        {
            name: APP.name + '_FEDERATION_' + 'APOLLO',
            repo: "seon-federation-gateway",
            branch: ENVIRONMENT === "production" ? "main" : ENVIRONMENT,
            health_check_url: '/.well-known/apollo/server-health',
            environment: {
                APP_ENVIRONMENT: ENVIRONMENT,
                NODE_ENV: ENVIRONMENT,
                APOLLO_KEY,
                APOLLO_GRAPH_REF,
                HOST_PORT: '4000',
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
            },
        },
    ],
};

const SUBSCRIPTIONS_SERVICE_CONFIG = {
    name: APP.name + '_SUBSCRIPTIONS',
};

const ALARMS_SERVICE_CONFIG = {
    name: APP.name + '_ALARMS',
};

const SSP_SERVICE_CONFIG = {
    name: APP.name + '_SSP',
};

const WORKFORCE_SERVICE_CONFIG = {
    name: APP.name + '_WORKFORCE',
};

const RTC_SERVICE_CONFIG = {
    name: APP.name + '_RTC',
};
