/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Request params for alert details.
 */
export interface AlertDetailsRequestParams {
  id: string;
}

/**
 * Request params for updating alert details.
 */
export interface AlertDetailsUpdateParams {
  active: boolean;
}
