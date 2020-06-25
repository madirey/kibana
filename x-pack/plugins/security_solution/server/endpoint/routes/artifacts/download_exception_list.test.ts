/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IClusterClient,
  IRouter,
  SavedObjectsClientContract,
  IScopedClusterClient,
  RouteConfig,
  RequestHandler,
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObject,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingSystemMock,
} from 'src/core/server/mocks';
import { ExceptionsCache } from '../../lib/artifacts/cache';
import { compressExceptionList } from '../../lib/artifacts/lists';
import { ArtifactConstants } from '../../lib/artifacts';
import { registerDownloadExceptionListRoute } from './download_exception_list';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { createMockEndpointAppContextServiceStartContract } from '../../mocks';
import { createMockConfig } from '../../../lib/detection_engine/routes/__mocks__';
import { WrappedTranslatedExceptionList } from '../../schemas/artifacts/lists';

const mockArtifactName = `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-windows-1.0.0`;
const expectedEndpointExceptions: WrappedTranslatedExceptionList = {
  exceptions_list: [
    {
      entries: [
        {
          field: 'some.not.nested.field',
          operator: 'included',
          type: 'exact_cased',
          value: 'some value',
        },
      ],
      field: 'some.field',
      type: 'nested',
    },
    {
      field: 'some.not.nested.field',
      operator: 'included',
      type: 'exact_cased',
      value: 'some value',
    },
  ],
};
const mockIngestSOResponse = {
  page: 1,
  per_page: 100,
  total: 1,
  saved_objects: [
    {
      id: 'agent1',
      type: 'agent',
      references: [],
      score: 0,
      attributes: {
        active: true,
        access_api_key_id: 'pedTuHIBTEDt93wW0Fhr',
      },
    },
  ],
};
const AuthHeader = 'ApiKey cGVkVHVISUJURUR0OTN3VzBGaHI6TnU1U0JtbHJSeC12Rm9qQWpoSHlUZw==';

describe('test alerts route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let routeConfig: RouteConfig<unknown, unknown, unknown, never>;
  let routeHandler: RequestHandler<unknown, unknown, unknown>;
  let endpointAppContextService: EndpointAppContextService;
  let cache: ExceptionsCache;
  let ingestSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    endpointAppContextService = new EndpointAppContextService();
    cache = new ExceptionsCache(5);
    const startContract = createMockEndpointAppContextServiceStartContract();

    // The authentication with the Fleet Plugin needs a separate scoped SO Client
    ingestSavedObjectClient = savedObjectsClientMock.create();
    ingestSavedObjectClient.find.mockReturnValue(Promise.resolve(mockIngestSOResponse));
    startContract.savedObjectsStart.getScopedClient.mockReturnValue(ingestSavedObjectClient);
    endpointAppContextService.start(startContract);

    registerDownloadExceptionListRoute(
      routerMock,
      {
        logFactory: loggingSystemMock.create(),
        service: endpointAppContextService,
        config: () => Promise.resolve(createMockConfig()),
      },
      cache
    );
  });

  it('should serve the compressed artifact to download', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '123456' },
      headers: {
        authorization: AuthHeader,
      },
    });

    // Mock the SavedObjectsClient get response for fetching the artifact
    const mockCompressedArtifact = await compressExceptionList(expectedEndpointExceptions);
    const mockArtifact = {
      id: '2468',
      type: 'test',
      references: [],
      attributes: {
        identifier: mockArtifactName,
        schemaVersion: '1.0.0',
        sha256: '123456',
        encoding: 'xz',
        created: Date.now(),
        body: mockCompressedArtifact,
        size: 100,
      },
    };
    const soFindResp: SavedObject<unknown> = {
      ...mockArtifact,
    };
    mockSavedObjectClient.get.mockImplementationOnce(() => Promise.resolve(soFindResp));

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );

    const expectedHeaders = {
      'content-encoding': 'xz',
      'content-disposition': `attachment; filename=${mockArtifactName}.xz`,
    };

    expect(mockResponse.ok).toBeCalled();
    expect(mockResponse.ok.mock.calls[0][0]?.headers).toEqual(expectedHeaders);
    const compressedArtifact = mockResponse.ok.mock.calls[0][0]?.body;
    expect(compressedArtifact).toEqual(mockCompressedArtifact);
  });

  it('should handle fetching a non-existent artifact', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/123456`,
      method: 'get',
      params: { sha256: '789' },
      headers: {
        authorization: AuthHeader,
      },
    });

    mockSavedObjectClient.get.mockImplementationOnce(() =>
      // eslint-disable-next-line prefer-promise-reject-errors
      Promise.reject({ output: { statusCode: 404 } })
    );

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.notFound).toBeCalled();
  });

  it('should utilize the cache', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
      headers: {
        authorization: AuthHeader,
      },
    });

    // Add to the download cache
    const mockCompressedArtifact = await compressExceptionList(expectedEndpointExceptions);
    const cacheKey = `${mockArtifactName}-${mockSha}`;
    cache.set(cacheKey, mockCompressedArtifact.toString('binary'));

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.ok).toBeCalled();
    // The saved objects client should be bypassed as the cache will contain the download
    expect(mockSavedObjectClient.get.mock.calls.length).toEqual(0);
  });

  it('should respond with a 401 if a valid API Token is not supplied', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
    });

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.unauthorized).toBeCalled();
  });

  it('should respond with a 404 if an agent cannot be linked to the API token', async () => {
    const mockSha = '123456789';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/allowlist/download/${mockArtifactName}/${mockSha}`,
      method: 'get',
      params: { sha256: mockSha, identifier: mockArtifactName },
      headers: {
        authorization: AuthHeader,
      },
    });

    // Mock the SavedObjectsClient find response for verifying the API token with no results
    mockIngestSOResponse.saved_objects = [];
    mockIngestSOResponse.total = 0;
    ingestSavedObjectClient.find.mockReturnValue(Promise.resolve(mockIngestSOResponse));

    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/allowlist/download')
    )!;

    await routeHandler(
      ({
        core: {
          savedObjects: {
            client: mockSavedObjectClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockResponse.notFound).toBeCalled();
  });
});
