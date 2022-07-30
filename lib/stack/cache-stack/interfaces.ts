export interface IECRedis {
    atRestEncryptionEnabled?: boolean;
    authToken?: string;
    cacheNodeType?: string;
    cacheParameterGroupName?: string;
    cacheSecurityGroupNames?: string[];
    cacheSubnetGroupName?: string;
    engine?: string;
    engineVersion?: string;
    kmsKeyId?: string;
    multiAzEnabled?: boolean;
    numNodeGroups?: number;
    replicasPerNodeGroup?: number;
    replicationGroupDescription?: string;
    securityGroupIds?: string[];
    transitEncryptionEnabled?: boolean;
    userGroupIds?: string[];
}
