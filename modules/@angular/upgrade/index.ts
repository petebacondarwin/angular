/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @module
 * @description
 * Entry point for all public APIs of the upgrade package.
 */
export * from './src/upgrade';
export { UpgradeModule } from './src/aot/upgrade_module';
export { downgradeInjectable } from './src/aot/downgrade_injectable';
export { downgradeNg2Component } from './src/aot/downgrade_component';

// This file only reexports content of the `src` folder. Keep it that way.
