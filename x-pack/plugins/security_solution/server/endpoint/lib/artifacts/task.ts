/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../task_manager/server';
import { EndpointAppContext } from '../../types';
/*
import { reportErrors, bumpSemanticVersion } from './common';
import { InternalArtifactCompleteSchema } from '../../schemas/artifacts';
import { ManifestDiff, Manifest } from './manifest';
*/

export const ManifestTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'endpoint:user-artifact-packager',
  VERSION: '1.0.0',
};

export interface ManifestTaskSetupContract {
  endpointAppContext: EndpointAppContext;
  taskManager: TaskManagerSetupContract;
}

export interface ManifestTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class ManifestTask {
  private endpointAppContext: EndpointAppContext;
  private logger: Logger;

  constructor(setupContract: ManifestTaskSetupContract) {
    this.endpointAppContext = setupContract.endpointAppContext;
    this.logger = this.endpointAppContext.logFactory.get(this.getTaskId());

    setupContract.taskManager.registerTaskDefinitions({
      [ManifestTaskConstants.TYPE]: {
        title: 'Security Solution Endpoint Exceptions Handler',
        type: ManifestTaskConstants.TYPE,
        timeout: ManifestTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              await this.runTask(taskInstance.id);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (startContract: ManifestTaskStartContract) => {
    try {
      await startContract.taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: ManifestTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: '60s',
        },
        state: {},
        params: { version: ManifestTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${ManifestTaskConstants.TYPE}:${ManifestTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string) => {
    // Check that this task is current
    if (taskId !== this.getTaskId()) {
      // old task, return
      this.logger.debug(`Outdated task running: ${taskId}`);
    }

    /*
    const artifactClient = this.endpointAppContext.service.getArtifactClient();
    const manifestClient = this.endpointAppContext.service.getManifestClient();

    if (artifactClient == null) {
      this.logger.debug('ArtifactClient not available.');
      return;
    }

    if (manifestClient == null) {
      this.logger.debug('ManifestClient not available.');
      return;
    }

    try {
      // Last manifest we computed, which was saved to ES
      const oldManifest = await manifestClient.getManifest('TODO');
      if (oldManifest == null) {
        this.logger.debug('User manifest not available yet.');
        return;
      }

      const buildExceptionListArtifacts = async (): Promise<Record<string, InternalArtifactCompleteSchema>> => { return {} };
      const getDiffs = (oldIds: string[], newIds: string[]): ManifestDiff[] =>  { return [] };
      const compressArtifacts = async (artifacts: InternalArtifactCompleteSchema[]) => { };
      const persistArtifacts = async (artifacts: InternalArtifactCompleteSchema[]) => { };
      const tryDispatch = async (manifest: Manifest) => { };

      // New computed manifest based on current state of exception list
      // returns map(artifactId => artifact)
      const currentArtifacts = await buildExceptionListArtifacts();
      const artifactIds = Object.keys(currentArtifacts);

      const diffs = getDiffs(oldManifest.attributes.ids, artifactIds);

      const oldArtifactIds = diffs.filter((diff) => diff.type === 'delete').map((diff) => diff.id);
      const newArtifactIds = diffs.filter((diff) => diff.type === 'add').map((diff) => diff.id);
      if (newArtifactIds.length) {
        const newArtifacts = newArtifactIds.map((artifactId) => currentArtifacts[artifactId]);
        const compressErrors = await compressArtifacts(newArtifacts);
        const persistErrors = await persistArtifacts(newArtifacts);
      }

      const newManifest = {
        // TODO: merge with old artifacts here, don't lose the compression
        ...oldManifest,
        ids: artifactIds,
        semanticVersion: diffs.length
          ? bumpSemanticVersion(oldManifest.semanticVersion)
          : oldManifest.semanticVersion,
      };

      if (diffs.length) {
        const commitErrors = await manifestClient.upsertManifest(newManifest);
      }

      const dispatchErrors = await tryDispatch(newManifest);

      for (const artifactId of oldArtifactIds) {
        try {
          await artifactClient.deleteArtifact(artifactId);
          this.logger.info(`Cleaned up artifact ${artifactId}`);
        } catch (err) {
          // errors.push(err);
        }
      }
    } catch (err) {
      this.logger.error(err);
    }
    */

    /*
    try {
      // Last manifest we computed, which was saved to ES
      const oldManifest = await manifestManager.getLastComputedManifest();
      if (oldManifest == null) {
        this.logger.debug('User manifest not available yet.');
        return;
      }

      // New computed manifest based on current state of exception list
      const newManifest = await manifestManager.buildNewManifest({ baselineManifest: oldManifest });
      const diffs = newManifest.getDiffs();

      // Compress new artifacts
      const adds = diffs.filter((diff) => diff.type === 'add').map((diff) => diff.id);
      for (const artifactId of adds) {
        const compressError = await newManifest.compressArtifact(artifactId);
        if (compressError) {
          throw compressError;
        }
      }

      // Persist new artifacts
      const artifacts = adds
        .map((artifactId) => newManifest.getArtifact(artifactId))
        .filter((artifact): artifact is InternalArtifactCompleteSchema => artifact !== undefined);
      if (artifacts.length !== adds.length) {
        throw new Error('Invalid artifact encountered.');
      }
      const persistErrors = await manifestManager.pushArtifacts(artifacts);
      if (persistErrors.length) {
        reportErrors(this.logger, persistErrors);
        throw new Error('Unable to persist new artifacts.');
      }

      // Commit latest manifest state, if different
      if (diffs.length) {
        const error = await manifestManager.commit(newManifest);
        if (error) {
          throw error;
        }
      }

      // Try dispatching to ingest-manager package configs
      const dispatchErrors = await manifestManager.tryDispatch(newManifest);
      if (dispatchErrors.length) {
        reportErrors(this.logger, dispatchErrors);
        throw new Error('Error dispatching manifest.');
      }

      // Try to clean up superceded artifacts
      const deletes = diffs.filter((diff) => diff.type === 'delete').map((diff) => diff.id);
      const deleteErrors = await manifestManager.deleteArtifacts(deletes);
      if (deleteErrors.length) {
        reportErrors(this.logger, deleteErrors);
      }
    } catch (err) {
      this.logger.error(err);
    }
    */
  };
}
