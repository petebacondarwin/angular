import * as angular from '../angular_js';
import { ElementRef, EventEmitter, OnInit, OnChanges, DoCheck } from '@angular/core';
import { UpgradeModule } from './upgrade_module';
import { $COMPILE, $TEMPLATE_CACHE, $HTTP_BACKEND } from './constants';

class Bindings {
  inputs: string[] = [];
  inputsRename: string[] = [];
  outputs: string[] = [];
  outputsRename: string[] = [];
  propertyOutputs: string[] = [];
  checkProperties: string[] = [];
  propertyMap: {[name: string]: string} = {};
}

export class UpgradeComponent implements OnInit, OnChanges, DoCheck {
  private $injector: angular.IInjectorService;
  private $compile: angular.ICompileService;
  private $templateCache: angular.ITemplateCacheService;
  private $httpBackend: angular.IHttpBackendService;
  private directive: angular.IDirective;
  private bindings: Bindings;
  private linkFnPromise: Promise<angular.ILinkFn>;

  constructor(protected name: string, protected elementRef: ElementRef, protected upgradeModule: UpgradeModule) {
    this.$injector = upgradeModule.$injector;
    this.$compile = this.$injector.get($COMPILE);
    this.$templateCache = this.$injector.get($TEMPLATE_CACHE);
    this.$httpBackend = this.$injector.get($HTTP_BACKEND);

    this.directive = this.extractDirective(upgradeModule.$injector);
    this.bindings = this.extractBindings(this.directive);
    this.linkFnPromise = this.compileTemplate(this.directive);
  }

  setInput(name: string, value: any) {
  }

  getOutput<T>(name: string): EventEmitter<T> {
    return new EventEmitter<T>();
  }

  ngOnInit() {
  }

  ngOnChanges() {
  }

  ngDoCheck() {
  }


  private extractDirective($injector: angular.IInjectorService): angular.IDirective {
    const directives: angular.IDirective[] = $injector.get(this.name + 'Directive');
    if (directives.length > 1) {
      throw new Error('Only support single directive definition for: ' + this.name);
    }
    const directive = directives[0];
    if (directive.replace) this.notSupported('replace');
    if (directive.terminal) this.notSupported('terminal');
    if (directive.compile) this.notSupported('compile');
    const link = directive.link;
    if (typeof link == 'object') {
      if ((<angular.IDirectivePrePost>link).post) this.notSupported('link{pre/post}');
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
      return Promise.resolve(compileHtml(getOrCall(this.directive.template)));
    } else if (this.directive.templateUrl) {
      var url = getOrCall(this.directive.templateUrl);
      var html = this.$templateCache.get(url) as string;
      if (html !== undefined) {
        return Promise.resolve(compileHtml(html));
      } else {
        return new Promise((resolve, reject) => {
          this.$httpBackend('GET', url, null, (status: number, response: string) => {
            if (status == 200) {
              resolve(compileHtml(this.$templateCache.put(url, response)));
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

  private notSupported(feature: string) {
    throw new Error(`Upgraded directive '${this.name}' contains unsupported feature: '${feature}'.`);
  }
}


function compileHtml(html: string): angular.ILinkFn {
  const div = document.createElement('div');
  div.innerHTML = html;
  return this.$compile(div.childNodes);
}
function getOrCall<T>(property: Function | T): T {
  return typeof(property) === 'function' ? property() : property;
}
