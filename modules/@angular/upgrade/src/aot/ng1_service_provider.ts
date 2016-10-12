import { FactoryProvider } from '@angular/core';
import * as angular from '../angular_js';

/**
 * Create an Angular 2 provider description for accessing an Angular 1 service
 * in Angular 2
 *
 * Usage:
 *
 * ```
 * @NgModule({
 *   providers: [UpgradeModule.ng1ServiceProvider({provide: SomeServiceToken, ng1Token: 'someService'}],
 *   ...
 * })
 * ```
 */
export function ng1ServiceProvider({provide, ng1Token}: {provide: any, ng1Token: any}): FactoryProvider {
  return {provide: provide, useFactory: (i: angular.IInjectorService) => i.get(ng1Token), deps: ['$injector']};
}