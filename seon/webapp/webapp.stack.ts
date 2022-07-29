import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { putParameter } from '../constructs/ssm.parameters';
import { LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';



export const createWebAppStack = ({
    scope,
    app_props,
    name,
                                      repo,
    branch
}: {
    scope: cdk.App;
    app_props: cdk.StackProps
    name: string;
    repo: string;
    branch: string;
}) => {
    const stack = new cdk.Stack(scope, name, app_props);

    
};

export default createWebAppStack;
