import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elasticache from '@aws-cdk/aws-elasticache';
import * as cdk from '@aws-cdk/core';

import configureRedis from './constructs/configureRedis';

/** Constructs the stack with given properties.
 * @param scope                 The CDK app
 * @param cacheName             The CDK stack identifier
 * @param props                 The CDK stack properties
 */
export const createCache = ({
    cacheName,
    cacheProperties,
    cluster,
    props,
    scope,
    vpc,
}: {
    cacheName: string;
    cacheProperties: elasticache.CfnReplicationGroupProps;
    cluster: ecs.Cluster;
    props: cdk.StackProps;
    scope: cdk.App;
    vpc: ec2.IVpc;
}) => {
    const stack = new cdk.Stack(scope, cacheName + 'STACK', props);

    // Define a group for telling Elasticache which subnets to put cache nodes in.
    const subnetGroup = new elasticache.CfnSubnetGroup(stack, cacheName + 'SUBNET_GROUP', {
        cacheSubnetGroupName: cacheName + 'SNGroup',
        description: cacheName + ' Elasticache Subnet Group',
        subnetIds: [
            ...vpc.privateSubnets.map(({ subnetId }) => subnetId),
            ...vpc.publicSubnets.map(({ subnetId }) => subnetId),
        ],
    });

    const securityGroup = new ec2.SecurityGroup(stack, cacheName + 'SG', {
        allowAllOutbound: true,
        description: 'SecurityGroup associated with the ElastiCache Redis Cluster',
        securityGroupName: cacheName + 'SG',
        vpc: vpc,
    });

    securityGroup.connections.allowFromAnyIpv4(ec2.Port.tcp(6379), 'Redis ingress 6379');

    new ec2.Connections({
        defaultPort: new ec2.Port({
            fromPort: 6379,
            protocol: ec2.Protocol.TCP,
            stringRepresentation: 'ec-sg-connection',
            toPort: 6379,
        }),
        securityGroups: [securityGroup],
    });

    const redis = configureRedis({
        cacheName,
        cacheProperties: {
            ...cacheProperties,
            cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
            securityGroupIds: [securityGroup.securityGroupId],
        },
        stack,
    });

    redis.node.addDependency(subnetGroup);

    new cdk.CfnOutput(stack, cacheName + '/Redis Endpoint', {
        value: redis.attrPrimaryEndPointAddress,
    });

    new cdk.CfnOutput(stack, cacheName + '/Redis Port', {
        value: redis.attrPrimaryEndPointPort,
    });

    return {
        redis,
    };
};

export default createCache;
