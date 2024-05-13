import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs"
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { claudeInput } from "./claudeInput.mjs"
import { titanInput } from "./titanInput.mjs"
import { downloadFile, uploadFile } from "./s3Utils.mjs"

const bedrockClient = new BedrockRuntimeClient();

const VIDEO_PROCESSING_STAGING_PREFIX = "video-processing-staging";
const VIDEO_SUMMARY_FILES_PREFIX = "video-summary-files";

const generateSummaryFiles = async (segmentsJson) => {
  const videoBucket = segmentsJson.BatchInput.Video.S3Object.Bucket;
  const videoFileKey = segmentsJson.BatchInput.Video.S3Object.Name;
  const videoFile = videoFileKey.split("/")[1];
  const videoName = videoFile.split(".")[0];

  const Segments = segmentsJson["Items"];
  let batchIndex = 0;
  for (let Segment of Segments) {
    if (Segment['AudioOrVideoExists'] == "NO") {
      batchIndex++;
      continue;
    }
    let index = Segment["ShotSegment"]["Index"];
    let transcriptJson = `${index}.json`;
    let summaryFile = `${index}.txt`
    // download json file 
    await downloadFile(videoBucket, `${VIDEO_PROCESSING_STAGING_PREFIX}/${videoName}/${transcriptJson}`, `/tmp/${transcriptJson}`);
    console.log("Downloaded file: ", transcriptJson)
    // extract transcript 
    const obj = readFileSync(`/tmp/${transcriptJson}`).toString();
    const text = JSON.parse(obj).results.transcripts[0].transcript;
    console.log(text)
    // send to bedrock 
    const summarizePrompt = `Generate concise key points from following text,
    dont send them as response,
    from those key points generate a small paragraph,
    give paragraph after @SUMMARY_REPORT:. if no text provided,dont return anything after @SUMMAR_REPORT. 
    TRANSCRIPT: ${text}`
    const { body } = await bedrockClient.send(new InvokeModelCommand(claudeInput(summarizePrompt)));
    const str = new TextDecoder().decode(body)
    const data = JSON.parse(str).completion;
    // console.log(data)
    let regex = /@SUMMARY_REPORT:\s*(.*)/;
    let match = regex.exec(data);
    let summarizedData = "";
    if (match) {
      summarizedData = match[1];
    }
    else {
      summarizedData = data;
    }
    console.log(summarizedData)
    // make it a file 
    const summaryFilepath = `/tmp/${summaryFile}`
    writeFileSync(summaryFilepath, summarizedData)

    // upload on s3
    await uploadFile(videoBucket, `${VIDEO_SUMMARY_FILES_PREFIX}/${videoName}/${summaryFile}`, summaryFilepath)
    console.log("Uploaded summarized file ", summaryFile)
    unlinkSync(`/tmp/${transcriptJson}`)
    unlinkSync(summaryFilepath);
    batchIndex++;
  }

  return segmentsJson;
}


export const handler = async (event) => {
  // TODO implement

  const segmentsJson = await generateSummaryFiles(event);
  return segmentsJson;
};





// await downloadFile("vig-cc-bucket", `${VIDEO_PROCESSING_STAGING_PREFIX}/1/0.json`, "/tmp/0.json");
// const obj = readFileSync("/tmp/0.json").toString();
// const text = JSON.parse(obj).results.transcripts[0].transcript;
// const command = new InvokeModelCommand(titanInput(customPrompt));
// const { body } = await bedrockClient.send(command);
// const str = new TextDecoder().decode(body)
// const data = JSON.parse(str).results[0].outputText;
// console.log(data);
// const filepath = "/tmp/summary.txt"
// writeFileSync(filepath, data)
