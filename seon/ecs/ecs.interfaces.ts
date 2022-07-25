import { TaskDefContainer } from '../seon.app.interfaces';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as ecr from "aws-cdk-lib/aws-ecr";

export interface SourcedContainer extends TaskDefContainer {
    ecr: ecr.IRepository;
}

export interface PipelineActions {
    source: codepipeline.IAction[];
    build: codepipeline.IAction[];
    deploy: codepipeline.IAction[];
}