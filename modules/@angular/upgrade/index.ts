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
export { ng2ProviderFactory } from './src/aot/ng2_provider_factory';
export { ng1ServiceProvider } from './src/aot/ng1_service_provider';
export { downgradeNg2Component } from './src/aot/downgrade_component';

// This file only reexports content of the `src` folder. Keep it that way.
