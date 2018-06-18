/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

export interface Decorator {
  name: string;
  import : Import | null;
  node: ts.Node;
  args: ts.Expression[]|null;
}

export enum ClassMemberKind {
  Constructor,
  Getter,
  Setter,
  Property,
  Method,
}

export interface ClassMember {
  node: ts.Node;
  kind: ClassMemberKind;
  type: ts.TypeNode|null;
  name: string;
  nameNode: ts.Identifier|null;
  initializer: ts.Expression|null;
  isStatic: boolean;
  decorators: Decorator[]|null;
}

export interface Parameter {
  name: string|null;
  nameNode: ts.BindingName;
  type: ts.Expression|null;
  decorators: Decorator[]|null;
}

export interface Import {
  name: string;
  from: string;
}

export interface ReflectionHost {
  getDecoratorsOfDeclaration(declaration: ts.Declaration): Decorator[]|null;
  getMembersOfClass(clazz: ts.Declaration): ClassMember[];
  getConstructorParameters(clazz: ts.Declaration): Parameter[]|null;
  getImportOfIdentifier(id: ts.Identifier): Import|null;

  isClass(node: ts.Node): node is ts.Declaration;
}
