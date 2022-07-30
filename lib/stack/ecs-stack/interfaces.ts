import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as loadBalancerV2 from '@aws-cdk/aws-elasticloadbalancingv2';

// Structure for tagging objects created

export interface IDomainProperties {
    domainCertificateArn: string;
    domainName: string;
    subdomainName: string;
}

// Definitions for a single service
export interface IContainerProperties {
    branch: string;
    // Define the path or host header for routing traffic
    conditions: loadBalancerV2.ListenerCondition[];
    // The container port
    containerPort: number;
    // Environment variables for the container
    environment: { [key: string]: string };
    healthCheck: string;
    // Unique id of the service
    id: string;
    is_docker_compose?: boolean;
    // Name of GitHub repo
    repo: string;
}

export interface IALBProperties {
    instanceCount: number;
    protocol: string;
}

export interface ISourcedContainer extends IContainerProperties {
    // ECR Repo
    ecrRepo: ecr.IRepository;
}

export interface ITag {
    name: string;
    value: string;
}

export interface IPipelineActions {
    build: codepipeline.IAction[];
    deploy: codepipeline.IAction[];
    source: codepipeline.IAction[];
}

export interface IDNS {
    domainCertificateArn: string;
    domainName: string;
    subdomainName: string;
}

export interface IECStack {
    alb: IALBProperties;
    containers: IContainerProperties[];
    dns: IDNS;
    name: string;
    tags?: ITag[];
}
