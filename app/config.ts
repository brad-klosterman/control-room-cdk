import * as cdk from "@aws-cdk/core";
import * as loadBalancerV2 from "@aws-cdk/aws-elasticloadbalancingv2";
import { IECStack } from "../lib/stack/ecs-stack/interfaces";

const app = new cdk.App();
const environment = app.node.tryGetContext("environment");
const certificateIdentifier = app.node.tryGetContext("certificateIdentifier");
const redisUrl = app.node.tryGetContext("redisUrl");
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
      id: "federation-" + environment,
      repo: "seon-federation-gateway",
      healthCheck: "/.well-known/apollo/server-health",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@" + environment,
        HOST_PORT: "4000",
      },
    },
  ],
  dns: {
    domainCertificateArn,
    domainName: "seon-gateway.com",
    subdomainName: environment,
  },
  alb: {
    protocol: "HTTPS",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS" + environment, value: "federation-" + environment }],
};

export const SUBSCRIPTIONS_STACK: IECStack = {
  name: APP.name + "SUBSCRIPTIONS",
  containers: [
    {
      id: "subscriptions-" + environment,
      repo: "seon-gateway-events",
      healthCheck: "/",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 5000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_VARIANT: "SEON@" + environment,
        HOST_PORT: "5000",
        GATEWAY_ENDPOINT: `https://${environment}.seon-gateway.com`,
        REDIS_HOST_ADDRESS: redisUrl,
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: "subscriptions." + environment,
    domainCertificateArn,
  },
  alb: {
    protocol: "HTTPS",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS" + environment, value: "subscriptions-" + environment }],
};

export const AGENTS_STACK: IECStack = {
  name: APP.name + "AGENTS",
  containers: [
    {
      id: "agents-" + environment,
      repo: "seon-agents-graph",
      healthCheck: "/.well-known/apollo/server-health",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@" + environment,
        HOST_PORT: "4000",
        REDIS_HOST_ADDRESS: redisUrl,
        SEON_RESTAPI_BASEURL:
          environment === "prod"
            ? "https://api.seon.network/"
            : "https://api.staging.seon.network/",
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: "agents." + environment,
    domainCertificateArn,
  },
  alb: {
    protocol: "HTTPS",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS_AGENTS" + environment, value: "agents-" + environment }],
};

export const ALARMS_STACK: IECStack = {
  name: APP.name + "ALARMS",
  containers: [
    {
      id: "alarms-" + environment,
      repo: "seon-alarms-graph",
      healthCheck: "/.well-known/apollo/server-health",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@" + environment,
        HOST_PORT: "4000",
        REDIS_HOST_ADDRESS: redisUrl,
        SEON_RESTAPI_BASEURL:
            environment === "prod"
                ? "https://api.seon.network/"
                : "https://api.staging.seon.network/",
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: "alarms." + environment,
    domainCertificateArn,
  },
  alb: {
    protocol: "HTTPS",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS_ALARMS" + environment, value: "alarms-" + environment }],
};

export const SSP_STACK: IECStack = {
  name: APP.name + "SSP",
  containers: [
    {
      id: "ssp-" + environment,
      repo: "seon-ssp-customers-graph",
      healthCheck: "/.well-known/apollo/server-health",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@" + environment,
        HOST_PORT: "4000",
        REDIS_HOST_ADDRESS: redisUrl,
        SEON_RESTAPI_BASEURL:
            environment === "prod"
                ? "https://api.seon.network/"
                : "https://api.staging.seon.network/",
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: "ssp-customers." + environment,
    domainCertificateArn,
  },
  alb: {
    protocol: "HTTPS",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS_SSP" + environment, value: "ssp-" + environment }],
};

export const RTC_STACK: IECStack = {
  name: APP.name + "RTC",
  containers: [
    {
      id: "rtc-" + environment,
      repo: "seon-rtc",
      healthCheck: "/health-check",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 4000,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@" + environment,
        HOST_PORT: "4000",
        REDIS_HOST_ADDRESS: redisUrl,
        SEON_RESTAPI_BASEURL:
            environment === "prod"
                ? "https://api.seon.network/"
                : "https://api.staging.seon.network/",
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: "rtc." + environment,
    domainCertificateArn,
  },
  alb: {
    protocol: "HTTP",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS_RTC" + environment, value: "rtc-" + environment }],
};

export const RDRONE_STACK: IECStack = {
  name: APP.name + "RDRONE",
  containers: [
    {
      id: "rdrone-" + environment,
      repo: "seon-ruby-aws",
      healthCheck: "/health-check",
      branch: environment === "prod" ? "main" : environment,
      containerPort: 3000,
      is_docker_compose: true,
      conditions: [loadBalancerV2.ListenerCondition.pathPatterns(["/*"])],
      environment: {
        APP_ENVIRONMENT: environment,
        NODE_ENV: environment,
        RAILS_ENV: "production",
        SECRET_KEY_BASE: '3e22395e3574d2e7060098f8132fd977d7f6f243178eca15fa688704b36a325539fc3fd95796068031511c4785bf6c8668d600b2e323be742fafd8e2870c2e09',
        POSTGRES_HOST: 'ec2-176-34-99-96.eu-west-1.compute.amazonaws.com',
        POSTGRES_DB: "d117iner0lefb",
        POSTGRES_USER: "u112csei54os7n",
        POSTGRES_PASS: "p16777a0c4f592db1a206d9094369ae35496d036bac4bca303a84585a4839b44b",
        APOLLO_KEY: apolloKey,
        APOLLO_GRAPH_REF: "SEON@" + environment,
        HOST_PORT: "3000",
        REDIS_HOST_ADDRESS: redisUrl,
        SEON_RESTAPI_BASEURL:
            environment === "prod"
                ? "https://api.seon.network/"
                : "https://api.staging.seon.network/",
      },
    },
  ],
  dns: {
    domainName: "seon-gateway.com",
    subdomainName: "rdrone." + environment,
    domainCertificateArn,
  },
  alb: {
    protocol: "HTTP",
    instanceCount: environment === "prod" ? 2 : 1,
  },
  tags: [{ name: "ECS_DRONE" + environment, value: "rdrone-" + environment }],
};
