import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { putParameter } from '../constructs/ssm.parameters';


export const createVPCStack = ({
    scope,
    app_props,
    maxAzs,
    cidr,
    natGateways,
    name,
}: {
    scope: cdk.App;
    app_props: cdk.StackProps;
    maxAzs: number;
    cidr: string;
    natGateways: number;
    name: string;
}) => {
    const stack = new cdk.Stack(scope, name, app_props);

    const vpc = new ec2.Vpc(stack, name, {
        vpcName: name,
        maxAzs,
        cidr,
        natGateways,
    });

    putParameter({
        stack,
        param_key: name + "-NS",
        param_value: name,
    });

    return {
        vpc,
    };
};

export default createVPCStack;
