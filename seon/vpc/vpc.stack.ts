import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { putParameter } from '../constructs/ssm.parameters';

const createVPCStack = ({
    app_props,
    cidr,
    maxAzs,
    name,
    natGateways,
    scope,
}: {
    app_props: cdk.StackProps;
    cidr: string;
    maxAzs: number;
    name: string;
    natGateways: number;
    scope: cdk.App;
}) => {
    const stack = new cdk.Stack(scope, name, app_props);

    const vpc = new ec2.Vpc(stack, name, {
        cidr,
        maxAzs,
        natGateways,
        vpcName: name,
    });

    putParameter({
        param_key: name + '-NS',
        param_value: name,
        stack,
    });

    return {
        vpc,
    };
};

export default createVPCStack;
