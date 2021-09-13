import * as cdk from "@aws-cdk/core";
import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";
import * as codepipeline from "@aws-cdk/aws-codepipeline";

// Structure for tagging objects created
export interface ITag {
  name: string;
  value: string;
}

export interface IVPCProperties {
  vpcName: string;
  vpcMaxAzs: number;
  vpcCidr: string;
  natGateways: number;
}
