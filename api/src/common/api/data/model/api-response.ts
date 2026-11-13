import { ApiProperty } from '@nestjs/swagger';

import { ApiCodeResponse } from '../enum/api-code-response.enum.js';
import { ApiValidationError } from './api-validation-error.js';

type ApiResponseOptions<TData> = {
  code: string;
  result: boolean;
  data: TData | null;
  validationErrors?: ApiValidationError[];
};

export class ApiResponse<TData = unknown> {
  @ApiProperty({
    example: ApiCodeResponse.CommonSuccess,
  })
  code!: string;

  @ApiProperty({ example: true })
  result!: boolean;

  @ApiProperty({
    required: true,
    nullable: true,
  })
  data!: TData | null;

  @ApiProperty({
    type: () => [ApiValidationError],
  })
  validationErrors!: ApiValidationError[];

  static success<TData>(
    data: TData,
    code: string = ApiCodeResponse.CommonSuccess,
  ): ApiResponse<TData> {
    return ApiResponse.create({
      code,
      result: true,
      data,
      validationErrors: [],
    });
  }

  static error<TData = unknown>(
    options: {
      code?: string;
      data?: TData | null;
      validationErrors?: ApiValidationError[];
    } = {},
  ): ApiResponse<TData> {
    return ApiResponse.create({
      code: options.code ?? ApiCodeResponse.CommonError,
      result: false,
      data: options.data ?? null,
      validationErrors: options.validationErrors ?? [],
    });
  }

  private static create<TData>(
    options: ApiResponseOptions<TData>,
  ): ApiResponse<TData> {
    const response = new ApiResponse<TData>();

    response.code = options.code;
    response.result = options.result;
    response.data = options.data;
    response.validationErrors = options.validationErrors ?? [];

    return response;
  }
}