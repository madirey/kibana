/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UpdateResponse } from 'elasticsearch';
import { KibanaRequest, RequestHandler } from 'kibana/server';
import {
  AlertEvent,
  AlertingIndexPatchBodyResult,
  EndpointAppConstants,
} from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { AlertDetailsRequestParams } from '../types';
import { AlertId } from '../lib';
import { AlertDetailsPagination } from './lib';
import { getHostData } from '../../../routes/metadata';

export const alertDetailsGetHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<AlertDetailsRequestParams, unknown, unknown> {
  const alertDetailsHandler: RequestHandler<AlertDetailsRequestParams, unknown, unknown> = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, unknown>,
    res
  ) => {
    try {
      const alertId = AlertId.fromEncoded(req.params.id);
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        index: alertId.index,
        id: alertId.id,
      })) as GetResponse<AlertEvent>;

      const config = await endpointAppContext.config();
      const pagination: AlertDetailsPagination = new AlertDetailsPagination(
        config,
        ctx,
        req.params,
        response
      );

      const currentHostInfo = await getHostData(ctx, response._source.host.id);

      let triageState = response._source.state?.active;
      if (triageState === undefined) {
        triageState = true;
      }

      return res.ok({
        body: {
          id: alertId.toString(),
          ...response._source,
          state: {
            active: triageState,
            host_metadata: currentHostInfo,
          },
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
  const alertDetailsHandler: RequestHandler<
    AlertDetailsRequestParams,
    unknown,
    AlertingIndexPatchBodyResult
  > = async (
    ctx,
    req: KibanaRequest<AlertDetailsRequestParams, unknown, AlertingIndexPatchBodyResult>,
    res
  ) => {
    try {
      const alertId = req.params.id;
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('update', {
        index: EndpointAppConstants.ALERT_INDEX_NAME,
        id: alertId,
        body: {
          doc: req.body,
        },
      })) as UpdateResponse<AlertEvent>;

      return res.ok({ body: response });
    } catch (err) {
      if (err.status === 404) {
        return res.notFound({ body: err });
      }
      return res.internalError({ body: err });
    }
  };

  return alertDetailsHandler;
};
