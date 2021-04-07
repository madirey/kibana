/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { v4 as uuidv4 } from 'uuid';

import { createPersistenceRuleTypeFactory } from '../../../../../rule_registry/server';
import { REFERENCE_RULE_PERSISTENCE_ALERT_TYPE_ID } from '../../../../common/constants';
import { SecurityRuleRegistry } from '../../../plugin';

const createSecurityPersistenceRuleType = createPersistenceRuleTypeFactory<SecurityRuleRegistry>();

export const referenceRulePersistenceAlertType = createSecurityPersistenceRuleType({
  id: REFERENCE_RULE_PERSISTENCE_ALERT_TYPE_ID,
  name: 'ReferenceRule persistence alert type',
  validate: {
    params: schema.object({
      query: schema.string(),
    }),
  },
  actionGroups: [
    {
      id: 'default',
      name: 'Default',
    },
    {
      id: 'warning',
      name: 'Warning',
    },
  ],
  defaultActionGroupId: 'default',
  actionVariables: {
    context: [
      { name: 'server', description: 'the server' },
      {
        name: 'hasCpuUsageIncreased',
        description: 'boolean indicating if the cpu usage has increased',
      },
    ],
  },
  minimumLicenseRequired: 'basic',
  producer: 'security-solution',
  async executor({ services, params }) {
    // TODO: search on query
    // THEN alertWithPersistence on search results
    services.alertWithPersistence([
      {
        id: `${uuidv4()}`,
        fields: {},
      },
      {
        id: `${uuidv4()}`,
        fields: {},
      },
      {
        id: `${uuidv4()}`,
        fields: {},
      },
    ]);

    return {
      lastChecked: new Date(),
    };
  },
});
