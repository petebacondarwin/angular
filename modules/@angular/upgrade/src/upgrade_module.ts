import {NgModule, Injector, NgZone, FactoryProvider} from '@angular/core';
import * as angular from './angular_js';

// Temporary global location where the ng1Injector is stored during bootstrap
let tempGlobalNg1Injector: angular.IInjectorService = null;

///////////////////////////////////
// START: ng1 service factories
// We must use exported named functions for the ng2 factories
// to keep the compiler happy:
// > Metadata collected contains an error that will be reported at runtime:
// >   Function calls are not supported.
// >   Consider replacing the function or lambda with a reference to an exported function
export function $injectorFactory() {
  return tempGlobalNg1Injector;
}
export function $rootScopeFactory(i: angular.IInjectorService) {
  return i.get('$rootScope');
}
export function $compileFactory(i: angular.IInjectorService) {
  return i.get('$compile');
}
// END: ng1 service factories
///////////////////////////////////


/**
 * UpgradeModule is the base class for the module that will contain all the
 * information about what Angular providers and component are to be bridged
 * between Angular 1 and Angular 2+
 */
@NgModule({
  providers: [
    { provide: '$injector', useFactory: $injectorFactory },
    { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector']},
    { provide: '$compile', useFactory: $compileFactory, deps: ['$injector']}
    // Add other providers as necessary
  ]
})
export class UpgradeModule {
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
  static ng2ProviderFactory(token: any) {
    return ['ng2Injector', (i: Injector) => i.get(token)];
  }

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
  static ng1ServiceProvider({provide, ng1Token}: {provide: any, ng1Token: any}): FactoryProvider {
    return {provide: provide, useFactory: (i: angular.IInjectorService) => i.get(ng1Token), deps: ['$injector']};
  }

  public ng2Injector: Injector;
  public ng1Injector: angular.IInjectorService;
  public ngZone: NgZone;

  constructor(ng2Injector: Injector) {
    this.ng2Injector = ng2Injector;
    this.ngZone = ng2Injector.get(NgZone);
  }

  ngDoBootstrap() {}

  bootstrapNg1(element: Element,
               modules?: any[],
               config?: angular.IAngularBootstrapConfig)
  {
    // Create an ng1 module to bootstrap
    const upgradeModule = angular.module('angular1UpgradeModule', modules)
      .value('ng2Injector', this.ng2Injector)
      .run(['$injector', ($injector: angular.IInjectorService) => this.provideNg1InjectorToNg2($injector)]);

    // Only add the config if it is there
    // QUESTION? Do we really need this param?
    if (config) {
      upgradeModule.config(config);
    }

    // Bootstrap the module
    angular.bootstrap(element, [upgradeModule.name], config);

    // Wire up the ng1 rootScope to the zone
    var $rootScope = this.ng1Injector.get('$rootScope');
    this.ngZone.onMicrotaskEmpty.subscribe((_: any) => $rootScope.$evalAsync());
  }

  private provideNg1InjectorToNg2(ng1Injector: angular.IInjectorService) {
    this.ng1Injector = tempGlobalNg1Injector = ng1Injector;
    this.ng2Injector.get('$injector'); // force the reading of the value.
    tempGlobalNg1Injector = null; // prevent memory leak
  }
}
