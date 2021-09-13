import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as iam from "@aws-cdk/aws-iam";
import * as codebuild from "@aws-cdk/aws-codebuild";

import { ISourcedContainer } from "../interfaces";

/** Constructs the build project for the CI/CD pipeline.
 * @param stack               The CDK stack
 * @param cluster             The ECS cluster
 * @param container           The container to build
 */

const configureBuild = ({
  stack,
  cluster,
  container,
}: {
  stack: cdk.Stack;
  cluster: ecs.Cluster;
  container: ISourcedContainer;
}) => {
  const project = new codebuild.Project(stack, "DockerBuild", {
    projectName: `${container.id}DockerBuild`,
    environment: {
      buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_2,
      computeType: codebuild.ComputeType.LARGE,
      privileged: true,
    },
    environmentVariables: {
      CLUSTER_NAME: {
        value: `${cluster.clusterName}`,
      },
      ECR_REPO_URI: {
        value: `${container.ecrRepo.repositoryUri}`,
      },
      CONTAINER_NAME: {
        value: `${container.id}`,
      },
      APP_PATH: {
        value: ".",
      },
      BACK_PATH: {
        value: ".",
      },
    },
    buildSpec: codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        pre_build: {
          commands: [
            'echo "In Pre-Build Phase"',
            "export TAG=latest",
            "echo $TAG",
          ],
        },
        build: {
          commands: [
            'echo "In Build Phase"',
            "cd $APP_PATH",
            "ls -l",
            `docker build -t $ECR_REPO_URI:$TAG .`,
            "$(aws ecr get-login --no-include-email)",
            "docker push $ECR_REPO_URI:$TAG",
          ],
        },
        post_build: {
          commands: [
            'echo "In Post-Build Phase"',
            "pwd",
            "cd $BACK_PATH",
            'printf \'[{"name":"%s","imageUri":"%s"}]\' $CONTAINER_NAME $ECR_REPO_URI:$TAG > imagedefinitions.json',
            "pwd; ls -al; cat imagedefinitions.json",
          ],
        },
      },
      artifacts: {
        files: ["imagedefinitions.json"],
      },
    }),
  });

  container.ecrRepo.grantPullPush(project.role!);

  project.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        "ecs:DescribeCluster",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
      ],
      resources: [cluster.clusterArn],
    })
  );

  return project;
};

export default configureBuild;
