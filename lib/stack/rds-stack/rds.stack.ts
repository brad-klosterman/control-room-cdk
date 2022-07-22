import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import { CfnDBCluster, CfnDBSubnetGroup, DatabaseClusterEngine, DatabaseCluster, Credentials,AuroraPostgresEngineVersion, AuroraMysqlEngineVersion,
    ParameterGroup, } from '@aws-cdk/aws-rds';

interface AuroraSetting {

}


export const createAuroraStack = ({
    scope,
    props,
    vpc,
    cluster,
    stack_name,
    settings,
}: {
    scope: cdk.App;
    props: cdk.StackProps;
    vpc: ec2.IVpc;
    cluster: ecs.Cluster;
    stack_name: string;
    settings: AuroraSetting;
}) => {
    const stack = new cdk.Stack(scope, stack_name + 'STACK', props);

    const aurora_cluster = new DatabaseCluster(stack, `${stack_name}_AURORA_CLUSTER`, {
        clusterIdentifier: `${this.namePrefix}-${this.param.dbClusterIdentifier}`,
        defaultDatabaseName: this.param.databaseName,
        instanceIdentifierBase: `${this.namePrefix}-${this.param.dbClusterIdentifier}-`,
        deletionProtection : this.param.deletionProtection,
        engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_5_7_12}),
        instances: this.param.maxCapacity,
        storageEncrypted: this.param.storageEncrypted,
        cloudwatchLogsExports: this.param.cloudwatchLogsExports,
        monitoringInterval: Duration.seconds(this.param.monitoringInterval),
        removalPolicy: RemovalPolicy.DESTROY,
        preferredMaintenanceWindow: this.param.preferredMaintenanceWindow,
        backup: {
            preferredWindow: this.param.preferredBackupWindow,
            retention: Duration.days(this.param.backupRetentionPeriod)
        },
        credentials: {
            username: this.credentials.masterUsername,
            password: this.credentials.masterUserPassword
        },
        instanceProps: {
            vpc,
            allowMajorVersionUpgrade: true,
            autoMinorVersionUpgrade: true,
            deleteAutomatedBackups: true,
            // Other Classes: MEMORY3, MEMORY4, MEMORY5, etc. Other Sizes: LARGE, XLRAGE, XLARGE2, etc
            instanceType:   InstanceType.of(InstanceClass.BURSTABLE3,  InstanceSize.MEDIUM),
            // Performance Insights is not supported for the instance class and size (t3.medium), so disable
            enablePerformanceInsights: false,
            securityGroups: [vpcSecurityGroup],
            vpcSubnets: vpc.selectSubnets({subnetType: SubnetType.ISOLATED}),
            // Use default or already created parameter group of specified "dbClusterParameterGroupName"
            parameterGroup: ParameterGroup.fromParameterGroupName(this, "AuroraMySQLInstanceParameterGroup", this.param.dbInstanceParameterGroupName)
        },
        s3ImportBuckets: [bucketList[0]],
        s3ExportBuckets: [bucketList[1]],
        parameterGroup: ParameterGroup.fromParameterGroupName(this, "AuroraMySQLClusterParameterGroup", this.param.dbClusterParameterGroupName)
    });




};

export default createAuroraStack;
