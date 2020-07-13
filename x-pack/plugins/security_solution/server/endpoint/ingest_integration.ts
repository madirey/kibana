/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../src/core/server';
import { NewPackageConfig } from '../../../ingest_manager/common/types/models';
import { factory as policyConfigFactory } from '../../common/endpoint/models/policy_config';
import { NewPolicyData } from '../../common/endpoint/types';
import { ManifestManager } from './services/artifacts';
import { Manifest } from './lib/artifacts';
import { ManifestConstants } from './lib/artifacts/common';

/**
 * Callback to handle creation of PackageConfigs in Ingest Manager
 */
export const getPackageConfigCreateCallback = (
  logger: Logger,
  manifestManager: ManifestManager
): ((newPackageConfig: NewPackageConfig) => Promise<NewPackageConfig>) => {
  const handlePackageConfigCreate = async (
    newPackageConfig: NewPackageConfig
  ): Promise<NewPackageConfig> => {
    // We only care about Endpoint package configs
    if (newPackageConfig.package?.name !== 'endpoint') {
      return newPackageConfig;
    }

    // We cast the type here so that any changes to the Endpoint specific data
    // follow the types/schema expected
    let updatedPackageConfig = newPackageConfig as NewPolicyData;

    // get current manifest from SO (last dispatched)
    let manifest: Manifest | null = null;

    try {
      manifest = await manifestManager.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION);
    } catch (err) {
      logger.error(err);
    }

    // Until we get the Default Policy Configuration in the Endpoint package,
    // we will add it here manually at creation time.
    updatedPackageConfig = {
      ...newPackageConfig,
      inputs: [
        {
          type: 'endpoint',
          enabled: true,
          streams: [],
          config: {
            artifact_manifest: {
              value: manifest ?? Manifest.getDefault(ManifestConstants.SCHEMA_VERSION),
            },
            policy: {
              value: policyConfigFactory(),
            },
          },
        },
      ],
    };

    return updatedPackageConfig;
  };

  return handlePackageConfigCreate;
};
