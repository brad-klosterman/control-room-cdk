import * as cdk from "@aws-cdk/core";
import * as elasticache from "@aws-cdk/aws-elasticache";

/** AWS::ElastiCache::ReplicationGroup
 *
 * @param stack                 The CDK stack
 * @param containerProperties   The container parameters
 * @param tags                  The tags to apply
 */

const configureRedis = ({
  stack,
  cacheName,
  cacheProperties,
}: {
  stack: cdk.Construct;
  cacheName: string;
  cacheProperties: elasticache.CfnReplicationGroupProps;
}) => {
  const redisReplicationGroup = new elasticache.CfnReplicationGroup(
    stack,
    cacheName + "ReplicationGroup",
    cacheProperties
  );

  return redisReplicationGroup;
};

export default configureRedis;
