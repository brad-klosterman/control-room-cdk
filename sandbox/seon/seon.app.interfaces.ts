import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs';

export interface ContainerEnvironment {
    APOLLO_GRAPH_REF: string;
    APOLLO_KEY: string;
    APP_ENVIRONMENT: 'development' | 'staging' | 'production';
    HOST_PORT: string;
    NODE_ENV: 'development' | 'staging' | 'production';
    REDIS_HOST_ADDRESS: string;
    SEON_RESTAPI_BASEURL: string;
}

export interface ServiceParams {
    desiredCount: number;
    maxHealthyPercent: number;
    minHealthyPercent: number;
    priority: number;
}

export interface TaskDefContainer {
    branch: 'development' | 'staging' | 'main';
    environment: { [key: string]: string };
    health_check_url: string;
    name: string;
    repo: string;
    url_path: string;
}

export interface ServiceConfig {
    containers: TaskDefContainer[];
    name: string;
    service_params: ServiceParams;
    sub_domain: string;
    task_params: FargateTaskDefinitionProps;
}
