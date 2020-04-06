/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { esQuery } from '../../../../../../../src/plugins/data/server';
import { AlertEvent, Direction, EndpointAppConstants } from '../../../../common/types';
import {
  AlertSearchQuery,
  AlertSearchRequest,
  AlertSearchRequestWrapper,
  AlertSort,
  UndefinedResultPosition,
} from '../types';

export { Pagination } from './pagination';

function reverseSortDirection(order: Direction): Direction {
  if (order === 'asc') {
    return 'desc';
  }
  return 'asc';
}

function buildQuery(query: AlertSearchQuery): JsonObject {
  const alertKindClause = {
    term: {
      'event.kind': {
        value: 'alert',
      },
    },
  };
  const dateRangeClause = query.dateRange
    ? [
        {
          range: {
            ['@timestamp']: {
              gte: query.dateRange.from,
              lte: query.dateRange.to,
            },
          },
        },
      ]
    : [];
  const queryAndFiltersClauses = esQuery.buildEsQuery(undefined, query.query, query.filters);

  const fullQuery = {
    ...queryAndFiltersClauses,
    bool: {
      ...queryAndFiltersClauses.bool,
      must: [...queryAndFiltersClauses.bool.must, alertKindClause, ...dateRangeClause],
    },
  };

  // Optimize
  if (fullQuery.bool.must.length > 1) {
    return (fullQuery as unknown) as JsonObject;
  }

  return alertKindClause;
}

function buildSort(query: AlertSearchQuery): AlertSort {
  const sort: AlertSort = [
    // User-defined primary sort, with default to `@timestamp`
    {
      [query.sort]: {
        order: query.order,
        missing:
          query.order === 'asc' ? UndefinedResultPosition.last : UndefinedResultPosition.first,
      },
    },
    // Secondary sort for tie-breaking
    {
      'event.id': {
        order: query.order,
      },
    },
  ];

  if (query.searchBefore) {
    // Reverse sort order for search_before functionality
    const newDirection = reverseSortDirection(query.order);
    sort[0][query.sort].order = newDirection;
    sort[0][query.sort].missing =
      newDirection === 'asc' ? UndefinedResultPosition.last : UndefinedResultPosition.first;
    sort[1]['event.id'].order = newDirection;
  }

  return sort;
}

/**
 * Builds a request body for Elasticsearch, given a set of query params.
 **/
const buildAlertSearchQuery = async (
  query: AlertSearchQuery
): Promise<AlertSearchRequestWrapper> => {
  const reqBody: AlertSearchRequest = {
    track_total_hits: EndpointAppConstants.MAX_ALERTS_PER_SEARCH + 1, // Add 1 so we can detect when we have an 'overflow'
    query: buildQuery(query),
    sort: buildSort(query),
  };

  if (query.searchAfter) {
    reqBody.search_after = query.searchAfter;
  }

  if (query.searchBefore) {
    reqBody.search_after = query.searchBefore;
  }

  const reqWrapper: AlertSearchRequestWrapper = {
    size: query.pageSize,
    index: EndpointAppConstants.ALERT_INDEX_NAME,
    body: reqBody,
  };

  if (query.fromIndex) {
    reqWrapper.from = query.fromIndex;
  }

  return reqWrapper;
};

/**
 * Makes a request to Elasticsearch, given an `AlertSearchRequestWrapper`.
 **/
export const searchESForAlerts = async (
  dataClient: IScopedClusterClient,
  query: AlertSearchQuery
): Promise<SearchResponse<AlertEvent>> => {
  const reqWrapper = await buildAlertSearchQuery(query);
  const response = (await dataClient.callAsCurrentUser('search', reqWrapper)) as SearchResponse<
    AlertEvent
  >;

  if (query.searchBefore !== undefined) {
    // Reverse the hits when using `search_before`.
    response.hits.hits.reverse();
  }

  return response;
};

/**
 * Abstraction over alert IDs.
 */
export class AlertId {
  protected index: string;
  protected id: string;

  constructor(index: string, id: string) {
    this.index = index;
    this.id = id;
  }

  public get index() {
    return this.index;
  }

  public get id() {
    return this.id;
  }

  static fromEncoded(encoded: string): AlertId {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [index, id] = decoded.split(' ');
    return new AlertId(index, id);
  }

  protected toString(): string {
    return Buffer.from(`${this.index} ${this.id}`).toString('base64');
  }
}
