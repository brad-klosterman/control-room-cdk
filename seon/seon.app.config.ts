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

const default_desired_count = ENVIRONMENT === 'production' ? 2 : 1;

const default_cpu = ENVIRONMENT === 'production' ? 1024 : 256;

const default_memory = ENVIRONMENT === 'production' ? 2048 : 512;

/*
 * WEBAPP
 *
 */

export const CONTROL_ROOM_CONFIG = {
    branch: ENVIRONMENT,
    env: {
        APOLLO_GRAPH_REF, // SEON@development
        APOLLO_KEY, // service:SEON:mMJVKJ8jbZVbyx39tybPqg
        APP_ENVIRONMENT: ENVIRONMENT,
        FEDERATION_URL: `https://federation.${ENVIRONMENT}.seon-gateway.com`,
        GOOGLE_MAPS_KEY: 'AIzaSyCZ0GwtkfcDCdTUCVpxajJXfX4A5sx7les',
        REVIO_API_URL: 'https://gate.revio.co.za/api/v1',
        SEON_RESTAPI_BASEURL,
        SERV_CRAFT_URL: 'https://devapi.servcraft.co.za/api.ext',
        SSP_URL: `https://ssp.${ENVIRONMENT}.seon-gateway.com/graphql`,
        WSS_LINK: `wss://subscriptions.${ENVIRONMENT}.seon-gateway.com`,
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
            health_check_url: '/.well-known/apollo/server-health', // no forward slash for xreay?
            name: APP.name.toLowerCase() + '-federation-' + 'gql',
            repo: 'seon-federation-gateway',
            url_path: '/',
        },
        // {
        //     branch: 'development-beta',
        //     environment: {
        //         APOLLO_GRAPH_REF,
        //         APOLLO_KEY,
        //         APP_ENVIRONMENT: ENVIRONMENT,
        //         HOST_PORT: '4001',
        //         NODE_ENV: ENVIRONMENT,
        //         REDIS_HOST_ADDRESS,
        //         SEON_RESTAPI_BASEURL,
        //     },
        //     health_check_url: '/.well-known/apollo/server-health',
        //     name: APP.name.toLowerCase() + '-federation-' + 'gql-beta',
        //     repo: 'seon-federation-gateway',
        //     url_path: '/development-beta',
        // },
    ],
    name: APP.name + '-FEDERATION',
    service_params: {
        desiredCount: default_desired_count,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        priority: 10,
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
            name: APP.name.toLowerCase() + '-subscriptions-' + 'gql',
            repo: 'seon-gateway-events',
            url_path: '/',
        },
    ],
    name: APP.name + '-SUBSCRIPTIONS',
    service_params: {
        desiredCount: default_desired_count,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        priority: 20,
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
            name: APP.name.toLowerCase() + '-alarms-' + 'gql',
            repo: 'seon-alarms-graph',
            url_path: '/graphql',
        },
    ],
    name: APP.name + '-ALARMS',
    service_params: {
        desiredCount: default_desired_count,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        priority: 30,
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
            name: APP.name.toLowerCase() + '-ssp-' + 'gql',
            repo: 'seon-ssp-customers-graph',
            url_path: '/graphql',
        },
    ],
    name: APP.name + '-SSP',
    service_params: {
        desiredCount: default_desired_count,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        priority: 40,
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
            name: APP.name.toLowerCase() + '-workforce-' + 'gql',
            repo: 'seon-agents-graph',
            url_path: '/graphql',
        },
    ],
    name: APP.name + '-WORKFORCE',
    service_params: {
        desiredCount: default_desired_count,
        maxHealthyPercent: 200,
        minHealthyPercent: 50,
        priority: 50,
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

/*

The number of cpu units used by the task. For tasks using the Fargate launch type, this field is required and you must use one of the following values, which determines your range of valid values for the memory parameter:
256 (.25 vCPU) - Available memory values: 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB)
512 (.5 vCPU) - Available memory values: 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB)
1024 (1 vCPU) - Available memory values: 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7 GB), 8192 (8 GB)
2048 (2 vCPU) - Available memory values: Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB)
4096 (4 vCPU) - Available memory values: Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB)

The amount (in MiB) of memory used by the task. For tasks using the Fargate launch type, this field is required and you must use one of the following values, which determines your range of valid values for the cpu parameter:
512 (0.5 GB), 1024 (1 GB), 2048 (2 GB) - Available cpu values: 256 (.25 vCPU)
1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB) - Available cpu values: 512 (.5 vCPU)
2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7 GB), 8192 (8 GB) - Available cpu values: 1024 (1 vCPU)
Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB) - Available cpu values: 2048 (2 vCPU)
Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB) - Available cpu values: 4096 (4 vCPU

 */
