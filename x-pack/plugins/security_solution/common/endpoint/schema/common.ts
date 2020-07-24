/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const semanticVersion = t.string; // TODO: make type
export type SemanticVersion = t.TypeOf<typeof semanticVersion>;

export const sha256 = t.string;
