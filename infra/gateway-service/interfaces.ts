import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as codepipeline from "@aws-cdk/aws-codepipeline";

// Structure for tagging objects created
export interface ITag {
  name: string;
  value: string;
}

export interface IDomainProperties {
  domainName: string;
  subdomainName: string;
  domainCertificateArn: string;
}

// Definitions for a single service
export interface IContainerProperties {
  // Unique id of the service
  id: string;
  // The container port
  containerPort: number;
  // Name of GitHub repo
  repo: string;
  // Environment variables for the container
  environment: { [key: string]: string };
  // Define the path or host header for routing traffic
  conditions: loadBalancerV2.ListenerCondition[];
}

export interface ISourcedContainer extends IContainerProperties {
  // Sourced image
  image: ecs.ContainerImage;
  // ECR Repo
  ecrRepo: ecr.IRepository;
}

export interface IPipelineActions {
  source: codepipeline.IAction[];
  build: codepipeline.IAction[];
  deploy: codepipeline.IAction[];
}
