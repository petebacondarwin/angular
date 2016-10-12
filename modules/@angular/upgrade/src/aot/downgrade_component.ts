import { Injector, ComponentFactory, ComponentFactoryResolver } from '@angular/core';
import { NG2_INJECTOR } from '../constants';
import { ComponentInfo } from '../metadata';
import { DowngradeNg2ComponentAdapter } from '../downgrade_ng2_adapter';
import * as angular from '../angular_js';

let downgradeCount = 0;

export function downgradeNg2Component(info: ComponentInfo) : Function {

  const idPrefix = `NG2_UPGRADE_${downgradeCount++}_`;
  let idCount = 0;

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
        const componentFactory: ComponentFactory<any> = componentFactoryResolver.resolveComponentFactory(info.type);

        if (!componentFactory) {
          throw new Error('Expecting ComponentFactory for: ' + info.type);
        }


        const facade = new DowngradeNg2ComponentAdapter(
            idPrefix + (idCount++), info, element, attrs, scope, <Injector>parentInjector, parse,
            componentFactory);
        facade.setupInputs();
        facade.bootstrapNg2();
        facade.projectContent();
        facade.setupOutputs();
        facade.registerCleanup();
      }
    };
  };

  directiveFactory.$inject = ['$injector', '$parse'];
  return directiveFactory;
}