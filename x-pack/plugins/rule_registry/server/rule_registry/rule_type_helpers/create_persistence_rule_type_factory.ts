/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import v4 from 'uuid/v4';
import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { RuleParams, RuleType } from '../../types';
import { DefaultFieldMap } from '../defaults/field_map';
import { OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';
import { PrepopulatedRuleEventFields } from '../create_scoped_rule_registry_client/types';
import { RuleRegistry } from '..';

type UserDefinedAlertFields<TFieldMap extends DefaultFieldMap> = Omit<
  OutputOfFieldMap<TFieldMap>,
  PrepopulatedRuleEventFields | 'alert.id' | 'alert.uuid' | '@timestamp'
>;

type PersistenceAlertService<
  TFieldMap extends DefaultFieldMap,
  TActionVariable extends ActionVariable
> = (
  alerts: Array<{
    id: string;
    fields: UserDefinedAlertFields<TFieldMap>;
  }>
) => Array<AlertInstance<AlertInstanceState, { [key in TActionVariable['name']]: any }, string>>;

type CreatePersistenceRuleType<TFieldMap extends DefaultFieldMap> = <
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
>(
  type: RuleType<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    { alertWithPersistence: PersistenceAlertService<TFieldMap, TActionVariable> }
  >
) => RuleType<TFieldMap, TRuleParams, TActionVariable>;

export function createPersistenceRuleTypeFactory<
  TRuleRegistry extends RuleRegistry<DefaultFieldMap>
>(): TRuleRegistry extends RuleRegistry<infer TFieldMap>
  ? CreatePersistenceRuleType<TFieldMap>
  : never;

export function createPersistenceRuleTypeFactory(): CreatePersistenceRuleType<DefaultFieldMap> {
  return (type) => {
    return {
      ...type,
      executor: async (options) => {
        const {
          services: { scopedRuleRegistryClient, alertInstanceFactory, logger },
        } = options;

        const currentAlerts: Record<
          string,
          UserDefinedAlertFields<DefaultFieldMap> & {
            'alert.id': string;
            'alert.uuid': string;
            '@timestamp': string;
          }
        > = {};

        const timestamp = options.startedAt.toISOString();

        await type.executor({
          ...options,
          services: {
            ...options.services,
            alertWithPersistence: (
              alerts: Array<{ id: string; fields: UserDefinedAlertFields<DefaultFieldMap> }>
            ) => {
              alerts.forEach((alert) => {
                currentAlerts[alert.id] = {
                  ...alert.fields,
                  'alert.id': alert.id,
                  'alert.uuid': v4(),
                  'event.kind': 'signal',
                  '@timestamp': timestamp,
                };
              });
              return alerts.map((alert) => alertInstanceFactory(alert.id));
            },
          },
        });

        const numAlerts = Object.keys(currentAlerts).length;
        logger.debug(`Tracking ${numAlerts}`);

        if (numAlerts) {
          await scopedRuleRegistryClient.bulkIndex(Object.values(currentAlerts));
        }

        return currentAlerts;
      },
    };
  };
}
