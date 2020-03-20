/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GetResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { AlertEvent, EndpointAppConstants } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsRequestParams } from '../types';
import { AlertingIndexPatchBodyResult } from '../../../../common/types';
import { AlertDetailsPagination } from './lib';

export const alertDetailsHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, unknown> {
  const alertDetailsHandler: RequestHandler<AlertDetailsRequestParams, unknown, unknown> = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, unknown>,
    res
  ) => {
    try {
      const alertId = req.params.id;
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        index: EndpointAppConstants.ALERT_INDEX_NAME,
        id: alertId,
      })) as GetResponse<AlertEvent>;

      const config = await endpointAppContext.config();
      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        config,
        ctx,
        req.params,
        response
      );

      return res.ok({
        body: {
          id: response._id,
          ...response._source,
          next: await pagination.getNextUrl(),
          prev: await pagination.getPrevUrl(),
        },
      });
    } catch (err) {
      if (err.status === 404) {
        return res.notFound({ body: err });
      }
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};

export const alertDetailsUpdateHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, AlertingIndexPatchBodyResult> {
  const alertDetailsUpdateHandler: RequestHandler<
    AlertDetailsRequestParams,
    unknown,
    AlertingIndexPatchBodyResult
  > = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, AlertingIndexPatchBodyResult>,
    res
  ) => {
    try {
      const savedObjectsClient = ctx.core.savedObjects.client;
      const alertId = req.params.id;
      const savedObjectsResponse = await savedObjectsClient.update(
        SAVED_OBJECT_TYPE_ALERT_STATE,
        alertId,
        {
          active: req.body.active,
        }
      );
      return res.noContent();
    } catch (err) {
      // console.log(err);
      return res.internalError({ body: err });
    }
  };

  return alertDetailsUpdateHandler;
};
