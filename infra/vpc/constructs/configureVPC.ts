import * as ec2 from "@aws-cdk/aws-ec2";
import * as cdk from "@aws-cdk/core";
import { IVPCProperties } from "../interfaces";

interface IVPC extends IVPCProperties {
  stack: cdk.Stack;
}
const configureVPC = ({
  stack,
  vpcName,
  vpcMaxAzs,
  vpcCidr,
  natGateways,
}: IVPC): ec2.IVpc => {
  if (vpcMaxAzs > 0 && vpcCidr.length > 0) {
    const vpc = new ec2.Vpc(stack, vpcName, {
      maxAzs: vpcMaxAzs,
      cidr: vpcCidr,
      natGateways: natGateways,
    });
    return vpc;
  } else {
    console.error("please check the options: VPCMaxAzs, VPCCIDR, NATGateway");
    process.exit(1);
  }
};

export default configureVPC;
