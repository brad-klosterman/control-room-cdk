import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

/**
 * The name of the IAM role that grants containers in the task permission to call AWS APIs on your behalf.
 *
 * @default - A task role is automatically created for you.
 */
const createTaskRole = ({ baseName, stack }: { baseName: string; stack: cdk.Stack }): iam.Role => {
    const role = new iam.Role(stack, baseName + 'TaskRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        roleName: baseName + 'TaskRole',
    });

    role.addToPolicy(
        new iam.PolicyStatement({
            actions: ['dynamodb:Scan', 'dynamodb:PutItem'],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
        }),
    );

    role.addToPolicy(
        new iam.PolicyStatement({
            actions: [
                'sns:Subscribe',
                'sns:Publish',
                'sns:RemovePermission',
                'sns:SetTopicAttributes',
                'sns:DeleteTopic',
                'sns:ListSubscriptionsByTopic',
                'sns:GetTopicAttributes',
                'sns:AddPermission',
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
        }),
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
    baseName,
    stack,
}: {
    baseName: string;
    stack: cdk.Stack;
}): iam.Role => {
    const role = new iam.Role(stack, baseName + 'ExecutionRole', {
        assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        roleName: baseName + 'ExecutionRole',
    });

    role.addToPolicy(
        new iam.PolicyStatement({
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
        }),
    );

    role.addToPolicy(
        new iam.PolicyStatement({
            actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
        }),
    );

    return role;
};

export { configureExecutionRole, createTaskRole };
