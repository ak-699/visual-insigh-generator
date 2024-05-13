import { StartSegmentDetectionCommand } from "@aws-sdk/client-rekognition"
import { rekogClient } from "./rekogUtils.mjs"

export const handler = async (event) => {
  // TODO implement
  console.log(event)
  const SNSTopicArn = "arn:aws:sns:us-east-1:471112757420:AmazonRekognitionVideoSegmentDetectionVIGTopic";
  const RoleArn = "arn:aws:iam::471112757420:role/RekognitionVideoRole";

  const bucket = event["Records"][0]["s3"]["bucket"]["name"];
  const key = event["Records"][0]["s3"]["object"]["key"];
  console.log(bucket, key);
  const ssdcInput = {
    Video: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    SegmentTypes: ["SHOT"],
    NotificationChannel: {
      SNSTopicArn: SNSTopicArn,
      RoleArn: RoleArn,
    }
  }
  const response = await rekogClient.send(new StartSegmentDetectionCommand(ssdcInput));
  console.log("Starting Segment Detection ,JobId: ", response.JobId)
  return response;
  // return {};
};
