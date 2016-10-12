import { Injector } from '@angular/core';

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
  return ['ng2Injector', (i: Injector) => i.get(token)];
}