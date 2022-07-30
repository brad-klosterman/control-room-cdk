import * as ecs from '@aws-cdk/aws-ecs';
import * as serviceDiscovery from '@aws-cdk/aws-servicediscovery';

const configureCloudMap = ({
    cluster,
    nameSpace,
}: {
    cluster: ecs.Cluster;
    nameSpace: string;
}): serviceDiscovery.INamespace => {
    const namespace = cluster.addDefaultCloudMapNamespace({
        name: nameSpace,
        type: serviceDiscovery.NamespaceType.DNS_PRIVATE,
    });

    return namespace;
};

export default configureCloudMap;
