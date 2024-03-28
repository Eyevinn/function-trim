import { Static, Type } from '@sinclair/typebox';

const StringEnum = <T extends string[]>(values: [...T]) =>
  Type.Unsafe<T[number]>({
    type: 'string',
    enum: values
  });

export const SourceType = StringEnum(['single', 'abr']);
export type SourceType = Static<typeof SourceType>;

export const EDLSegment = Type.Object({
  start: Type.Number({ description: 'Start time in seconds (float)' }),
  end: Type.Number({ description: 'End time in seconds (float)' })
});
export type EDLSegment = Static<typeof EDLSegment>;

export const EDL = Type.Object({
  name: Type.String({ description: 'Name of the EDL' }),
  segments: Type.Array(EDLSegment)
});
export type EDL = Static<typeof EDL>;

export const NewTrimJobRequest = Type.Object({
  source: Type.Array(Type.String({ description: 'URL to source file' })),
  sourceType: SourceType,
  outputDirectory: Type.String({
    description: 'S3 URL or path for the output'
  }),
  edl: EDL
});
export type NewTrimJobRequest = Static<typeof NewTrimJobRequest>;

export const NewTrimJobResponse = Type.Object({
  jobId: Type.String({ description: 'ID of the trim job' })
});
export type NewTrimJobResponse = Static<typeof NewTrimJobResponse>;

export const TrimJobStatus = StringEnum([
  'pending',
  'running',
  'completed',
  'cancelled'
]);
export type TrimJobStatus = Static<typeof TrimJobStatus>;
export const TrimJob = Type.Object({
  id: Type.String({ description: 'ID of the trim job' }),
  edl: EDL,
  outputFiles: Type.Array(Type.String({ description: 'path to output file' })),
  status: TrimJobStatus
});
export type TrimJob = Static<typeof TrimJob>;

export type UploadToS3 = {
  path: string;
  bucket: string;
  key: string;
  region?: string;
};
