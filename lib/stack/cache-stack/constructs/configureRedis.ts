import * as elasticache from '@aws-cdk/aws-elasticache';
import * as cdk from '@aws-cdk/core';

/** The AWS::ElastiCache::ReplicationGroup
 * A Redis (cluster mode disabled) replication group is a collection of
 * cache clusters, where one of the clusters is a primary read-write cluster
 * and the others are read-only replicas.
 *
 * @param stack                 The CDK stack
 * @param containerProperties   The container parameters
 * @param tags                  The tags to apply
 */

const configureRedis = ({
    cacheName,
    cacheProperties,
    stack,
}: {
    cacheName: string;
    cacheProperties: elasticache.CfnReplicationGroupProps;
    stack: cdk.Construct;
}) => {
    const redisReplicationGroup = new elasticache.CfnReplicationGroup(
        stack,
        cacheName + 'ReplicationGroup',
        cacheProperties,
    );

    return redisReplicationGroup;
};

export default configureRedis;
