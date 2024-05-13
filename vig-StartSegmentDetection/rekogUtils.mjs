import { RekognitionClient } from "@aws-sdk/client-rekognition"; 
const config = {region:"us-east-1"};
const rekogClient = new RekognitionClient(config);

export {rekogClient};