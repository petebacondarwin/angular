import {NgModule, Injector, NgZone, FactoryProvider, ComponentFactory, ComponentFactoryResolver, Testability} from '@angular/core';
import { ng1Providers, setNg1Injector } from './ng1_providers';
import { UPGRADE_MODULE_INJECTOR, NG1_INJECTOR, NG1_PROVIDE, NG1_TESTABILITY } from '../constants';
import { controllerKey } from '../util';
import * as angular from '../angular_js';

const NG1_UPGRADE_MODULE_NAME = 'angular1UpgradeModule';

/**
 * UpgradeModule is the base class for the module that will contain all the
 * information about what Angular providers and component are to be bridged
 * between Angular 1 and Angular 2+
 *
 * NOTE: the Angular 1 injector is `this.ng1Injector`;
 *       the Angular 2+ injector is `this.injector`
 *
 * TODO: Add more detailed information here with runnable examples
 */
@NgModule({ providers: [ng1Providers] })
export class UpgradeModule {

  public ng1Injector: angular.IInjectorService;

  constructor(public injector: Injector, public ngZone: NgZone) {}

  /**
   * This method prevents the Angular bootstrapper from complaining about a
   * lack of `bootstrap` component in the `@NgModule` metadata.
   * @internal
   */
  ngDoBootstrap() {}

  /**
   * Bootstrap this NgModule into an Angular 1 application.
   * @param element the element on which to bootstrap the Angular 1 application
   * @param [modules] the Angular 1 modules to bootstrap for this application
   * @param [config] optional extra Angular 1 config block to run when bootstrapping
   */
  bootstrapNg1(element: Element,
               modules: string[] = [],
               config?: angular.IAngularBootstrapConfig)
  {
    // Create an ng1 module to bootstrap
    const upgradeModule = angular.module(NG1_UPGRADE_MODULE_NAME, modules)

      .value(UPGRADE_MODULE_INJECTOR, this.injector)

      .run([NG1_INJECTOR, (ng1Injector: angular.IInjectorService) => {
        // We have to do a little dance to get the ng1 injector into the module injector.
        // We store the ng1 injector so that the provider in the module injector can access it
        // Then we "get" the ng1 injector from the module injector, which triggers the provider to read
        // the stored injector and release the reference to it.
        setNg1Injector(this.ng1Injector = ng1Injector);
        this.injector.get(NG1_INJECTOR);


        // Put the injector on the DOM, so that it can be "required"
        angular.element(element).data(
                          controllerKey(UPGRADE_MODULE_INJECTOR), this.injector);

        // Wire up the ng1 rootScope to run a digest cycle whenever the zone settles
        var $rootScope = ng1Injector.get('$rootScope');
        this.ngZone.onMicrotaskEmpty.subscribe(() => this.ngZone.runOutsideAngular(() => $rootScope.$evalAsync()));
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
      }]);

    // Bootstrap the angular 1 application inside our zone
   this.ngZone.run(() => {
      angular.bootstrap(element, [upgradeModule.name], config);
   });
  }
}