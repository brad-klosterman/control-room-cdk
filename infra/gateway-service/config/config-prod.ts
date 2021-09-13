import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";
import { IContainerProperties } from "../interfaces";

export const dockerProperties: IContainerProperties[] = [
  {
    id: "gateway-server",
    repo: "seon-federation-gateway",
    containerPort: 4000,
    conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/apollo*"])],
    environment: { APP_ENVIRONMENT: `production` },
  },
];

export const stackTags: { name: string; value: string }[] = [
  { name: "Application", value: "gateway-service" },
];

/*
{
  image: ecs.ContainerImage.fromAsset(containerDirectory),
  containerPort: 80,
  id: "AppName2",
  conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/v2*"])],
  environment: { APP_ENVIRONMENT: `env-AppName2-prod` },
},
{
  image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
  containerPort: 80,
  id: "EcsSample",
  conditions: [
    loadBalancerV2.ListenerCondition.hostHeaders(["site-prod.olmi.be"]),
  ],
  environment: { APP_ENVIRONMENT: `env-EcsSample-dev` },
},

*/
