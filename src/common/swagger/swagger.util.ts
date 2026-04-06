import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';

type SwaggerOperation = {
  tags?: string[];
  responses?: Record<string, unknown>;
};

type SwaggerPathItem = {
  [key in (typeof OPERATION_METHODS)[number]]?: SwaggerOperation;
};

const OPERATION_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
] as const;

function getOperationTag(path: string) {
  const normalizedPath = path.replace(/^\//, '');
  const firstSegment = normalizedPath.split('/')[0];

  if (!firstSegment) {
    return 'App';
  }

  return firstSegment
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getGlobalResponses() {
  return {
    400: {
      description: 'Bad Request',
    },
    401: {
      description: 'Unauthorized',
    },
    403: {
      description: 'Forbidden',
    },
    404: {
      description: 'Not Found',
    },
    429: {
      description: 'Too Many Requests',
    },
    500: {
      description: 'Internal Server Error',
    },
  };
}

function applyOperationDefaults(path: string, operation: SwaggerOperation) {
  return {
    ...operation,
    tags:
      operation.tags && operation.tags.length > 0
        ? operation.tags
        : [getOperationTag(path)],
    responses: {
      ...getGlobalResponses(),
      ...operation.responses,
    },
  };
}

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Africonn API')
    .setDescription('API documentation for the Africonn backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide the JWT access token',
      },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .build();
}

export function applySwaggerDocumentDefaults(document: OpenAPIObject) {
  const paths = Object.entries(document.paths).reduce<
    Record<string, SwaggerPathItem>
  >((accumulator, [path, rawPathItem]) => {
    const pathItem = rawPathItem as SwaggerPathItem;

    accumulator[path] = { ...pathItem };

    for (const method of OPERATION_METHODS) {
      const operation = pathItem[method];

      if (!operation) {
        continue;
      }

      accumulator[path][method] = applyOperationDefaults(path, operation);
    }

    return accumulator;
  }, {});

  return {
    ...document,
    paths: paths as OpenAPIObject['paths'],
  };
}
