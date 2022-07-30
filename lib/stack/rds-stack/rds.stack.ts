import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import {
    CfnDBCluster,
    CfnDBSubnetGroup,
    DatabaseClusterEngine,
    DatabaseCluster,
    Credentials,
    AuroraPostgresEngineVersion,
    AuroraMysqlEngineVersion,
    ParameterGroup,
} from '@aws-cdk/aws-rds';
import * as cdk from '@aws-cdk/core';

interface AuroraSetting {}

export const createAuroraStack = ({
    cluster,
    props,
    scope,
    settings,
    stack_name,
    vpc,
}: {
    cluster: ecs.Cluster;
    props: cdk.StackProps;
    scope: cdk.App;
    vpc: ec2.IVpc;
    stack_name: string;
    settings: AuroraSetting;
}) => {
    const stack = new cdk.Stack(scope, stack_name + 'STACK', props);

    const aurora_cluster = new DatabaseCluster(stack, `${stack_name}_AURORA_CLUSTER`, {
        clusterIdentifier: `${this.namePrefix}-${this.param.dbClusterIdentifier}`,
        defaultDatabaseName: this.param.databaseName,
        deletionProtection: this.param.deletionProtection,
        engine: DatabaseClusterEngine.auroraMysql({ version: AuroraMysqlEngineVersion.VER_5_7_12 }),
        instanceIdentifierBase: `${this.namePrefix}-${this.param.dbClusterIdentifier}-`,
        cloudwatchLogsExports: this.param.cloudwatchLogsExports,
        instances: this.param.maxCapacity,
        monitoringInterval: Duration.seconds(this.param.monitoringInterval),
        storageEncrypted: this.param.storageEncrypted,
        preferredMaintenanceWindow: this.param.preferredMaintenanceWindow,
        backup: {
            preferredWindow: this.param.preferredBackupWindow,
            retention: Duration.days(this.param.backupRetentionPeriod),
        },
        removalPolicy: RemovalPolicy.DESTROY,
        credentials: {
            password: this.credentials.masterUserPassword,
            username: this.credentials.masterUsername,
        },
        instanceProps: {
            allowMajorVersionUpgrade: true,
            autoMinorVersionUpgrade: true,
            vpc,
            deleteAutomatedBackups: true,

            // Performance Insights is not supported for the instance class and size (t3.medium), so disable
            enablePerformanceInsights: false,

            // Other Classes: MEMORY3, MEMORY4, MEMORY5, etc. Other Sizes: LARGE, XLRAGE, XLARGE2, etc
            instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MEDIUM),
            // Use default or already created parameter group of specified "dbClusterParameterGroupName"
parameterGroup: ParameterGroup.fromParameterGroupName(this, "AuroraMySQLInstanceParameterGroup", this.param.dbInstanceParameterGroupName),
            
securityGroups: [vpcSecurityGroup],
            ),

            vpcSubnets: vpc.selectSubnets({ subnetType: SubnetType.ISOLATED }),
        },
        s3ExportBuckets: [bucketList[1]],
        parameterGroup: ParameterGroup.fromParameterGroupName(
            this,
            'AuroraMySQLClusterParameterGroup',
            this.param.dbClusterParameterGroupName,
        ),
        s3ImportBuckets: [bucketList[0]],
    });
};

export default createAuroraStack;
