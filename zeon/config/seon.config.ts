import { AvailableServices, ServiceConfig } from './seon.config.interfaces';

const SHARED_ENV = {
    APOLLO_GRAPH_REF: 'SEON@development',
    APOLLO_KEY: 'service:SEON:mMJVKJ8jbZVbyx39tybPqg',
    AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
    ENVIRONMENT: 'development',
    GATEWAY_ENDPOINT: 'development.seon-gateway.com/graphql',
    PORT: '4000',
    REDIS_HOST_ADDRESS: 'sesi50gr1hf9510.s1azzv.ng.0001.euc1.cache.amazonaws.com',
    SEON_REST_URL: 'https://api.staging.seon.network/',
};

const FEDERATION_SERVICE_CONFIG: ServiceConfig = {
    desired_count: 1,
    discovery_type: 'DNS',
    health_check_url: '/mesh/health',
    main_container: {
        environment: {
            ...SHARED_ENV,
        },
        github: {
            branch: 'development',
            repo: 'seon-federation-gateway',
        },
    },
    max_healthy_percent: 300,
    min_healthy_percent: 50,
    priority: 10,
    task_props: {
        cpu: 256,
        memoryLimitMiB: 512,
    },
};

const ALARMS_SERVICE_CONFIG: ServiceConfig = {
    desired_count: 1,
    discovery_type: 'CLOUDMAP',
    health_check_url: '/mesh/health',
    main_container: {
        environment: {
            ...SHARED_ENV,
        },
        github: {
            branch: 'development',
            repo: 'seon-alarms-graph',
        },
    },
    max_healthy_percent: 300,
    min_healthy_percent: 50,
    priority: 20,
    task_props: {
        cpu: 256,
        memoryLimitMiB: 512,
    },
};

const WORKFORCE_SERVICE_CONFIG: ServiceConfig = {
    desired_count: 1,
    discovery_type: 'CLOUDMAP',
    health_check_url: '/.well-known/apollo/server-health', // not setup yet
    main_container: {
        environment: {
            ...SHARED_ENV,
        },
        github: {
            branch: 'development',
            repo: 'seon-agents-graph',
        },
    },
    max_healthy_percent: 300,
    min_healthy_percent: 50,
    priority: 20,
    task_props: {
        cpu: 256,
        memoryLimitMiB: 512,
    },
};

const SSP_SERVICE_CONFIG: ServiceConfig = {
    desired_count: 1,
    discovery_type: 'CLOUDMAP',
    health_check_url: '/.well-known/apollo/server-health',
    main_container: {
        environment: {
            ...SHARED_ENV,
        },
        github: {
            branch: 'development',
            repo: 'seon-ssp-customers-graph',
        },
    },
    max_healthy_percent: 300,
    min_healthy_percent: 50,
    priority: 20,
    task_props: {
        cpu: 256,
        memoryLimitMiB: 512,
    },
};

export const getServiceConfig = (service_namespace: AvailableServices): ServiceConfig => {
    const services = {
        alarms: ALARMS_SERVICE_CONFIG,
        events: FEDERATION_SERVICE_CONFIG,
        federation: FEDERATION_SERVICE_CONFIG,
        ssp: SSP_SERVICE_CONFIG,
        workforce: WORKFORCE_SERVICE_CONFIG,
    };

    return services[service_namespace];
};
