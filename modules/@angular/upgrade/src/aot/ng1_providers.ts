import { Provider } from '@angular/core';
import * as angular from '../angular_js';

export const ng1Providers : Provider[]  = [
  { provide: '$injector', useFactory: $injectorFactory },
  { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector']},
  { provide: '$compile', useFactory: $compileFactory, deps: ['$injector']}
];

// We must use exported named functions for the ng2 factories to keep the compiler happy:
// > Metadata collected contains an error that will be reported at runtime:
// >   Function calls are not supported.
// >   Consider replacing the function or lambda with a reference to an exported function

let tempGlobalNg1Injector: angular.IInjectorService = null;
export function $injectorFactory() {
  const injector = tempGlobalNg1Injector;
  tempGlobalNg1Injector = null; // clear the value to prevent memory leaks
  return injector;
}

export function $rootScopeFactory(i: angular.IInjectorService) {
  return i.get('$rootScope');
}

export function $compileFactory(i: angular.IInjectorService) {
  return i.get('$compile');
}

export function setNg1Injector(injector: angular.IInjectorService) {
  tempGlobalNg1Injector = injector;
}