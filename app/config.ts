import * as cdk from "@aws-cdk/core";
import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";
import { IECStack } from "../lib/stack/ecs-stack/interfaces";

const app = new cdk.App();
const environment = app.node.tryGetContext("environment");
const certificateIdentifier = app.node.tryGetContext("certificateIdentifier");
const apolloKey = app.node.tryGetContext("apolloKey");

if (environment === undefined) {
  throw new Error("Environment must be given");
}

export const APP = {
  cdk: app,
  name: "SEON" + environment,
  stage: environment,
  props: {
    env: {
      account: "894556524073",
      region: "eu-central-1",
      profile: "seon",
    },
  },
};

const domainCertificateArn = `arn:aws:acm:${APP.props.env.region}:${APP.props.env.account}:certificate/${certificateIdentifier}`;

export const GATEWAY_STACK: IECStack = {
  name: APP.name + "GATEWAYSTACK",
  containers: [
    {
      id: "federation",
      repo: "seon-federation-gateway",
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@current",
        GATEWAY_PORT: "4000",
      },
    },
  ],
  dns: {
    domainCertificateArn,
    domainName: "seon-gateway.com",
    subdomainName: environment,
  },
  tags: [{ name: "ECS", value: "gateway-service" }],
};

export const SUBSCRIPTIONS_STACK: IECStack = {
  name: APP.name + "SUBSCRIPTIONSSTACK",
  containers: [
    {
      id: "subscriptions",
      repo: "seon-gateway-events",
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@current",
        HOST_PORT: "4000",
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: environment + ".subscriptions",
    domainCertificateArn,
  },
  tags: [{ name: "ECS", value: "seon-gateway-subscriptions" }],
};

export const AGENTS_STACK: IECStack = {
  name: APP.name + "AGENTS",
  containers: [
    {
      id: "agents",
      repo: "seon-agents-graph",
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@current",
        HOST_PORT: "4000",
        REDIS_HOST_ADDRESS: "ses1b4su55iwynwb.s1azzv.ng.0001.euc1.cache.amazonaws.com"
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: environment + ".agents",
    domainCertificateArn,
  },
  tags: [{ name: "ECS_AGENTS", value: "seon-gateway-agents" }],
};
