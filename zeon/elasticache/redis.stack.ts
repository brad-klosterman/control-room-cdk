import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import { Connections, Port, Protocol, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { CfnReplicationGroup, CfnSubnetGroup } from 'aws-cdk-lib/aws-elasticache';

import { BaseStack } from '../base/base.stack';
import { NetworkStack } from '../network/network.stack';

export class RedisStack extends BaseStack {
    readonly network: NetworkStack;

    constructor(network: NetworkStack, id: string, props?: StackProps) {
        super(network, id, props);

        this.network = network;

        // Define a group for telling Elasticache which subnets to put cache nodes in.
        const subnet_group = new CfnSubnetGroup(this, this.base_name + '-redis-subnet-group', {
            cacheSubnetGroupName: this.base_name + '-redis-subnet-group',
            description: this.base_name + 'Redis Elasticache Subnet Group',
            subnetIds: [
                ...this.network.vpc.privateSubnets.map(({ subnetId }) => subnetId),
                ...this.network.vpc.publicSubnets.map(({ subnetId }) => subnetId),
            ],
        });

        const security_group = new SecurityGroup(this, this.base_name + '-redis-security-group', {
            allowAllOutbound: true,
            description: 'security group associated with the Elasticache Redis Cluster',
            securityGroupName: this.base_name + '-redis-security-group',
            vpc: this.network.vpc,
        });

        security_group.connections.allowFromAnyIpv4(Port.tcp(6379), 'Redis ingress 6379');

        new Connections({
            defaultPort: new Port({
                fromPort: 6379,
                protocol: Protocol.TCP,
                stringRepresentation: 'ec-sg-connection',
                toPort: 6379,
            }),
            securityGroups: [security_group],
        });

        const redis_replication_group = new CfnReplicationGroup(
            this,
            this.base_name + '-redis-replication-group',
            {
                // atRestEncryptionEnabled: true,
                // multiAzEnabled: true,
                cacheNodeType: 'cache.t3.micro',
                // cacheParameterGroupName: 'keyevent',
                // primaryClusterId: cluster.clusterName,
                cacheSubnetGroupName: subnet_group.cacheSubnetGroupName,
                engine: 'Redis',
                engineVersion: '6.2',
                // numCacheClusters: 1,
                numNodeGroups: 1,
                replicasPerNodeGroup: 1,
                replicationGroupDescription: this.base_name + 'Redis replication Group',
                securityGroupIds: [security_group.securityGroupId],
            },
        );

        redis_replication_group.node.addDependency(subnet_group);

        new cdk.CfnOutput(this, this.base_name + '/Redis Endpoint', {
            value: redis_replication_group.attrPrimaryEndPointAddress,
        });

        new cdk.CfnOutput(this, this.base_name + '/Redis Port', {
            value: redis_replication_group.attrPrimaryEndPointPort,
        });
    }
}
