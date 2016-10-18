import {Injector} from '@angular/core';
import {INJECTOR_KEY} from './constants';

/**
 * Create an Angular 1 factory that will return an Angular 2 injectable thing
 * (e.g. service, pipe, component, etc)
 *
 * Usage:
 *
 * ```
 * angular1Module.factory('someService', downgradeInjectable(SomeService))
 * ```
 *
 * @experimental
 */
export function downgradeInjectable(token: any) {
  return [INJECTOR_KEY, (i: Injector) => i.get(token)];
}