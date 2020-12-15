/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// This module is intended to be run inside of a webworker
/* eslint-disable @kbn/eslint/module_migration */

import 'regenerator-runtime/runtime';
// @ts-ignore
import * as worker from 'monaco-editor/esm/vs/editor/editor.worker';
import { monaco } from '../../monaco_imports';
import { PainlessWorker } from './painless_worker';

self.onmessage = () => {
  worker.initialize((ctx: monaco.worker.IWorkerContext, createData: any) => {
    return new PainlessWorker(ctx);
  });
};
