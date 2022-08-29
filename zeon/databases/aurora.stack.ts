/*  eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import { App, CfnOutput, Duration, Fn, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface AuroraProps extends StackProps {
    /**
     *
     * prove aurora cluster username
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly auroraClusterUsername?: string;

    /**
     *
     * Backup retention days like 14
     *
     * @type {number}
     * @memberof AuroraProps
     */
    readonly backupRetentionDays?: number;

    /**
     *
     *  backup window time for example  22:00-23:00
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly backupWindow?: string;

    /**
     * The name of the database
     *
     *
     * @type {string}
     * @memberof AuroraProps
     *
     */
    readonly dbName?: string;

    /**
     *
     * provide description
     *
     * @type {string}
     * @memberof AuroraProps
     *
     */
    readonly description?: string;

    readonly enableBabelfish?: boolean;

    /**
     * the engine type for example mysql or postresql
     *
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly engine?: string;

    /**
     * list of ingress sources
     *
     *
     * @type {any[]}
     * @memberof AuroraProps
     */
    readonly ingressSources?: any[];

    /**
     * the type of instance for example ec2 graviton for example ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.LARGE)
     *
     * @type {*}
     * @memberof AuroraProps
     *
     */
    readonly instanceType?: any;

    /**
     *
     * maintenance time Sun:23:45-Mon:00:15
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly preferredMaintenanceWindow?: string;
    /**
     * any replica instances
     *
     *
     * @type {number}
     * @memberof AuroraProps
     */
    readonly replicaInstances?: number;

    /**
     *
     * this list of subnet ids
     *
     * @type {string []}
     * @memberof AuroraProps
     *
     */
    readonly subnetIds?: string[];

    /**
     * the id of the VPC
     *
     * @type {string}
     * @memberof AuroraProps
     */
    readonly vpcId: string;
}

export class Aurora extends Stack {
    //export class Aurora extends Construct {
    constructor(scope: Construct, id: string, props: AuroraProps) {
        //constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        const subnetIds = props.subnetIds;
        let instanceType = props.instanceType;
        let replicaInstances = props.replicaInstances ?? 1;
        let backupRetentionDays = props.backupRetentionDays ?? 14;

        let ingressSources = [];

        if (typeof props.ingressSources !== 'undefined') {
            ingressSources = props.ingressSources;
        }

        const dbs = ['mysql', 'postgresql'];

        if (!dbs.includes(props.engine!)) {
            throw new Error('Unknown Engine Please Use mysql or postgresql');

            process.exit(1);
        }

        if (backupRetentionDays < 14) {
            backupRetentionDays = 14;
        }

        if (replicaInstances < 1) {
            replicaInstances = 1;
        }

        const azs = Fn.getAzs();

        // vpc
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVPC', {
            availabilityZones: azs,
            vpcId: props.vpcId,
        });

        // Subnets
        const subnets: any[] = [];

        for (const subnetId of subnetIds!) {
            const subid = subnetId.replace('-', '').replace('_', '').replace(' ', '');

            subnets.push(
                ec2.Subnet.fromSubnetAttributes(this, subid, {
                    subnetId: subid,
                }),
            );
        }

        // interface
        const vpcSubnets: ec2.SubnetSelection = {
            subnets: subnets,
        };

        // all the ports
        const allAll = ec2.Port.allTraffic();
        const tcp3306 = ec2.Port.tcpRange(3306, 3306);
        const tcp5432 = ec2.Port.tcpRange(5432, 5432);
        const tcp1433 = ec2.Port.tcpRange(1433, 1433);

        let connectionPort: any;
        let connectionName: string;

        // Database Security Group
        const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            allowAllOutbound: true,
            description: id + 'Database',
            securityGroupName: id + 'Database',
            vpc: vpc,
        });

        dbsg.addIngressRule(dbsg, allAll, 'all from self');
        dbsg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), allAll, 'all out');

        if (props.engine == 'mysql') {
            connectionPort = tcp3306;
            connectionName = 'tcp3306 MySQL';
        } else {
            connectionPort = tcp5432;
            connectionName = 'tcp5432 PostgresSQL';
        }

        for (const ingress_source of ingressSources!) {
            dbsg.addIngressRule(ingress_source, connectionPort, connectionName);

            if (props.engine == 'postgresql') {
                dbsg.addIngressRule(ingress_source, tcp1433, 'tcp1433');
            }
        }

        // Declaring postgres engine
        let auroraEngine = rds.DatabaseClusterEngine.auroraPostgres({
            version: rds.AuroraPostgresEngineVersion.VER_13_4,
        });

        if (props.engine == 'mysql') {
            auroraEngine = rds.DatabaseClusterEngine.auroraMysql({
                version: rds.AuroraMysqlEngineVersion.VER_2_10_1,
            });
        }

        const auroraParameters: any = {};

        // If PostgreSQL, enable Babelfish
        if (props.enableBabelfish && props.engine == 'postgresql') {
            auroraParameters['rds.babelfish_status'] = 'on';
        }

        // aurora params
        const auroraParameterGroup = new rds.ParameterGroup(this, 'AuroraParameterGroup', {
            description: id + ' Parameter Group',
            engine: auroraEngine,
            parameters: auroraParameters,
        });

        const auroraClusterSecret = new secretsmanager.Secret(this, 'AuroraClusterCredentials', {
            description: props.dbName + 'AuroraClusterCrendetials',
            generateSecretString: {
                excludeCharacters: '"@/\\ \'',
                generateStringKey: 'password',
                passwordLength: 30,
                secretStringTemplate: `{"username":${props.auroraClusterUsername}}`,
            },
            secretName: props.dbName + 'AuroraClusterCredentials',
        });

        // aurora credentials
        const auroraClusterCrendentials = rds.Credentials.fromSecret(
            auroraClusterSecret,
            props.auroraClusterUsername,
        );

        if (instanceType == null || instanceType == undefined) {
            instanceType = ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE4_GRAVITON,
                ec2.InstanceSize.MEDIUM,
            );
        }

        // Aurora DB Key
        const kmsKey = new kms.Key(this, 'AuroraDatabaseKey', {
            alias: props.dbName,
            enableKeyRotation: true,
        });

        let cloudwatchLogsExports: any = ['postgresql'];

        if (props.engine == 'mysql') {
            cloudwatchLogsExports = ['slowquery'];
        }

        const aurora_cluster = new rds.DatabaseCluster(this, 'AuroraDatabase', {
            backup: {
                preferredWindow: props.backupWindow,
                retention: Duration.days(backupRetentionDays),
            },
            cloudwatchLogsExports: cloudwatchLogsExports,
            cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
            copyTagsToSnapshot: true,
            credentials: auroraClusterCrendentials,
            deletionProtection: true,
            engine: auroraEngine,
            iamAuthentication: true,
            instanceIdentifierBase: props.dbName,
            instanceProps: {
                instanceType: props.instanceType,
                securityGroups: [dbsg],
                vpc: vpc,
                vpcSubnets: vpcSubnets,
            },
            instances: replicaInstances,
            parameterGroup: auroraParameterGroup,
            preferredMaintenanceWindow: props.preferredMaintenanceWindow,
            removalPolicy: RemovalPolicy.SNAPSHOT,
            storageEncrypted: true,
            storageEncryptionKey: kmsKey,
        });

        aurora_cluster.applyRemovalPolicy(RemovalPolicy.RETAIN);

        Tags.of(aurora_cluster).add('Name', props.dbName!, {
            priority: 300,
        });

        aurora_cluster.addRotationSingleUser({
            automaticallyAfter: Duration.days(30),
            excludeCharacters: '"@/\\ \'',
            vpcSubnets: vpcSubnets,
        });

        /*
         * CloudWatch Dashboard
         */

        const dashboard = new cloudwatch.Dashboard(this, 'AuroraMonitoringDashboard', {
            dashboardName: props.dbName,
        });

        const dbConnections = aurora_cluster.metricDatabaseConnections();
        const cpuUtilization = aurora_cluster.metricCPUUtilization();
        const deadlocks = aurora_cluster.metricDeadlocks();
        let freeLocalStorage = aurora_cluster.metricFreeLocalStorage();
        let freeableMemory = aurora_cluster.metricFreeableMemory();
        let networkRecieveThroughput = aurora_cluster.metricNetworkReceiveThroughput();
        let networkThroughput = aurora_cluster.metricNetworkThroughput();
        let networkTransmitThroughput = aurora_cluster.metricNetworkTransmitThroughput();
        let snapshotStorageUsed = aurora_cluster.metricSnapshotStorageUsed();
        let totalBackupStorageBilled = aurora_cluster.metricTotalBackupStorageBilled();
        let volumeBytesUsed = aurora_cluster.metricVolumeBytesUsed();
        let volumeReadIoPs = aurora_cluster.metricVolumeReadIOPs();
        let volumeWriteIoPs = aurora_cluster.metricVolumeWriteIOPs();

        //  The average amount of time taken per disk I/O operation (average over 1 minute)
        const readLatency = aurora_cluster.metric('ReadLatency', {
            period: Duration.seconds(60),
            statistic: 'Average',
        });

        const widgetDbConnections = new cloudwatch.GraphWidget({
            // Metrics to display on left Y axis.
            left: [dbConnections],

            title: 'DB Connections',
        });

        const widgetCpuUtilizaton = new cloudwatch.GraphWidget({
            // Metrics to display on left Y axis
            left: [cpuUtilization],

            title: 'CPU Utilization',
        });

        const widgetReadLatency = new cloudwatch.GraphWidget({
            //  Metrics to display on left Y axis.
            left: [readLatency],

            title: 'Read Latency',
        });

        freeLocalStorage = aurora_cluster.metricFreeLocalStorage();
        freeableMemory = aurora_cluster.metricFreeableMemory();
        networkRecieveThroughput = aurora_cluster.metricNetworkReceiveThroughput();
        networkThroughput = aurora_cluster.metricNetworkThroughput();
        networkTransmitThroughput = aurora_cluster.metricNetworkTransmitThroughput();
        snapshotStorageUsed = aurora_cluster.metricSnapshotStorageUsed();
        totalBackupStorageBilled = aurora_cluster.metricTotalBackupStorageBilled();
        volumeBytesUsed = aurora_cluster.metricVolumeBytesUsed();
        volumeReadIoPs = aurora_cluster.metricVolumeReadIOPs();
        volumeWriteIoPs = aurora_cluster.metricVolumeWriteIOPs();

        const widgetDeadlocks = new cloudwatch.GraphWidget({
            left: [deadlocks],
            title: 'Deadlocks',
        });

        const widgetFreeLocalStorage = new cloudwatch.GraphWidget({
            left: [freeLocalStorage],
            title: 'Free Local Storage',
        });

        const widgetFreeableMemory = new cloudwatch.GraphWidget({
            left: [freeableMemory],
            title: 'Freeable Memory',
        });

        const widget_network_receive_throughput = new cloudwatch.GraphWidget({
            left: [networkRecieveThroughput, networkThroughput, networkTransmitThroughput],
            title: 'Network Throuput',
        });

        const widgetTotalBackupStorageBilled = new cloudwatch.GraphWidget({
            left: [totalBackupStorageBilled],
            title: 'Backup Storage Billed',
        });

        const widgetVolumeBytes = new cloudwatch.GraphWidget({
            left: [volumeBytesUsed, snapshotStorageUsed],
            title: 'Storage',
        });

        const widgetVolumeIops = new cloudwatch.GraphWidget({
            left: [volumeReadIoPs, volumeWriteIoPs],
            title: 'Volume IOPs',
        });

        dashboard.addWidgets(widgetDbConnections, widgetCpuUtilizaton);

        dashboard.addWidgets(widgetTotalBackupStorageBilled, widgetFreeLocalStorage);

        dashboard.addWidgets(widgetFreeableMemory, widgetVolumeBytes, widgetVolumeIops);

        dashboard.addWidgets(widget_network_receive_throughput, widgetReadLatency, widgetDeadlocks);

        new CfnOutput(this, 'OutputSecretName', {
            exportName: aurora_cluster.stack.stackName + ':SecretName',
            value: aurora_cluster.secret?.secretArn!,
        });

        new CfnOutput(this, 'OutputSecretArn', {
            exportName: aurora_cluster.stack.stackName + ':SecretArn',
            value: aurora_cluster.secret?.secretArn!,
        });

        new CfnOutput(this, 'OutputGetSecretValue', {
            exportName: aurora_cluster.stack.stackName + ':GetSecretValue',
            value:
                'aws secretsmanager get-secret-value --secret-id ' +
                aurora_cluster.secret?.secretArn,
        });

        new CfnOutput(this, 'OutputInstanceIdentifiers', {
            exportName: aurora_cluster.stack.stackName + 'InstanceIdentifiers',
            value: aurora_cluster.instanceIdentifiers.toString(),
        });

        const instance_endpoints: any = [];

        for (const ie of aurora_cluster.instanceEndpoints) {
            instance_endpoints.push(ie.hostname);
        }

        new CfnOutput(this, 'OutputEndpoints', {
            exportName: aurora_cluster.stack.stackName + ':Endpoints',
            value: instance_endpoints.toString(),
        });

        new CfnOutput(this, 'OutputClusterEndpoint', {
            exportName: aurora_cluster.stack.stackName + ':Endpoint',
            value: aurora_cluster.clusterEndpoint.socketAddress,
        });

        // Outputs Cluster Engine
        new CfnOutput(this, 'OutputEngineFamily', {
            exportName: aurora_cluster.stack.stackName + ':EngineFamily',
            value: aurora_cluster.engine?.engineFamily!,
        });

        new CfnOutput(this, 'OutputEngineType', {
            exportName: aurora_cluster.stack.stackName + ':EngineType',
            value: aurora_cluster.engine?.engineType!,
        });

        new CfnOutput(this, 'OutputEngineFullVersion', {
            exportName: aurora_cluster.stack.stackName + ':EngineFullVersion',
            value: aurora_cluster.engine?.engineVersion?.fullVersion!,
        });

        new CfnOutput(this, 'OutputEngineMajorVersion', {
            exportName: aurora_cluster.stack.stackName + ':EngineMajorVersion',
            value: aurora_cluster.engine?.engineVersion?.majorVersion!,
        });

        new CfnOutput(this, 'OutputParameterGroupFamily', {
            exportName: aurora_cluster.stack.stackName + ':ParameterGroupFamily',
            value: aurora_cluster.engine?.parameterGroupFamily!,
        });
    }
}
