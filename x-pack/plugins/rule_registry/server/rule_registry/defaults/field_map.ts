/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsFieldMap } from '../../generated/ecs_field_map';
import { pickWithPatterns } from '../field_map/pick_with_patterns';

export const defaultFieldMap = {
  ...pickWithPatterns(
    ecsFieldMap,
    '@timestamp',
    'event.kind',
    'event.action',
    'rule.uuid',
    'rule.id',
    'rule.name',
    'rule.category',
    'tags'
  ),
  'kibana.rac.producer': { type: 'keyword' },
  'kibana.rac.alert.uuid': { type: 'keyword' },
  'kibana.rac.alert.id': { type: 'keyword' },
  'kibana.rac.alert.start': { type: 'date' },
  'kibana.rac.alert.end': { type: 'date' },
  'kibana.rac.alert.duration.us': { type: 'long' },
  'kibana.rac.alert.severity.level': { type: 'keyword' },
  'kibana.rac.alert.severity.value': { type: 'long' },
  'kibana.rac.alert.status': { type: 'keyword' },
  'kibana.rac.alert.ancestors': { array: true, type: 'keyword' },
  'kibana.rac.alert.depth': { type: 'long' },
} as const;

export type DefaultFieldMap = typeof defaultFieldMap;
