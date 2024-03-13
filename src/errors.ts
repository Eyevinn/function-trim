import { Static, Type } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({
  reason: Type.String({ description: 'Reason why something failed' })
});
export type ErrorResponse = Static<typeof ErrorResponse>;
