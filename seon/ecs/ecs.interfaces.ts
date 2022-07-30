import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as ecr from 'aws-cdk-lib/aws-ecr';

import { TaskDefContainer } from '../seon.app.interfaces';

export interface SourcedContainer extends TaskDefContainer {
    ecr: ecr.IRepository;
}

export interface PipelineActions {
    build: codepipeline.IAction[];
    deploy: codepipeline.IAction[];
    source: codepipeline.IAction[];
}
