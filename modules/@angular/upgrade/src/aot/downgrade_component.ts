import { Injector, ComponentFactory, ComponentFactoryResolver } from '@angular/core';
import { INJECTOR_KEY, $INJECTOR, $PARSE } from './constants';
import { ComponentInfo } from '../metadata';
import { DowngradeComponentAdapter } from './downgrade_component_adapter';
import * as angular from '../angular_js';

let downgradeCount = 0;

export function downgradeComponent(info: ComponentInfo) : Function {

  const idPrefix = `NG2_UPGRADE_${downgradeCount++}_`;
  let idCount = 0;

  const directiveFactory: angular.IAnnotatedFunction =
    function ($injector: angular.IInjectorService, $parse: angular.IParseService) : angular.IDirective {

    return {
      restrict: 'E',
      require: '?^' + INJECTOR_KEY,
      link: (scope: angular.IScope,
            element: angular.IAugmentedJQuery,
            attrs: angular.IAttributes,
            parentInjector: Injector,
            transclude: angular.ITranscludeFunction) => {

        if (parentInjector === null) {
          parentInjector = $injector.get(INJECTOR_KEY);
        }

        const componentFactoryResolver : ComponentFactoryResolver = parentInjector.get(ComponentFactoryResolver);
        const componentFactory: ComponentFactory<any> = componentFactoryResolver.resolveComponentFactory(info.type);

        if (!componentFactory) {
          throw new Error('Expecting ComponentFactory for: ' + info.type);
        }

        const facade = new DowngradeComponentAdapter(
            idPrefix + (idCount++), info, element, attrs, scope, parentInjector, $parse, componentFactory);
        facade.setupInputs();
        facade.createComponent();
        facade.projectContent();
        facade.setupOutputs();
        facade.registerCleanup();
      }
    };
  };

  directiveFactory.$inject = [$INJECTOR, $PARSE];
  return directiveFactory;
}