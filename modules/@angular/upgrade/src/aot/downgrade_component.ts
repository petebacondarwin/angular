import { Injector, ComponentFactory, ComponentFactoryResolver } from '@angular/core';
import { NG2_INJECTOR } from '../constants';
import * as angular from '../angular_js';

export function downgradeNg2Component({component, inputs = [], outputs = []}:
                              {component: any, inputs?: string[], outputs?: string[]}) : Function {

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