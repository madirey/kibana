/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest, RequestHandler } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { AlertData } from '../../../../common/types';
import { EndpointAppContext } from '../../../types';
import { SAVED_OBJECT_TYPE_ALERT_STATE } from '../common';
import { getRequestData, buildAlertListESQuery, mapToAlertResultList } from './lib';
import { AlertListRequestParams, AlertListUpdateParams, AlertListUpdateBody } from './types';

export const alertListHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, AlertListRequestParams, AlertListRequestParams> {
  const alertListHandler: RequestHandler<
    unknown,
    AlertListRequestParams,
    AlertListRequestParams
  > = async (
    ctx,
    req: KibanaRequest<unknown, AlertListRequestParams, AlertListRequestParams>,
    res
  ) => {
    try {
      const reqData = await getRequestData(req, endpointAppContext);

      const reqWrapper = await buildAlertListESQuery(reqData);
      endpointAppContext.logFactory.get('alerts').debug('ES query: ' + JSON.stringify(reqWrapper));

      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        reqWrapper
      )) as SearchResponse<AlertData>;

      return res.ok({ body: mapToAlertResultList(endpointAppContext, reqData, response) });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  return alertListHandler;
};

export const alertListUpdateHandlerWrapper = function(
  endpointAppContext: EndpointAppContext
): RequestHandler<unknown, unknown, AlertListUpdateParams> {
  const alertListHandler: RequestHandler<unknown, unknown, AlertListUpdateParams> = async (
    ctx,
    req: KibanaRequest<unknown, unknown, AlertListRequestParams>,
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
      const alertIds = req.body;
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
