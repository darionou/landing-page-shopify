import { HTTP_STATUS } from '../constants/httpStatus';

import { ApiError } from './ApiError';


export class ServerError extends ApiError {
  constructor(name: string, message: string, statusCode: number = 500) {
    super(name, message, statusCode);
  }
}

export class ShopifyApiError extends ServerError {
  public readonly response?: any;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, response?: any) {
    super('ShopifyApiError', message, statusCode);
    this.response = response;
  }
}
