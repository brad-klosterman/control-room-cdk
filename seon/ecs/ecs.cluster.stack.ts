import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as serviceDiscovery from "aws-cdk-lib/aws-servicediscovery";
import { putParameter } from '../constructs/ssm.parameters';

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
    const stack = new cdk.Stack(scope, name + '-STACK', app_props);

    const cluster = new ecs.Cluster(stack, name, {
        clusterName: name,
        vpc,
        containerInsights: true,
        enableFargateCapacityProviders: true
        // defaultCloudMapNamespace
    });

    const namespace = cluster.addDefaultCloudMapNamespace({
        name: name,
        type: serviceDiscovery.NamespaceType.DNS_PRIVATE,
    });

    putParameter({
        stack,
        param_key: name + 'CLUSTER-NS',
        param_value: cluster.clusterName,
    });

    putParameter({
        stack,
        param_key: name + "-NS",
        param_value: namespace.namespaceName,
    });

    putParameter({
        stack,
        param_key: name + "-ARN",
        param_value: namespace.namespaceArn,
    });

    putParameter({
        stack,
        param_key: name + "-ID",
        param_value: namespace.namespaceId,
    });

    return {
        cluster,
    };
};

export default createECSClusterStack;
