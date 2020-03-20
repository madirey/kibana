/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'kibana/server';
import { EndpointAppContext } from '../../../types';
import { searchESForAlerts } from '../lib';
import { getRequestData, mapToAlertResultList } from './lib';
import { AlertDetailsUpdateParams } from '../types';
import {
  AlertingIndexGetQueryResult,
  AlertingIndexPatchQueryResult,
  AlertingIndexPatchBodyResult,
} from '../../../../common/types';

export const alertListHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, AlertingIndexGetQueryResult, unknown> {
  const alertListHandler: RequestHandler<unknown, AlertingIndexGetQueryResult, unknown> = async (
    ctx,
    req,
    res
  ) => {
    try {
      const reqData = await getRequestData(req, endpointAppContext);
      const response = await searchESForAlerts(ctx.core.elasticsearch.dataClient, reqData);
      const mappedBody = await mapToAlertResultList(ctx, endpointAppContext, reqData, response);
      return res.ok({ body: mappedBody });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};

export const alertListUpdateHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, unknown, AlertDetailsUpdateParams> {
  const alertListHandler: RequestHandler<
    unknown,
    AlertingIndexPatchQueryResult,
    AlertingIndexPatchBodyResult
  > = async (
    ctx,
    req: KibanaRequest<unknown, AlertingIndexPatchQueryResult, AlertingIndexPatchBodyResult>,
    res
  ) => {
    try {
      /**
       * In progress:
       *
       * 1. Look up alerts
       *
       * 2. Call SavedObjectsClient.bulkGet() to get state
       * https://github.com/elastic/kibana/blob/aa695ec6370e83e6cd595004c7d08e266fad0930/docs/development/core/server/kibana-plugin-server.savedobjectsclient.bulkget.md
       *
       * 3. Join the data by alert ID and return
       */

      // 1. Look up alerts
      // TODO

      // 2. Get saved objects
      const savedObjectsClient = ctx.core.savedObjects.client;
      // console.log(savedObjectsClient);
      const alertIds = req.body.alertIds;
      const savedObjectsResponse = await savedObjectsClient.update(
        SAVED_OBJECT_TYPE_ALERT_STATE,
        alertId,
        {
          active: req.body.active,
        }
      );
      // console.log(savedObjectsResponse);
      return res.noContent();
    } catch (err) {
      // console.log(err);
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};
