import { HttpStatus } from '@nestjs/common';

import { ApiCodeResponse } from '../enum/api-code-response.enum.js';
import { ApiValidationError } from '../model/api-validation-error.js';
import { ApiException } from './api-exception.js';

export class ValidationException extends ApiException {
  constructor(validationErrors: ApiValidationError[]) {
    super({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ApiCodeResponse.CommonValidationError,
      validationErrors,
      logMessage: 'Request validation failed',
    });
  }
}