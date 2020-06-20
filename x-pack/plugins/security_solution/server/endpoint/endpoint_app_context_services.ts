/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AgentService } from '../../../ingest_manager/server';
import { ArtifactService, ManifestService } from './artifacts';

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private agentService: AgentService | undefined;
  private artifactService: ArtifactService | undefined;
  private manifestService: ManifestService | undefined;

  public start(dependencies: { agentService: AgentService }) {
    this.agentService = dependencies.agentService;
    this.artifactService = dependencies.artifactService;
    this.manifestService = dependencies.manifestService;
  }

  public stop() {}

  public getAgentService(): AgentService {
    if (!this.agentService) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.agentService;
  }

  public getArtifactService(): ArtifactService {
    if (!this.artifactService) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.artifactService;
  }

  public getManifestService(): ManifestService {
    if (!this.manifestService) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.manifestService;
  }
}
