/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ArtifactConstants } from '../task';
import { ExceptionsCache } from '../cache';
import { DownloadArtifactReqParamsSchema, downloadArtifactReqParamsSchema } from '../schemas';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function downloadEndpointExceptionListRoute(router: IRouter, cache: ExceptionsCache) {
  router.get(
    {
      path: `${allowlistBaseRoute}/download/{artifactName}/{sha256}`,
      validate: {
        params: buildRouteValidation<
          typeof downloadArtifactReqParamsSchema,
          DownloadArtifactReqParamsSchema
        >(downloadArtifactReqParamsSchema),
      },
      options: { tags: [] },
    },
    async (context, req, res) => {
      const soClient = context.core.savedObjects.client;

      const cacheKey = `${req.params.artifactName}-${req.params.sha256}`;
      const cacheResp = cache.get(cacheKey);
      if (cacheResp) {
        // CACHE HIT
        return res.ok({
          body: Buffer.from(cacheResp, 'binary'),
          headers: {
            'content-encoding': 'xz',
            'content-disposition': `attachment; filename=${req.params.artifactName}.xz`,
          },
        });
      } else {
        // CACHE MISS
        return soClient
          .get(ArtifactConstants.SAVED_OBJECT_TYPE, `${req.params.artifactName}`)
          .then((artifact) => {
            const outBuffer = Buffer.from(artifact.attributes.body, 'binary');

            if (artifact.attributes.sha256 !== req.params.sha256) {
              return res.notFound({
                body: `No artifact matching sha256: ${req.params.sha256} for type ${req.params.artifactName}`,
              });
            }

            // TODO: factor this response out here and above
            return res.ok({
              body: outBuffer,
              headers: {
                'content-encoding': 'xz',
                'content-disposition': `attachment; filename=${artifact.attributes.name}.xz`,
              },
            });
          })
          .catch((err) => {
            return res.internalError({ body: err });
          });
      }
    }
  );
}
