import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecr from "@aws-cdk/aws-ecr";

import { IContainerProperties } from "../interfaces";

const sourceContainerImages = (
  stack: cdk.Stack,
  containerProperties: IContainerProperties[]
) => {
  const sourcedContainers = containerProperties.map((container) => {
    let image: ecs.ContainerImage;
    let ecrRepo: ecr.IRepository;
    const repositoryName = (container.id + "-ecr-repo").toLowerCase();

    const existingRepo: ecr.IRepository = ecr.Repository.fromRepositoryName(
      stack,
      repositoryName,
      repositoryName
    );

    ecrRepo = new ecr.Repository(stack, repositoryName, {
      repositoryName: repositoryName,
    });

    // if (existingRepo) {
    //   ecrRepo = existingRepo;
    //   // image = ecs.ContainerImage.fromEcrRepository(existingRepo);
    // } else {
    //   ecrRepo = new ecr.Repository(stack, repositoryName, {
    //     repositoryName: repositoryName,
    //   });
    //   // image = ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample");
    // }

    new cdk.CfnOutput(stack, container.id + "ECRName", {
      value: ecrRepo.repositoryName,
    });

    return {
      ...container,
      ecrRepo,
    };
  });

  return sourcedContainers;
};

export default sourceContainerImages;
