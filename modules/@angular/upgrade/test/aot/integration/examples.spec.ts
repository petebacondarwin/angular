import {Component, Directive, ElementRef, Injector, Input, NgModule, destroyPlatform} from '@angular/core';
import {async} from '@angular/core/testing';
import {BrowserModule} from '@angular/platform-browser';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {UpgradeComponent, UpgradeModule, downgradeComponent} from '@angular/upgrade';
import * as angular from '@angular/upgrade/src/angular_js';

import {bootstrap, html, multiTrim} from '../test_helpers';

export function main() {
  describe('examples', () => {

    beforeEach(() => destroyPlatform());
    afterEach(() => destroyPlatform());

    it('should have angular 1 loaded', () => expect(angular.version.major).toBe(1));

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
                 .directive('ng2', downgradeComponent({component: Ng2Component, inputs: ['name']}));

         // This is the (Angular 1) application bootstrap element
         // Notice that it is actually a downgraded Angular 2 component
         const element = html('<ng2 name="World">project</ng2>');

         // Let's use a helper function to make this simpler
         bootstrap(platformBrowserDynamic(), Ng2Module, element, ng1Module).then(upgrade => {
           expect(multiTrim(element.textContent))
               .toEqual('ng2[ng1[Hello World!](transclude)](project)');
         });
       }));
  });
}