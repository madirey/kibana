/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { v4 } from 'uuid';

import { Logger } from 'kibana/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

import { SecurityRuleRegistry } from '../../../../plugin';
import { ConfigType } from '../../../../config';

export const createRuleTypeMocks = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let alertExecutor: (...args: any[]) => Promise<Record<string, any>>;

  const mockedConfig$ = of({} as ConfigType);

  const loggerMock = ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown) as Logger;

  const registry = {
    registerType: ({ executor }) => {
      alertExecutor = executor;
    },
  } as SecurityRuleRegistry;

  const scheduleActions = jest.fn();

  const services = {
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    scopedRuleRegistryClient: {
      bulkIndex: jest.fn(),
    },
    alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    findAlerts: jest.fn(), // TODO: does this stay?
    alertWithPersistence: jest.fn(),
    logger: loggerMock,
  };

  return {
    dependencies: {
      registry,
      config$: mockedConfig$,
      logger: loggerMock,
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, unknown> }) => {
      return alertExecutor({
        services,
        params,
        rule: {
          id: v4(),
        },
        startedAt: new Date(),
      });
    },
  };
};
