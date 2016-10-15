import * as angular from '../angular_js';
import { ElementRef, Injector, EventEmitter, OnInit, OnChanges, SimpleChange, SimpleChanges, DoCheck } from '@angular/core';
import { UpgradeModule } from './upgrade_module';
import { $INJECTOR, $COMPILE, $TEMPLATE_CACHE, $HTTP_BACKEND, $CONTROLLER, $SCOPE } from './constants';
import { controllerKey } from '../util';

const NOT_SUPPORTED: any = 'NOT_SUPPORTED';
const INITIAL_VALUE = { __UNINITIALIZED__: true };

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
  [key: string]: any;
  $onInit?: () => void;
  $onChanges?: (changes: SimpleChanges) => void;
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

  constructor(private name: string, private elementRef: ElementRef, private injector: Injector) {
    this.$injector = injector.get($INJECTOR);
    this.$compile = this.$injector.get($COMPILE);
    this.$templateCache = this.$injector.get($TEMPLATE_CACHE);
    this.$httpBackend = this.$injector.get($HTTP_BACKEND);
    this.$controller = this.$injector.get($CONTROLLER);

    this.element = elementRef.nativeElement;
    this.$element = angular.element(this.element);

    this.directive = this.getDirective(name);
    this.bindings = this.extractBindings(this.directive);
    this.linkFn = this.compileTemplate(this.directive);

    // We ask for the Angular 1 scope from the Angular 2 injector, since
    // we will put the new component scope onto the new injector for each component
    const $parentScope = injector.get($SCOPE);
    // QUESTION: should we create an isolated scope if the scope is only true
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

    this.setupBindings();
  }

  setInput(name: string, value: any) {
  }

  getOutput<T>(name: string): EventEmitter<T> {
    return new EventEmitter<T>();
  }

  ngOnInit() {
    // QUESTION: why not just use $compile instead of reproducing parts of it
    if (!this.directive.bindToController && this.directive.controller) {
      this.buildController(this.directive.controller, this.$componentScope,
                           this.$element, this.directive.controllerAs);
    }
    const attrs: angular.IAttributes = NOT_SUPPORTED;
    const transcludeFn: angular.ITranscludeFunction = NOT_SUPPORTED;
    const linkController = this.resolveRequired(this.$element, this.directive.require);

    const link = this.directive.link;
    const preLink = (typeof link == 'object') && (link as angular.IDirectivePrePost).pre;
    const postLink = (typeof link == 'object') ? (link as angular.IDirectivePrePost).post : link;
    if (preLink) {
        preLink(this.$componentScope, this.$element, attrs, linkController, transcludeFn);
    }

    var childNodes: Node[] = [];
    var childNode: Node;
    while (childNode = this.element.firstChild) {
      this.element.removeChild(childNode);
      childNodes.push(childNode);
    }

    const attachElement: angular.ICloneAttachFunction = (clonedElements, scope) => {
      this.$element.append(clonedElements);
    };
    const attachChildNodes: angular.ILinkFn = (scope, cloneAttach) => cloneAttach(childNodes);

    this.linkFn(this.$componentScope, attachElement, { parentBoundTranscludeFn: attachChildNodes });

    if (postLink) {
      postLink(this.$componentScope, this.$element, attrs, linkController, transcludeFn);
    }

    // QUESTION: in Angular 1 we only call $onInit if the bindingDestination is the controller
    if (this.bindingDestination.$onInit) {
      this.bindingDestination.$onInit();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const localChanges: SimpleChanges = {};
    for (var name in changes) {
      if ((changes as Object).hasOwnProperty(name)) {
        const localName = this.bindings.propertyMap['input_' + name];
        this.bindingDestination[localName] = localChanges[localName] = changes[name].currentValue;
      }
    }
    if (this.bindingDestination.$onChanges) {
      this.bindingDestination.$onChanges(localChanges);
    }
    console.log('onChanges');
  }

  ngDoCheck() {
    const count = 0;
    const destination = this.bindingDestination;
    const lastValues = this.checkLastValues;
    const checkProperties = this.bindings.checkProperties;
    for (let i = 0; i < checkProperties.length; i++) {
      const value = destination[checkProperties[i]];
      const last = lastValues[i];
      if (value !== last) {
        if (typeof value == 'number' && isNaN(value) && typeof last == 'number' && isNaN(last)) {
          // ignore because NaN != NaN
        } else {
          const eventEmitter: EventEmitter<any> = (this as any)[this.bindings.propertyOutputs[i]];
          eventEmitter.emit(lastValues[i] = value);
        }
      }
    }
    return count;
  }

  protected setDestinationProperty(name: string, value: any) {
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
    // QUESTION: why not support link.post?
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

  private compileTemplate(directive: angular.IDirective): angular.ILinkFn {
    if (this.directive.template !== undefined) {
      return this.compileHtml(getOrCall(this.directive.template));
    } else if (this.directive.templateUrl) {
      var url = getOrCall(this.directive.templateUrl);
      var html = this.$templateCache.get(url) as string;
      if (html !== undefined) {
        return this.compileHtml(html);
      } else {
        throw new Error('loading directive templates asynchronously is not supported');
        // return new Promise((resolve, reject) => {
        //   this.$httpBackend('GET', url, null, (status: number, response: string) => {
        //     if (status == 200) {
        //       resolve(this.compileHtml(this.$templateCache.put(url, response)));
        //     } else {
        //       reject(`GET component template from '${url}' returned '${status}: ${response}'`);
        //     }
        //   });
        // });
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

  private setupBindings() {
    // null out the input properties on the component
    // QUESTION: do we need to do this if we explicitly define inputs via `@Input()`?
    const inputs = this.bindings.inputs;
    for (var i = 0; i < inputs.length; i++) {
      (this as any)[inputs[i]] = null;
    }

    // Create event emitters for each output
    // QUESTION: do we need to do this if we explicitly define inputs via `@Output()`?
    const outputs = this.bindings.outputs;
    for (var j = 0; j < outputs.length; j++) {
      const emitter = (this as any)[outputs[j]] = new EventEmitter();
      const emitFunction = (emitter: EventEmitter<any>) => (value: any) => emitter.emit(value);
      this.setDestinationProperty(outputs[j], emitFunction(emitter));
    }

    // Initialze the outputs
    // QUESTION: what is the difference between outputs and propertyOutputs??
    const propertyOutputs = this.bindings.propertyOutputs;
    for (var k = 0; k < propertyOutputs.length; k++) {
      (this as any)[propertyOutputs[k]] = new EventEmitter();
      this.checkLastValues.push(INITIAL_VALUE);
    }

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
