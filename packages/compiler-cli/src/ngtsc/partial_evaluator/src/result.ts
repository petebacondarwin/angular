/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ParseLocation, ParseSourceFile, ParseSourceSpan} from '@angular/compiler/src/compiler';
import * as ts from 'typescript';

import {Reference} from '../../imports';

import {DynamicValue} from './dynamic';


/**
 * A value resulting from static resolution.
 *
 * This could be a primitive, collection type, reference to a `ts.Node` that declares a
 * non-primitive value, or a special `DynamicValue` type which indicates the value was not
 * available statically.
 *
 * The position of the value in the source is captured in the `span` property.
 */
export class ResolvedValue {
  span: ParseSourceSpan;
  constructor(
      public value: ResolvedValueType, spanOrNode: ParseSourceSpan|ts.Node,
      container: ResolvedValue|null = null) {
    this.span = this.computeSpan(spanOrNode, container);
  }

  unwrap(): any {
    if (Array.isArray(this.value)) {
      return this.value.map(item => item.unwrap());
    } else if (this.value instanceof ResolvedValueMap) {
      const unwrappedMap = new Map();
      this.value.forEach((value, key) => unwrappedMap.set(key, value.unwrap()));
      return unwrappedMap;
    } else {
      return this.value;
    }
  }

  toString(): string { return `ResolvedValue:${this.unwrap().toString()}`; }

  private computeSpan(spanOrNode: ParseSourceSpan|ts.Node, container: ResolvedValue|null):
      ParseSourceSpan {
    if (spanOrNode instanceof ParseSourceSpan) {
      return spanOrNode;
    } else {
      const tsSpan = ts.getSourceMapRange(spanOrNode);
      const tsFile = tsSpan.source || spanOrNode.getSourceFile();
      if (!tsFile) {
        if (container) {
          // This value is synthesized so we just use the span of its container.
          return container.span;
        }
        throw new Error('Missing source file');
      }
      const file = new TsParseSourceFile(tsFile);
      return new ParseSourceSpan(
          new TsParseLocation(file, tsSpan.pos), new TsParseLocation(file, tsSpan.end));
    }
  }
}

export type ResolvedValueType = number | boolean | string | null | undefined | Reference |
    EnumValue | ResolvedValueArray | ResolvedValueMap | BuiltinFn | DynamicValue<unknown>;

/**
 * An array of `ResolvedValue`s.
 *
 * This is a reified type to allow the circular reference of
 * `ResolvedValue` -> `ResolvedValueArray` -> `ResolvedValue`.
 */
export interface ResolvedValueArray extends Array<ResolvedValue> {}

/**
 * A map of strings to `ResolvedValue`s.
 *
 * This is a reified type to allow the circular reference of
 * `ResolvedValue` -> `ResolvedValueMap` -> `ResolvedValue`.
 */
export type ResolvedValueMap = Map<string, ResolvedValue>;
export const ResolvedValueMap = Map;

/**
 * A value member of an enumeration.
 *
 * Contains a `Reference` to the enumeration itself, and the name of the referenced member.
 */
export class EnumValue {
  constructor(
      readonly enumRef: Reference<ts.EnumDeclaration>, readonly name: string,
      readonly resolved: ResolvedValueType) {}
}

/**
 * An implementation of a builtin function, such as `Array.prototype.slice`.
 */
export abstract class BuiltinFn { abstract evaluate(args: ResolvedValueArray): ResolvedValue; }


export class TsParseSourceFile extends ParseSourceFile {
  constructor(public tsSource: ts.SourceMapSource) { super(tsSource.text, tsSource.fileName); }
}

export class TsParseLocation extends ParseLocation {
  constructor(file: TsParseSourceFile, offset: number) {
    const {line, character} = file.tsSource.getLineAndCharacterOfPosition(offset);
    super(file, offset, line, character);
  }
}
