import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';

import { IVPCProperties } from '../interfaces';

interface IVPC extends IVPCProperties {
    stack: cdk.Stack;
}

const configureVPC = ({ natGateways, stack, vpcCidr, vpcMaxAzs, vpcName }: IVPC): ec2.IVpc => {
    if (vpcMaxAzs > 0 && vpcCidr.length > 0) {
        const vpc = new ec2.Vpc(stack, vpcName, {
            cidr: vpcCidr,
            maxAzs: vpcMaxAzs,
            natGateways: natGateways,
        });

        const flowLog = new ec2.FlowLog(stack, vpcName + 'FLOW_LOG', {
            resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
        });

        return vpc;
    } else {
        console.error('please check the options: VPCMaxAzs, VPCCIDR, NATGateway');
        process.exit(1);
    }
};

export default configureVPC;
