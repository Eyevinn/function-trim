import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import fs from 'fs';

export type TContent =
  | string
  | Readable
  | ReadableStream
  | Blob
  | Uint8Array
  | Buffer
  | undefined;

export type TUploadToS3 = {
  content: TContent;
  bucket: string;
  key: string;
  region?: string;
};

export const S3_FOLDER = 'aws_content';

export function isS3URI(url: string): boolean {
  try {
    const inputUrl = new URL(url);
    return inputUrl.protocol === 's3:';
  } catch {
    return false;
  }
}

function saveStreamToFile(stream: Readable, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    stream.pipe(writeStream);
    writeStream.on('error', (err) => {
      reject(err);
    });
    writeStream.on('finish', () => {
      resolve();
    });
  });
}

export function getFileNameFromS3URL(S3url: string): string {
  return S3url.split('/')[3];
}

export function getBucketFromS3URL(S3url: string): string {
  return S3url.split('/')[2];
}

export async function downloadFromS3(S3url: string, destination?: string) {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  const getCommand = new GetObjectCommand({
    Bucket: getBucketFromS3URL(S3url),
    Key: getFileNameFromS3URL(S3url)
  });
  const localDest = `./${S3_FOLDER}/${S3url.split('/')[3]}`;
  const responseStream = await s3Client.send(getCommand);
  saveStreamToFile(responseStream.Body as Readable, destination || localDest);
}

export async function uploadToS3({
  content,
  bucket,
  key
}: TUploadToS3): Promise<void> {
  const client = new S3Client({ region: process.env.AWS_REGION });
  const upload = new Upload({
    client,
    params: { Bucket: bucket, Key: `${key}`, Body: content }
  });
  const round = (percent: number) => Math.round(percent * 100) / 100;
  upload.on('httpUploadProgress', (progress) => {
    const percent =
      progress.loaded && progress.total
        ? round((progress.loaded / progress.total) * 100)
        : 0;
    console.log(`Uploading: ${percent}%`);
  });
  await upload.done();
}
