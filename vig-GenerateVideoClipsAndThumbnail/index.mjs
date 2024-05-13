import { downloadFile, uploadFile } from "./s3Utils.mjs"
import { unlinkSync } from 'node:fs';

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
      const streams = metadata.streams;
      const hasVideo = streams.some(stream => stream.codec_type === 'video');
      const hasAudio = streams.some(stream => stream.codec_type === 'audio');

      resolve(hasVideo && hasAudio);
    });
  });
}

// createSegment function
const createSegmentFiles = async (event) => {

  const videoBucket = event["BatchInput"]["Video"]["S3Object"]["Bucket"];
  const videoKey = event["BatchInput"]["Video"]["S3Object"]["Name"];
  const videoFile = videoKey.split("/")[1];
  const videoName = videoFile.split(".")[0];

  console.log(`Starting segmentation process for ${videoBucket}/${videoKey}`);

  let tmpVideoPath = `/tmp/${videoFile}`;
  await downloadFile(videoBucket, videoKey, tmpVideoPath);
  console.log("Downloaded video", videoFile)

  const Segments = event["Items"];

  let batchIndex = 0;
  for (let Segment of Segments) {
    let index = Segment["ShotSegment"]["Index"];
    let clipName = `${index}.mp4`;
    let thumbnailName = `${index}.jpg`;
    let startTime = Segment.StartTimecodeSMPTE.slice(0, -3);
    let duration = Segment.DurationSMPTE.slice(0, -3);
    console.log("Generating video clip and thumbnail for segment: ", index)
    event['Items'][batchIndex]['AudioOrVideoExists'] = 'NO';

    if (duration == '00:00:00') {
      batchIndex++;
      continue;
    }
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
    // upload clip to bucket 
    await uploadFile(videoBucket, `${VIDEO_PROCESSING_STAGING_PREFIX}/${videoName}/${clipName}`, `/tmp/${clipName}`);
    if (hasVideoAndAudio(`/tmp/${clipName}`)) {
      console.log("Clip has video and audio: ", clipName)
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

      event['Items'][batchIndex]['AudioOrVideoExists'] = 'YES';
      await uploadFile(videoBucket, `${VIDEO_SUMMARY_FILES_PREFIX}/${videoName}/${thumbnailName}`, `/tmp/${thumbnailName}`);
      console.log("Generated clip and thumbnail: ", clipName, thumbnailName);
      unlinkSync(`/tmp/${thumbnailName}`);
      batchIndex++;
    }
  }
  unlinkSync(tmpVideoPath);
  return event;
};


export const handler = async (event) => {
  const segmentsJson = await createSegmentFiles(event);
  return segmentsJson;
};
