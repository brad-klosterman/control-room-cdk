import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export const sourceECR = ({ stack, ecr_name }: { stack: cdk.Stack; ecr_name: string }) => {
    let ecr_repo: ecr.IRepository;

    const existing_repo: ecr.IRepository = ecr.Repository.fromRepositoryName(
        stack,
        ecr_name,
        ecr_name
    );

    // ecr_repo = new ecr.Repository(stack, ecr_name, {
    //   repositoryName: ecr_name,
    // });

    if (existing_repo) {
        ecr_repo = existing_repo;
    } else {
        ecr_repo = new ecr.Repository(stack, ecr_name, {
            repositoryName: ecr_name,
        });
    }

    return ecr_repo;
};
