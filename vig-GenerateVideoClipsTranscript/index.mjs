import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { v4 as uuidv4 } from "uuid";

const VIDEO_PROCESSING_STAGING_PREFIX = "video-processing-staging";
const VIDEO_SUMMARY_FILES_PREFIX = "video-summary-files";


const transcribeClient = new TranscribeClient(); // Specify your AWS region

async function generateTranscripts(segmentsJson) {
    const videoBucket = segmentsJson.BatchInput.Video.S3Object.Bucket;
    const videoFileKey = segmentsJson.BatchInput.Video.S3Object.Name;
    const videoFile = videoFileKey.split("/")[1];
    const videoName = videoFile.split(".")[0];

    const Segments = segmentsJson.Items;
    let batchIndex = 0;

    for (let Segment of Segments) {
        if (Segment.AudioOrVideoExists == "NO") {
            batchIndex++;
            continue;
        }
        const jobName = `GenerateVideoClipTranscript-${videoName}-${uuidv4()}`;
        const index = Segment.ShotSegment.Index;
        const clipName = `${index}.mp4`;
        const transcriptName = `${index}.json`;
        const videoFileUri = `s3://${videoBucket}/${VIDEO_PROCESSING_STAGING_PREFIX}/${videoName}/${index}.mp4`;
        const transcriptFileKey = `${VIDEO_PROCESSING_STAGING_PREFIX}/${videoName}/${transcriptName}`;
        
        const response = await transcribeClient.send(new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName, // required
            Media: { // required
                MediaFileUri: videoFileUri
            },
            MediaFormat: "mp4",
            LanguageCode: "en-US",
            OutputBucketName: videoBucket,
            OutputKey: transcriptFileKey
        }));

        console.log(`Started transcription job for ${videoName}/${index}.mp4: ${jobName}`);

        segmentsJson.Items[batchIndex].TranscriptionJobName = response.TranscriptionJob.TranscriptionJobName;
        segmentsJson.Items[batchIndex].TranscriptionJobStatus = response.TranscriptionJob.TranscriptionJobStatus;
        batchIndex++
    }

    return segmentsJson;
}

export const handler = async (event) => {
    const segmentsJson = await generateTranscripts(event);
    return segmentsJson;
};
