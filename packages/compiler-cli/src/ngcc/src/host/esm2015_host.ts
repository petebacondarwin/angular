/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { Decorator } from '../../../ngtsc/host';
import { TypeScriptReflectionHost } from '../../../ngtsc/metadata/src/reflector';
import { NgccReflectionHost } from './ngcc_host';

const DECORATORS = 'decorators' as ts.__String;

/**
 * Fesm 2015 are a single file containing ECMAScript 2015 classes and function, etc. For example:
 *
 * ```
 * class CommonModule {
 * }
 * CommonModule.decorators = [
 *     { type: NgModule, args: [{
 *                 declarations: [COMMON_DIRECTIVES, COMMON_PIPES],
 *                 exports: [COMMON_DIRECTIVES, COMMON_PIPES],
 *                 providers: [
 *                     { provide: NgLocalization, useClass: NgLocaleLocalization },
 *                 ],
 *             },] }
 * ];
 * ```
 *
 * Items are decorated if they have a static property called `decorators`.
 *
 */
export class Esm2015ReflectionHost extends TypeScriptReflectionHost implements NgccReflectionHost {
  constructor(private checker2: ts.TypeChecker) {
    super(checker2);
  }

  getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[]|null {

    // TODO: this method needs to be able to get decorators on properties, methods and params too!
    // Then we should be able to reuse all the other methods from TypeScriptReflectionHost in this class.

    // Currently it is only able to handle class declarations

    if (ts.isClassDeclaration(declaration) && declaration.name) {
      const symbol = this.checker2.getSymbolAtLocation(declaration.name);
      if (symbol) {
        if (symbol.exports && symbol.exports.has(DECORATORS)) {
          // Symbol of the identifier for `SomeSymbol.decorators`.
          const decoratorsProperty = symbol.exports.get(DECORATORS)!;
          const decoratorsIdentifier = decoratorsProperty.valueDeclaration;

          if (decoratorsIdentifier && decoratorsIdentifier.parent) {

            // AST of the array of decorator values
            const decoratorsValue = (decoratorsIdentifier.parent as ts.AssignmentExpression<ts.EqualsToken>).right;
            if (decoratorsValue && ts.isArrayLiteralExpression(decoratorsValue)) {
              const decorators: Decorator[] = [];

              // Add each decorator that is imported from `@angular/core` into the `decorators` array
              decoratorsValue.elements.forEach(node => {

                // If the decorator is ot an object literal expression then we are not interested
                // TODO(pbd): check whether we need to use some kind of resolver incase the decorators are not always object literals.
                if(ts.isObjectLiteralExpression(node)) {

                  // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`

                  // Is this a `type` property?
                  const typeProperty = node.properties.filter(ts.isPropertyAssignment).find(property => property.name.getText() === 'type');
                  if (typeProperty) {

                    // Is the value of the `type` property an identifier?
                    const typeIdentifier = typeProperty.initializer;
                    if (ts.isIdentifier(typeIdentifier)) {

                      // Was the identifier was imported from `@angular/core`?
                      const importInfo = this.getImportOfIdentifier(typeIdentifier);
                      // Get the args for the decorator
                      const argsProperty = node.properties.filter(ts.isPropertyAssignment).find(property => property.name.getText() === 'args');
                      const argsExpression = argsProperty && argsProperty.initializer;
                      const args = (argsExpression && ts.isArrayLiteralExpression(argsExpression)) ? Array.from(argsExpression.elements) : null;

                      const decorator: Decorator = { name: symbol.name, import: importInfo, node, args };
                      decorators.push(decorator);
                    }
                  }
                }
              });
              return decorators;
            }
          }
        }
      }
    }
    return null;
  }
}
