import * as path from 'path';
import * as fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import {
  S3_FOLDER,
  downloadFromS3,
  getFileNameFromS3URL,
  isS3URI,
  uploadToS3
} from '../aws/aws';
import { NewTrimJobRequest, TrimJobStatus } from '../model';
import { nanoid } from 'nanoid';

export default class TrimService {
  private id: string;
  private state: TrimJobStatus | undefined;
  private currentProcesses: ChildProcessWithoutNullStreams[];
  private currentJob: NewTrimJobRequest | undefined;
  private outputFiles: string[];

  constructor() {
    this.id = nanoid();
    this.outputFiles = [];
    this.currentProcesses = [];
    this.state = 'pending';
  }

  getId(): string {
    return this.id;
  }

  getJob(): {
    id: string;
    job: NewTrimJobRequest | undefined;
    outputFiles: string[];
  } {
    return { id: this.id, job: this.currentJob, outputFiles: this.outputFiles };
  }

  getState(): TrimJobStatus | undefined {
    return this.state;
  }

  cancelJob(): void {
    if (this.currentProcesses) {
      this.currentProcesses.forEach((process) => {
        process.kill('SIGINT');
      });
      this.state = 'cancelled';
    }
  }

  downloadS3File(url: string) {
    if (!fs.existsSync(path.join(__dirname, S3_FOLDER))) {
      fs.mkdirSync(path.join(__dirname, S3_FOLDER));
    }
    if (!isS3URI(url)) return;
    downloadFromS3(url);
  }

  deleteAWSCache() {
    try {
      const files = fs.readdirSync(path.join(__dirname, S3_FOLDER));
      for (const file of files) {
        fs.unlinkSync(path.join(__dirname, S3_FOLDER, file));
      }
    } catch (error) {
      console.error(error);
    }
  }

  async trim(props: NewTrimJobRequest): Promise<string[]> {
    if (props.source.length === 0) {
      throw new Error('No source files provided');
    }
    if (props.edl.segments.length === 0) {
      throw new Error('No segments provided');
    }
    if (props.outputDirectory === '') {
      throw new Error('No output directory provided');
    }
    if (this.state === 'running') {
      throw new Error('Job already running');
    }

    this.currentJob = props;
    if (props.sourceType === 'single') {
      return this.trimSingle(props);
    } else {
      return this.trimABR(props);
    }
  }

  async trimSingle(props: NewTrimJobRequest) {
    this.state = 'running';
    await Promise.all(
      props.source.map((source) => this.downloadS3File(source))
    );

    const filterComplex = props.edl.segments
      .flatMap((segment, index) => {
        return props.source.map((source, sourceIndex) => {
          return `[${sourceIndex}:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS,format=yuv420p[v${index}_${sourceIndex}]; [${sourceIndex}:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}_${sourceIndex}];`;
        });
      })
      .join('');

    const concat = props.edl.segments
      .flatMap((segment, index) => {
        return props.source.map((source, sourceIndex) => {
          return `[v${index}_${sourceIndex}][a${index}_${sourceIndex}]`;
        });
      })
      .join('');

    const outputName = path.join(__dirname, `${props.edl.name}.mp4`);
    const process = spawn('ffmpeg', [
      ...props.source.flatMap((source) => {
        if (isS3URI(source)) {
          const s3Key = getFileNameFromS3URL(source);
          const localPath = path.join(__dirname, S3_FOLDER, s3Key);
          return ['-i', localPath];
        } else {
          return ['-i', source];
        }
      }),
      '-filter_complex',
      `${filterComplex}${concat}concat=n=${
        props.edl.segments.length * props.source.length
      }:v=1:a=1[outv][outa]`,
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      outputName
    ]);

    console.log('print ffmpeg command', process.spawnargs.join(' '));

    this.currentProcesses?.push(process);
    await new Promise((resolve, reject) => {
      process.on('close', resolve);
      process.stderr.on('data', (data) => {
        console.error(data.toString());
      });
      process.on('error', reject);
    });

    const outputUrl = new URL(props.outputDirectory);
    try {
      await uploadToS3({
        path: outputName,
        bucket: outputUrl.host,
        key: `${
          outputUrl.pathname ? outputUrl.pathname.replace(/^\/+/, '') + '/' : ''
        }${props.edl.name}.mp4`
      });
    } catch (error) {
      console.error(error);
      this.state = 'cancelled';
    }
    try {
      if (fs.existsSync(outputName)) {
        fs.unlinkSync(outputName);
        console.log(`Deleted ${outputName}`);
      }
    } catch (error) {
      console.error('Error while deleting file', error);
      this.state = 'cancelled';
      this.currentJob = undefined;
      this.deleteAWSCache();
      return [];
    }

    this.outputFiles.push(
      new URL(
        `${outputUrl.pathname}/${props.edl.name}.mp4`,
        outputUrl
      ).toString()
    );
    this.deleteAWSCache();
    this.state = 'completed';
    return this.outputFiles;
  }

  async trimABR(props: NewTrimJobRequest) {
    this.state = 'running';
    await Promise.all(
      props.source.map((source) => this.downloadS3File(source))
    );

    const promises = props.source.map(async (source, sourceIndex) => {
      const filterComplex = props.edl.segments
        .map((segment, index) => {
          return `[0:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS,format=yuv420p[v${index}]; [0:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}];`;
        })
        .join('');

      const concat = props.edl.segments
        .map((segment, index) => {
          return `[v${index}][a${index}]`;
        })
        .join('');

      const outputName = path.join(
        __dirname,
        `${props.edl.name}_${sourceIndex}.mp4`
      );

      let localPath = source;
      if (isS3URI(source)) {
        const s3Key = getFileNameFromS3URL(source);
        localPath = path.join(__dirname, S3_FOLDER, s3Key);
      }
      const process = spawn('ffmpeg', [
        '-i',
        localPath,
        '-filter_complex',
        `${filterComplex}${concat}concat=n=${props.edl.segments.length}:v=1:a=1[outv][outa]`,
        '-map',
        '[outv]',
        '-map',
        '[outa]',
        outputName
      ]);

      console.log('print ffmpeg command', process.spawnargs.join(' '));

      this.currentProcesses?.push(process);
      await new Promise((resolve, reject) => {
        process.on('close', resolve);
        process.on('error', reject);
      });

      const outputUrl = new URL(props.outputDirectory);
      try {
        await uploadToS3({
          path: outputName,
          bucket: outputUrl.host,
          key: `${
            outputUrl.pathname
              ? outputUrl.pathname.replace(/^\/+/, '') + '/'
              : ''
          }${props.edl.name}_${sourceIndex}.mp4`
        });
      } catch (error) {
        console.error(error);
        this.state = 'cancelled';
      }
      try {
        if (fs.existsSync(outputName)) {
          fs.unlinkSync(outputName);
          console.log(`Deleted ${outputName}`);
        }
        console.log(`Deleted ${outputName}`);
      } catch (error) {
        console.error(error);
        this.state = 'cancelled';
        this.currentJob = undefined;
        this.deleteAWSCache();
        return '';
      }
      return new URL(
        `${outputUrl.pathname}/${props.edl.name}_${sourceIndex}.mp4`,
        outputUrl
      ).toString();
    });
    const s3Urls = await Promise.allSettled(promises);
    const fulfilledUrls = s3Urls
      .filter((result) => result.status === 'fulfilled')
      .map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return null;
      })
      .filter((value): value is string => value !== null);
    this.outputFiles.push(...fulfilledUrls);
    this.deleteAWSCache();
    this.state = 'completed';
    return this.outputFiles;
  }
}
