/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { EndpointAppContext } from '../../types';
import { EndpointAppConstants } from '../../../common/types';
import { alertListHandlerWrapper } from './list/handlers';
import { alertListReqSchema } from './list/schemas';
import { alertDetailsReqSchema } from './details/schemas';
import { alertDetailsHandlerWrapper } from './details/handlers';

const BASE_ALERTS_ROUTE = `${EndpointAppConstants.BASE_API_URL}/alerts`;

export function registerAlertRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  router.get(
    {
      path: BASE_ALERTS_ROUTE,
      validate: {
        query: alertListReqSchema,
      },
      options: { authRequired: true },
    },
    alertListHandlerWrapper(endpointAppContext)
  );

  router.get(
    {
      path: `${BASE_ALERTS_ROUTE}/{id}`,
      validate: {
        params: alertDetailsReqSchema,
      },
      options: { authRequired: true },
    },
    alertDetailsHandlerWrapper(endpointAppContext)
  );
}
