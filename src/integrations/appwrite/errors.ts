export class AppwriteFunctionError extends Error {
  readonly functionId: string;
  readonly statusCode: number;
  readonly rawBody: string;
  readonly parsedBody: unknown;

  constructor(params: {
    message: string;
    functionId: string;
    statusCode: number;
    rawBody: string;
    parsedBody: unknown;
  }) {
    super(params.message);
    this.name = 'AppwriteFunctionError';
    this.functionId = params.functionId;
    this.statusCode = params.statusCode;
    this.rawBody = params.rawBody;
    this.parsedBody = params.parsedBody;
  }
}
