import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';

export const createECSClusterStack = ({
    scope,
    app_props,
    name,
    vpc,
}: {
    scope: cdk.App;
    app_props: cdk.StackProps;
    name: string;
    vpc: ec2.IVpc;
}) => {
    const stack = new cdk.Stack(scope, name + '_STACK', app_props);

    const cluster = new ecs.Cluster(stack, name, {
        clusterName: name,
        vpc,
        containerInsights: true,
        enableFargateCapacityProviders: true
        // defaultCloudMapNamespace
    });

    return {
        cluster,
    };
};

export default createECSClusterStack;
