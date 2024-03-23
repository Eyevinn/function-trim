import { FastifyPluginCallback } from 'fastify';
import {
  NewTrimJobRequest,
  NewTrimJobResponse,
  TrimJob,
  TrimJobStatus
} from './model';
import { ErrorResponse } from './errors';
import TrimWorker from './worker/trim_worker';

export interface ApiTrimOptions {
  ffmpegPath: string;
}

const worker = new TrimWorker();

const apiTrim: FastifyPluginCallback<ApiTrimOptions> = (
  fastify,
  opts,
  next
) => {
  fastify.post<{
    Body: NewTrimJobRequest;
    Reply: NewTrimJobResponse | ErrorResponse;
  }>(
    '/trim',
    {
      schema: {
        description: 'Start a trim job',
        body: NewTrimJobRequest,
        response: {
          200: NewTrimJobResponse,
          400: ErrorResponse,
          500: ErrorResponse
        }
      }
    },
    async (request, reply) => {
      try {
        const id = worker.startJob(request.body);
        reply.code(200).send({ jobId: id });
      } catch (err) {
        reply.code(500).send({ reason: 'Unhandled error: ' + err });
      }
    }
  );

  fastify.get<{
    Params: { jobId: string };
    Reply: TrimJob | ErrorResponse;
  }>(
    '/trim/:jobId',
    {
      schema: {
        description: 'Get the status of a trim job',
        response: {
          200: TrimJob,
          404: ErrorResponse,
          500: ErrorResponse
        }
      }
    },
    async (request, reply) => {
      try {
        const trimJob = worker.getJob(request.params.jobId);
        if (trimJob?.job) {
          const status = worker.getJobStatus(request.params.jobId);
          if (status) {
            reply.code(200).send({
              id: request.params.jobId,
              edl: trimJob.job.edl,
              outputFiles: trimJob.outputFiles,
              status: status
            });
          } else {
            reply.code(404).send({ reason: 'Job not found' });
          }
        } else {
          reply.code(404).send({ reason: 'Job not found' });
        }
      } catch (err) {
        reply.code(500).send({ reason: 'Unhandled error: ' + err });
      }
    }
  );

  fastify.delete<{
    Params: { jobId: string };
    Reply: TrimJobStatus | ErrorResponse;
  }>(
    '/trim/:jobId',
    {
      schema: {
        description: 'Cancel a trim job',
        response: {
          200: TrimJobStatus,
          404: ErrorResponse,
          500: ErrorResponse
        }
      }
    },
    async (request, reply) => {
      try {
        let status = worker.getJobStatus(request.params.jobId);
        if (status !== 'cancelled' && status !== 'completed') {
          worker.cancelJob(request.params.jobId);
          status = worker.getJobStatus(request.params.jobId);
          reply.code(200).send(status);
        } else {
          reply.code(404).send({ reason: 'Job not found' });
        }
      } catch (err) {
        reply.code(500).send({ reason: 'Unhandled error: ' + err });
      }
    }
  );

  next();
};

export default apiTrim;
