export interface IECRedis {
  replicationGroupDescription?: string;
  multiAzEnabled?: boolean;
  atRestEncryptionEnabled?: boolean;
  authToken?: string;
  cacheNodeType?: string;
  cacheParameterGroupName?: string;
  cacheSecurityGroupNames?: string[];
  cacheSubnetGroupName?: string;
  engine?: string;
  engineVersion?: string;
  kmsKeyId?: string;
  numNodeGroups?: number;
  replicasPerNodeGroup?: number;
  securityGroupIds?: string[];
  transitEncryptionEnabled?: boolean;
  userGroupIds?: string[];
}
