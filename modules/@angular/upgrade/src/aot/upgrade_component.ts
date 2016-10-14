import * as angular from '../angular_js';
import { ElementRef, EventEmitter } from '@angular/core';
import { UpgradeModule } from './upgrade_module';

export class UpgradeComponent {
  private directive: angular.IDirective;

  constructor(protected name: string, protected elementRef: ElementRef, protected upgradeModule: UpgradeModule) {
    this.directive = this.extractDirective(upgradeModule.$injector);
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
    var directives: angular.IDirective[] = $injector.get(this.name + 'Directive');
    if (directives.length > 1) {
      throw new Error('Only support single directive definition for: ' + this.name);
    }
    var directive = directives[0];
    if (directive.replace) this.notSupported('replace');
    if (directive.terminal) this.notSupported('terminal');
    if (directive.compile) this.notSupported('compile');
    var link = directive.link;
    if (typeof link == 'object') {
      if ((<angular.IDirectivePrePost>link).post) this.notSupported('link{pre/post}');
    }
    return directive;
  }

  private notSupported(feature: string) {
    throw new Error(`Upgraded directive '${this.name}' contains unsupported feature: '${feature}'.`);
  }
}