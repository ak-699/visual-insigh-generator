import { RekognitionClient, GetSegmentDetectionCommand } from "@aws-sdk/client-rekognition";
import { downloadFile, uploadFile } from "./s3Utils.mjs"
import { unlinkSync } from 'node:fs';
import { LambdaClient, InvokeAsyncCommand } from "@aws-sdk/client-lambda";

import ffmpeg from "fluent-ffmpeg";
import pathToFfmpeg from "ffmpeg-static";
import ffprobePath from "@ffprobe-installer/ffprobe";
ffmpeg.setFfmpegPath(pathToFfmpeg);
ffmpeg.setFfprobePath(ffprobePath.path)

const VIDEO_PROCESSING_STAGING_PREFIX = "video-processing-staging";
const VIDEO_SUMMARY_FILES_PREFIX = "video-summary-files";


function hasVideoAndAudio(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      // Check if streams exist and contain both video and audio
      const streams = metadata.streams;
      const hasVideo = streams.some(stream => stream.codec_type === 'video');
      const hasAudio = streams.some(stream => stream.codec_type === 'audio');

      resolve(hasVideo && hasAudio);
    });
  });
}

// createSegment function
const createSegmentFiles = async (segmentsJson) => {
  const videoBucket = segmentsJson["Video"]["S3Object"]["Bucket"];
  const videoKey = segmentsJson["Video"]["S3Object"]["Name"];
  const videoFile = videoKey.split("/")[1];
  const videoName = videoFile.split(".")[0];

  console.log(`Starting segmentation process for ${videoBucket}/${videoKey}`);

  let tmpVideoPath = `/tmp/${videoFile}`;

  // download video from s3 bucket and store in /tmp/videoFile
  await downloadFile(videoBucket, videoKey, tmpVideoPath);
  console.log("Downloaded video", videoFile)

  const Segments = segmentsJson["Segments"];
  // console.log("segments: ", Segments)

  for (let Segment of Segments) {
    let index = Segment["ShotSegment"]["Index"];
    let clipName = `${index}.mp4`;
    let thumbnailName = `${index}.jpg`;
    let startTime = Segment.StartTimecodeSMPTE.slice(0, -3);
    let duration = Segment.DurationSMPTE.slice(0, -3);
    console.log(startTime, duration)
    segmentsJson['Segments'][index]['AudioOrVideoExists'] = 'NO';

    if (duration == '00:00:00') continue;
    // Use ffmpeg to split the video into a clip
    await new Promise((resolve, reject) => {
      ffmpeg(tmpVideoPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(`/tmp/${clipName}`)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    // console.log("generated clip: ", clipName)
    // upload clip to bucket 

    await uploadFile(videoBucket, `${VIDEO_PROCESSING_STAGING_PREFIX}/${videoName}/${clipName}`, `/tmp/${clipName}`);
    // console.log("uploaded clip: ", clipName);
    // Check if the generated clip has video and audio streams

    if (hasVideoAndAudio(`/tmp/${clipName}`)) {
      console.log("clip has video and audio: ", clipName)
      await new Promise((resolve, reject) => {
        ffmpeg(`/tmp/${clipName}`)
          .outputOptions('-vf', 'thumbnail')
          .outputOptions('-frames:v', '1')
          .output(`/tmp/${thumbnailName}`)
          .on('end', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });

      segmentsJson['Segments'][index]['AudioOrVideoExists'] = 'YES';
      await uploadFile(videoBucket, `${VIDEO_SUMMARY_FILES_PREFIX}/${videoName}/${thumbnailName}`, `/tmp/${thumbnailName}`);
      console.log("uploaded thumbnail", thumbnailName);
      // remove thumbnail from tmp storage
      unlinkSync(`/tmp/${thumbnailName}`);

    }


    // remove clip form tmp storage
    // console.log("removig clip: ", clipName);
    unlinkSync(`/tmp/${clipName}`);
  }
  unlinkSync(tmpVideoPath);
  return segmentsJson;
};


const rekogClient = new RekognitionClient();
const lambdaClient = new LambdaClient();

export const handler = async (event) => {
  const JobId = JSON.parse(event["Records"][0]["Sns"]["Message"]).JobId;
  const gsdcInput = {
    JobId,
  };
  let segmentsJson = await rekogClient.send(new GetSegmentDetectionCommand(gsdcInput));
  segmentsJson = await createSegmentFiles(segmentsJson);
  await lambdaClient.send(new InvokeAsyncCommand({
    FunctionName: "vig-GenerateVideoClipsTranscript",
    InvokeArgs: JSON.stringify(segmentsJson)
  }))
  return "Segments processed successfully";
};
