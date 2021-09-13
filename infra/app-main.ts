#!/usr/bin/env node
import "source-map-support/register";

import * as cdk from "@aws-cdk/core";
import { createStack } from "./gateway-service/gateway-stack";
import createVPC from "./vpc/vpc-stack";

import {
  dockerProperties as dockerPropertiesDev,
  stackTags as stackTagsDev,
} from "./gateway-service/config/config-dev";
import {
  dockerProperties as dockerPropertiesProd,
  stackTags as stackTagsProd,
} from "./gateway-service/config/config-prod";

const appName = "SEONGateway";
const stackProperties = {
  env: {
    region: "eu-central-1",
    account: "894556524073",
  },
};

const app = new cdk.App();

const environment = app.node.tryGetContext("environment");
if (environment === undefined) {
  throw new Error("Environment must be given");
}

const { vpc, cluster, cloudMapNamespace } = createVPC({
  scope: app,
  appName,
  clusterName: "GatewayCluster",
  props: stackProperties,
  vpcProperties: {
    vpcName: "GatewayVPC",
    vpcMaxAzs: 3,
    vpcCidr: "10.0.0.0/16",
    natGateways: 1,
  },
});

// Use predefined hosted zone and a domain certificate
const getDnsProperties = (
  certificateIdentifier: string,
  domainName: string,
  subdomainName: string
) => ({
  domainName: domainName,
  subdomainName: subdomainName,
  domainCertificateArn: `arn:aws:acm:${stackProperties.env.region}:${stackProperties.env.account}:certificate/${certificateIdentifier}`,
});

const dnsProperties = getDnsProperties(
  app.node.tryGetContext("certificateIdentifier"),
  app.node.tryGetContext("domainName"),
  app.node.tryGetContext("subdomainName")
);

const stackName = `${appName}-${environment}`;

// IContainerProperties
const dockerProperties =
  environment === "dev" ? dockerPropertiesDev : dockerPropertiesProd;

// ITag stack tags
const stackTags = environment === "dev" ? stackTagsDev : stackTagsProd;

// Construct SEON Gateway Stack
createStack(
  app,
  stackName,
  dockerProperties,
  dnsProperties,
  stackTags,
  stackProperties,
  vpc,
  cluster
);

app.synth();
