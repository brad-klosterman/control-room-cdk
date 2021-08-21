import * as cdk from "@aws-cdk/core";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  GitHubSourceAction,
} from "@aws-cdk/aws-codepipeline-actions";
import { SecretValue } from "@aws-cdk/core";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "@aws-cdk/aws-codebuild";

export class SeonCdkPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, "Pipeline", {
      pipelineName: "Pipeline",
      crossAccountKeys: false,
      restartExecutionOnUpdate: true,
    });

    const CDK_SOURCE_OUTPUT = new Artifact("CDKSourceOutput");
    const LAMBDA_COMPUTE_SOURCE_OUTPUT = new Artifact("LambdaComputeSourceOutput");

    pipeline.addStage({
      stageName: "Source",
      actions: [
        new GitHubSourceAction({
          owner: "SEON-GmbH",
          repo: "seon-cdk-pipeline",
          branch: "main",
          actionName: "Pipeline_Source",
          oauthToken: SecretValue.secretsManager("seon-github-token"),
          output: CDK_SOURCE_OUTPUT,
        }),
        new GitHubSourceAction({
          owner: "SEON-GmbH",
          repo: "seon-lambda-compute",
          branch: "main",
          actionName: "LambdaCompute_Source",
          oauthToken: SecretValue.secretsManager("seon-github-token"),
          output: LAMBDA_COMPUTE_SOURCE_OUTPUT,
        }),
      ],
    });

    const CDK_BUILD_OUTPUT = new Artifact("CdkBuildOutput");
    const LAMBDA_COMPUTE_BUILD_OUTPUT = new Artifact("ServiceBuildOutput");

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodeBuildAction({
          actionName: "CDK_Build",
          input: CDK_SOURCE_OUTPUT,
          outputs: [CDK_BUILD_OUTPUT],
          project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
            ),
          }),
        }),
        new CodeBuildAction({
          actionName: "Lambda_Compute_Build",
          input: LAMBDA_COMPUTE_SOURCE_OUTPUT,
          outputs: [LAMBDA_COMPUTE_BUILD_OUTPUT],
          project: new PipelineProject(this, "LambdaComputeBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/service-build-spec.yml"
            ),
          }),
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Pipeline_Update",
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: "Pipeline_Update",
          stackName: "SeonCdkPipelineStack",
          templatePath: CDK_BUILD_OUTPUT.atPath(
            "SeonCdkPipelineStack.template.json"
          ),
          adminPermissions: true,
        }),
      ],
    });
  }
}
