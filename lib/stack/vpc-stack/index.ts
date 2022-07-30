import * as cdk from '@aws-cdk/core';

import configureCloudMap from './constructs/configureCloudMap';
import configureECSCluster from './constructs/configureECSCluster';
import configureVPC from './constructs/configureVPC';
import putParameter from './constructs/putParameter';
import { IVPCProperties } from './interfaces';

/** Constructs the stack with given properties.
 * @param scope                 The CDK app
 * @param props                 The CDK stack properties
 * @param appName               The application identifier
 * @param stackName             The stack identifier
 * @param clusterName           The cluster identifier
 * @param vpcProperties         IVPCProperties
 */
export const createVPC = ({
    cloudName,
    clusterName,
    props,
    scope,
    vpcProperties,
}: {
    cloudName: string;
    clusterName: string;
    props: cdk.StackProps;
    scope: cdk.App;
    vpcProperties: IVPCProperties;
}) => {
    const stack = new cdk.Stack(scope, vpcProperties.vpcName + 'STACK', props);

    const vpc = configureVPC({
        stack,
        ...vpcProperties,
    });

    const cluster = configureECSCluster({ clusterName, stack, vpc });

    const cloudMapNamespace = configureCloudMap({
        cluster,
        nameSpace: cloudName,
    });

    putParameter({
        paramKey: vpcProperties.vpcName + 'NAME',
        paramValue: vpcProperties.vpcName,
        stack,
    });

    putParameter({
        paramKey: cloudName + 'NS',
        paramValue: cloudMapNamespace.namespaceName,
        stack,
    });

    putParameter({
        paramKey: cloudName + 'ARN',
        paramValue: cloudMapNamespace.namespaceArn,
        stack,
    });

    putParameter({
        paramKey: cloudName + 'ID',
        paramValue: cloudMapNamespace.namespaceId,
        stack,
    });

    return {
        cloudMapNamespace,
        cluster,
        vpc,
    };
};

export default createVPC;
