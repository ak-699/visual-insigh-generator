import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream, createReadStream } from 'node:fs';


const s3Client = new S3Client();

const downloadFile = async (bucket, key, filepath) => {
  const gocInput = {
    Bucket: bucket,
    Key: key,
  };
  const { Body } = await s3Client.send(new GetObjectCommand(gocInput));
  // console.log(await Body.transformToString())
  const writeStream = createWriteStream(filepath);
  await new Promise((resolve, reject) => {
    Body.pipe(writeStream)
      .on('error', reject)
      .on('finish', resolve);
  });
};

const uploadFile = async (bucket, key, filepath) => {
  const readStream = createReadStream(filepath);
  const pocInput = {
    Bucket: bucket,
    Key: key,
    Body: readStream,
  };
  await s3Client.send(new PutObjectCommand(pocInput));
};

export { downloadFile, uploadFile };
