import {NgModule, Injector, NgZone, FactoryProvider, ComponentFactory, ComponentFactoryResolver, Testability} from '@angular/core';
import { ng1Providers, setNg1Injector } from './ng1_providers';
import { NG2_INJECTOR, NG1_INJECTOR, NG1_PROVIDE, NG1_TESTABILITY } from '../constants';
import * as angular from '../angular_js';

const NG1_UPGRADE_MODULE_NAME = 'angular1UpgradeModule';

/**
 * UpgradeModule is the base class for the module that will contain all the
 * information about what Angular providers and component are to be bridged
 * between Angular 1 and Angular 2+
 *
 * TODO: Add more detailed information here with examples
 */
@NgModule({ providers: [ng1Providers] })
export class UpgradeModule {

  public ng2Injector: Injector;
  public ng1Injector: angular.IInjectorService;
  public ngZone: NgZone;

  constructor(ng2Injector: Injector) {
    this.ng2Injector = ng2Injector;
    this.ngZone = ng2Injector.get(NgZone);
  }

  /**
   * This method prevents the bootstrapping code from complaining about a
   * lack of `bootstrap` component in the metadata.
   * @internal
   */
  ngDoBootstrap() {}

  /**
   * Bootstrap this NgModule with into an Angular 1 application.
   * @param element the element on which to bootstrap the Angular 1 application
   * @param [modules] the Angular 1 modules to bootstrap for this application
   * @param [config] optional extra Angular 1 config block to run when bootstrapping
   */
  bootstrapNg1(element: Element,
               modules: string[] = [],
               config: angular.IInjectable = () => {})
  {
    // Create an ng1 module to bootstrap
    const upgradeModule = angular.module(NG1_UPGRADE_MODULE_NAME, modules)
      .value(NG2_INJECTOR, this.ng2Injector)
      .run([NG1_INJECTOR, (ng1Injector: angular.IInjectorService) => {
        // store the ng1 injector so that our ng2 injector provider can access it
        setNg1Injector(this.ng1Injector = ng1Injector);
        // force the reading of the value from the ng2 injector provider.
        this.ng2Injector.get(NG1_INJECTOR);

        // Wire up the ng1 rootScope to the zone
        var $rootScope = ng1Injector.get('$rootScope');
        this.ngZone.onMicrotaskEmpty.subscribe((_: any) => $rootScope.$evalAsync());
      }])
      .config([
        NG1_INJECTOR, NG1_PROVIDE,
        ($injector: angular.IInjectorService, $provide: angular.IProvideService) => {
          if ($injector.has(NG1_TESTABILITY)) {
            // $provide.decorator(NG1_TESTABILITY, ['$delegate', function(testabilityDelegate: angular.ITestabilityService) {

            //     var originalWhenStable: Function = testabilityDelegate.whenStable;
            //     var newWhenStable = (callback: Function): void => {
            //       var whenStableContext: any = this;
            //       originalWhenStable.call(this, function() {
            //         var ng2Testability: Testability = this.ng2Injector.get(Testability);
            //         if (ng2Testability.isStable()) {
            //           callback.apply(this, arguments);
            //         } else {
            //           ng2Testability.whenStable(newWhenStable.bind(whenStableContext, callback));
            //         }
            //       });
            //     };

            //     testabilityDelegate.whenStable = newWhenStable;
            //     return testabilityDelegate;
            //   }
            // ]);
          }
      }])
      .config(config);

    // Bootstrap the angular 1 application
    angular.bootstrap(element, [upgradeModule.name], config);
  }

}