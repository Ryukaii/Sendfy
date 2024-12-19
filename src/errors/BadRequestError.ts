import { CustomError } from "./CustomError";

export class BadRequestError extends CustomError {
  statusCode = 400;
  errors = [{ message: this.message }];
  logging = false;

  constructor(message: string, context?: { [key: string]: any }) {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
