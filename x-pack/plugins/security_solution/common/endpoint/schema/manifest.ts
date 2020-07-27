/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { semanticVersion, sha256 } from './common';

export const compressionAlgorithm = t.keyof({
  none: null,
  zlib: null,
});
export type CompressionAlgorithm = t.TypeOf<typeof compressionAlgorithm>;

export const compressionAlgorithmDispatch = t.keyof({
  zlib: null,
});
export type CompressionAlgorithmDispatch = t.TypeOf<typeof compressionAlgorithmDispatch>;

export const encryptionAlgorithm = t.keyof({
  none: null,
});

export const identifier = t.string;

export const manifestSchemaVersion = t.keyof({
  v1: null,
});
export type ManifestSchemaVersion = t.TypeOf<typeof manifestSchemaVersion>;

export const relativeUrl = t.string;

export const size = t.number;

export const manifestEntryBaseSchema = t.exact(
  t.type({
    relative_url: relativeUrl,
    decoded_sha256: sha256,
    decoded_size: size,
    encoded_sha256: sha256,
    encoded_size: size,
    encryption_algorithm: encryptionAlgorithm,
  })
);

export const manifestEntrySchema = t.intersection([
  manifestEntryBaseSchema,
  t.exact(
    t.type({
      compression_algorithm: compressionAlgorithm,
    })
  ),
]);
export type ManifestEntrySchema = t.TypeOf<typeof manifestEntrySchema>;

export const manifestEntryDispatchSchema = t.intersection([
  manifestEntryBaseSchema,
  t.exact(
    t.type({
      compression_algorithm: compressionAlgorithmDispatch,
    })
  ),
]);
export type ManifestEntryDispatchSchema = t.TypeOf<typeof manifestEntryDispatchSchema>;

export const manifestBaseSchema = t.exact(
  t.type({
    manifest_version: semanticVersion,
    schema_version: manifestSchemaVersion,
  })
);

export const manifestSchema = t.intersection([
  manifestBaseSchema,
  t.exact(
    t.type({
      artifacts: t.record(identifier, manifestEntrySchema),
    })
  ),
]);
export type ManifestSchema = t.TypeOf<typeof manifestSchema>;

export const manifestArtifactsSchema = t.record(identifier, manifestEntryDispatchSchema);

export const manifestDispatchSchema = t.intersection([
  manifestBaseSchema,
  t.exact(
    t.type({
      artifacts: manifestArtifactsSchema,
    })
  ),
]);
export type ManifestDispatchSchema = t.TypeOf<typeof manifestDispatchSchema>;
