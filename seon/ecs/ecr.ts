import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export const sourceECR = ({ ecr_name, stack }: { ecr_name: string; stack: cdk.Stack }) => {
    let ecr_repo: ecr.IRepository;

    // const ecr_repo = new ecr.Repository(stack, ecr_name, {
    //     repositoryName: ecr_name,
    // });

    const existing_repo: ecr.IRepository = ecr.Repository.fromRepositoryName(
        stack,
        ecr_name,
        ecr_name,
    );

    if (existing_repo) {
        ecr_repo = existing_repo;
    } else {
        ecr_repo = new ecr.Repository(stack, ecr_name, {
            repositoryName: ecr_name,
        });
    }

    return ecr_repo;
};
