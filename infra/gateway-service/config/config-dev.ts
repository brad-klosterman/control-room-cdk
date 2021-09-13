import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";
import { IContainerProperties } from "../interfaces";

export const dockerProperties: IContainerProperties[] = [
  {
    containerPort: 4000,
    id: "AppName1",
    repo: "seon-federation-gateway",
    conditions: [
      loadBalancerV2.ListenerCondition.hostHeaders(["dev.seongateway.com"]),
      loadBalancerV2.ListenerCondition.pathPatterns(["/seon*"]),
    ],
    environment: { APP_ENVIRONMENT: `dev` },
  },
];

export const stackTags: { name: string; value: string }[] = [
  { name: "Application", value: "seon-gateway" },
];
