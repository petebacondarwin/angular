/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Class, Component, Directive, ElementRef, EventEmitter, Injector, Input, NO_ERRORS_SCHEMA, NgModule, NgModuleRef, OnChanges, OnDestroy, OpaqueToken, Output, PlatformRef, SimpleChanges, Testability, Type, destroyPlatform, forwardRef} from '@angular/core';
import {async, fakeAsync, tick} from '@angular/core/testing';
import {BrowserModule, platformBrowser} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {UpgradeComponent, UpgradeModule, downgradeComponent, downgradeInjectable} from '@angular/upgrade';
import * as angular from '@angular/upgrade/src/angular_js';
import {parseFields} from '@angular/upgrade/src/metadata';

function bootstrap(
    platform: PlatformRef, Ng2Module: Type<{}>, element: Element, ng1Module: angular.IModule) {
  // We bootstrap the Angular 2 module first; then when it is ready (async)
  // We bootstrap the Angular 1 module on the bootstrap element
  return platform.bootstrapModule(Ng2Module).then(ref => {
    var upgrade = ref.injector.get(UpgradeModule) as UpgradeModule;
    upgrade.bootstrap(element, [ng1Module.name]);
    return upgrade;
  });
}

export function main() {
  describe('ngUpgrade (AOT)', () => {
    beforeEach(() => destroyPlatform());
    afterEach(() => destroyPlatform());

    it('should have angular 1 loaded', () => expect(angular.version.major).toBe(1));

    describe('content projection', () => {
      it('should instantiate ng2 in ng1 template and project content', async(() => {

           // the ng2 component that will be used in ng1 (downgraded)
           @Component({selector: 'ng2', template: `{{ 'NG2' }}(<ng-content></ng-content>)`})
           class Ng2Component {
           }

           // our upgrade module to host the component to downgrade
           @NgModule({
             imports: [BrowserModule, UpgradeModule],
             declarations: [Ng2Component],
             entryComponents: [Ng2Component]
           })
           class Ng2Module {
             ngDoBootstrap() {}
           }

           // the ng1 app module that will consume the downgraded component
           const ng1Module = angular
                                 .module('ng1', [])
                                 // create an ng1 facade of the ng2 component
                                 .directive('ng2', downgradeComponent({component: Ng2Component}));

           const element =
               html('<div>{{ \'ng1[\' }}<ng2>~{{ \'ng-content\' }}~</ng2>{{ \']\' }}</div>');

           platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
             expect(document.body.textContent).toEqual('ng1[NG2(~ng-content~)]');
           });
         }));

      it('should instantiate ng1 in ng2 template and project content', async(() => {

           @Component({
             selector: 'ng2',
             template: `{{ 'ng2(' }}<ng1>{{'transclude'}}</ng1>{{ ')' }}`,
           })
           class Ng2Component {
           }


           @Directive({selector: 'ng1'})
           class Ng1WrapperComponent extends UpgradeComponent {
             constructor(elementRef: ElementRef, injector: Injector) {
               super('ng1', elementRef, injector);
             }
           }

           @NgModule({
             declarations: [Ng1WrapperComponent, Ng2Component],
             entryComponents: [Ng2Component],
             imports: [BrowserModule, UpgradeModule]
           })
           class Ng2Module {
             ngDoBootstrap() {}
           }

           const ng1Module = angular.module('ng1', [])
                                 .directive(
                                     'ng1',
                                     () => {
                                       return {
                                         transclude: true,
                                         template: '{{ "ng1" }}(<ng-transclude></ng-transclude>)'
                                       };
                                     })
                                 .directive('ng2', downgradeComponent({component: Ng2Component}));

           const element = html('<div>{{\'ng1(\'}}<ng2></ng2>{{\')\'}}</div>');

           platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
             expect(document.body.textContent).toEqual('ng1(ng2(ng1(transclude)))');
           });
         }));
    });

    describe('scope/component change-detection', () => {
      it('should interleave scope and component expressions', async(() => {
           const log: any[] /** TODO #9100 */ = [];
           const l = (value: any /** TODO #9100 */) => {
             log.push(value);
             return value + ';';
           };

           @Directive({selector: 'ng1a'})
           class Ng1aComponent extends UpgradeComponent {
             constructor(elementRef: ElementRef, injector: Injector) {
               super('ng1a', elementRef, injector);
             }
           }

           @Directive({selector: 'ng1b'})
           class Ng1bComponent extends UpgradeComponent {
             constructor(elementRef: ElementRef, injector: Injector) {
               super('ng1b', elementRef, injector);
             }
           }

           @Component({
             selector: 'ng2',
             template: `{{l('2A')}}<ng1a></ng1a>{{l('2B')}}<ng1b></ng1b>{{l('2C')}}`
           })
           class Ng2Component {
             l: (value: any) => string;
             constructor() { this.l = l; }
           }

           @NgModule({
             declarations: [Ng1aComponent, Ng1bComponent, Ng2Component],
             entryComponents: [Ng2Component],
             imports: [BrowserModule, UpgradeModule]
           })
           class Ng2Module {
             ngDoBootstrap() {}
           }

           const ng1Module = angular.module('ng1', [])
                                 .directive('ng1a', () => ({template: '{{ l(\'ng1a\') }}'}))
                                 .directive('ng1b', () => ({template: '{{ l(\'ng1b\') }}'}))
                                 .directive('ng2', downgradeComponent({component: Ng2Component}))
                                 .run(($rootScope: any /** TODO #9100 */) => {
                                   $rootScope.l = l;
                                   $rootScope.reset = () => log.length = 0;
                                 });

           const element =
               html('<div>{{reset(); l(\'1A\');}}<ng2>{{l(\'1B\')}}</ng2>{{l(\'1C\')}}</div>');
           platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
             expect(document.body.textContent).toEqual('1A;2A;ng1a;2B;ng1b;2C;1C;');
             // https://github.com/angular/angular.js/issues/12983
             expect(log).toEqual(['1A', '1B', '1C', '2A', '2B', '2C', 'ng1a', 'ng1b']);
           });
         }));
    });

    describe('downgrade ng2 component', () => {
      it('should bind properties, events', async(() => {

           const ng1Module = angular.module('ng1', []).run(($rootScope: angular.IScope) => {
             $rootScope['dataA'] = 'A';
             $rootScope['dataB'] = 'B';
             $rootScope['modelA'] = 'initModelA';
             $rootScope['modelB'] = 'initModelB';
             $rootScope['eventA'] = '?';
             $rootScope['eventB'] = '?';
           });

           @Component({
             selector: 'ng2',
             inputs: ['literal', 'interpolate', 'oneWayA', 'oneWayB', 'twoWayA', 'twoWayB'],
             outputs: [
               'eventA', 'eventB', 'twoWayAEmitter: twoWayAChange', 'twoWayBEmitter: twoWayBChange'
             ],
             template: 'ignore: {{ignore}}; ' +
                 'literal: {{literal}}; interpolate: {{interpolate}}; ' +
                 'oneWayA: {{oneWayA}}; oneWayB: {{oneWayB}}; ' +
                 'twoWayA: {{twoWayA}}; twoWayB: {{twoWayB}}; ({{ngOnChangesCount}})'
           })
           class Ng2Component implements OnChanges {
             ngOnChangesCount = 0;
             ignore = '-';
             literal = '?';
             interpolate = '?';
             oneWayA = '?';
             oneWayB = '?';
             twoWayA = '?';
             twoWayB = '?';
             eventA = new EventEmitter();
             eventB = new EventEmitter();
             twoWayAEmitter = new EventEmitter();
             twoWayBEmitter = new EventEmitter();

             ngOnChanges(changes: SimpleChanges) {
               const assert = (prop: string, value: any) => {
                 const propVal = (this as any)[prop];
                 if (propVal != value) {
                   throw new Error(`Expected: '${prop}' to be '${value}' but was '${propVal}'`);
                 }
               };

               const assertChange = (prop: string, value: any) => {
                 assert(prop, value);
                 if (!changes[prop]) {
                   throw new Error(`Changes record for '${prop}' not found.`);
                 }
                 const actualValue = changes[prop].currentValue;
                 if (actualValue != value) {
                   throw new Error(
                       `Expected changes record for'${prop}' to be '${value}' but was '${actualValue}'`);
                 }
               };

               switch (this.ngOnChangesCount++) {
                 case 0:
                   assert('ignore', '-');
                   assertChange('literal', 'Text');
                   assertChange('interpolate', 'Hello world');
                   assertChange('oneWayA', 'A');
                   assertChange('oneWayB', 'B');
                   assertChange('twoWayA', 'initModelA');
                   assertChange('twoWayB', 'initModelB');

                   this.twoWayAEmitter.emit('newA');
                   this.twoWayBEmitter.emit('newB');
                   this.eventA.emit('aFired');
                   this.eventB.emit('bFired');
                   break;
                 case 1:
                   assertChange('twoWayA', 'newA');
                   break;
                 case 2:
                   assertChange('twoWayB', 'newB');
                   break;
                 default:
                   throw new Error('Called too many times! ' + JSON.stringify(changes));
               }
             };
           }

           ng1Module.directive(
               'ng2', downgradeComponent({
                 component: Ng2Component,
                 inputs: ['literal', 'interpolate', 'oneWayA', 'oneWayB', 'twoWayA', 'twoWayB'],
                 outputs: [
                   'eventA', 'eventB', 'twoWayAEmitter: twoWayAChange',
                   'twoWayBEmitter: twoWayBChange'
                 ]
               }));

           @NgModule({
             declarations: [Ng2Component],
             entryComponents: [Ng2Component],
             imports: [BrowserModule, UpgradeModule]
           })
           class Ng2Module {
             ngDoBootstrap() {}
           }

           const element = html(`<div>
          <ng2 literal="Text" interpolate="Hello {{'world'}}"
                bind-one-way-a="dataA" [one-way-b]="dataB"
                bindon-two-way-a="modelA" [(two-way-b)]="modelB"
                on-event-a='eventA=$event' (event-b)="eventB=$event"></ng2>
          | modelA: {{modelA}}; modelB: {{modelB}}; eventA: {{eventA}}; eventB: {{eventB}};
          </div>`);
           platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
             expect(multiTrim(document.body.textContent))
                 .toEqual(
                     'ignore: -; ' +
                     'literal: Text; interpolate: Hello world; ' +
                     'oneWayA: A; oneWayB: B; twoWayA: newA; twoWayB: newB; (2) | ' +
                     'modelA: newA; modelB: newB; eventA: aFired; eventB: bFired;');
           });
         }));

      it('should properly run cleanup when ng1 directive is destroyed', async(() => {

           let destroyed = false;
           @Component({selector: 'ng2', template: 'test'})
           class Ng2Component implements OnDestroy {
             ngOnDestroy() { destroyed = true; }
           }

           @NgModule({
             declarations: [Ng2Component],
             entryComponents: [Ng2Component],
             imports: [BrowserModule, UpgradeModule]
           })
           class Ng2Module {
             ngDoBootstrap() {}
           }

           const ng1Module =
               angular.module('ng1', [])
                   .directive(
                       'ng1',
                       () => { return {template: '<div ng-if="!destroyIt"><ng2></ng2></div>'}; })
                   .directive('ng2', downgradeComponent({component: Ng2Component}));
           const element = html('<ng1></ng1>');
           platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
             expect(element.textContent).toContain('test');
             expect(destroyed).toBe(false);

             const $rootScope = adapter.$injector.get('$rootScope');
             $rootScope.$apply('destroyIt = true');

             expect(element.textContent).not.toContain('test');
             expect(destroyed).toBe(true);
           });
         }));

      it('should work when compiled outside the dom (by fallback to the root ng2.injector)',
         async(() => {

           @Component({selector: 'ng2', template: 'test'})
           class Ng2Component {
           }

           @NgModule({
             declarations: [Ng2Component],
             entryComponents: [Ng2Component],
             imports: [BrowserModule, UpgradeModule]
           })
           class Ng2Module {
             ngDoBootstrap() {}
           }

           const ng1Module =
               angular.module('ng1', [])
                   .directive(
                       'ng1',
                       [
                         '$compile',
                         ($compile: angular.ICompileService) => {
                           return {
                             link: function(
                                 $scope: angular.IScope, $element: angular.IAugmentedJQuery,
                                 $attrs: angular.IAttributes) {
                               // here we compile some HTML that contains a downgraded component
                               // since it is not currently in the DOM it is not able to "require"
                               // an ng2 injector so it should use the `moduleInjector` instead.
                               const compiled = $compile('<ng2></ng2>');
                               const template = compiled($scope);
                               $element.append(template);
                             }
                           };
                         }
                       ])
                   .directive('ng2', downgradeComponent({component: Ng2Component}));

           const element = html('<ng1></ng1>');
           platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
             // the fact that the body contains the correct text means that the
             // downgraded component was able to access the moduleInjector
             // (since there is no other injector in this system)
             expect(multiTrim(document.body.textContent)).toEqual('test');
           });
         }));
    });

    describe('upgrade ng1 component', () => {
      describe('template/templateUrl', () => {
        it('should support `template` (string)', async(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {template: 'Hello, Angular!'};

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({selector: 'ng2', template: '<ng1></ng1>'})
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('Hello, Angular!');
             });
           }));

        it('should support `template` (function)', async(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {template: () => 'Hello, Angular!'};

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({selector: 'ng2', template: '<ng1></ng1>'})
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('Hello, Angular!');
             });
           }));

        it('should support not pass any arguments to `template` function', async(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: ($attrs: angular.IAttributes, $element: angular.IAugmentedJQuery) => {
                 expect($attrs).toBeUndefined();
                 expect($element).toBeUndefined();

                 return 'Hello, Angular!';
               }
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({selector: 'ng2', template: '<ng1></ng1>'})
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('Hello, Angular!');
             });
           }));

        it('should support `templateUrl` (string) fetched from `$templateCache`', async(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {templateUrl: 'ng1.component.html'};

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({selector: 'ng2', template: '<ng1></ng1>'})
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module =
                 angular.module('ng1Module', [])
                     .component('ng1', ng1Component)
                     .directive('ng2', downgradeComponent({component: Ng2Component}))
                     .run(
                         ($templateCache: angular.ITemplateCacheService) =>
                             $templateCache.put('ng1.component.html', 'Hello, Angular!'));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('Hello, Angular!');
             });
           }));

        it('should support `templateUrl` (function) fetched from `$templateCache`', async(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {templateUrl: () => 'ng1.component.html'};

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({selector: 'ng2', template: '<ng1></ng1>'})
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module =
                 angular.module('ng1Module', [])
                     .component('ng1', ng1Component)
                     .directive('ng2', downgradeComponent({component: Ng2Component}))
                     .run(
                         ($templateCache: angular.ITemplateCacheService) =>
                             $templateCache.put('ng1.component.html', 'Hello, Angular!'));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('Hello, Angular!');
             });
           }));

        it('should support not pass any arguments to `templateUrl` function', async(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               templateUrl: ($attrs: angular.IAttributes, $element: angular.IAugmentedJQuery) => {
                 expect($attrs).toBeUndefined();
                 expect($element).toBeUndefined();

                 return 'ng1.component.html';
               }
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({selector: 'ng2', template: '<ng1></ng1>'})
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module =
                 angular.module('ng1Module', [])
                     .component('ng1', ng1Component)
                     .directive('ng2', downgradeComponent({component: Ng2Component}))
                     .run(
                         ($templateCache: angular.ITemplateCacheService) =>
                             $templateCache.put('ng1.component.html', 'Hello, Angular!'));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('Hello, Angular!');
             });
           }));

        // NOT SUPPORTED YET
        xit('should support `templateUrl` (string) fetched from the server', fakeAsync(() => {
              // Define `ng1Component`
              const ng1Component: angular.IComponent = {templateUrl: 'ng1.component.html'};

              // Define `Ng1ComponentFacade`
              @Directive({selector: 'ng1'})
              class Ng1ComponentFacade extends UpgradeComponent {
                constructor(elementRef: ElementRef, injector: Injector) {
                  super('ng1', elementRef, injector);
                }
              }

              // Define `Ng2Component`
              @Component({selector: 'ng2', template: '<ng1></ng1>'})
              class Ng2Component {
              }

              // Define `ng1Module`
              const ng1Module =
                  angular.module('ng1Module', [])
                      .component('ng1', ng1Component)
                      .directive('ng2', downgradeComponent({component: Ng2Component}))
                      .value(
                          '$httpBackend',
                          (method: string, url: string, post?: any, callback?: Function) =>
                              setTimeout(
                                  () => callback(200, `${method}:${url}`.toLowerCase()), 1000));

              // Define `Ng2Module`
              @NgModule({
                declarations: [Ng1ComponentFacade, Ng2Component],
                entryComponents: [Ng2Component],
                imports: [BrowserModule, UpgradeModule]
              })
              class Ng2Module {
                ngDoBootstrap() {}
              }

              // Bootstrap
              const element = html(`<ng2></ng2>`);

              platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
                var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
                adapter.bootstrap(element, [ng1Module.name]);

                tick(500);
                expect(multiTrim(element.textContent)).toBe('');

                tick(500);
                expect(multiTrim(element.textContent)).toBe('get:ng1.component.html');
              });
            }));

        // NOT SUPPORTED YET
        xit('should support `templateUrl` (function) fetched from the server', fakeAsync(() => {
              // Define `ng1Component`
              const ng1Component: angular.IComponent = {templateUrl: () => 'ng1.component.html'};

              // Define `Ng1ComponentFacade`
              @Directive({selector: 'ng1'})
              class Ng1ComponentFacade extends UpgradeComponent {
                constructor(elementRef: ElementRef, injector: Injector) {
                  super('ng1', elementRef, injector);
                }
              }

              // Define `Ng2Component`
              @Component({selector: 'ng2', template: '<ng1></ng1>'})
              class Ng2Component {
              }

              // Define `ng1Module`
              const ng1Module =
                  angular.module('ng1Module', [])
                      .component('ng1', ng1Component)
                      .directive('ng2', downgradeComponent({component: Ng2Component}))
                      .value(
                          '$httpBackend',
                          (method: string, url: string, post?: any, callback?: Function) =>
                              setTimeout(
                                  () => callback(200, `${method}:${url}`.toLowerCase()), 1000));

              // Define `Ng2Module`
              @NgModule({
                declarations: [Ng1ComponentFacade, Ng2Component],
                entryComponents: [Ng2Component],
                imports: [BrowserModule, UpgradeModule]
              })
              class Ng2Module {
                ngDoBootstrap() {}
              }

              // Bootstrap
              const element = html(`<ng2></ng2>`);

              platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
                var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
                adapter.bootstrap(element, [ng1Module.name]);

                tick(500);
                expect(multiTrim(element.textContent)).toBe('');

                tick(500);
                expect(multiTrim(element.textContent)).toBe('get:ng1.component.html');
              });
            }));

        it('should support empty templates', async(() => {
             // Define `ng1Component`s
             const ng1ComponentA: angular.IComponent = {template: ''};
             const ng1ComponentB: angular.IComponent = {template: () => ''};
             const ng1ComponentC: angular.IComponent = {templateUrl: 'ng1.component.html'};
             const ng1ComponentD: angular.IComponent = {templateUrl: () => 'ng1.component.html'};

             // Define `Ng1ComponentFacade`s
             @Directive({selector: 'ng1A'})
             class Ng1ComponentAFacade extends UpgradeComponent {
               constructor(e: ElementRef, i: Injector) { super('ng1A', e, i); }
             }
             @Directive({selector: 'ng1B'})
             class Ng1ComponentBFacade extends UpgradeComponent {
               constructor(e: ElementRef, i: Injector) { super('ng1B', e, i); }
             }
             @Directive({selector: 'ng1C'})
             class Ng1ComponentCFacade extends UpgradeComponent {
               constructor(e: ElementRef, i: Injector) { super('ng1C', e, i); }
             }
             @Directive({selector: 'ng1D'})
             class Ng1ComponentDFacade extends UpgradeComponent {
               constructor(e: ElementRef, i: Injector) { super('ng1D', e, i); }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1A>Ignore this</ng1A>
              <ng1B>Ignore this</ng1B>
              <ng1C>Ignore this</ng1C>
              <ng1D>Ignore this</ng1D>
            `
             })
             class Ng2Component {
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1A', ng1ComponentA)
                                   .component('ng1B', ng1ComponentB)
                                   .component('ng1C', ng1ComponentC)
                                   .component('ng1D', ng1ComponentD)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}))
                                   .run(
                                       ($templateCache: angular.ITemplateCacheService) =>
                                           $templateCache.put('ng1.component.html', ''));

             // Define `Ng2Module`
             @NgModule({
               declarations: [
                 Ng1ComponentAFacade, Ng1ComponentBFacade, Ng1ComponentCFacade, Ng1ComponentDFacade,
                 Ng2Component
               ],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule],
               schemas: [NO_ERRORS_SCHEMA]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent)).toBe('');
             });
           }));
      });

      describe('bindings', () => {
        it('should support `@` bindings', fakeAsync(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: 'Inside: {{ $ctrl.inputA }}, {{ $ctrl.inputB }}',
               bindings: {inputA: '@inputAttrA', inputB: '@'}
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Input('inputAttrA') inputA: string;
               @Input() inputB: string;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1 inputAttrA="{{ dataA }}" inputB="{{ dataB }}"></ng1>
              | Outside: {{ dataA }}, {{ dataB }}
            `
             })
             class Ng2Component {
               dataA = 'foo';
               dataB = 'bar';
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               var ng1 = element.querySelector('ng1');
               var ng1Controller = angular.element(ng1).controller('ng1');

               expect(multiTrim(element.textContent)).toBe('Inside: foo, bar | Outside: foo, bar');

               ng1Controller.inputA = 'baz';
               ng1Controller.inputB = 'qux';
               tick();

               expect(multiTrim(element.textContent)).toBe('Inside: baz, qux | Outside: foo, bar');

               // TODO: Verify that changes in `<ng2>` propagate to `<ng1>`.
             });
           }));

        it('should support `<` bindings', fakeAsync(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: 'Inside: {{ $ctrl.inputA.value }}, {{ $ctrl.inputB.value }}',
               bindings: {inputA: '<inputAttrA', inputB: '<'}
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Input('inputAttrA') inputA: string;
               @Input() inputB: string;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1 [inputAttrA]="dataA" [inputB]="dataB"></ng1>
              | Outside: {{ dataA.value }}, {{ dataB.value }}
            `
             })
             class Ng2Component {
               dataA = {value: 'foo'};
               dataB = {value: 'bar'};
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               var ng1 = element.querySelector('ng1');
               var ng1Controller = angular.element(ng1).controller('ng1');

               expect(multiTrim(element.textContent)).toBe('Inside: foo, bar | Outside: foo, bar');

               ng1Controller.inputA = {value: 'baz'};
               ng1Controller.inputB = {value: 'qux'};
               tick();

               expect(multiTrim(element.textContent)).toBe('Inside: baz, qux | Outside: foo, bar');

               // TODO: Verify that changes in `<ng2>` propagate to `<ng1>`.
             });
           }));

        it('should support `=` bindings', fakeAsync(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: 'Inside: {{ $ctrl.inputA.value }}, {{ $ctrl.inputB.value }}',
               bindings: {inputA: '=inputAttrA', inputB: '='}
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Input('inputAttrA') inputA: string;
               @Output('inputAttrAChange') inputAChange: EventEmitter<any>;
               @Input() inputB: string;
               @Output() inputBChange: EventEmitter<any>;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1 [(inputAttrA)]="dataA" [(inputB)]="dataB"></ng1>
              | Outside: {{ dataA.value }}, {{ dataB.value }}
            `
             })
             class Ng2Component {
               dataA = {value: 'foo'};
               dataB = {value: 'bar'};
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               var ng1 = element.querySelector('ng1');
               var ng1Controller = angular.element(ng1).controller('ng1');

               expect(multiTrim(element.textContent)).toBe('Inside: foo, bar | Outside: foo, bar');

               ng1Controller.inputA = {value: 'baz'};
               ng1Controller.inputB = {value: 'qux'};
               tick();

               expect(multiTrim(element.textContent)).toBe('Inside: baz, qux | Outside: baz, qux');

               // TODO: Verify that changes in `<ng2>` propagate to `<ng1>`.
             });
           }));

        it('should support `&` bindings', fakeAsync(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: 'Inside: -',
               bindings: {outputA: '&outputAttrA', outputB: '&'}
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Output('outputAttrA') outputA: EventEmitter<any>;
               @Output() outputB: EventEmitter<any>;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1 (outputAttrA)="dataA = $event" (outputB)="dataB = $event"></ng1>
              | Outside: {{ dataA }}, {{ dataB }}
            `
             })
             class Ng2Component {
               dataA = 'foo';
               dataB = 'bar';
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               var ng1 = element.querySelector('ng1');
               var ng1Controller = angular.element(ng1).controller('ng1');

               expect(multiTrim(element.textContent)).toBe('Inside: - | Outside: foo, bar');

               ng1Controller.outputA('baz');
               ng1Controller.outputB('qux');
               tick();

               expect(multiTrim(element.textContent)).toBe('Inside: - | Outside: baz, qux');
             });
           }));

        it('should bind properties, events', fakeAsync(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: `
              Hello {{ $ctrl.fullName }};
              A: {{ $ctrl.modelA }};
              B: {{ $ctrl.modelB }};
              C: {{ $ctrl.modelC }}
            `,
               bindings:
                   {fullName: '@', modelA: '<dataA', modelB: '=dataB', modelC: '=', event: '&'},
               controller: function($scope: angular.IScope) {
                 $scope.$watch('$ctrl.modelB', (v: string) => {
                   if (v === 'Savkin') {
                     this.modelB = 'SAVKIN';
                     this.event('WORKS');

                     // Should not update because `modelA: '<dataA'` is uni-directional.
                     this.modelA = 'VICTOR';

                     // Should not update because `[modelC]` is uni-directional.
                     this.modelC = 'sf';
                   }
                 });
               }
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Input() fullName: string;
               @Input('dataA') modelA: any;
               @Input('dataB') modelB: any;
               @Output('dataBChange') modelBChange: EventEmitter<any>;
               @Input() modelC: any;
               @Output() modelCChange: EventEmitter<any>;
               @Output() event: EventEmitter<any>;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1 fullName="{{ last }}, {{ first }}, {{ city }}"
                  [(dataA)]="first" [(dataB)]="last" [modelC]="city"
                  (event)="event = $event">
              </ng1> |
              <ng1 fullName="{{ 'TEST' }}" dataA="First" dataB="Last" modelC="City"></ng1> |
              {{ event }} - {{ last }}, {{ first }}, {{ city }}
            `
             })
             class Ng2Component {
               first = 'Victor';
               last = 'Savkin';
               city = 'SF';
               event = '?';
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               expect(multiTrim(element.textContent))
                   .toBe(
                       'Hello Savkin, Victor, SF; A: VICTOR; B: SAVKIN; C: sf | ' +
                       'Hello TEST; A: First; B: Last; C: City | ' +
                       'WORKS - SAVKIN, Victor, SF');

               // Detect changes
               tick();

               expect(multiTrim(element.textContent))
                   .toBe(
                       'Hello SAVKIN, Victor, SF; A: VICTOR; B: SAVKIN; C: sf | ' +
                       'Hello TEST; A: First; B: Last; C: City | ' +
                       'WORKS - SAVKIN, Victor, SF');
             });
           }));

        it('should bind optional properties', fakeAsync(() => {
             // Define `ng1Component`
             const ng1Component: angular.IComponent = {
               template: 'Inside: {{ $ctrl.inputA.value }}, {{ $ctrl.inputB }}',
               bindings:
                   {inputA: '=?inputAttrA', inputB: '=?', outputA: '&?outputAttrA', outputB: '&?'}
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: 'ng1'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Input('inputAttrA') inputA: string;
               @Output('inputAttrAChange') inputAChange: EventEmitter<any>;
               @Input() inputB: string;
               @Output() inputBChange: EventEmitter<any>;
               @Output('outputAttrA') outputA: EventEmitter<any>;
               @Output() outputB: EventEmitter<any>;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
              <ng1 [(inputAttrA)]="dataA" [(inputB)]="dataB.value"></ng1> |
              <ng1 inputB="Bar" (outputAttrA)="dataA = $event"></ng1> |
              <ng1 (outputB)="updateDataB($event)"></ng1> |
              <ng1></ng1> |
              Outside: {{ dataA.value }}, {{ dataB.value }}
            `
             })
             class Ng2Component {
               dataA = {value: 'foo'};
               dataB = {value: 'bar'};

               updateDataB(value: any) { this.dataB.value = value; }
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .component('ng1', ng1Component)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);

               const $rootScope = adapter.$injector.get('$rootScope') as angular.IRootScopeService;

               var ng1s = element.querySelectorAll('ng1');
               var ng1Controller0 = angular.element(ng1s[0]).controller('ng1');
               var ng1Controller1 = angular.element(ng1s[1]).controller('ng1');
               var ng1Controller2 = angular.element(ng1s[2]).controller('ng1');

               expect(multiTrim(element.textContent))
                   .toBe(
                       'Inside: foo, bar | Inside: , Bar | Inside: , | Inside: , | Outside: foo, bar');

               ng1Controller0.inputA.value = 'baz';
               ng1Controller0.inputB = 'qux';
               tick();

               expect(multiTrim(element.textContent))
                   .toBe(
                       'Inside: baz, qux | Inside: , Bar | Inside: , | Inside: , | Outside: baz, qux');

               ng1Controller1.outputA({value: 'foo again'});
               ng1Controller2.outputB('bar again');
               $rootScope.$apply();
               tick();

               // FIXME: These are failing and I have no idea why :(
               expect(ng1Controller0.inputA).toEqual({value: 'foo again'});
               expect(ng1Controller0.inputB).toEqual('bar again');
               expect(multiTrim(element.textContent))
                   .toBe(
                       'Inside: foo again, bar again | Inside: , Bar | Inside: , | Inside: , | ' +
                       'Outside: foo again, bar again');
             });
           }));

        it('should bind properties, events to scope when bindToController is not used',
           fakeAsync(() => {
             // Define `ng1Directive`
             const ng1Directive: angular.IDirective = {
               template: '{{ someText }} - Data: {{ inputA }} - Length: {{ inputA.length }}',
               scope: {inputA: '=', outputA: '&'},
               controller: function($scope: angular.IScope) {
                 $scope['someText'] = 'ng1';
                 this.$scope = $scope;
               }
             };

             // Define `Ng1ComponentFacade`
             @Directive({selector: '[ng1]'})
             class Ng1ComponentFacade extends UpgradeComponent {
               @Input() inputA: string;
               @Output() inputAChange: EventEmitter<any>;
               @Output() outputA: EventEmitter<any>;

               constructor(elementRef: ElementRef, injector: Injector) {
                 super('ng1', elementRef, injector);
               }
             }

             // Define `Ng2Component`
             @Component({
               selector: 'ng2',
               template: `
                <div ng1 [(inputA)]="dataA" (outputA)="dataA.push($event)"></div> |
                {{ someText }} - Data: {{ dataA }} - Length: {{ dataA.length }}
              `
             })
             class Ng2Component {
               someText = 'ng2';
               dataA = [1, 2, 3];
             }

             // Define `ng1Module`
             const ng1Module = angular.module('ng1Module', [])
                                   .directive('ng1', () => ng1Directive)
                                   .directive('ng2', downgradeComponent({component: Ng2Component}));

             // Define `Ng2Module`
             @NgModule({
               declarations: [Ng1ComponentFacade, Ng2Component],
               entryComponents: [Ng2Component],
               imports: [BrowserModule, UpgradeModule]
             })
             class Ng2Module {
               ngDoBootstrap() {}
             }

             // Bootstrap
             const element = html(`<ng2></ng2>`);

             platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
               var adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
               adapter.bootstrap(element, [ng1Module.name]);
               const $rootScope = adapter.$injector.get('$rootScope') as angular.IRootScopeService;

               var ng1 = element.querySelector('[ng1]');
               var ng1Controller = angular.element(ng1).controller('ng1');

               expect(multiTrim(element.textContent))
                   .toBe('ng1 - Data: [1,2,3] - Length: 3 | ng2 - Data: 1,2,3 - Length: 3');

               ng1Controller.$scope.inputA = [4, 5];
               tick();

               expect(multiTrim(element.textContent))
                   .toBe('ng1 - Data: [4,5] - Length: 2 | ng2 - Data: 4,5 - Length: 2');

               ng1Controller.$scope.outputA(6);
               tick();
               $rootScope.$apply();

               expect(ng1Controller.$scope.inputA).toEqual([4, 5, 6]);
               expect(multiTrim(element.textContent))
                   .toBe('ng1 - Data: [4,5,6] - Length: 3 | ng2 - Data: 4,5,6 - Length: 3');
             });
           }));

        // it('should bind properties, events in link function', async(() => {
        //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
        //   const ng1Module = angular.module('ng1', []);

        //   const ng1 = () => {
        //     return {
        //       restrict: 'E',
        //       template: '{{someText}} - Length: {{data.length}}',
        //       scope: {data: '='},
        //       link: function($scope: any /** TODO #9100 */) {
        //         $scope.someText = 'ng1 - Data: ' + $scope.data;
        //       }
        //     };
        //   };

        //   ng1Module.directive('ng1', ng1);
        //   const Ng2 =
        //       Component({
        //         selector: 'ng2',
        //         template:
        //             '{{someText}} - Length: {{dataList.length}} | <ng1
        //             [(data)]="dataList"></ng1>'
        //       }).Class({

        //         constructor: function() {
        //           this.dataList = [1, 2, 3];
        //           this.someText = 'ng2';
        //         }
        //       });

        //   const Ng2Module = NgModule({
        //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
        //                       imports: [BrowserModule],
        //                       schemas: [NO_ERRORS_SCHEMA],
        //                     }).Class({constructor: function() {}});

        //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
        //   const element = html(`<div><ng2></ng2></div>`);
        //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
        //     // we need to do setTimeout, because the EventEmitter uses setTimeout to schedule
        //     // events, and so without this we would not see the events processed.
        //     setTimeout(() => {
        //       expect(multiTrim(document.body.textContent))
        //           .toEqual('ng2 - Length: 3 | ng1 - Data: 1,2,3 - Length: 3');
        //       ref.dispose();
        //     }, 0);
        //   });
        // }));
      });

      // it('should support controller with controllerAs', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = () => {
      //     return {
      //       scope: true,
      //       template:
      //           '{{ctl.scope}}; {{ctl.isClass}}; {{ctl.hasElement}}; {{ctl.isPublished()}}',
      //       controllerAs: 'ctl',
      //       controller: Class({
      //         constructor: function(
      //             $scope: any /** TODO #9100 */, $element: any /** TODO #9100 */) {
      //           (<any>this).verifyIAmAClass();
      //           this.scope = $scope.$parent.$parent == $scope.$root ? 'scope' : 'wrong-scope';
      //           this.hasElement = $element[0].nodeName;
      //           this.$element = $element;
      //         },
      //         verifyIAmAClass: function() { this.isClass = 'isClass'; },
      //         isPublished: function() {
      //           return this.$element.controller('ng1') == this ? 'published' : 'not-published';
      //         }
      //       })
      //     };
      //   };
      //   ng1Module.directive('ng1', ng1);

      //   const Ng2 = Component({selector: 'ng2', template: '<ng1></ng1>'}).Class({
      //     constructor: function() {}
      //   });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
      //   const element = html(`<div><ng2></ng2></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual('scope; isClass; NG1; published');
      //     ref.dispose();
      //   });
      // }));

      // it('should support bindToController', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = () => {
      //     return {
      //       scope: {title: '@'},
      //       bindToController: true,
      //       template: '{{ctl.title}}',
      //       controllerAs: 'ctl',
      //       controller: Class({constructor: function() {}})
      //     };
      //   };
      //   ng1Module.directive('ng1', ng1);

      //   const Ng2 = Component({selector: 'ng2', template: '<ng1 title="WORKS"></ng1>'}).Class({
      //     constructor: function() {}
      //   });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
      //   const element = html(`<div><ng2></ng2></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual('WORKS');
      //     ref.dispose();
      //   });
      // }));

      // it('should support bindToController with bindings', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = () => {
      //     return {
      //       scope: {},
      //       bindToController: {title: '@'},
      //       template: '{{ctl.title}}',
      //       controllerAs: 'ctl',
      //       controller: Class({constructor: function() {}})
      //     };
      //   };
      //   ng1Module.directive('ng1', ng1);

      //   const Ng2 = Component({selector: 'ng2', template: '<ng1 title="WORKS"></ng1>'}).Class({
      //     constructor: function() {}
      //   });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
      //   const element = html(`<div><ng2></ng2></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual('WORKS');
      //     ref.dispose();
      //   });
      // }));

      // it('should support single require in linking fn', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = ($rootScope: any /** TODO #9100 */) => {
      //     return {
      //       scope: {title: '@'},
      //       bindToController: true,
      //       template: '{{ctl.status}}',
      //       require: 'ng1',
      //       controllerAs: 'ctrl',
      //       controller: Class({constructor: function() { this.status = 'WORKS'; }}),
      //       link: function(
      //           scope: any /** TODO #9100 */, element: any /** TODO #9100 */,
      //           attrs: any /** TODO #9100 */, linkController: any /** TODO #9100 */) {
      //         expect(scope.$root).toEqual($rootScope);
      //         expect(element[0].nodeName).toEqual('NG1');
      //         expect(linkController.status).toEqual('WORKS');
      //         scope.ctl = linkController;
      //       }
      //     };
      //   };
      //   ng1Module.directive('ng1', ng1);

      //   const Ng2 = Component({selector: 'ng2', template: '<ng1></ng1>'}).Class({
      //     constructor: function() {}
      //   });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
      //   const element = html(`<div><ng2></ng2></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual('WORKS');
      //     ref.dispose();
      //   });
      // }));

      // it('should support array require in linking fn', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const parent = () => {
      //     return {controller: Class({constructor: function() { this.parent = 'PARENT'; }})};
      //   };
      //   const ng1 = () => {
      //     return {
      //       scope: {title: '@'},
      //       bindToController: true,
      //       template: '{{parent.parent}}:{{ng1.status}}',
      //       require: ['ng1', '^parent', '?^^notFound'],
      //       controllerAs: 'ctrl',
      //       controller: Class({constructor: function() { this.status = 'WORKS'; }}),
      //       link: function(
      //           scope: any /** TODO #9100 */, element: any /** TODO #9100 */,
      //           attrs: any /** TODO #9100 */, linkControllers: any /** TODO #9100 */) {
      //         expect(linkControllers[0].status).toEqual('WORKS');
      //         expect(linkControllers[1].parent).toEqual('PARENT');
      //         expect(linkControllers[2]).toBe(undefined);
      //         scope.ng1 = linkControllers[0];
      //         scope.parent = linkControllers[1];
      //       }
      //     };
      //   };
      //   ng1Module.directive('parent', parent);
      //   ng1Module.directive('ng1', ng1);

      //   const Ng2 = Component({selector: 'ng2', template: '<ng1></ng1>'}).Class({
      //     constructor: function() {}
      //   });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
      //   const element = html(`<div><parent><ng2></ng2></parent></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual('PARENT:WORKS');
      //     ref.dispose();
      //   });
      // }));

      // it('should call $onInit of components', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);
      //   const valueToFind = '$onInit';

      //   const ng1 = {
      //     bindings: {},
      //     template: '{{$ctrl.value}}',
      //     controller: Class(
      //         {constructor: function() {}, $onInit: function() { this.value = valueToFind; }})
      //   };
      //   ng1Module.component('ng1', ng1);

      //   const Ng2 = Component({selector: 'ng2', template: '<ng1></ng1>'}).Class({
      //     constructor: function() {}
      //   });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));

      //   const element = html(`<div><ng2></ng2></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual(valueToFind);
      //     ref.dispose();
      //   });
      // }));

      // it('should bind input properties (<) of components', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = {
      //     bindings: {personProfile: '<'},
      //     template: 'Hello {{$ctrl.personProfile.firstName}} {{$ctrl.personProfile.lastName}}',
      //     controller: Class({constructor: function() {}})
      //   };
      //   ng1Module.component('ng1', ng1);

      //   const Ng2 =
      //       Component({selector: 'ng2', template: '<ng1 [personProfile]="goku"></ng1>'}).Class({
      //         constructor: function() { this.goku = {firstName: 'GOKU', lastName: 'SAN'}; }
      //       });

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));

      //   const element = html(`<div><ng2></ng2></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual(`Hello GOKU SAN`);
      //     ref.dispose();
      //   });
      // }));

      // it('should support ng2 > ng1 > ng2', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = {
      //     template: 'ng1(<ng2b></ng2b>)',
      //   };
      //   ng1Module.component('ng1', ng1);

      //   const Ng2a = Component({selector: 'ng2a', template: 'ng2a(<ng1></ng1>)'}).Class({
      //     constructor: function() {}
      //   });
      //   ng1Module.directive('ng2a', adapter.downgradeNg2Component(Ng2a));

      //   const Ng2b =
      //       Component({selector: 'ng2b', template: 'ng2b'}).Class({constructor: function() {}});
      //   ng1Module.directive('ng2b', adapter.downgradeNg2Component(Ng2b));

      //   const Ng2Module = NgModule({
      //                       declarations: [adapter.upgradeNg1Component('ng1'), Ng2a, Ng2b],
      //                       imports: [BrowserModule],
      //                       schemas: [NO_ERRORS_SCHEMA],
      //                     }).Class({constructor: function() {}});

      //   const element = html(`<div><ng2a></ng2a></div>`);
      //   adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //     expect(multiTrim(document.body.textContent)).toEqual('ng2a(ng1(ng2b))');
      //   });
      // }));

      //   it('should allow attribute selectors for components in ng2', async(() => {
      //        const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => MyNg2Module));
      //        const ng1Module = angular.module('myExample', []);

      //        @Component({selector: '[works]', template: 'works!'})
      //        class WorksComponent {
      //        }

      //        @Component({selector: 'root-component', template: 'It <div works></div>'})
      //        class RootComponent {
      //        }

      //        @NgModule({imports: [BrowserModule], declarations: [RootComponent, WorksComponent]})
      //        class MyNg2Module {
      //        }

      //        ng1Module.directive('rootComponent', adapter.downgradeNg2Component(RootComponent));

      //        document.body.innerHTML = '<root-component></root-component>';
      //        adapter.bootstrap(document.body.firstElementChild, ['myExample']).ready((ref) => {
      //          expect(multiTrim(document.body.textContent)).toEqual('It works!');
      //          ref.dispose();
      //        });
      //      }));
    });

    describe('injection', () => {

      it('should downgrade ng2 service to ng1', async(() => {
           // Tokens used in ng2 to identify services
           const Ng2Service = new OpaqueToken('ng2-service');

           // Sample ng1 NgModule for tests
           @NgModule({
             imports: [BrowserModule, UpgradeModule],
             providers: [
               {provide: Ng2Service, useValue: 'ng2 service value'},
             ]
           })
           class MyNg2Module {
             ngDoBootstrap() {}
           }

           // create the ng1 module that will import an ng2 service
           const ng1Module = angular.module('ng1Module', [])
                                 .factory('ng2Service', downgradeInjectable(Ng2Service));

           platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(html('<div>'), [ng1Module.name]);
             const ng1Injector = adapter.$injector;
             expect(ng1Injector.get('ng2Service')).toBe('ng2 service value');
           });
         }));

      it('should upgrade ng1 service to ng2', async(() => {
           // Tokens used in ng2 to identify services
           const Ng1Service = new OpaqueToken('ng1-service');

           // Sample ng1 NgModule for tests
           @NgModule({
             imports: [BrowserModule, UpgradeModule],
             providers: [
               // the following line is the "upgrade" of an Angular 1 service
               {
                 provide: Ng1Service,
                 useFactory: (i: angular.IInjectorService) => i.get('ng1Service'),
                 deps: ['$injector']
               }
             ]
           })
           class MyNg2Module {
             ngDoBootstrap() {}
           }

           // create the ng1 module that will import an ng2 service
           const ng1Module =
               angular.module('ng1Module', []).value('ng1Service', 'ng1 service value');

           platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(html('<div>'), [ng1Module.name]);
             var ng2Injector = adapter.injector;
             expect(ng2Injector.get(Ng1Service)).toBe('ng1 service value');
           });
         }));
    });

    describe('testability', () => {

      @NgModule({imports: [BrowserModule, UpgradeModule]})
      class MyNg2Module {
        ngDoBootstrap() {}
      }

      it('should handle deferred bootstrap', fakeAsync(() => {
           let applicationRunning = false;
           const ng1Module = angular.module('ng1', []).run(() => { applicationRunning = true; });

           const element = html('<div></div>');
           window.name = 'NG_DEFER_BOOTSTRAP!' + window.name;

           platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);
           });

           setTimeout(() => { (<any>window).angular.resumeBootstrap(); }, 100);

           expect(applicationRunning).toEqual(false);
           tick(100);
           expect(applicationRunning).toEqual(true);
         }));

      it('should wait for ng2 testability', fakeAsync(() => {
           const ng1Module = angular.module('ng1', []);
           const element = html('<div></div>');

           platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
             const adapter = ref.injector.get(UpgradeModule) as UpgradeModule;
             adapter.bootstrap(element, [ng1Module.name]);

             const ng2Testability: Testability = adapter.injector.get(Testability);
             ng2Testability.increasePendingRequestCount();
             let ng2Stable = false;
             let ng1Stable = false;

             angular.getTestability(element).whenStable(() => { ng1Stable = true; });

             setTimeout(() => {
               ng2Stable = true;
               ng2Testability.decreasePendingRequestCount();
             }, 100);

             expect(ng1Stable).toEqual(false);
             expect(ng2Stable).toEqual(false);
             tick(100);
             expect(ng1Stable).toEqual(true);
             expect(ng2Stable).toEqual(true);
           });
         }));
    });

    describe('examples', () => {
      it('should verify UpgradeAdapter example', async(() => {

           // This is wrapping (upgrading) an Angular 1 component to be used in an Angular 2
           // component
           @Directive({selector: 'ng1'})
           class Ng1Component extends UpgradeComponent {
             constructor(elementRef: ElementRef, injector: Injector) {
               super('ng1', elementRef, injector);
             }
             @Input() title: string;
           }

           // This is an Angular 2 component that will be downgraded
           @Component({
             selector: 'ng2',
             template: 'ng2[<ng1 [title]="name">transclude</ng1>](<ng-content></ng-content>)'
           })
           class Ng2Component {
             @Input('name') nameProp: string;
           }

           // This module represents the Angular 2 pieces of the application
           @NgModule({
             declarations: [Ng1Component, Ng2Component],
             entryComponents: [Ng2Component],
             imports: [BrowserModule, UpgradeModule]
           })
           class Ng2Module {
             ngDoBootstrap() { /* this is a placeholder to stop the boostrapper from complaining */
             }
           }

           // This module represents the Angular 1 pieces of the application
           const ng1Module =
               angular
                   .module('myExample', [])
                   // This is an Angular 1 component that will be upgraded
                   .directive(
                       'ng1',
                       () => {
                         return {
                           scope: {title: '='},
                           transclude: true,
                           template: 'ng1[Hello {{title}}!](<span ng-transclude></span>)'
                         };
                       })
                   // This is wrapping (downgrading) an Angular 2 component to be used in Angular 1
                   .directive(
                       'ng2', downgradeComponent({component: Ng2Component, inputs: ['name']}));

           // This is the (Angular 1) application bootstrap element
           // Notice that it is actually a downgraded Angular 2 component
           document.body.innerHTML = '<ng2 name="World">project</ng2>';

           // Let's use a helper function to make this simpler
           bootstrap(
               platformBrowserDynamic(), Ng2Module, document.body.firstElementChild, ng1Module)
               .then(upgrade => {
                 expect(multiTrim(document.body.textContent))
                     .toEqual('ng2[ng1[Hello World!](transclude)](project)');
               });
         }));
    });
  });
}

function multiTrim(text: string): string {
  return text.replace(/\n/g, '').replace(/\s\s+/g, ' ').trim();
}

function html(html: string): Element {
  const body = document.body;
  body.innerHTML = html;
  if (body.childNodes.length == 1 && body.firstChild instanceof HTMLElement)
    return <Element>body.firstChild;
  return body;
}
