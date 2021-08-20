#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { SeonCdkPipelineStack } from "../lib/seon-cdk-pipeline-stack";
import { BillingStack } from "../lib/billing-stack";

const app = new cdk.App();
new SeonCdkPipelineStack(app, "SeonCdkPipelineStack", {});
new BillingStack(app, "BillingStack", {
  budgetAmount: 5,
  emailAddress: "bradley@seon.group",
});
