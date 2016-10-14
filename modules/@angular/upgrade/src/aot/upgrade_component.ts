import * as angular from '../angular_js';
import { ElementRef, EventEmitter, OnInit, OnChanges, DoCheck } from '@angular/core';
import { UpgradeModule } from './upgrade_module';
import { $COMPILE, $TEMPLATE_CACHE, $HTTP_BACKEND, $CONTROLLER, $SCOPE } from './constants';
import { controllerKey } from '../util';

const NOT_SUPPORTED: any = 'NOT_SUPPORTED';

class Bindings {
  inputs: string[] = [];
  inputsRename: string[] = [];
  outputs: string[] = [];
  outputsRename: string[] = [];
  propertyOutputs: string[] = [];
  checkProperties: string[] = [];
  propertyMap: {[name: string]: string} = {};
}

interface IBindingDestination {
  [key: string]: any
  $onInit?: () => any
}

export class UpgradeComponent implements OnInit, OnChanges, DoCheck {
  private $injector: angular.IInjectorService;
  private $compile: angular.ICompileService;
  private $templateCache: angular.ITemplateCacheService;
  private $httpBackend: angular.IHttpBackendService;
  private $controller: angular.IControllerService;

  private element: Element;
  private $element: angular.IAugmentedJQuery;
  private $componentScope: angular.IScope;

  private directive: angular.IDirective;
  private bindings: Bindings;
  private linkFn: angular.ILinkFn;

  private bindingDestination: IBindingDestination = null;
  private checkLastValues: any[] = [];

  constructor(private name: string, private elementRef: ElementRef, private upgradeModule: UpgradeModule) {
    this.$injector = upgradeModule.$injector;
    this.$compile = this.$injector.get($COMPILE);
    this.$templateCache = this.$injector.get($TEMPLATE_CACHE);
    this.$httpBackend = this.$injector.get($HTTP_BACKEND);
    this.$controller = this.$injector.get($CONTROLLER);

    this.element = elementRef.nativeElement;
    this.$element = angular.element(this.element);

    this.directive = this.getDirective(name);
    this.bindings = this.extractBindings(this.directive);
    this.compileTemplate(this.directive).then((linkFn) => {
      this.linkFn = linkFn;
    });

    // We ask for the Angular 1 scope from the Angular 2 injector, since
    // we will put the new component scope onto the new injector for each component
    const $parentScope = upgradeModule.injector.get($SCOPE);
    this.$componentScope = $parentScope.$new(!!this.directive.scope);

    const controllerType = this.directive.controller;
    // QUESTION: shouldn't we be building the controller in any case?
    if (this.directive.bindToController && controllerType) {
      this.bindingDestination =
          this.buildController(controllerType, this.$componentScope,
                               this.$element, this.directive.controllerAs);
    } else {
      this.bindingDestination = this.$componentScope;
    }

    // TODO: do stuff about inputs and outputs...
  }

  setInput(name: string, value: any) {
  }

  getOutput<T>(name: string): EventEmitter<T> {
    return new EventEmitter<T>();
  }

  ngOnInit() {
    if (!this.directive.bindToController && this.directive.controller) {
      this.buildController(this.directive.controller, this.$componentScope,
                           this.$element, this.directive.controllerAs);
    }
    let link = this.directive.link;
    if (typeof link == 'object') link = (link as angular.IDirectivePrePost).pre;
    if (link) {
      const attrs: angular.IAttributes = NOT_SUPPORTED;
      const transcludeFn: angular.ITranscludeFunction = NOT_SUPPORTED;
      const linkController = this.resolveRequired(this.$element, this.directive.require);
      (<angular.IDirectiveLinkFn>this.directive.link)(
          this.$componentScope, this.$element, attrs, linkController, transcludeFn);
    }

    var childNodes: Node[] = [];
    var childNode: any /** TODO #9100 */;
    while (childNode = this.element.firstChild) {
      this.element.removeChild(childNode);
      childNodes.push(childNode);
    }
    this.linkFn(this.$componentScope, (clonedElement, scope) => {
      for (var i = 0, ii = clonedElement.length; i < ii; i++) {
        this.element.appendChild(clonedElement[i]);
      }
    }, {
      parentBoundTranscludeFn: (scope: any /** TODO #9100 */,
                                cloneAttach: any /** TODO #9100 */) => { cloneAttach(childNodes); }
    });

    if (this.bindingDestination.$onInit) {
      this.bindingDestination.$onInit();
    }
  }

  ngOnChanges() {
  }

  ngDoCheck() {
  }

  setComponentProperty(name: string, value: any) {
    const property = this.bindings.propertyMap[name];
    this.bindingDestination[property] = value;
  }

  private getDirective(name: string): angular.IDirective {
    const directives: angular.IDirective[] = this.$injector.get(name + 'Directive');
    if (directives.length > 1) {
      throw new Error('Only support single directive definition for: ' + this.name);
    }
    const directive = directives[0];
    if (directive.replace) this.notSupported('replace');
    if (directive.terminal) this.notSupported('terminal');
    if (directive.compile) this.notSupported('compile');
    const link = directive.link;
    if (typeof link == 'object') {
      if ((<angular.IDirectivePrePost>link).post) this.notSupported('link.post');
    }
    return directive;
  }

  private extractBindings(directive: angular.IDirective) {
    const btcIsObject = typeof directive.bindToController === 'object';
    if (btcIsObject && Object.keys(directive.scope).length) {
      throw new Error(
          `Binding definitions on scope and controller at the same time are not supported.`);
    }

    const context = (btcIsObject) ? directive.bindToController : directive.scope;
    const bindings = new Bindings();

    if (typeof context == 'object') {
      for (let name in context) {
        if ((context as Object).hasOwnProperty(name)) {
          let localName = context[name];
          const type = localName.charAt(0);
          const typeOptions = localName.charAt(1);
          localName = typeOptions === '?' ? localName.substr(2) : localName.substr(1);
          localName = localName || name;

          const outputName = 'output_' + name;
          const outputNameRename = outputName + ': ' + name;
          const outputNameRenameChange = outputName + ': ' + name + 'Change';
          const inputName = 'input_' + name;
          const inputNameRename = inputName + ': ' + name;
          switch (type) {
            case '=':
              bindings.propertyOutputs.push(outputName);
              bindings.checkProperties.push(localName);
              bindings.outputs.push(outputName);
              bindings.outputsRename.push(outputNameRenameChange);
              bindings.propertyMap[outputName] = localName;
              bindings.inputs.push(inputName);
              bindings.inputsRename.push(inputNameRename);
              bindings.propertyMap[inputName] = localName;
              break;
            case '@':
            // handle the '<' binding of angular 1.5 components
            case '<':
              bindings.inputs.push(inputName);
              bindings.inputsRename.push(inputNameRename);
              bindings.propertyMap[inputName] = localName;
              break;
            case '&':
              bindings.outputs.push(outputName);
              bindings.outputsRename.push(outputNameRename);
              bindings.propertyMap[outputName] = localName;
              break;
            default:
              var json = JSON.stringify(context);
              throw new Error(
                  `Unexpected mapping '${type}' in '${json}' in '${this.name}' directive.`);
          }
        }
      }
    }
    return bindings;
  }

  private compileTemplate(directive: angular.IDirective): Promise<angular.ILinkFn> {
    if (this.directive.template !== undefined) {
      return Promise.resolve(this.compileHtml(getOrCall(this.directive.template)));
    } else if (this.directive.templateUrl) {
      var url = getOrCall(this.directive.templateUrl);
      var html = this.$templateCache.get(url) as string;
      if (html !== undefined) {
        return Promise.resolve(this.compileHtml(html));
      } else {
        return new Promise((resolve, reject) => {
          this.$httpBackend('GET', url, null, (status: number, response: string) => {
            if (status == 200) {
              resolve(this.compileHtml(this.$templateCache.put(url, response)));
            } else {
              reject(`GET component template from '${url}' returned '${status}: ${response}'`);
            }
          });
        });
      }
    } else {
      throw new Error(`Directive '${this.name}' is not a component, it is missing template.`);
    }
  }

  private buildController(controllerType: angular.IController, $scope: angular.IScope,
                          $element: angular.IAugmentedJQuery, controllerAs: string) {
    var locals = {$scope, $element};
    var controller = this.$controller(controllerType, locals, null, controllerAs);
    $element.data(controllerKey(this.directive.name), controller);
    return controller;
  }

  private resolveRequired($element: angular.IAugmentedJQuery, require: angular.DirectiveRequireProperty) {
    // TODO
  }

  private notSupported(feature: string) {
    throw new Error(`Upgraded directive '${this.name}' contains unsupported feature: '${feature}'.`);
  }

  private compileHtml(html: string): angular.ILinkFn {
    const div = document.createElement('div');
    div.innerHTML = html;
    return this.$compile(div.childNodes);
  }
}


function getOrCall<T>(property: Function | T): T {
  return typeof(property) === 'function' ? property() : property;
}
