/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IClusterClient, IRouter, IScopedClusterClient } from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../../src/core/server/mocks';
import { EndpointConfigSchema } from '../../config';
import { alertListReqSchema } from './list/schemas';
import { registerAlertRoutes } from './index';

describe('test alerts route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    registerAlertRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  it('should fail to validate when `page_size` is not a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: 'abc',
      });
    };
    expect(validate).toThrow();
  });

  it('should validate when `page_size` is a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: 25,
      });
    };
    expect(validate).not.toThrow();
  });

  it('should validate when `page_size` can be converted to a number', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_size: '50',
      });
    };
    expect(validate).not.toThrow();
  });

  it('should allow either `page_index` or `after`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_index: 1,
        after: [123, 345],
      });
    };
    expect(validate).toThrow();
  });

  it('should allow either `page_index` or `before`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        page_index: 1,
        before: 'abc',
      });
    };
    expect(validate).toThrow();
  });

  it('should allow either `before` or `after`, but not both', async () => {
    const validate = () => {
      alertListReqSchema.validate({
        before: ['abc', 'def'],
        after: [123, 345],
      });
    };
    expect(validate).toThrow();
  });
});
