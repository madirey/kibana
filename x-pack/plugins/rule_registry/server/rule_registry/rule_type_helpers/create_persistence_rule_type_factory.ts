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
          rule,
        } = options;

        const currentAlerts: Record<
          string,
          UserDefinedAlertFields<DefaultFieldMap> & { 'alert.id': string }
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
                };
              });
              return alerts.map((alert) => alertInstanceFactory(alert.id));
            },
          },
        });

        const newAlertIds = Object.keys(currentAlerts);

        logger.debug(`Detected ${currentAlerts.length} alerts`);

        const alertsDataMap: Record<string, UserDefinedAlertFields<DefaultFieldMap>> = {
          ...currentAlerts,
        };

        const eventsToIndex: Array<OutputOfFieldMap<DefaultFieldMap>> = allAlertIds.map(
          (alertId) => {
            const alertData = alertsDataMap[alertId];

            if (!alertData) {
              logger.warn(`Could not find alert data for ${alertId}`);
            }

            const event: OutputOfFieldMap<DefaultFieldMap> = {
              ...alertData,
              '@timestamp': timestamp,
              'event.kind': 'state',
              'alert.id': alertId,
            };

            const isNew = !state.trackedAlerts[alertId];
            const isRecovered = !currentAlerts[alertId];
            const isActiveButNotNew = !isNew && !isRecovered;
            const isActive = !isRecovered;

            const { alertUuid, started } = state.trackedAlerts[alertId] ?? {
              alertUuid: v4(),
              started: timestamp,
            };

            event['alert.start'] = started;
            event['alert.uuid'] = alertUuid;

            if (isNew) {
              event['event.action'] = 'open';
            }

            if (isRecovered) {
              event['alert.end'] = timestamp;
              event['event.action'] = 'close';
              event['alert.status'] = 'closed';
            }

            if (isActiveButNotNew) {
              event['event.action'] = 'active';
            }

            if (isActive) {
              event['alert.status'] = 'open';
            }

            event['alert.duration.us'] =
              (options.startedAt.getTime() - new Date(event['alert.start']!).getTime()) * 1000;

            return event;
          }
        );

        if (eventsToIndex.length) {
          await scopedRuleRegistryClient.bulkIndex(eventsToIndex);
        }

        return currentAlerts;
      },
    };
  };
}
