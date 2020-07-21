/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {compilePartialComponentFromMetadata, ConstantPool, Identifiers, makeBindingParser, R3ComponentMetadata} from '@angular/compiler/src/compiler';
import {R3FactoryTarget} from '@angular/compiler/src/compiler_facade_interface';

import {ClassDeclaration} from '../../reflection';
import {CompileResult} from '../../transform';

import {ComponentAnalysisData, ComponentDecoratorHandler, ComponentResolutionData} from './component';
import {compileNgFactoryDefField} from './factory';

export class PartialComponentDecoratorHandler extends ComponentDecoratorHandler {
  compile(
      node: ClassDeclaration, analysis: Readonly<ComponentAnalysisData>,
      resolution: Readonly<ComponentResolutionData>, pool: ConstantPool): CompileResult[] {
    const meta: R3ComponentMetadata = {...analysis.meta, ...resolution};
    const res = compilePartialComponentFromMetadata(meta, pool, makeBindingParser());
    const factoryRes = compileNgFactoryDefField(
        {...meta, injectFn: Identifiers.directiveInject, target: R3FactoryTarget.Component});
    if (analysis.metadataStmt !== null) {
      factoryRes.statements.push(analysis.metadataStmt);
    }
    return [
      factoryRes, {
        name: 'ɵcmp',
        initializer: res.expression,
        statements: [],
        type: res.type,
      }
    ];
  }
}
