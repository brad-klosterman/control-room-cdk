import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

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
    const stack = new cdk.Stack(scope, name + '-STACK', app_props);

    const vpc = new ec2.Vpc(stack, name, {
        vpcName: name,
        maxAzs,
        cidr,
        natGateways,
    });

    return {
        vpc,
    };
};

export default createVPCStack;
