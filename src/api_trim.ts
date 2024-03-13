import { FastifyPluginCallback } from 'fastify';
import {
  NewTrimJobRequest,
  NewTrimJobResponse,
  TrimJob,
  TrimJobStatus
} from './model';
import { ErrorResponse } from './errors';

export interface ApiTrimOptions {
  ffmpegPath: string;
}

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
        //
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
        //
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
        //
      } catch (err) {
        reply.code(500).send({ reason: 'Unhandled error: ' + err });
      }
    }
  );

  next();
};

export default apiTrim;
