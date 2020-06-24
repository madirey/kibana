/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { validate } from '../../../../common/validate';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ArtifactConstants, ExceptionsCache } from '../../lib/artifacts';
import {
  DownloadArtifactRequestParamsSchema,
  downloadArtifactRequestParamsSchema,
  downloadArtifactResponseSchema,
  InternalArtifactSchema,
} from '../../schemas/artifacts';
import { EndpointAppContext } from '../../types';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function registerDownloadExceptionListRoute(
  router: IRouter,
  endpointContext: EndpointAppContext,
  cache: ExceptionsCache
) {
  router.get(
    {
      path: `${allowlistBaseRoute}/download/{identifier}/{sha256}`,
      validate: {
        params: buildRouteValidation<
          typeof downloadArtifactRequestParamsSchema,
          DownloadArtifactRequestParamsSchema
        >(downloadArtifactRequestParamsSchema),
      },
      options: { tags: [] },
    },
    async (context, req, res) => {
      const soClient = context.core.savedObjects.client;
      const logger = endpointContext.logFactory.get('download_exception_list');

      // TODO: authenticate api key
      // https://github.com/elastic/kibana/issues/69329

      const buildAndValidateResponse = (artName: string, body: string): object => {
        const artifact = {
          body: Buffer.from(body, 'binary'),
          headers: {
            'content-encoding': 'xz',
            'content-disposition': `attachment; filename=${artName}.xz`,
          },
        };
        const [validated, errors] = validate(artifact, downloadArtifactResponseSchema);
        if (errors != null) {
          return res.internalError({ body: errors });
        } else {
          return res.ok(validated);
        }
      };

      const id = `${req.params.identifier}-${req.params.sha256}`;
      const cacheResp = cache.get(id);

      if (cacheResp) {
        logger.debug(`Cache HIT artifact ${id}`);
        return buildAndValidateResponse(req.params.identifier, cacheResp);
      } else {
        logger.debug(`Cache MISS artifact ${id}`);
        return soClient
          .get<InternalArtifactSchema>(ArtifactConstants.SAVED_OBJECT_TYPE, id)
          .then((artifact) => {
            cache.set(id, artifact.attributes.body);
            return buildAndValidateResponse(
              artifact.attributes.identifier,
              artifact.attributes.body
            );
          })
          .catch((err) => {
            if (err?.output?.statusCode === 404) {
              return res.notFound({ body: `No artifact found for ${id}` });
            } else {
              return res.internalError({ body: err });
            }
          });
      }
    }
  );
}
