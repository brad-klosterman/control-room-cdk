import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';

import putParameter from './putParameter';

const configureECSCluster = ({
    clusterName,
    stack,
    vpc,
}: {
    clusterName: string;
    stack: cdk.Stack;
    vpc: ec2.IVpc;
}): ecs.Cluster => {
    const cluster = new ecs.Cluster(stack, clusterName, {
        clusterName: clusterName,
        containerInsights: true,
        vpc: vpc,
    });

    putParameter({
        paramKey: clusterName + 'CLUSTER_NAME',
        paramValue: cluster.clusterName,
        stack,
    });

    return cluster;
};

export default configureECSCluster;
