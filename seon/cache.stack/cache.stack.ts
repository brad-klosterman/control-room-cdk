import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export const createCache = ({
    scope,
    app_props,
    vpc,
    cluster,
    cache_name,
    cache_properties,
}: {
    scope: cdk.App;
    app_props: cdk.StackProps;
    vpc: ec2.IVpc;
    cluster: ecs.Cluster;
    cache_name: string;
    cache_properties: elasticache.CfnReplicationGroupProps;
}) => {
    const stack = new cdk.Stack(scope, cache_name + '-STACK', app_props);

    // Define a group for telling Elasticache which subnets to put cache nodes in.
    const subnetGroup = new elasticache.CfnSubnetGroup(stack, cache_name + '-SUBNET_GROUP', {
        cacheSubnetGroupName: cache_name + '-SNGroup',
        description: cache_name + 'Elasticache Subnet Group',
        subnetIds: [
            ...vpc.privateSubnets.map(({ subnetId }) => subnetId),
            ...vpc.publicSubnets.map(({ subnetId }) => subnetId),
        ],
    });

    const securityGroup = new ec2.SecurityGroup(stack, cache_name + '-SG', {
        vpc: vpc,
        securityGroupName: cache_name + '-SG',
        description: 'SecurityGroup associated with the ElastiCache Redis Cluster',
        allowAllOutbound: true,
    });

    securityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(6379), 'Redis ingress 6379');

    new ec2.Connections({
        securityGroups: [securityGroup],
        defaultPort: new ec2.Port({
            protocol: ec2.Protocol.TCP,
            fromPort: 6379,
            toPort: 6379,
            stringRepresentation: 'ec-sg-connection',
        }),
    });

    const redisReplicationGroup = new elasticache.CfnReplicationGroup(
        stack,
        cache_name + 'ReplicationGroup',
        {
            ...cache_properties,
            cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
            securityGroupIds: [securityGroup.securityGroupId],
        }
    );

    redisReplicationGroup.node.addDependency(subnetGroup);

    new cdk.CfnOutput(stack, cache_name + '/Redis Endpoint', {
        value: redisReplicationGroup.attrPrimaryEndPointAddress,
    });

    new cdk.CfnOutput(stack, cache_name + '/Redis Port', {
        value: redisReplicationGroup.attrPrimaryEndPointPort,
    });

    return {
        redis: redisReplicationGroup,
    };
};
