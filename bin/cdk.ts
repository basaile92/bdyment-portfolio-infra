#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import {SiteBucketS3Stack} from "../lib/site-bucket-s3-stack";
import {CloudFrontStack} from "../lib/cloudfront-stack";

const app = new cdk.App();

const domainName: string = "bdyment.com";

const siteBucketS3Stack = new SiteBucketS3Stack(app, "BdymentPortfolioSiteBucketStack",{
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }
});
const apiStack = new ApiStack(app, "BdymentPortfolioApiStack", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    }
});
const cloudFrontStack = new CloudFrontStack(app, "CloudFrontStack", domainName,{
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
    bucketAssets: siteBucketS3Stack.bucketAssets,
    api: apiStack.api,
    cloudfrontOriginAccessIdentity: siteBucketS3Stack.cloudfrontOriginAccessIdentity,
});
app.synth();
