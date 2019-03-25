/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

import {Reference} from '../../imports';
import {ForeignFunctionResolver, PartialEvaluator, ResolvedValue} from '../../partial_evaluator';

import {NgModuleRawRouteData} from './analyzer';
import {RouterEntryPoint, RouterEntryPointManager, entryPointKeyFor} from './route';

const ROUTES_MARKER = '__ngRoutesMarker__';

export interface LazyRouteEntry {
  loadChildren: string;
  from: RouterEntryPoint;
  resolvedTo: RouterEntryPoint;
}

export function scanForCandidateTransitiveModules(
    expr: ts.Expression | null, evaluator: PartialEvaluator): string[] {
  if (expr === null) {
    return [];
  }

  const candidateModuleKeys: string[] = [];
  const entries = evaluator.evaluate(expr);

  function recursivelyAddModules(entry: ResolvedValue) {
    if (Array.isArray(entry)) {
      for (const e of entry) {
        recursivelyAddModules(e);
      }
    } else if (entry instanceof Map) {
      if (entry.has('ngModule')) {
        recursivelyAddModules(entry.get('ngModule') !);
      }
    } else if ((entry instanceof Reference) && hasIdentifier(entry.node)) {
      const filePath = entry.node.getSourceFile().fileName;
      const moduleName = entry.node.name.text;
      candidateModuleKeys.push(entryPointKeyFor(filePath, moduleName));
    }
  }

  recursivelyAddModules(entries);
  return candidateModuleKeys;
}

export function scanForRouteEntryPoints(
    ngModule: ts.SourceFile, moduleName: string, data: NgModuleRawRouteData,
    entryPointManager: RouterEntryPointManager, evaluator: PartialEvaluator): LazyRouteEntry[] {
  const loadChildrenIdentifiers: string[] = [];
  const from = entryPointManager.fromNgModule(ngModule, moduleName);
  if (data.providers !== null) {
    loadChildrenIdentifiers.push(...scanForProviders(data.providers, evaluator));
  }
  if (data.imports !== null) {
    loadChildrenIdentifiers.push(...scanForRouterModuleUsage(data.imports, evaluator));
  }
  if (data.exports !== null) {
    loadChildrenIdentifiers.push(...scanForRouterModuleUsage(data.exports, evaluator));
  }
  const routes: LazyRouteEntry[] = [];
  for (const loadChildren of loadChildrenIdentifiers) {
    const resolvedTo = entryPointManager.resolveLoadChildrenIdentifier(loadChildren, ngModule);
    if (resolvedTo !== null) {
      routes.push({
          loadChildren, from, resolvedTo,
      });
    }
  }
  return routes;
}

function scanForProviders(expr: ts.Expression, evaluator: PartialEvaluator): string[] {
  const loadChildrenIdentifiers: string[] = [];
  const providers = evaluator.evaluate(expr);

  function recursivelyAddProviders(provider: ResolvedValue): void {
    const providerValue = provider.value;
    if (Array.isArray(providerValue)) {
      for (const entry of providerValue) {
        recursivelyAddProviders(entry);
      }
    } else if (providerValue instanceof Map) {
      if (providerValue.has('provide') && providerValue.has('useValue')) {
        const provide = providerValue.get('provide') !.unwrap();
        const useValue = providerValue.get('useValue') !.unwrap();
        if (isRouteToken(provide) && Array.isArray(useValue)) {
          loadChildrenIdentifiers.push(...scanForLazyRoutes(useValue));
        }
      }
    }
  }

  recursivelyAddProviders(providers);
  return loadChildrenIdentifiers;
}

function scanForRouterModuleUsage(expr: ts.Expression, evaluator: PartialEvaluator): string[] {
  const loadChildrenIdentifiers: string[] = [];
  const imports = evaluator.evaluate(expr, routerModuleFFR);

  function recursivelyAddRoutes(imp: ResolvedValue): void {
    const importValue = imp.value;
    if (Array.isArray(importValue)) {
      for (const entry of importValue) {
        recursivelyAddRoutes(entry);
      }
    } else if (importValue instanceof Map) {
      if (importValue.has(ROUTES_MARKER) && importValue.has('routes')) {
        const routes = importValue.get('routes') !;
        if (Array.isArray(routes.value)) {
          loadChildrenIdentifiers.push(...scanForLazyRoutes(routes.value));
        }
      }
    }
  }

  recursivelyAddRoutes(imports);
  return loadChildrenIdentifiers;
}

function scanForLazyRoutes(routes: ResolvedValue[]): string[] {
  const loadChildrenIdentifiers: string[] = [];

  function recursivelyScanRoutes(routes: ResolvedValue[]): void {
    for (let route of routes) {
      const routeValue = route.value;
      if (!(routeValue instanceof Map)) {
        continue;
      }
      if (routeValue.has('loadChildren')) {
        const loadChildren = routeValue.get('loadChildren') !.value;
        if (typeof loadChildren === 'string') {
          loadChildrenIdentifiers.push(loadChildren);
        }
      } else if (routeValue.has('children')) {
        const children = routeValue.get('children') !.value;
        if (Array.isArray(children)) {
          recursivelyScanRoutes(children);
        }
      }
    }
  }

  recursivelyScanRoutes(routes);
  return loadChildrenIdentifiers;
}

/**
 * A foreign function resolver that converts `RouterModule.forRoot/forChild(X)` to a special object
 * of the form `{__ngRoutesMarker__: true, routes: X}`.
 *
 * These objects are then recognizable inside the larger set of imports/exports.
 */
const routerModuleFFR: ForeignFunctionResolver =
    function routerModuleFFR(
        ref: Reference<ts.FunctionDeclaration|ts.MethodDeclaration|ts.FunctionExpression>,
        args: ReadonlyArray<ts.Expression>): ts.Expression |
    null {
      if (!isMethodNodeReference(ref) || !ts.isClassDeclaration(ref.node.parent)) {
        return null;
      } else if (
          ref.bestGuessOwningModule === null ||
          ref.bestGuessOwningModule.specifier !== '@angular/router') {
        return null;
      } else if (
          ref.node.parent.name === undefined || ref.node.parent.name.text !== 'RouterModule') {
        return null;
      } else if (
          !ts.isIdentifier(ref.node.name) ||
          (ref.node.name.text !== 'forRoot' && ref.node.name.text !== 'forChild')) {
        return null;
      }

      const routes = args[0];
      return ts.createObjectLiteral([
        ts.createPropertyAssignment(ROUTES_MARKER, ts.createTrue()),
        ts.createPropertyAssignment('routes', routes),
      ]);
    };

function hasIdentifier(node: ts.Node): node is ts.Node&{name: ts.Identifier} {
  const node_ = node as ts.NamedDeclaration;
  return (node_.name !== undefined) && ts.isIdentifier(node_.name);
}

function isMethodNodeReference(
    ref: Reference<ts.FunctionDeclaration|ts.MethodDeclaration|ts.FunctionExpression>):
    ref is Reference<ts.MethodDeclaration> {
  return ts.isMethodDeclaration(ref.node);
}

function isRouteToken(ref: ResolvedValue): boolean {
  return ref instanceof Reference && ref.bestGuessOwningModule !== null &&
      ref.bestGuessOwningModule.specifier === '@angular/router' && ref.debugName === 'ROUTES';
}
