import { Injector } from '@angular/core';
import { NG2_INJECTOR } from '@angular/upgrade/src/constants';

/**
 * Create an Angular 1 factory that will return an Angular 2 injectable thing
 * (e.g. service, pipe, component, etc)
 *
 * Usage:
 *
 * ```
 * angular1Module.factory('someService', ng2ProviderFactory(SomeService))
 * ```
 */
export function ng2ProviderFactory(token: any) {
  return [NG2_INJECTOR, (i: Injector) => i.get(token)];
}