import * as angular from '../angular_js';
import { Provider, NgModule, Injector, NgZone } from '@angular/core';
import { UPGRADE_MODULE_NAME, INJECTOR_KEY, $INJECTOR } from './constants';
import { controllerKey } from '../util';


/**
 * The Ng1Module contains providers for the Ng1Adapter and all the core Angular 1 services;
 * and also holds the `bootstrapNg1()` method fo bootstrapping an upgraded Angular 1 app.
 */
@NgModule({
  providers: [
    // We must use exported named functions for the ng2 factories to keep the compiler happy:
    // > Metadata collected contains an error that will be reported at runtime:
    // >   Function calls are not supported.
    // >   Consider replacing the function or lambda with a reference to an exported function
    { provide: '$injector', useFactory: $injectorFactory },
    { provide: '$rootScope', useFactory: $rootScopeFactory, deps: ['$injector']},
    { provide: '$compile', useFactory: $compileFactory, deps: ['$injector']}
  ]
})
export class UpgradeModule {

  public $injector: angular.IInjectorService;

  constructor(public injector: Injector, public ngZone: NgZone) {}

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
    const upgradeModule = angular.module(UPGRADE_MODULE_NAME, modules)

      .value(INJECTOR_KEY, this.injector)

      .run([$INJECTOR, (ng1Injector: angular.IInjectorService) => {
        store$Injector(this.$injector = ng1Injector);
        this.injector.get($INJECTOR);


        // Put the injector on the DOM, so that it can be "required"
        angular.element(element).data(
                          controllerKey(INJECTOR_KEY), this.injector);

        // Wire up the ng1 rootScope to run a digest cycle whenever the zone settles
        var $rootScope = ng1Injector.get('$rootScope');
        this.ngZone.onMicrotaskEmpty.subscribe(() => this.ngZone.runOutsideAngular(() => $rootScope.$evalAsync()));
      }]);

    // Bootstrap the angular 1 application inside our zone
    this.ngZone.run(() => {
      angular.bootstrap(element, [upgradeModule.name], config);
    });
  }
}

// We have to do a little dance to get the ng1 injector into the module injector.
// We store the ng1 injector so that the provider in the module injector can access it
// Then we "get" the ng1 injector from the module injector, which triggers the provider to read
// the stored injector and release the reference to it.
let $injectorReference: angular.IInjectorService = null;
/** @internal */
export function store$Injector($injector: angular.IInjectorService) {
  $injectorReference = $injector;
}
/** @internal */
export function $injectorFactory() {
  const injector = $injectorReference;
  $injectorReference = null; // clear the value to prevent memory leaks
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
