/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { useSelector } from 'react-redux';
import { useMonitorId } from '../../hooks';
import { monitorStatusSelector } from '../../state/selectors';
import { EnableMonitorAlert } from '../overview/monitor_list/columns/enable_alert';
import { Ping } from '../../../common/runtime_types/ping';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

const isAutogeneratedId = (id: string) => {
  const autoGeneratedId = /^auto-(icmp|http|tcp|browser)-0X[A-F0-9]{16}.*/;
  return autoGeneratedId.test(id);
};

// For monitors with no explicit ID, we display the URL instead of the
// auto-generated ID because it is difficult to derive meaning from a
// generated id like `auto-http-0X8D6082B94BBE3B8A`.
// We may deprecate this behavior in the next major release, because
// the heartbeat config will require an explicit ID.
const getPageTitle = (monitorId: string, selectedMonitor: Ping | null) => {
  if (isAutogeneratedId(monitorId)) {
    return selectedMonitor?.url?.full || monitorId;
  }
  return monitorId;
};

export const MonitorPageTitle: React.FC = () => {
  const monitorId = useMonitorId();

  const selectedMonitor = useSelector(monitorStatusSelector);

  const nameOrId = selectedMonitor?.monitor?.name || getPageTitle(monitorId, selectedMonitor);

  const type = selectedMonitor?.monitor?.type;
  const isBrowser = type === 'browser';

  useBreadcrumbs([{ text: nameOrId }]);

  const renderMonitorType = (monitorType: string) => {
    switch (monitorType) {
      case 'http':
        return (
          <FormattedMessage
            id="xpack.uptime.monitorDetails.title.pingType.http"
            defaultMessage="HTTP ping"
          />
        );
      case 'tcp':
        return (
          <FormattedMessage
            id="xpack.uptime.monitorDetails.title.pingType.tcp"
            defaultMessage="TCP ping"
          />
        );
      case 'icmp':
        return (
          <FormattedMessage
            id="xpack.uptime.monitorDetails.title.pingType.icmp"
            defaultMessage="ICMP ping"
          />
        );
      case 'browser':
        return (
          <FormattedMessage
            id="xpack.uptime.monitorDetails.title.pingType.browser"
            defaultMessage="Browser"
          />
        );
      default:
        return '';
    }
  };

  return (
    <>
      <EuiFlexGroup wrap={false} data-test-subj="monitorTitle">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h1 className="eui-textNoWrap">{nameOrId}</h1>
          </EuiTitle>
          <EuiSpacer size="xs" />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EnableMonitorAlert monitorId={monitorId} selectedMonitor={selectedMonitor!} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup wrap={false} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          {type && (
            <EuiBadge color="hollow">
              {renderMonitorType(type)}{' '}
              {isBrowser && (
                <FormattedMessage
                  id="xpack.uptime.monitorDetails.title.disclaimer.description"
                  defaultMessage="(BETA)"
                />
              )}
            </EuiBadge>
          )}
        </EuiFlexItem>
        {isBrowser && (
          <EuiFlexItem grow={false}>
            <EuiLink href="https://www.elastic.co/what-is/synthetic-monitoring" target="_blank">
              <FormattedMessage
                id="xpack.uptime.monitorDetails.title.disclaimer.link"
                defaultMessage="See more"
              />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
