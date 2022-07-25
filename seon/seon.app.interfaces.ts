import { FargateTaskDefinitionProps } from 'aws-cdk-lib/aws-ecs';


export interface ContainerEnvironment {
    APP_ENVIRONMENT: 'development' | 'staging' | 'production';
    NODE_ENV: 'development' | 'staging' | 'production';
    APOLLO_KEY: string;
    APOLLO_GRAPH_REF: string;
    HOST_PORT: string;
    REDIS_HOST_ADDRESS: string;
    SEON_RESTAPI_BASEURL: string;
}

export interface ServiceParams {
    desiredCount: number;
    minHealthyPercent: number;
    maxHealthyPercent: number;
}

export interface TaskDefContainer {
    name: string;
    repo: string;
    branch: 'development' | 'staging' | 'main';
    environment: { [key: string]: string };
    health_check_url: string;
}

export interface ServiceConfig {
    name: string;
    sub_domain: string;
    service_params: ServiceParams;
    task_params: FargateTaskDefinitionProps;
    containers: TaskDefContainer[];
}