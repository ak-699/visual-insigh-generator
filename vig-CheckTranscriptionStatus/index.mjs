import { TranscribeClient, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";

const transcribeClient = new TranscribeClient();

const checkTranscriptionStatus = async (segmentsJson) => {
  segmentsJson['AllJobsStatus'] = 'IN_PROGRESS';
  const Segments = segmentsJson.Items;
  let batchIndex = 0;

  for (let Segment of Segments) {

    if (Segment.AudioOrVideoExists == "NO") {
      batchIndex++;
      continue;
    }

    let jobName = Segment['TranscriptionJobName'];
    let jobStatus = Segment['TranscriptionJobStatus'];

    if (jobStatus == 'IN_PROGRESS' || jobStatus == 'QUEUED') {

      const gtjcInput = {
        TranscriptionJobName: Segment["TranscriptionJobName"],
      };
      const { TranscriptionJob } = await transcribeClient.send(new GetTranscriptionJobCommand(gtjcInput));
      if (TranscriptionJob.TranscriptionJobStatus == 'IN_PROGRESS' || TranscriptionJob.TranscriptionJobStatus == 'QUEUED') {
        segmentsJson['AllJobsStatus'] = 'IN_PROGRESS'
        console.log(TranscriptionJob.TranscriptionJobStatus,jobName)
        return segmentsJson;
      } 
      else {
        segmentsJson.Items[batchIndex].TranscriptionJobStatus = 'COMPLETED'
        console.log(TranscriptionJob.TranscriptionJobStatus,jobName)
      }
    }
    batchIndex++;
  }
  console.log("All Transcription Jobs Completed")
  segmentsJson['AllJobsStatus'] = 'COMPLETED';
  return segmentsJson;
};



export const handler = async (event) => {
  // TODO implement
  const segmentsJson = await checkTranscriptionStatus(event);
  return segmentsJson;
};
