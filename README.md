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

## Step Function Workflow
![Alt "Step Funvtion"](https://github.com/ak-699/visual-insight-generator/blob/source/stepfunctions_graph.png)

