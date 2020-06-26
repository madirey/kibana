/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsServiceStart, KibanaRequest, SavedObjectsClient } from 'src/core/server';
import { AgentService, IngestManagerStartContract } from '../../../ingest_manager/server';
import { getDatasourceCreateCallback } from './ingest_integration';
import { ManifestManager } from './services/artifacts';

export type EndpointAppContextServiceStartContract = Pick<
  IngestManagerStartContract,
  'agentService'
> & {
  manifestManager: ManifestManager;
  registerIngestCallback: IngestManagerStartContract['registerExternalCallback'];
  savedObjectsStart: SavedObjectsServiceStart;
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private agentService: AgentService | undefined;
  private manifestManager: ManifestManager | undefined;
  private savedObjectsStart: SavedObjectsServiceStart | undefined;

  public start(dependencies: EndpointAppContextServiceStartContract) {
    this.agentService = dependencies.agentService;
    this.manifestManager = dependencies.manifestManager;
    this.savedObjectsStart = dependencies.savedObjectsStart;
    dependencies.registerIngestCallback(
      'datasourceCreate',
      getDatasourceCreateCallback(this.manifestManager)
    );
  }

  public stop() {}

  public getAgentService(): AgentService {
    if (!this.agentService) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.agentService;
  }

  public getManifestManager(): ManifestManager | undefined {
    return this.manifestManager;
  }

  public getScopedSavedObjects(req: KibanaRequest): SavedObjectsClient | undefined {
    let client: SavedObjectsClient;
    if (this.savedObjectsStart !== undefined) {
      client = this.savedObjectsStart.getScopedClient(req, { excludedWrappers: ['security'] });
    }
    return client;
  }
}
