import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

/**
 * The name of the IAM role that grants containers in the task permission to call AWS APIs on your behalf.
 *
 * @default - A task role is automatically created for you.
 */
const createTaskRole = ({
  stack,
  baseName,
}: {
  stack: cdk.Stack;
  baseName: string;
}): iam.Role => {
  const role = new iam.Role(stack, baseName + "TaskRole", {
    roleName: baseName + "TaskRole",
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
  });

  role.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["dynamodb:Scan", "dynamodb:PutItem"],
    })
  );

  return role;
};

/**
 * The name of the IAM task execution role that grants the ECS agent to call AWS APIs on your behalf.
 *
 * The role will be used to retrieve container images from ECR and create CloudWatch log groups.
 *
 * @default - An execution role will be automatically created if you use ECR images in your task definition.
 */
const configureExecutionRole = ({
  stack,
  baseName,
}: {
  stack: cdk.Stack;
  baseName: string;
}): iam.Role => {
  const role = new iam.Role(stack, baseName + "ExecutionRole", {
    roleName: baseName + "ExecutionRole",
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
  });

  role.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
      ],
    })
  );
  role.addToPolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
    })
  );

  return role;
};

export { configureExecutionRole, createTaskRole };
