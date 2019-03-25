/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

import {OwningModule, Reference} from '../../imports';
import {Declaration, ReflectionHost} from '../../reflection';

import {ArraySliceBuiltinFn} from './builtin';
import {DynamicValue} from './dynamic';
import {ForeignFunctionResolver} from './interface';
import {BuiltinFn, EnumValue, ResolvedValue, ResolvedValueArray, ResolvedValueMap, ResolvedValueType} from './result';



/**
 * Tracks the scope of a function body, which includes `ResolvedValue`s for the parameters of that
 * body.
 */
type Scope = Map<ts.ParameterDeclaration, ResolvedValue>;

interface BinaryOperatorDef {
  literal: boolean;
  op: (a: any, b: any) => ResolvedValueType;
}

function literalBinaryOp(op: (a: any, b: any) => any): BinaryOperatorDef {
  return {op, literal: true};
}

function referenceBinaryOp(op: (a: any, b: any) => any): BinaryOperatorDef {
  return {op, literal: false};
}

const BINARY_OPERATORS = new Map<ts.SyntaxKind, BinaryOperatorDef>([
  [ts.SyntaxKind.PlusToken, literalBinaryOp((a, b) => a + b)],
  [ts.SyntaxKind.MinusToken, literalBinaryOp((a, b) => a - b)],
  [ts.SyntaxKind.AsteriskToken, literalBinaryOp((a, b) => a * b)],
  [ts.SyntaxKind.SlashToken, literalBinaryOp((a, b) => a / b)],
  [ts.SyntaxKind.PercentToken, literalBinaryOp((a, b) => a % b)],
  [ts.SyntaxKind.AmpersandToken, literalBinaryOp((a, b) => a & b)],
  [ts.SyntaxKind.BarToken, literalBinaryOp((a, b) => a | b)],
  [ts.SyntaxKind.CaretToken, literalBinaryOp((a, b) => a ^ b)],
  [ts.SyntaxKind.LessThanToken, literalBinaryOp((a, b) => a < b)],
  [ts.SyntaxKind.LessThanEqualsToken, literalBinaryOp((a, b) => a <= b)],
  [ts.SyntaxKind.GreaterThanToken, literalBinaryOp((a, b) => a > b)],
  [ts.SyntaxKind.GreaterThanEqualsToken, literalBinaryOp((a, b) => a >= b)],
  [ts.SyntaxKind.LessThanLessThanToken, literalBinaryOp((a, b) => a << b)],
  [ts.SyntaxKind.GreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >> b)],
  [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken, literalBinaryOp((a, b) => a >>> b)],
  [ts.SyntaxKind.AsteriskAsteriskToken, literalBinaryOp((a, b) => Math.pow(a, b))],
  [ts.SyntaxKind.AmpersandAmpersandToken, referenceBinaryOp((a, b) => a && b)],
  [ts.SyntaxKind.BarBarToken, referenceBinaryOp((a, b) => a || b)]
]);

const UNARY_OPERATORS = new Map<ts.SyntaxKind, (a: any) => any>([
  [ts.SyntaxKind.TildeToken, a => ~a], [ts.SyntaxKind.MinusToken, a => -a],
  [ts.SyntaxKind.PlusToken, a => +a], [ts.SyntaxKind.ExclamationToken, a => !a]
]);

interface Context {
  /**
   * The module name (if any) which was used to reach the currently resolving symbols.
   */
  absoluteModuleName: string|null;

  /**
   * A file name representing the context in which the current `absoluteModuleName`, if any, was
   * resolved.
   */
  resolutionContext: string;
  scope: Scope;
  foreignFunctionResolver?: ForeignFunctionResolver;
}

export class StaticInterpreter {
  constructor(private host: ReflectionHost, private checker: ts.TypeChecker) {}

  visit(node: ts.Expression, context: Context): ResolvedValue {
    return this.visitExpression(node, context);
  }

  private visitExpression(node: ts.Expression, context: Context): ResolvedValue {
    let result: ResolvedValue;
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return new ResolvedValue(true);
    } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return new ResolvedValue(false);
    } else if (ts.isStringLiteral(node)) {
      return new ResolvedValue(node.text);
    } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return new ResolvedValue(node.text);
    } else if (ts.isTemplateExpression(node)) {
      result = this.visitTemplateExpression(node, context);
    } else if (ts.isNumericLiteral(node)) {
      return new ResolvedValue(parseFloat(node.text));
    } else if (ts.isObjectLiteralExpression(node)) {
      result = this.visitObjectLiteralExpression(node, context);
    } else if (ts.isIdentifier(node)) {
      result = this.visitIdentifier(node, context);
    } else if (ts.isPropertyAccessExpression(node)) {
      result = this.visitPropertyAccessExpression(node, context);
    } else if (ts.isCallExpression(node)) {
      result = this.visitCallExpression(node, context);
    } else if (ts.isConditionalExpression(node)) {
      result = this.visitConditionalExpression(node, context);
    } else if (ts.isPrefixUnaryExpression(node)) {
      result = this.visitPrefixUnaryExpression(node, context);
    } else if (ts.isBinaryExpression(node)) {
      result = this.visitBinaryExpression(node, context);
    } else if (ts.isArrayLiteralExpression(node)) {
      result = this.visitArrayLiteralExpression(node, context);
    } else if (ts.isParenthesizedExpression(node)) {
      result = this.visitParenthesizedExpression(node, context);
    } else if (ts.isElementAccessExpression(node)) {
      result = this.visitElementAccessExpression(node, context);
    } else if (ts.isAsExpression(node)) {
      result = this.visitExpression(node.expression, context);
    } else if (ts.isNonNullExpression(node)) {
      result = this.visitExpression(node.expression, context);
    } else if (this.host.isClass(node)) {
      result = this.visitDeclaration(node, context);
    } else {
      return new ResolvedValue(DynamicValue.fromUnknownExpressionType(node))
    }
    if (result instanceof DynamicValue && result.node !== node) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, result));
    }
    return result;
  }

  private visitArrayLiteralExpression(node: ts.ArrayLiteralExpression, context: Context):
      ResolvedValue {
    const array: ResolvedValueArray = [];
    const resolvedArray = new ResolvedValue(array);
    for (let i = 0; i < node.elements.length; i++) {
      const element = node.elements[i];
      if (ts.isSpreadElement(element)) {
        const spread = this.visitExpression(element.expression, context).value;
        if (spread instanceof DynamicValue) {
          array.push(new ResolvedValue(DynamicValue.fromDynamicInput(element.expression, spread)));
        } else if (!Array.isArray(spread)) {
          throw new Error(`Unexpected value in spread expression: ${spread}`);
        } else {
          array.push(...spread);
        }
      } else {
        array.push(this.visitExpression(element, context));
      }
    }
    return resolvedArray;
  }

  private visitObjectLiteralExpression(node: ts.ObjectLiteralExpression, context: Context):
      ResolvedValue {
    const map = new ResolvedValueMap();
    const resolvedMap = new ResolvedValue(map);
    for (let i = 0; i < node.properties.length; i++) {
      const property = node.properties[i];
      if (ts.isPropertyAssignment(property)) {
        const name = this.stringNameFromPropertyName(property.name, context);
        // Check whether the name can be determined statically.
        if (name === undefined) {
          return new ResolvedValue(
              DynamicValue.fromDynamicInput(node, DynamicValue.fromDynamicString(property.name)));
        }
        map.set(name, this.visitExpression(property.initializer, context));
      } else if (ts.isShorthandPropertyAssignment(property)) {
        const symbol = this.checker.getShorthandAssignmentValueSymbol(property);
        if (symbol === undefined || symbol.valueDeclaration === undefined) {
          map.set(property.name.text, new ResolvedValue(DynamicValue.fromUnknown(property)));
        } else {
          map.set(property.name.text, this.visitDeclaration(symbol.valueDeclaration, context));
        }
      } else if (ts.isSpreadAssignment(property)) {
        const spreadValue = this.visitExpression(property.expression, context).value;
        if (spreadValue instanceof DynamicValue) {
          return new ResolvedValue(DynamicValue.fromDynamicInput(node, spreadValue));
        } else if (!(spreadValue instanceof ResolvedValueMap)) {
          throw new Error(`Unexpected value in spread assignment: ${spreadValue}`);
        }
        spreadValue.forEach((value, key) => map.set(key, value));
      } else {
        return new ResolvedValue(DynamicValue.fromUnknown(node));
      }
    }
    return resolvedMap;
  }

  private visitTemplateExpression(node: ts.TemplateExpression, context: Context): ResolvedValue {
    const pieces: string[] = [node.head.text];
    for (let i = 0; i < node.templateSpans.length; i++) {
      const span = node.templateSpans[i];
      let value = this.visit(span.expression, context).value;
      if (value instanceof EnumValue) {
        value = value.resolved;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ||
          value == null) {
        pieces.push(`${value}`);
      } else if (value instanceof DynamicValue) {
        return new ResolvedValue(DynamicValue.fromDynamicInput(node, value))
      } else {
        return new ResolvedValue(
            DynamicValue.fromDynamicInput(node, DynamicValue.fromDynamicString(span.expression)));
      }
      pieces.push(span.literal.text);
    }
    return new ResolvedValue(pieces.join(''));
  }

  private visitIdentifier(node: ts.Identifier, context: Context): ResolvedValue {
    const decl = this.host.getDeclarationOfIdentifier(node);
    if (decl === null) {
      return new ResolvedValue(DynamicValue.fromUnknownIdentifier(node));
    }
    const result =
        this.visitDeclaration(decl.node, {...context, ...joinModuleContext(context, node, decl)});
    if (result.value instanceof Reference) {
      // Only record identifiers to non-synthetic references. Synthetic references may not have the
      // same value at runtime as they do at compile time, so it's not legal to refer to them by the
      // identifier here.
      if (!result.value.synthetic) {
        result.value.addIdentifier(node);
      }
    } else if (result.value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, result.value));
    }
    return result;
  }

  private visitDeclaration(node: ts.Declaration, context: Context): ResolvedValue {
    if (this.host.isClass(node)) {
      return new ResolvedValue(this.getReference(node, context));
    } else if (ts.isVariableDeclaration(node)) {
      return this.visitVariableDeclaration(node, context);
    } else if (ts.isParameter(node) && context.scope.has(node)) {
      return context.scope.get(node) !;
    } else if (ts.isExportAssignment(node)) {
      return this.visitExpression(node.expression, context);
    } else if (ts.isEnumDeclaration(node)) {
      return this.visitEnumDeclaration(node, context);
    } else if (ts.isSourceFile(node)) {
      return this.visitSourceFile(node, context);
    } else {
      return new ResolvedValue(this.getReference(node, context));
    }
  }

  private visitVariableDeclaration(node: ts.VariableDeclaration, context: Context): ResolvedValue {
    const value = this.host.getVariableValue(node);
    if (value !== null) {
      return this.visitExpression(value, context);
    } else if (isVariableDeclarationDeclared(node)) {
      return new ResolvedValue(this.getReference(node, context));
    } else {
      return new ResolvedValue(undefined);
    }
  }

  private visitEnumDeclaration(node: ts.EnumDeclaration, context: Context): ResolvedValue {
    const enumRef = this.getReference(node, context) as Reference<ts.EnumDeclaration>;
    const map = new Map<string, ResolvedValue>();
    node.members.forEach(member => {
      const name = this.stringNameFromPropertyName(member.name, context);
      if (name !== undefined) {
        const resolved = member.initializer && this.visit(member.initializer, context);
        map.set(name, new ResolvedValue(new EnumValue(enumRef, name, resolved && resolved.value)));
      }
    });
    return new ResolvedValue(map as ResolvedValueMap);
  }

  private visitElementAccessExpression(node: ts.ElementAccessExpression, context: Context):
      ResolvedValue {
    const lhs = this.visitExpression(node.expression, context);
    if (node.argumentExpression === undefined) {
      throw new Error(`Expected argument in ElementAccessExpression`);
    }
    if (lhs.value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, lhs.value));
    }
    const rhsValue = this.visitExpression(node.argumentExpression, context).value;
    if (rhsValue instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, rhsValue));
    }
    if (typeof rhsValue !== 'string' && typeof rhsValue !== 'number') {
      throw new Error(
          `ElementAccessExpression index should be string or number, got ${typeof rhsValue}: ${rhsValue}`);
    }

    return this.accessHelper(node, lhs, rhsValue, context);
  }

  private visitPropertyAccessExpression(node: ts.PropertyAccessExpression, context: Context):
      ResolvedValue {
    const lhs = this.visitExpression(node.expression, context);
    const rhs = node.name.text;
    // TODO: handle reference to class declaration.
    if (lhs.value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, lhs.value));
    }
    return this.accessHelper(node, lhs, rhs, context);
  }

  private visitSourceFile(node: ts.SourceFile, context: Context): ResolvedValue {
    const declarations = this.host.getExportsOfModule(node);
    if (declarations === null) {
      return new ResolvedValue(DynamicValue.fromUnknown(node));
    }
    const map = new Map<string, ResolvedValue>();
    declarations.forEach((decl, name) => {
      const value = this.visitDeclaration(
          decl.node, {
                         ...context, ...joinModuleContext(context, node, decl),
                     });
      map.set(name, value);
    });
    return new ResolvedValue(map);
  }

  private accessHelper(
      lhsNode: ts.Expression, lhs: ResolvedValue, rhs: string|number,
      context: Context): ResolvedValue {
    const strIndex = `${rhs}`;
    const lhsValue = lhs.value;
    if (lhsValue instanceof Map) {
      if (lhsValue.has(strIndex)) {
        return lhsValue.get(strIndex) !;
      } else {
        throw new Error(`Invalid map access: [${Array.from(lhsValue.keys())}] dot ${rhs}`);
      }
    } else if (Array.isArray(lhsValue)) {
      if (rhs === 'length') {
        return new ResolvedValue(lhsValue.length);
      } else if (rhs === 'slice') {
        return new ResolvedValue(new ArraySliceBuiltinFn(lhsNode, lhs));
      }
      if (typeof rhs !== 'number' || !Number.isInteger(rhs)) {
        return new ResolvedValue(DynamicValue.fromUnknown(lhsNode));
      }
      if (rhs < 0 || rhs >= lhsValue.length) {
        throw new Error(`Index out of bounds: ${rhs} vs ${lhsValue.length}`);
      }
      return lhsValue[rhs];
    } else if (lhsValue instanceof Reference) {
      const ref = lhsValue.node;
      if (this.host.isClass(ref)) {
        const module = owningModule(context, lhsValue.bestGuessOwningModule);
        let resolved: ResolvedValue = new ResolvedValue(undefined);
        const member = this.host.getMembersOfClass(ref).find(
            member => member.isStatic && member.name === strIndex);
        if (member !== undefined) {
          if (member.value !== null) {
            resolved = this.visitExpression(member.value, context);
          } else if (member.implementation !== null) {
            resolved.value = new Reference(member.implementation, module);
          } else if (member.node) {
            resolved.value = new Reference(member.node, module);
          }
        }
        return resolved;
      }
    } else if (lhsValue instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(lhsNode, lhsValue));
    } else {
      throw new Error(`Invalid dot property access: ${lhsValue} dot ${rhs}`);
    }
    return new ResolvedValue(undefined);
  }

  private visitCallExpression(node: ts.CallExpression, context: Context): ResolvedValue {
    const lhs = this.visitExpression(node.expression, context);
    const lhsValue = lhs.value;
    if (lhsValue instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, lhsValue));
    }

    // If the call refers to a builtin function, attempt to evaluate the function.
    if (lhsValue instanceof BuiltinFn) {
      return lhsValue.evaluate(node.arguments.map(arg => this.visitExpression(arg, context)));
    }

    if (!(lhsValue instanceof Reference)) {
      return new ResolvedValue(DynamicValue.fromInvalidExpressionType(node.expression, lhsValue));
    } else if (!isFunctionOrMethodReference(lhsValue)) {
      return new ResolvedValue(DynamicValue.fromInvalidExpressionType(node.expression, lhsValue));
    }

    const fn = this.host.getDefinitionOfFunction(lhsValue.node);

    // If the function is foreign (declared through a d.ts file), attempt to resolve it with the
    // foreignFunctionResolver, if one is specified.
    if (fn.body === null) {
      let expr: ts.Expression|null = null;
      if (context.foreignFunctionResolver) {
        expr = context.foreignFunctionResolver(lhsValue, node.arguments);
      }
      if (expr === null) {
        return new ResolvedValue(DynamicValue.fromDynamicInput(
            node, DynamicValue.fromExternalReference(node.expression, lhsValue)));
      }

      // If the function is declared in a different file, resolve the foreign function expression
      // using the absolute module name of that file (if any).
      if (lhsValue.bestGuessOwningModule !== null) {
        context = {
          ...context,
          absoluteModuleName: lhsValue.bestGuessOwningModule.specifier,
          resolutionContext: node.getSourceFile().fileName,
        };
      }

      const res = this.visitExpression(expr, context);
      if (res instanceof Reference) {
        // This Reference was created synthetically, via a foreign function resolver. The real
        // runtime value of the function expression may be different than the foreign function
        // resolved value, so mark the Reference as synthetic to avoid it being misinterpreted.
        res.synthetic = true;
      }
      return res;
    }

    const body = fn.body;
    if (body.length !== 1 || !ts.isReturnStatement(body[0])) {
      throw new Error('Function body must have a single return statement only.');
    }
    const ret = body[0] as ts.ReturnStatement;

    const newScope: Scope = new Map<ts.ParameterDeclaration, ResolvedValue>();
    fn.parameters.forEach((param, index) => {
      let value = new ResolvedValue(undefined);
      if (index < node.arguments.length) {
        const arg = node.arguments[index];
        value = this.visitExpression(arg, context);
      }
      if (value === undefined && param.initializer !== null) {
        value = this.visitExpression(param.initializer, context);
      }
      newScope.set(param.node, value);
    });

    return ret.expression !== undefined ?
        this.visitExpression(ret.expression, {...context, scope: newScope}) :
        new ResolvedValue(undefined);
  }

  private visitConditionalExpression(node: ts.ConditionalExpression, context: Context):
      ResolvedValue {
    const condition = this.visitExpression(node.condition, context);
    if (condition.value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, condition.value));
    }

    if (condition.value) {
      return this.visitExpression(node.whenTrue, context);
    } else {
      return this.visitExpression(node.whenFalse, context);
    }
  }

  private visitPrefixUnaryExpression(node: ts.PrefixUnaryExpression, context: Context):
      ResolvedValue {
    const operatorKind = node.operator;
    if (!UNARY_OPERATORS.has(operatorKind)) {
      throw new Error(`Unsupported prefix unary operator: ${ts.SyntaxKind[operatorKind]}`);
    }

    const op = UNARY_OPERATORS.get(operatorKind) !;
    const value = this.visitExpression(node.operand, context).value;
    if (value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, value));
    } else {
      return new ResolvedValue(op(value));
    }
  }

  private visitBinaryExpression(node: ts.BinaryExpression, context: Context): ResolvedValue {
    const tokenKind = node.operatorToken.kind;
    if (!BINARY_OPERATORS.has(tokenKind)) {
      throw new Error(`Unsupported binary operator: ${ts.SyntaxKind[tokenKind]}`);
    }

    const opRecord = BINARY_OPERATORS.get(tokenKind) !;
    let lhs: ResolvedValue, rhs: ResolvedValue;
    if (opRecord.literal) {
      lhs = literal(this.visitExpression(node.left, context));
      rhs = literal(this.visitExpression(node.right, context));
    } else {
      lhs = this.visitExpression(node.left, context);
      rhs = this.visitExpression(node.right, context);
    }
    if (lhs.value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, lhs.value));
    } else if (rhs.value instanceof DynamicValue) {
      return new ResolvedValue(DynamicValue.fromDynamicInput(node, rhs.value));
    } else {
      return new ResolvedValue(opRecord.op(lhs.value, rhs.value));
    }
  }

  private visitParenthesizedExpression(node: ts.ParenthesizedExpression, context: Context):
      ResolvedValue {
    return this.visitExpression(node.expression, context);
  }

  private stringNameFromPropertyName(node: ts.PropertyName, context: Context): string|undefined {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
      return node.text;
    } else {  // ts.ComputedPropertyName
      const literal = this.visitExpression(node.expression, context);
      return typeof literal === 'string' ? literal : undefined;
    }
  }

  private getReference(node: ts.Declaration, context: Context): Reference {
    return new Reference(node, owningModule(context));
  }
}

function isFunctionOrMethodReference(ref: Reference<ts.Node>):
    ref is Reference<ts.FunctionDeclaration|ts.MethodDeclaration|ts.FunctionExpression> {
  return ts.isFunctionDeclaration(ref.node) || ts.isMethodDeclaration(ref.node) ||
      ts.isFunctionExpression(ref.node);
}

function literal(resolved: ResolvedValue): ResolvedValue {
  const value = resolved.value;
  if (value instanceof DynamicValue || value === null || value === undefined ||
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return resolved;
  }
  throw new Error(`Value ${value} is not literal and cannot be used in this context.`);
}

function isVariableDeclarationDeclared(node: ts.VariableDeclaration): boolean {
  if (node.parent === undefined || !ts.isVariableDeclarationList(node.parent)) {
    return false;
  }
  const declList = node.parent;
  if (declList.parent === undefined || !ts.isVariableStatement(declList.parent)) {
    return false;
  }
  const varStmt = declList.parent;
  return varStmt.modifiers !== undefined &&
      varStmt.modifiers.some(mod => mod.kind === ts.SyntaxKind.DeclareKeyword);
}

const EMPTY = {};

function joinModuleContext(existing: Context, node: ts.Node, decl: Declaration): {
  absoluteModuleName?: string,
  resolutionContext?: string,
} {
  if (decl.viaModule !== null && decl.viaModule !== existing.absoluteModuleName) {
    return {
      absoluteModuleName: decl.viaModule,
      resolutionContext: node.getSourceFile().fileName,
    };
  } else {
    return EMPTY;
  }
}

function owningModule(context: Context, override: OwningModule | null = null): OwningModule|null {
  let specifier = context.absoluteModuleName;
  if (override !== null) {
    specifier = override.specifier;
  }
  if (specifier !== null) {
    return {
      specifier,
      resolutionContext: context.resolutionContext,
    };
  } else {
    return null;
  }
}
