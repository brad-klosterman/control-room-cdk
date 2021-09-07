#!/bin/sh

# Configuration File Path
APP_CONFIG=$1
export APP_CONFIG=$1

echo ==--------CheckDedendencies---------==
# npm install -g aws-cdk
aws --version
npm --version
cdk --version
jq --version

ACCOUNT=$(cat $APP_CONFIG | jq -r '.Project.Account') 
REGION=$(cat $APP_CONFIG | jq -r '.Project.Region') 
PROFILE_NAME=$(cat $APP_CONFIG | jq -r '.Project.Profile')

echo ==--------ConfigInfo---------==
echo $APP_CONFIG
echo $ACCOUNT
echo $REGION
echo $PROFILE_NAME
echo .
echo .

echo ==--------InstallCDKDependencies---------==
npm install
echo .
echo .

echo ==--------BootstrapCDKEnvironment---------==
if [ -z "$PROFILE_NAME" ]; then
    cdk bootstrap aws://$ACCOUNT/$REGION
else
    cdk bootstrap aws://$ACCOUNT/$REGION --profile $PROFILE_NAME
fi
echo .
echo .

