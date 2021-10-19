import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as actions from "@aws-cdk/aws-codepipeline-actions";

import configureBuild from "./configureBuild";
import { ISourcedContainer, IPipelineActions } from "../interfaces";

/** Constructs The CI/CD Pipeline.
 * @param stack                 The CDK Stack
 * @param stackName             The Stack Name
 * @param cluster               The ECS Cluster
 * @param services              The ECS Services
 * @param sourcedContainers     ISourcedContainer[]
 */

const configurePipeline = ({
  stack,
  stackName,
  cluster,
  services,
  sourcedContainers,
}: {
  stack: cdk.Stack;
  stackName: string;
  cluster: ecs.Cluster;
  services: ecs.IBaseService[];
  sourcedContainers: ISourcedContainer[];
}) => {
  // Construct the build action source/build
  const { source, build, deploy } = sourcedContainers.reduce(
    (accumulator: IPipelineActions, container: ISourcedContainer) => {
      const sourceOutput = new codepipeline.Artifact();
      const sourceAction = new actions.GitHubSourceAction({
        owner: "SEON-GmbH",
        repo: container.repo,
        branch: container.branch,
        actionName: `${container.id}_SourceMerge`,
        oauthToken: cdk.SecretValue.secretsManager("seon-github-token"),
        output: sourceOutput,
      });

      const buildOutput = new codepipeline.Artifact();
      const buildAction = new actions.CodeBuildAction({
        actionName: `${container.id}_CodeBuild`,
        project: configureBuild({
          stack,
          cluster,
          container,
        }),
        input: sourceOutput,
        outputs: [buildOutput],
      });

      const deployAction = new actions.EcsDeployAction({
        actionName: `${container.id}_ContainerDeploy`,
        service: services[0],
        imageFile: new codepipeline.ArtifactPath(
          buildOutput,
          `imagedefinitions.json`
        ),
        deploymentTimeout: cdk.Duration.minutes(20),
      });

      return {
        source: [...accumulator.source, sourceAction],
        build: [...accumulator.build, buildAction],
        deploy: [...accumulator.deploy, deployAction],
      };
    },
    {
      source: [],
      build: [],
      deploy: [],
    }
  );

  const approvalAction = new actions.ManualApprovalAction({
    actionName: "Manual_Approve",
  });

  new codepipeline.Pipeline(stack, "Pipeline", {
    pipelineName: `${stackName}-Pipeline`,
    crossAccountKeys: true,
    stages: [
      {
        stageName: "Source",
        actions: source,
      },
      {
        stageName: "Build",
        actions: build,
      },
      {
        stageName: "Approve",
        actions: [approvalAction],
      },
      {
        stageName: "Deploy",
        actions: deploy,
      },
    ],
  });
};

export default configurePipeline;
