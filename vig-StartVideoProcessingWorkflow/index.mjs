import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient();

export const handler = async (event) => {
  const stateMachineArn = 'arn:aws:states:us-east-1:471112757420:stateMachine:vig-state-machine';
  const snsMessage = event["Records"][0]["Sns"]["Message"]
  const JobId = JSON.parse(snsMessage).JobId;
  const JOBID = {
    JobId,
  }
  const secInput = {
    stateMachineArn,
    input: JSON.stringify(JOBID), // You can provide input data to the state machine if required
  };
  const response = await sfnClient.send(new StartExecutionCommand(secInput));
  console.log(response);
  return {
    statusCode: 200,
    body: "State machine execution started successfully"
  };
};
