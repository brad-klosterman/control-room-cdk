import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';

import { IPipelineActions, ISourcedContainer } from '../interfaces';
import configureBuild from './configureBuild';

/** Constructs The CI/CD Pipeline.
 * @param stack                 The CDK Stack
 * @param stackName             The Stack Name
 * @param cluster               The ECS Cluster
 * @param services              The ECS Services
 * @param sourcedContainers     ISourcedContainer[]
 */

const configurePipeline = ({
    cluster,
    services,
    sourcedContainers,
    stack,
    stackName,
}: {
    cluster: ecs.Cluster;
    services: ecs.IBaseService[];
    sourcedContainers: ISourcedContainer[];
    stack: cdk.Stack;
    stackName: string;
}) => {
    // Construct the build action source/build
    const { build, deploy, source } = sourcedContainers.reduce(
        (accumulator: IPipelineActions, container: ISourcedContainer) => {
            const sourceOutput = new codepipeline.Artifact();

            const sourceAction = new actions.GitHubSourceAction({
                actionName: `${container.id}_SourceMerge`,
                branch: container.branch,
                oauthToken: cdk.SecretValue.secretsManager('seon-github-token'),
                output: sourceOutput,
                owner: 'SEON-GmbH',
                repo: container.repo,
            });

            const buildOutput = new codepipeline.Artifact();

            const buildAction = new actions.CodeBuildAction({
                actionName: `${container.id}_CodeBuild`,
                input: sourceOutput,
                outputs: [buildOutput],
                project: configureBuild({
                    cluster,
                    container,
                    stack,
                }),
            });

            const deployAction = new actions.EcsDeployAction({
                actionName: `${container.id}_ContainerDeploy`,
                deploymentTimeout: cdk.Duration.minutes(20),
                imageFile: new codepipeline.ArtifactPath(buildOutput, `imagedefinitions.json`),
                service: services[0],
            });

            return {
                build: [...accumulator.build, buildAction],
                deploy: [...accumulator.deploy, deployAction],
                source: [...accumulator.source, sourceAction],
            };
        },
        {
            build: [],
            deploy: [],
            source: [],
        },
    );

    const approvalAction = new actions.ManualApprovalAction({
        actionName: 'Manual_Approve',
    });

    new codepipeline.Pipeline(stack, 'Pipeline', {
        crossAccountKeys: true,
        pipelineName: `${stackName}-Pipeline`,
        stages: [
            {
                actions: source,
                stageName: 'Source',
            },
            {
                actions: build,
                stageName: 'Build',
            },
            {
                actions: [approvalAction],
                stageName: 'Approve',
            },
            {
                actions: deploy,
                stageName: 'Deploy',
            },
        ],
    });
};

export default configurePipeline;
