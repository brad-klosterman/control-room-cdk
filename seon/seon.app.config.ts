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
    props: {
        env: {
            account: '894556524073',
            profile: 'seon',
            region: 'eu-central-1',
        },
    },
    stage: ENVIRONMENT,
};

export const certificate_identifier = app.node.tryGetContext('certificate_identifier');

export const DOMAIN_NAME = 'seon-gateway.com';

const SEON_RESTAPI_BASEURL =
    ENVIRONMENT === 'production'
        ? 'https://api.seon.network/'
        : 'https://api.staging.seon.network/';

const APOLLO_GRAPH_REF = 'SEON@' + ENVIRONMENT;

/*
 * WEBAPP
 *
 */

export const CONTROL_ROOM_CONFIG = {
    branch: ENVIRONMENT,
    env: {
        REACT_APP_API_ROOT: SEON_RESTAPI_BASEURL + 'api',
        REACT_APP_GOOGLE_MAPS_KEY: 'AIzaSyCZ0GwtkfcDCdTUCVpxajJXfX4A5sx7les',
        REACT_APP_PDF_REPORT_URL: 'https://ssp-customers.stage.seon-gateway.com',
        REACT_APP_PDF_URL: 'https://ssp-customers.stage.seon-gateway.com',
        REACT_APP_REVIO_API: 'https://gate.revio.co.za/api/v1',
        REACT_APP_SERV_CRAFT: 'https://devapi.servcraft.co.za/api.ext',
        REACT_GOOGLE_MAPS_API_KEY: 'AIzaSyCZ0GwtkfcDCdTUCVpxajJXfX4A5sx7les',
        SEON_GATEWAY: 'https://stage.seon-gateway.com',
        WSS_LINK: 'wss://subscriptions.stage.seon-gateway.com',
    },
    name: APP.name + '-CONTROL-ROOM',
    repo: 'seon-control-3',
    sub_domain: 'control-room.' + ENVIRONMENT,
};

/*
 * FARGATE SERVICES
 *
 */

export const FEDERATION_SERVICE_CONFIG: ServiceConfig = {
    containers: [
        {
            branch: ENVIRONMENT === 'production' ? 'main' : ENVIRONMENT,
            environment: {
                APOLLO_GRAPH_REF,
                APOLLO_KEY,
                APP_ENVIRONMENT: ENVIRONMENT,
                HOST_PORT: '4000',
                NODE_ENV: ENVIRONMENT,
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
            },
            health_check_url: '/.well-known/apollo/server-health',
            name: APP.name.toLowerCase() + '-federation-' + 'apollo',
            repo: 'seon-federation-gateway',
        },
    ],
    name: APP.name + '-FEDERATION',
    service_params: {
        desiredCount: 1,
        maxHealthyPercent: 200,
        minHealthyPercent: 100,
        priority: 1,
    },
    sub_domain: 'federation.' + ENVIRONMENT + '.' + DOMAIN_NAME,
    task_params: {
        cpu: 1024,
        memoryLimitMiB: 2048,
    },
};

export const SUBSCRIPTIONS_SERVICE_CONFIG = {
    containers: [
        {
            branch: ENVIRONMENT === 'production' ? 'main' : ENVIRONMENT,
            environment: {
                APOLLO_GRAPH_REF,
                APOLLO_KEY,
                APP_ENVIRONMENT: ENVIRONMENT,
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
                HOST_PORT: '5000',
                NODE_ENV: ENVIRONMENT,
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
            },
            health_check_url: '/',
            name: APP.name.toLowerCase() + '-subscriptions-' + 'apollo',
            repo: 'seon-gateway-events',
        },
    ],
    name: APP.name + '-SUBSCRIPTIONS',
    service_params: {
        desiredCount: 1,
        maxHealthyPercent: 200,
        minHealthyPercent: 100,
        priority: 2,
    },
    sub_domain: 'subscriptions.' + ENVIRONMENT + '.' + DOMAIN_NAME,
    task_params: {
        cpu: 1024,
        memoryLimitMiB: 2048,
    },
};

export const ALARMS_SERVICE_CONFIG = {
    containers: [
        {
            branch: ENVIRONMENT === 'production' ? 'main' : ENVIRONMENT,
            environment: {
                APOLLO_GRAPH_REF,
                APOLLO_KEY,
                APP_ENVIRONMENT: ENVIRONMENT,
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
                HOST_PORT: '4000',
                NODE_ENV: ENVIRONMENT,
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
            },
            health_check_url: '/.well-known/apollo/server-health',
            name: APP.name.toLowerCase() + '-alarms-' + 'apollo',
            repo: 'seon-alarms-graph',
        },
    ],
    name: APP.name + '-ALARMS',
    service_params: {
        desiredCount: 1,
        maxHealthyPercent: 200,
        minHealthyPercent: 100,
        priority: 3,
    },
    sub_domain: 'alarms.' + ENVIRONMENT + '.' + DOMAIN_NAME,
    task_params: {
        cpu: 1024,
        memoryLimitMiB: 2048,
    },
};

export const SSP_SERVICE_CONFIG = {
    containers: [
        {
            branch: ENVIRONMENT === 'production' ? 'main' : ENVIRONMENT,
            environment: {
                APOLLO_GRAPH_REF,
                APOLLO_KEY,
                APP_ENVIRONMENT: ENVIRONMENT,
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
                HOST_PORT: '4000',
                NODE_ENV: ENVIRONMENT,
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
            },
            health_check_url: '/.well-known/apollo/server-health',
            name: APP.name.toLowerCase() + '-ssp-' + 'apollo',
            repo: 'seon-ssp-customers-graph',
        },
    ],
    name: APP.name + '-SSP',
    service_params: {
        desiredCount: 1,
        maxHealthyPercent: 200,
        minHealthyPercent: 100,
        priority: 4,
    },
    sub_domain: 'ssp.' + ENVIRONMENT + '.' + DOMAIN_NAME,
    task_params: {
        cpu: 1024,
        memoryLimitMiB: 2048,
    },
};

export const WORKFORCE_SERVICE_CONFIG = {
    containers: [
        {
            branch: ENVIRONMENT === 'production' ? 'main' : ENVIRONMENT,
            environment: {
                APOLLO_GRAPH_REF,
                APOLLO_KEY,
                APP_ENVIRONMENT: ENVIRONMENT,
                GATEWAY_ENDPOINT: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
                HOST_PORT: '4000',
                NODE_ENV: ENVIRONMENT,
                REDIS_HOST_ADDRESS,
                SEON_RESTAPI_BASEURL,
            },
            health_check_url: '/.well-known/apollo/server-health',
            name: APP.name.toLowerCase() + '-workforce-' + 'apollo',
            repo: 'seon-workforce-graph',
        },
    ],
    name: APP.name + '-WORKFORCE',
    service_params: {
        desiredCount: 1,
        maxHealthyPercent: 200,
        minHealthyPercent: 100,
        priority: 5,
    },
    sub_domain: 'workforce.' + ENVIRONMENT + '.' + DOMAIN_NAME,
    task_params: {
        cpu: 1024,
        memoryLimitMiB: 2048,
    },
};

export const RTC_SERVICE_CONFIG = {
    name: APP.name + '_RTC',
};
