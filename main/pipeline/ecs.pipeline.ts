import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { IRepository } from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class ECSPipeline extends Construct {
    /**
     * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codepipeline-readme.html
     * * SEON: https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=eu-central-1
     */
    pipeline: Pipeline;

    constructor(
        service: ecs.FargateService,
        id: string,
        props: {
            container: { name: string };
            ecr: IRepository;
            github: { branch: string; repo: string };
            pipeline_name: string;
        },
    ) {
        super(service, id);

        this.pipeline = new Pipeline(this, props.pipeline_name + '--pipeline', {
            crossAccountKeys: true,
            pipelineName: props.pipeline_name,
        });

        const source_output = new codepipeline.Artifact();

        const source_action = new actions.GitHubSourceAction({
            actionName: props.container.name + 'SOURCE',
            branch: props.github.branch,
            oauthToken: cdk.SecretValue.secretsManager('seon-github-token'),
            output: source_output,
            owner: 'SEON-GmbH',
            repo: props.github.repo,
        });

        const build_output = new codepipeline.Artifact();

        const build_action = new actions.CodeBuildAction({
            actionName: props.container.name + 'BUILD',
            input: source_output,
            outputs: [build_output],
            project: this.configureBuild({
                ecr: props.ecr,
                name: props.container.name,
            }),
        });

        const deploy_action = new actions.EcsDeployAction({
            actionName: props.container.name + 'DEPLOY',
            deploymentTimeout: cdk.Duration.minutes(20),
            imageFile: new codepipeline.ArtifactPath(build_output, `imagedefinitions.json`),
            service,
        });

        const approval_action = new actions.ManualApprovalAction({
            actionName: 'APPROVE',
        });

        this.pipeline.addStage({
            actions: [source_action],
            stageName: 'Source',
        });

        this.pipeline.addStage({
            actions: [build_action],
            stageName: 'Build',
        });

        this.pipeline.addStage({
            actions: [approval_action],
            stageName: 'Approve',
        });

        this.pipeline.addStage({
            actions: [deploy_action],
            stageName: 'Deploy',
        });
    }

    private configureBuild({ ecr, name }: { ecr: IRepository; name: string }) {
        const project = new codebuild.Project(this, name + '-DOCKER-BUILD', {
            buildSpec: codebuild.BuildSpec.fromObject({
                artifacts: {
                    files: ['imagedefinitions.json'],
                },
                phases: {
                    build: {
                        commands: [
                            'echo "In Build Phase"',
                            'cd $APP_PATH',
                            'ls -l',
                            `docker build -t $ECR_REPO_URI:$TAG .`,
                            '$(aws ecr get-login --no-include-email)',
                            'docker push $ECR_REPO_URI:$TAG',
                        ],
                    },
                    install: {
                        commands: [
                            'echo Seon20212021! | docker login -u seongroup --password-stdin',
                        ],
                    },
                    post_build: {
                        commands: [
                            'echo "In Post-Build Phase"',
                            'pwd',
                            'cd $BACK_PATH',
                            'printf \'[{"name":"%s","imageUri":"%s"}]\' $CONTAINER_NAME $ECR_REPO_URI:$TAG > imagedefinitions.json',
                            'pwd; ls -al; cat imagedefinitions.json',
                        ],
                    },
                    pre_build: {
                        commands: ['echo "In Pre-Build Phase"', 'export TAG=latest', 'echo $TAG'],
                    },
                },
                version: '0.2',
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
                computeType: codebuild.ComputeType.LARGE,
                privileged: true,
            },
            environmentVariables: {
                APP_PATH: {
                    value: '.',
                },
                BACK_PATH: {
                    value: '.',
                },
                // CLUSTER_NAME: {
                //     value: `${cluster.clusterName}`,
                // },
                CONTAINER_NAME: {
                    value: name,
                },
                ECR_REPO_URI: {
                    value: ecr.repositoryUri,
                },
            },
            projectName: name + '-DOCKER-BUILD',
        });

        ecr.grantPullPush(project.role!);
        this.appendEcrReadPolicy('build-policy', project.role!);

        project.addToRolePolicy(
            new iam.PolicyStatement({
                actions: [
                    'ecs:DescribeCluster',
                    'ecr:GetAuthorizationToken',
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:BatchGetImage',
                    'ecr:GetDownloadUrlForLayer',
                ],
                resources: ['*'],
            }),
        );

        return project;
    }
    private appendEcrReadPolicy(baseName: string, role: iam.IRole) {
        const statement = new iam.PolicyStatement({
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
            ],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
        });

        const policy = new iam.Policy(this, baseName);
        policy.addStatements(statement);

        role.attachInlinePolicy(policy);
    }
}
