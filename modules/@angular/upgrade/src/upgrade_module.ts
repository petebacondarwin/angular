import {NgModule, Injector, NgZone, FactoryProvider} from '@angular/core';
import * as angular from './angular_js';

// Temporary global location where the ng1Injector is stored during bootstrap
let tempGlobalNg1Injector: angular.IInjectorService = null;

@NgModule({
  providers: [
    { provide: '$injector', useFactory: () => tempGlobalNg1Injector },
    { provide: '$rootScope', useFactory: (i: angular.IInjectorService) => i.get('$rootScope'), deps: ['$injector']},
    { provide: '$compile', useFactory: (i: angular.IInjectorService) => i.get('$compile'), deps: ['$injector']}
    // Add other providers as necessary
  ]
})
export class UpgradeModule {
  static ng2ProviderFactory(token: any) {
    return ['$injector', (i: Injector) => i.get(token)];
  }

  static ng1Provider({provide, ng1Token}: {provide: any, ng1Token: any}): FactoryProvider {
    return {provide: provide, useFactory: (i: angular.IInjectorService) => i.get(ng1Token), deps: ['$injector']};
  }

  public ng2Injector: Injector;
  public ng1Injector: angular.IInjectorService;
  public ngZone: NgZone;

  constructor(ng2Injector: Injector) {
    this.ng2Injector = ng2Injector;
    this.ngZone = ng2Injector.get(NgZone);
  }

  bootstrapNg1(element: Element,
               modules?: any[],
               config?: angular.IAngularBootstrapConfig): angular.IInjectorService
  {
    const ng1UpgradeModuleName = 'angular1UpgradeModule';
    const upgradeModule = angular.module(ng1UpgradeModuleName, modules);
    upgradeModule.value('ng2Injector', this.ng2Injector);
    upgradeModule.config(['$injector',
      ($injector: angular.IInjectorService) => this.set$Injector($injector)]);
    angular.bootstrap(element, [ng1UpgradeModuleName], config);
    var $rootScope = this.ng1Injector.get('$rootScope');
    this.ngZone.onMicrotaskEmpty.subscribe({
      next: (_: any) => $rootScope.$evalAsync()
    });
    return this.ng1Injector;
  }

  private set$Injector(ng1Injector: angular.IInjectorService) {
    this.ng1Injector = tempGlobalNg1Injector = ng1Injector;
    this.ng2Injector.get('$injector'); // force the reading of the value.
    tempGlobalNg1Injector = null; // prevent memory leak
  }
}
