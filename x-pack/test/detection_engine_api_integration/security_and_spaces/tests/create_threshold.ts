/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CreateRulesSchema } from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSignalsByIds,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';

import { getCreateThresholdRulesSchemaMock } from '../../../../plugins/security_solution/common/detection_engine/schemas/request/rule_schemas.mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  /**
   * Specific api integration tests for threshold rule type
   */
  describe('create_threshold', () => {
    describe('validation errors', () => {
      it('should give an error that the index must exist first if it does not exist before creating a rule', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateThresholdRulesSchemaMock())
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });
    });

    describe('threshold tests with auditbeat data', () => {
      beforeEach(async () => {
        await deleteAllAlerts(supertest);
        await createSignalsIndex(supertest);
        await esArchiver.load('auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should be able to execute and create signals when doing a threshold query', async () => {
        const rule: CreateRulesSchema = {
          description: 'Detecting malicious activity',
          name: 'Query with everything',
          severity: 'high',
          index: ['auditbeat-*'],
          type: 'threshold',
          risk_score: 55,
          language: 'kuery',
          rule_id: 'rule-1',
          from: '1900-01-01T00:00:00.000Z',
          query: '*:*',
          threshold: {
            field: ['host.name'],
            value: 2,
            cardinality: [
              {
                field: 'process.name',
                value: 2,
              },
            ],
          },
        };

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 10, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).equal(10);
      });
    });
  });
};
