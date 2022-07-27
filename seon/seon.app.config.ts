import { App } from 'aws-cdk-lib';
import { ServiceConfig } from './seon.app.interfaces';
const app = new App();
const ENVIRONMENT = app.node.tryGetContext('environment');
const REDIS_HOST_ADDRESS = app.node.tryGetContext('redis_url');
const APOLLO_KEY = app.node.tryGetContext('apollo_key');

if (ENVIRONMENT === undefined) {
    throw new Error('Environment must be given');
}

export const APP = {
    cdk: app,
    name: 'SEON' + ENVIRONMENT,
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
    name: APP.name + '-FEDERATION',
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

export const SUBSCRIPTIONS_SERVICE_CONFIG = {
    name: APP.name + '-SUBSCRIPTIONS',
    sub_domain: 'subscriptions.' + ENVIRONMENT + '.' + DOMAIN_NAME,
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
            name: APP.name + '_SUBSCRIPTIONS_' + 'APOLLO',
            repo: "seon-gateway-events",
            branch: ENVIRONMENT === "production" ? "main" : ENVIRONMENT,
            health_check_url: '/',
            environment: {
                APP_ENVIRONMENT: ENVIRONMENT,
                NODE_ENV: ENVIRONMENT,
                APOLLO_KEY,
                APOLLO_GRAPH_REF,
                HOST_PORT: '5000',
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
            },
        },
    ],
};

export const ALARMS_SERVICE_CONFIG = {
    name: APP.name + '-ALARMS',
    sub_domain: 'alarms.' + ENVIRONMENT + '.' + DOMAIN_NAME,
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
            name: APP.name + '_ALARMS_' + 'APOLLO',
            repo: "seon-alarms-graph",
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
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
            },
        },
    ],
};

export const SSP_SERVICE_CONFIG = {
    name: APP.name + '-SSP',
    sub_domain: 'ssp.' + ENVIRONMENT + '.' + DOMAIN_NAME,
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
            name: APP.name + '_SSP_' + 'APOLLO',
            repo: "seon-ssp-customers-graph",
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
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
            },
        },
    ],
};

export const WORKFORCE_SERVICE_CONFIG = {
    name: APP.name + '-WORKFORCE',
    sub_domain: 'workforce.' + ENVIRONMENT + '.' + DOMAIN_NAME,
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
            name: APP.name + 'WORKFORCE' + 'APOLLO',
            repo: "seon-workforce-graph",
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
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
            },
        },
    ],
};

export const RTC_SERVICE_CONFIG = {
    name: APP.name + '_RTC',
};
