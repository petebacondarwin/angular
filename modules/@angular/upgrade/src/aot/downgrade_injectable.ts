import { Injector } from '@angular/core';
import { UPGRADE_MODULE_INJECTOR } from '../constants';

/**
 * Create an Angular 1 factory that will return an Angular 2 injectable thing
 * (e.g. service, pipe, component, etc)
 *
 * Usage:
 *
 * ```
 * angular1Module.factory('someService', downgradeInjectable(SomeService))
 * ```
 */
export function downgradeInjectable(token: any) {
  return [UPGRADE_MODULE_INJECTOR, (i: Injector) => i.get(token)];
}