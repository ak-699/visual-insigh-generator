# VISUAL INSIGHT GENERATOR
## Abstract
The Visual Insight Generator project aims to simplify the process of extracting valuable
insights from videos by providing users with a comprehensive summary report. By
leveraging AWS services such as S3, Lambda functions, Rekognition, Transcribe, and Step
Functions, the system automatically segments uploaded videos, generates thumbnails,
extracts transcriptions, and summarizes the content into a PDF report. The project
addresses the need for efficient content consumption in the era of online learning, where
time spent on note-taking and lack of access to visual aids can hinder the learning
experience.

## Services Used:
**1. Amazon S3:** For storing user-uploaded videos, generated thumbnails, transcripts, and
summary reports.

**2. AWS Lambda:** For serverless computing, triggering functions in response to events such
as video uploads and SNS messages.

**3. AWS Step Functions:** For orchestrating the workflow of processing videos, handling tasks
sequentially or in parallel.

**4. Amazon Transcribe:** For generating transcriptions of video content.

**5. Amazon SNS:** For publishing messages from Amazon Rekognition to trigger further
processing.

**6. Amazon Rekognition:** For video segment detection.

**7. Amazon Bedrock:** Used for summary generation.

**8. API Gateway:** Provides API to connect frontend with backend

## AWS Cloud Architecture 
![Alt "AWS Cloud Architecture"](https://github.com/ak-699/visual-insight-generator/blob/source/vig-cc-arch-2.png)

## Implementation Details:
**1. Video Upload and Event Triggering:**
a. Users upload videos to the designated S3 bucket.
b. Object creation events in the S3 bucket trigger a Lambda function, initiating the video
processing workflow.

**2. Segment Detection and Publishing to SNS:**
a. The Lambda function responsible for object creation calls the "Start Segment
Detection" Lambda function.
b. This function utilizes Amazon Rekognition's video segment detection API to identify
shot segments within the video.
c. The results are then published to an SNS topic.

**3. Starting Step Function Workflow:**
a. Another Lambda function, "Start Video Processing Workflow," is triggered by the SNS
message from Amazon Rekognition.
b. This Lambda function initiates the Step Function workflow.

**4. Get Segment Detection API Task State:**
a. The first state in the Step Function workflow retrieves the shot segments information
using the "Get Segment Detection API" task state.

**5. Distributed Map State:**
a. The shot segments information is passed to the distributed map state.b. The first task in the map is a Lambda function called "Generate Video Clips and
Transcript."
c. This Lambda function utilizes the FFmpeg library to generate video clips from the
segments information.
d. Thumbnails are generated using FFmpeg and uploaded to the S3 bucket.

**6. Transcription Generation:**
a. Another task in the distributed map state is a Lambda function named "generate
transcripts."
b. This function starts a transcription job for each video clip.
c. The response JSON from the transcription job is uploaded to the S3 bucket.
d. A wait state is initiated until all transcription jobs are complete.

**7. Summarization and PDF Report Generation:**
a. Transcription is provided using Amazon Transcribe.
b. If not all transcription jobs are finished, the process waits. Once completed, it
proceeds to the next step using a choice state.
c. A Lambda function in the map state called "Summarize Video Clips" uses Amazon
Bedrock to generate a summary of the transcripts.
d. The summary is uploaded to the S3 bucket.

**8. Create PDF Report**
a. A Lambda function named "Create PDF Report" generates a PDF report(using pdfkit)
using the summaries and thumbnails uploaded to S3.

## Step Function Workflow
![Alt "Step Funvtion"](https://github.com/ak-699/visual-insight-generator/blob/source/stepfunctions_graph.png)

