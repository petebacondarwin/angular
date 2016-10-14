/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Injector, Class, Component, Directive, ElementRef, Input, Output, OnChanges, OnDestroy,
  SimpleChanges, EventEmitter, NO_ERRORS_SCHEMA, NgModule, NgModuleRef, OpaqueToken, Testability,
  destroyPlatform, forwardRef
} from '@angular/core';
import { async, fakeAsync, tick } from '@angular/core/testing';
import { BrowserModule, platformBrowser } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Ng1Adapter, Ng1Module, downgradeInjectable, downgradeNg2Component, UpgradeComponent } from '@angular/upgrade';
import { parseFields } from '@angular/upgrade/src/metadata';
import * as angular from '@angular/upgrade/src/angular_js';

export function main() {
  fdescribe('adapter: ng1 to ng2', () => {
    beforeEach(() => destroyPlatform());
    afterEach(() => destroyPlatform());

    it('should have angular 1 loaded', () => expect(angular.version.major).toBe(1));

    it('should instantiate ng2 in ng1 template and project content', async(() => {

      // the ng2 component that will be used in ng1 (downgraded)
      @Component({
        selector: 'ng2',
        template: `{{ 'NG2' }}(<ng-content></ng-content>)`
      })
      class Ng2Component {}

      // our upgrade module to host the component to downgrade
      @NgModule({
        imports: [BrowserModule, Ng1Module],
        declarations: [Ng2Component],
        entryComponents: [Ng2Component]
      })
      class Ng2Module  {
        ngDoBootstrap() {}
      }

      // the ng1 app module that will consume the downgraded component
      const ng1Module = angular.module('ng1', [])
        // create an ng1 facade of the ng2 component
        .directive('ng2', downgradeNg2Component({ selector: 'ng2', type: Ng2Component }));

      const element =
          html('<div>{{ \'ng1[\' }}<ng2>~{{ \'ng-content\' }}~</ng2>{{ \']\' }}</div>');

      platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
        const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
        adapter.bootstrapNg1(element, [ng1Module.name]);
        expect(document.body.textContent).toEqual('ng1[NG2(~ng-content~)]');
      });
    }));

    // it('should instantiate ng1 in ng2 template and project content', async(() => {
    //      const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
    //      const ng1Module = angular.module('ng1', []);

    //      const Ng2 = Component({
    //                    selector: 'ng2',
    //                    template: `{{ 'ng2(' }}<ng1>{{'transclude'}}</ng1>{{ ')' }}`,
    //                  }).Class({constructor: function Ng2() {}});

    //      const Ng2Module = NgModule({
    //                          declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
    //                          imports: [BrowserModule],
    //                          schemas: [NO_ERRORS_SCHEMA],
    //                        }).Class({constructor: function Ng2Module() {}});

    //      ng1Module.directive('ng1', () => {
    //        return {transclude: true, template: '{{ "ng1" }}(<ng-transclude></ng-transclude>)'};
    //      });
    //      ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));

    //      const element = html('<div>{{\'ng1(\'}}<ng2></ng2>{{\')\'}}</div>');

    //      adapter.bootstrap(element, ['ng1']).ready((ref) => {
    //        expect(document.body.textContent).toEqual('ng1(ng2(ng1(transclude)))');
    //        ref.dispose();
    //      });
    //    }));
    // describe('scope/component change-detection', () => {
    //   it('should interleave scope and component expressions', async(() => {
    //        const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
    //        const ng1Module = angular.module('ng1', []);
    //        const log: any[] /** TODO #9100 */ = [];
    //        const l = (value: any /** TODO #9100 */) => {
    //          log.push(value);
    //          return value + ';';
    //        };

    //        ng1Module.directive('ng1a', () => ({template: '{{ l(\'ng1a\') }}'}));
    //        ng1Module.directive('ng1b', () => ({template: '{{ l(\'ng1b\') }}'}));
    //        ng1Module.run(($rootScope: any /** TODO #9100 */) => {
    //          $rootScope.l = l;
    //          $rootScope.reset = () => log.length = 0;
    //        });

    //        const Ng2 = Component({
    //                      selector: 'ng2',
    //                      template: `{{l('2A')}}<ng1a></ng1a>{{l('2B')}}<ng1b></ng1b>{{l('2C')}}`
    //                    }).Class({constructor: function() { this.l = l; }});

    //        const Ng2Module =
    //            NgModule({
    //              declarations: [
    //                adapter.upgradeNg1Component('ng1a'), adapter.upgradeNg1Component('ng1b'), Ng2
    //              ],
    //              imports: [BrowserModule],
    //              schemas: [NO_ERRORS_SCHEMA],
    //            }).Class({constructor: function() {}});

    //        ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));

    //        const element =
    //            html('<div>{{reset(); l(\'1A\');}}<ng2>{{l(\'1B\')}}</ng2>{{l(\'1C\')}}</div>');
    //        adapter.bootstrap(element, ['ng1']).ready((ref) => {
    //          expect(document.body.textContent).toEqual('1A;2A;ng1a;2B;ng1b;2C;1C;');
    //          // https://github.com/angular/angular.js/issues/12983
    //          expect(log).toEqual(['1A', '1B', '1C', '2A', '2B', '2C', 'ng1a', 'ng1b']);
    //          ref.dispose();
    //        });
    //      }));
    // });

    describe('downgrade ng2 component', () => {
      it('should bind properties, events', async(() => {

        const ng1Module = angular.module('ng1', [])
          .run(($rootScope: angular.IScope) => {
            $rootScope['dataA'] = 'A';
            $rootScope['dataB'] = 'B';
            $rootScope['modelA'] = 'initModelA';
            $rootScope['modelB'] = 'initModelB';
            $rootScope['eventA'] = '?';
            $rootScope['eventB'] = '?';
          });

        @Component({
          selector: 'ng2',
          inputs: [
            'literal', 'interpolate', 'oneWayA', 'oneWayB', 'twoWayA', 'twoWayB'
          ],
          outputs: [
            'eventA', 'eventB', 'twoWayAEmitter: twoWayAChange',
            'twoWayBEmitter: twoWayBChange'
          ],
          template: 'ignore: {{ignore}}; ' +
              'literal: {{literal}}; interpolate: {{interpolate}}; ' +
              'oneWayA: {{oneWayA}}; oneWayB: {{oneWayB}}; ' +
              'twoWayA: {{twoWayA}}; twoWayB: {{twoWayB}}; ({{ngOnChangesCount}})'
        })
        class Ng2Component implements OnChanges{

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

        ng1Module.directive('ng2', downgradeNg2Component({
          type: Ng2Component,
          selector: 'ng2',
          inputs: parseFields([
            'literal', 'interpolate', 'oneWayA', 'oneWayB', 'twoWayA', 'twoWayB'
          ]),
          outputs: parseFields([
            'eventA', 'eventB', 'twoWayAEmitter: twoWayAChange',
            'twoWayBEmitter: twoWayBChange'
          ])
        }));

        @NgModule({
          declarations: [Ng2Component],
          entryComponents: [Ng2Component],
          imports: [BrowserModule, Ng1Module],
          schemas: [NO_ERRORS_SCHEMA],
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
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(element, [ng1Module.name]);
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
          imports: [BrowserModule, Ng1Module],
          schemas: [NO_ERRORS_SCHEMA]
        })
        class Ng2Module {
          ngDoBootstrap() {}
        }

        const ng1Module = angular.module('ng1', [])
          .directive('ng1', () => {
            return {
              template: '<div ng-if="!destroyIt"><ng2></ng2></div>'
            };
          })
          .directive('ng2', downgradeNg2Component({
            type: Ng2Component,
            selector: 'ng2'
          }));
        const element = html('<ng1></ng1>');
        platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(element, [ng1Module.name]);
          expect(element.textContent).toContain('test');
          expect(destroyed).toBe(false);

          const $rootScope = adapter.ng1Injector.get('$rootScope');
          $rootScope.$apply('destroyIt = true');

          expect(element.textContent).not.toContain('test');
          expect(destroyed).toBe(true);
        });
      }));

      it('should work when compiled outside the dom (by fallback to the root ng2.injector)', async(() => {

        @Component({selector: 'ng2', template: 'test'})
        class Ng2Component {}

        @NgModule({
          declarations: [Ng2Component],
          entryComponents: [Ng2Component],
          imports: [BrowserModule, Ng1Module],
          schemas: [NO_ERRORS_SCHEMA]
        })
        class Ng2Module {
          ngDoBootstrap() {}
        }

        const ng1Module = angular.module('ng1', [])
          .directive('ng1', [
            '$compile',
            ($compile: angular.ICompileService) => {
              return {
                link: function(
                    $scope: angular.IScope,
                    $element: angular.IAugmentedJQuery,
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
          .directive('ng2', downgradeNg2Component({
            type: Ng2Component,
            selector: 'ng2'
          }));

        const element = html('<ng1></ng1>');
        platformBrowserDynamic().bootstrapModule(Ng2Module).then((ref) => {
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(element, [ng1Module.name]);
          // the fact that the body contains the correct text means that the
          // downgraded component was able to access the moduleInjector
          // (since there is no other injector in this system)
          expect(multiTrim(document.body.textContent)).toEqual('test');
        });
      }));
    });

    describe('upgrade ng1 component', () => {
      it('should bind properties, events', async(() => {
        console.log(angular.version);
        const ng1 = {
          template: 'Hello {{fullName}}; A: {{dataA}}; B: {{dataB}}; C: {{modelC}}; | ',
          bindings: {fullName: '@', modelA: '=dataA', modelB: '=dataB', modelC: '=', event: '&'},
          controller: function($scope: angular.IScope) {
            $scope.$watch('$ctrl.dataB', (v: any /** TODO #9100 */) => {
              if (v === 'Savkin') {
                this.dataB = 'SAVKIN';
                this.event('WORKS');

                // Should not update because [model-a] is uni directional
                this.dataA = 'VICTOR';
              }
            });
          }
        };

        const ng1Module = angular.module('ng1Component', []).component('ng1', ng1);

        @Directive({
          selector: 'ng1'
        })
        class Ng1 extends UpgradeComponent {
          constructor(elementRef: ElementRef) {
            super('ng1', elementRef);
          }

          @Input() set fullName(value: string) { this.setInput('fullName', value); }

          @Input() set modeA(value: any) { this.setInput('modelA', value); }
          @Output() get modeAChange() { return this.getOutput('modelAChange'); }

          @Input() set modeB(value: any) { this.setInput('modelB', value); }
          @Output() get modeBChange() { return this.getOutput('modelBChange'); }

          @Output() get eventChange() { return this.getOutput('eventChange'); }
        }

        @Component({
          selector: 'ng2',
          template:
              '<ng1 fullName="{{last}}, {{first}}, {{city}}" [modelA]="first" [(modelB)]="last" [modelC]="city" ' +
              '(event)="event=$event"></ng1>' +
              '<ng1 fullName="{{\'TEST\'}}" modelA="First" modelB="Last" modelC="City"></ng1>' +
              '{{event}}-{{last}}, {{first}}, {{city}}'
        })
        class Ng2 {
          first = 'Victor';
          last = 'Savkin';
          city = 'SF';
          event = '?';
        }

        @NgModule({
          declarations: [Ng1, Ng2],
          entryComponents: [Ng2],
          imports: [BrowserModule, Ng1Module],
          // schemas: [NO_ERRORS_SCHEMA]
        })
        class Ng2Module {
          ngDoBootstrap() {}
        }

        const element = html(`<ng2></ng2>`);
        platformBrowserDynamic().bootstrapModule(Ng2Module).then(ref => {
          var adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(element, [ng1Module.name]);

          // // we need to do setTimeout, because the EventEmitter uses setTimeout to schedule
          // // events, and so without this we would not see the events processed.
          // setTimeout(() => {
          //   expect(multiTrim(document.body.textContent))
          //       .toEqual(
          //           'Hello SAVKIN, Victor, SF; A: VICTOR; B: SAVKIN; C: SF; | Hello TEST; A: First; B: Last; C: City; | WORKS-SAVKIN, Victor, SF');
          //   ref.dispose();
          // }, 0);

          expect(multiTrim(document.body.textContent)).toBe(
              'Hello SAVKIN, Victor, SF; A: VICTOR; B: SAVKIN; C: SF; | ' +
              'Hello TEST; A: First; B: Last; C: City; | WORKS-SAVKIN, Victor, SF');
        });
      }));

      // it('should bind optional properties', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = () => {
      //     return {
      //       template: 'Hello; A: {{dataA}}; B: {{modelB}}; | ',
      //       scope: {modelA: '=?dataA', modelB: '=?'}
      //     };
      //   };
      //   ng1Module.directive('ng1', ng1);
      //   const Ng2 = Component({
      //                 selector: 'ng2',
      //                 template: '<ng1 [modelA]="first" [modelB]="last"></ng1>' +
      //                     '<ng1 modelA="First" modelB="Last"></ng1>' +
      //                     '<ng1></ng1>' +
      //                     '<ng1></ng1>'
      //               }).Class({
      //     constructor: function() {
      //       this.first = 'Victor';
      //       this.last = 'Savkin';
      //     }
      //   });

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
      //           .toEqual(
      //               'Hello; A: Victor; B: Savkin; | Hello; A: First; B: Last; | Hello; A: ; B: ; | Hello; A: ; B: ; |');
      //       ref.dispose();
      //     }, 0);
      //   });
      // }));

      // it('should bind properties, events in controller when bindToController is not used',
      //   async(() => {
      //     const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //     const ng1Module = angular.module('ng1', []);

      //     const ng1 = () => {
      //       return {
      //         restrict: 'E',
      //         template: '{{someText}} - Length: {{data.length}}',
      //         scope: {data: '='},
      //         controller: function($scope: any /** TODO #9100 */) {
      //           $scope.someText = 'ng1 - Data: ' + $scope.data;
      //         }
      //       };
      //     };

      //     ng1Module.directive('ng1', ng1);
      //     const Ng2 =
      //         Component({
      //           selector: 'ng2',
      //           template:
      //               '{{someText}} - Length: {{dataList.length}} | <ng1 [(data)]="dataList"></ng1>'
      //         }).Class({

      //           constructor: function() {
      //             this.dataList = [1, 2, 3];
      //             this.someText = 'ng2';
      //           }
      //         });

      //     const Ng2Module = NgModule({
      //                         declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
      //                         imports: [BrowserModule],
      //                         schemas: [NO_ERRORS_SCHEMA],
      //                       }).Class({constructor: function() {}});

      //     ng1Module.directive('ng2', adapter.downgradeNg2Component(Ng2));
      //     const element = html(`<div><ng2></ng2></div>`);
      //     adapter.bootstrap(element, ['ng1']).ready((ref) => {
      //       // we need to do setTimeout, because the EventEmitter uses setTimeout to schedule
      //       // events, and so without this we would not see the events processed.
      //       setTimeout(() => {
      //         expect(multiTrim(document.body.textContent))
      //             .toEqual('ng2 - Length: 3 | ng1 - Data: 1,2,3 - Length: 3');
      //         ref.dispose();
      //       }, 0);
      //     });
      //   })
      // );

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
      //             '{{someText}} - Length: {{dataList.length}} | <ng1 [(data)]="dataList"></ng1>'
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

      // it('should support templateUrl fetched from $httpBackend', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);
      //   ng1Module.value(
      //       '$httpBackend', (method: any /** TODO #9100 */, url: any /** TODO #9100 */,
      //                       post: any /** TODO #9100 */,
      //                       cbFn: any /** TODO #9100 */) => { cbFn(200, `${method}:${url}`); });

      //   const ng1 = () => { return {templateUrl: 'url.html'}; };
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
      //     expect(multiTrim(document.body.textContent)).toEqual('GET:url.html');
      //     ref.dispose();
      //   });
      // }));

      // it('should support templateUrl as a function', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);
      //   ng1Module.value(
      //       '$httpBackend', (method: any /** TODO #9100 */, url: any /** TODO #9100 */,
      //                       post: any /** TODO #9100 */,
      //                       cbFn: any /** TODO #9100 */) => { cbFn(200, `${method}:${url}`); });

      //   const ng1 = () => { return {templateUrl() { return 'url.html'; }}; };
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
      //     expect(multiTrim(document.body.textContent)).toEqual('GET:url.html');
      //     ref.dispose();
      //   });
      // }));

      // it('should support empty template', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = () => { return {template: ''}; };
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
      //     expect(multiTrim(document.body.textContent)).toEqual('');
      //     ref.dispose();
      //   });
      // }));

      // it('should support template as a function', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);

      //   const ng1 = () => { return {template() { return ''; }}; };
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
      //     expect(multiTrim(document.body.textContent)).toEqual('');
      //     ref.dispose();
      //   });
      // }));

      // it('should support templateUrl fetched from $templateCache', async(() => {
      //   const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
      //   const ng1Module = angular.module('ng1', []);
      //   ng1Module.run(
      //       ($templateCache: any /** TODO #9100 */) => $templateCache.put('url.html', 'WORKS'));

      //   const ng1 = () => { return {templateUrl: 'url.html'}; };
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
    });

    describe('injection', () => {

      // Tokens used in ng2 to identify services
      const Ng2Service = new OpaqueToken('ng2-service');
      const Ng1Service = new OpaqueToken('ng1-service');

      // Sample ng1 NgModule for tests
      @NgModule({
        imports: [BrowserModule, Ng1Module],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          {provide: Ng2Service, useValue: 'ng2 service value'},
          // the following line is the "upgrade" of an Angular 1 service
          {provide: Ng1Service, useFactory: (i: angular.IInjectorService) => i.get('ng1Service'), deps: ['$injector']}
        ]
      })
      class MyNg2Module {
        ngDoBootstrap() {}
      }

      // create the ng1 module that will import an ng2 service
      const ng1Module = angular.module('ng1Module', [])
        .factory('ng2Service', downgradeInjectable(Ng2Service))
        .value('ng1Service', 'ng1 service value');

      it('should export ng2 instance to ng1', async(() => {
        platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(html('<div>'), [ng1Module.name]);
          const ng1Injector = adapter.ng1Injector;
          expect(ng1Injector.get('ng2Service')).toBe('ng2 service value');
        });
      }));

      it('should export ng1 instance to ng2', async(() => {
        platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(html('<div>'), [ng1Module.name]);
          var ng2Injector = adapter.injector;
          expect(ng2Injector.get(Ng1Service)).toBe('ng1 service value');
        });
      }));
    });

    describe('testability', () => {

      @NgModule({
        imports: [BrowserModule, Ng1Module]
      })
      class MyNg2Module {
        ngDoBootstrap() {}
      }

      const ng1Module = angular.module('ng1', []);

      it('should handle deferred bootstrap', fakeAsync(() => {
        let bootstrapResumed: boolean = false;
        let bootstrapCompleted: boolean = false;
        const element = html('<div></div>');
        window.name = 'NG_DEFER_BOOTSTRAP!' + window.name;

        platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
          adapter.bootstrapNg1(element, [ng1Module.name]);
          expect(bootstrapResumed).toEqual(true);
          bootstrapCompleted = true;
        });

        setTimeout(() => {
          bootstrapResumed = true;
          (<any>window).angular.resumeBootstrap();
        }, 100);

        expect(bootstrapResumed).toEqual(false);
        tick(100);
        expect(bootstrapCompleted).toEqual(true);
      }));

      xit('should wait for ng2 testability', fakeAsync(() => {
          const element = html('<div></div>');

          platformBrowserDynamic().bootstrapModule(MyNg2Module).then((ref) => {
          const adapter = ref.injector.get(Ng1Adapter) as Ng1Adapter;
            adapter.bootstrapNg1(element, [ng1Module.name]);

            const ng2Testability: Testability = adapter.injector.get(Testability);
            ng2Testability.increasePendingRequestCount();
            let ng2Stable = false;
            let ng1Stable = false;

            angular.getTestability(element).whenStable(() => {
              ng1Stable = true;
            });

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

  //   describe('examples', () => {
  //     it('should verify UpgradeAdapter example', async(() => {
  //          const adapter: UpgradeAdapter = new UpgradeAdapter(forwardRef(() => Ng2Module));
  //          const module = angular.module('myExample', []);

  //          const ng1 = () => {
  //            return {
  //              scope: {title: '='},
  //              transclude: true,
  //              template: 'ng1[Hello {{title}}!](<span ng-transclude></span>)'
  //            };
  //          };
  //          module.directive('ng1', ng1);

  //          const Ng2 =
  //              Component({
  //                selector: 'ng2',
  //                inputs: ['name'],
  //                template: 'ng2[<ng1 [title]="name">transclude</ng1>](<ng-content></ng-content>)'
  //              }).Class({constructor: function() {}});

  //          const Ng2Module = NgModule({
  //                              declarations: [adapter.upgradeNg1Component('ng1'), Ng2],
  //                              imports: [BrowserModule],
  //                              schemas: [NO_ERRORS_SCHEMA],
  //                            }).Class({constructor: function() {}});

  //          module.directive('ng2', adapter.downgradeNg2Component(Ng2));

  //          document.body.innerHTML = '<ng2 name="World">project</ng2>';

  //          adapter.bootstrap(document.body.firstElementChild, ['myExample']).ready((ref) => {
  //            expect(multiTrim(document.body.textContent))
  //                .toEqual('ng2[ng1[Hello World!](transclude)](project)');
  //            ref.dispose();
  //          });
  //        }));
  //   });
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
