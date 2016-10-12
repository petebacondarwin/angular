import {NgModule, Injector, NgZone, FactoryProvider, ComponentFactory, ComponentFactoryResolver} from '@angular/core';
import { ng1Providers, setNg1Injector } from './ng1_providers';
import * as angular from '../angular_js';

/**
 * UpgradeModule is the base class for the module that will contain all the
 * information about what Angular providers and component are to be bridged
 * between Angular 1 and Angular 2+
 */
@NgModule({
  providers: [ng1Providers]
})
export class UpgradeModule {

  static downgradeNg2Component({component, inputs = [], outputs = []}:
                                {component: any, inputs?: string[], outputs?: string[]}) : Function {
      const NG2_INJECTOR = 'ng2.Injector';

    const directiveFactory: angular.IInjectableFactory =
      function (ng1Injector: angular.IInjectorService, parse: angular.IParseService) : angular.IDirective {

      return {
        restrict: 'E',
        require: '?^' + NG2_INJECTOR,
        link: (scope: angular.IScope,
              element: angular.IAugmentedJQuery,
              attrs: angular.IAttributes,
              parentInjector: Injector,
              transclude: angular.ITranscludeFunction) => {

          if (parentInjector === null) {
            parentInjector = ng1Injector.get(NG2_INJECTOR);
          }

          const componentFactoryResolver : ComponentFactoryResolver = parentInjector.get(ComponentFactoryResolver);
          var componentFactory: ComponentFactory<any> = componentFactoryResolver.resolveComponentFactory(component);

          if (!componentFactory) {
            throw new Error('Expecting ComponentFactory for: ' + component);
          }

          const componentRef = componentFactory.create(parentInjector);
        }
      };
    };

    directiveFactory.$inject = ['$injector', '$parse', directiveFactory];
    return directiveFactory;
  }

  public ng2Injector: Injector;
  public ng1Injector: angular.IInjectorService;
  public ngZone: NgZone;

  constructor(ng2Injector: Injector) {
    this.ng2Injector = ng2Injector;
    this.ngZone = ng2Injector.get(NgZone);
  }

  // This method prevents the bootstrapping code from complaining about a
  // lack of `bootstrap` component in the metadata.
  ngDoBootstrap() {}

  /**
   * Bootstrap this NgModule with into an Angular 1 application.
   * @param element the element on which to bootstrap the Angular 1 application
   * @param [modules] the Angular 1 modules to bootstrap for this application
   * @param [config] optional extra Angular 1 config block to run when bootstrapping
   */
  bootstrapNg1(element: Element,
               modules?: string[],
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
    setNg1Injector(this.ng1Injector = ng1Injector);
    this.ng2Injector.get('$injector'); // force the reading of the value.
  }
}