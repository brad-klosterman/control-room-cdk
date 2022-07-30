import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as loadBalancerV2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';

// Structure for tagging objects created
export interface ITag {
    name: string;
    value: string;
}

export interface IVPCProperties {
    natGateways: number;
    vpcCidr: string;
    vpcMaxAzs: number;
    vpcName: string;
}
