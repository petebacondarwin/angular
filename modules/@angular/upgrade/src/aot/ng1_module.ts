import { Provider, NgModule } from '@angular/core';
import { Ng1Adapter } from './ng1_adapter';
import * as angular from '../angular_js';

// We must use exported named functions for the ng2 factories to keep the compiler happy:
// > Metadata collected contains an error that will be reported at runtime:
// >   Function calls are not supported.
// >   Consider replacing the function or lambda with a reference to an exported function

/**
 * The Ng1Module contains providers for all the core Angular 1 services
 */
@NgModule({
  providers: [
    Ng1Adapter,
    { provide: '$injector', useFactory: $injectorFactory },
    { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector']},
    { provide: '$compile', useFactory: $compileFactory, deps: ['$injector']}
  ]
})
export class Ng1Module {}

let tempGlobalNg1Injector: angular.IInjectorService = null;
/** @internal */
export function storeNg1Injector(injector: angular.IInjectorService) {
  tempGlobalNg1Injector = injector;
}
/** @internal */
export function $injectorFactory() {
  const injector = tempGlobalNg1Injector;
  tempGlobalNg1Injector = null; // clear the value to prevent memory leaks
  return injector;
}
/** @internal */
export function $rootScopeFactory(i: angular.IInjectorService) {
  return i.get('$rootScope');
}
/** @internal */
export function $compileFactory(i: angular.IInjectorService) {
  return i.get('$compile');
}
