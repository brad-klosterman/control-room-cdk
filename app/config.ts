import * as loadBalancerV2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';

import { IECStack } from '../lib/stack/ecs-stack/interfaces';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment');
const certificateIdentifier = app.node.tryGetContext('certificateIdentifier');
const redisUrl = app.node.tryGetContext('redisUrl');
const apolloKey = app.node.tryGetContext('apolloKey');

if (environment === undefined) {
    throw new Error('Environment must be given');
}

export const APP = {
    cdk: app,
    name: 'SEON' + environment,
    props: {
        env: {
            account: '894556524073',
            profile: 'seon',
            region: 'eu-central-1',
        },
    },
    stage: environment,
};

const domainCertificateArn = `arn:aws:acm:${APP.props.env.region}:${APP.props.env.account}:certificate/${certificateIdentifier}`;

export const GATEWAY_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTPS',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 4000,
            environment: {
                APOLLO_GRAPH_REF: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                APP_ENVIRONMENT: environment,
                HOST_PORT: '4000',
                NODE_ENV: environment,
            },
            healthCheck: '/.well-known/apollo/server-health',
            id: 'federation-' + environment,
            repo: 'seon-federation-gateway',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: environment,
    },
    name: APP.name + 'GATEWAYSTACK',
    tags: [{ name: 'ECS' + environment, value: 'federation-' + environment }],
};

export const SUBSCRIPTIONS_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTPS',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 5000,
            environment: {
                APOLLO_GRAPH_VARIANT: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                APP_ENVIRONMENT: environment,
                GATEWAY_ENDPOINT: `https://${environment}.seon-gateway.com`,
                HOST_PORT: '5000',
                NODE_ENV: environment,
                REDIS_HOST_ADDRESS: redisUrl,
            },
            healthCheck: '/',
            id: 'subscriptions-' + environment,
            repo: 'seon-gateway-events',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: 'subscriptions.' + environment,
    },
    name: APP.name + 'SUBSCRIPTIONS',
    tags: [{ name: 'ECS' + environment, value: 'subscriptions-' + environment }],
};

export const AGENTS_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTPS',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 4000,
            environment: {
                APOLLO_GRAPH_REF: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                APP_ENVIRONMENT: environment,
                HOST_PORT: '4000',
                NODE_ENV: environment,
                REDIS_HOST_ADDRESS: redisUrl,
                SEON_RESTAPI_BASEURL:
                    environment === 'prod'
                        ? 'https://api.seon.network/'
                        : 'https://api.staging.seon.network/',
            },
            healthCheck: '/.well-known/apollo/server-health',
            id: 'agents-' + environment,
            repo: 'seon-agents-graph',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: 'agents.' + environment,
    },
    name: APP.name + 'AGENTS',
    tags: [{ name: 'ECS_AGENTS' + environment, value: 'agents-' + environment }],
};

export const ALARMS_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTPS',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 4000,
            environment: {
                APOLLO_GRAPH_REF: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                APP_ENVIRONMENT: environment,
                HOST_PORT: '4000',
                NODE_ENV: environment,
                REDIS_HOST_ADDRESS: redisUrl,
                SEON_RESTAPI_BASEURL:
                    environment === 'prod'
                        ? 'https://api.seon.network/'
                        : 'https://api.staging.seon.network/',
            },
            healthCheck: '/.well-known/apollo/server-health',
            id: 'alarms-' + environment,
            repo: 'seon-alarms-graph',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: 'alarms.' + environment,
    },
    name: APP.name + 'ALARMS',
    tags: [{ name: 'ECS_ALARMS' + environment, value: 'alarms-' + environment }],
};

export const SSP_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTPS',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 4000,
            environment: {
                APOLLO_GRAPH_REF: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                APP_ENVIRONMENT: environment,
                HOST_PORT: '4000',
                NODE_ENV: environment,
                REDIS_HOST_ADDRESS: redisUrl,
                SEON_RESTAPI_BASEURL:
                    environment === 'prod'
                        ? 'https://api.seon.network/'
                        : 'https://api.staging.seon.network/',
            },
            healthCheck: '/.well-known/apollo/server-health',
            id: 'ssp-' + environment,
            repo: 'seon-ssp-customers-graph',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: 'ssp-customers.' + environment,
    },
    name: APP.name + 'SSP',
    tags: [{ name: 'ECS_SSP' + environment, value: 'ssp-' + environment }],
};

export const RTC_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTP',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 4000,
            environment: {
                APOLLO_GRAPH_REF: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                APP_ENVIRONMENT: environment,
                HOST_PORT: '4000',
                NODE_ENV: environment,
                REDIS_HOST_ADDRESS: redisUrl,
                SEON_RESTAPI_BASEURL:
                    environment === 'prod'
                        ? 'https://api.seon.network/'
                        : 'https://api.staging.seon.network/',
            },
            healthCheck: '/health-check',
            id: 'rtc-' + environment,
            repo: 'seon-rtc',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: 'rtc.' + environment,
    },
    name: APP.name + 'RTC',
    tags: [{ name: 'ECS_RTC' + environment, value: 'rtc-' + environment }],
};

export const RDRONE_STACK: IECStack = {
    alb: {
        instanceCount: environment === 'prod' ? 2 : 1,
        protocol: 'HTTP',
    },
    containers: [
        {
            branch: environment === 'prod' ? 'main' : environment,
            conditions: [loadBalancerV2.ListenerCondition.pathPatterns(['/*'])],
            containerPort: 3000,
            environment: {
                APP_ENVIRONMENT: environment,
                NODE_ENV: environment,
                POSTGRES_HOST: 'ec2-176-34-99-96.eu-west-1.compute.amazonaws.com',
                POSTGRES_DB: 'd117iner0lefb',
                RAILS_ENV: 'production',
                POSTGRES_PASS: 'p16777a0c4f592db1a206d9094369ae35496d036bac4bca303a84585a4839b44b',
                SECRET_KEY_BASE:
                    '3e22395e3574d2e7060098f8132fd977d7f6f243178eca15fa688704b36a325539fc3fd95796068031511c4785bf6c8668d600b2e323be742fafd8e2870c2e09',
                APOLLO_GRAPH_REF: 'SEON@' + environment,
                APOLLO_KEY: apolloKey,
                POSTGRES_USER: 'u112csei54os7n',
                HOST_PORT: '3000',
                REDIS_HOST_ADDRESS: redisUrl,
                SEON_RESTAPI_BASEURL:
                    environment === 'prod'
                        ? 'https://api.seon.network/'
                        : 'https://api.staging.seon.network/',
            },
            healthCheck: '/health-check',
            id: 'rdrone-' + environment,
            is_docker_compose: true,
            repo: 'seon-ruby-aws',
        },
    ],
    dns: {
        domainCertificateArn,
        domainName: 'seon-gateway.com',
        subdomainName: 'rdrone.' + environment,
    },
    name: APP.name + 'RDRONE',
    tags: [{ name: 'ECS_DRONE' + environment, value: 'rdrone-' + environment }],
};
