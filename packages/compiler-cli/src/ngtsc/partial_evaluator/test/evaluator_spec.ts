/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';

import {Reference} from '../../imports';
import {TypeScriptReflectionHost} from '../../reflection';
import {getDeclaration, makeProgram} from '../../testing/in_memory_typescript';
import {DynamicValue} from '../src/dynamic';
import {ForeignFunctionResolver, PartialEvaluator} from '../src/interface';
import {EnumValue, ResolvedValue} from '../src/result';

function makeSimpleProgram(contents: string): ts.Program {
  return makeProgram([{name: 'entry.ts', contents}]).program;
}

function makeExpression(
    code: string, expr: string, supportingFiles: {name: string, contents: string}[] = []): {
  expression: ts.Expression,
  host: ts.CompilerHost,
  checker: ts.TypeChecker,
  program: ts.Program,
  options: ts.CompilerOptions
} {
  const {program, options, host} = makeProgram(
      [{name: 'entry.ts', contents: `${code}; const target$ = ${expr};`}, ...supportingFiles]);
  const checker = program.getTypeChecker();
  const decl = getDeclaration(program, 'entry.ts', 'target$', ts.isVariableDeclaration);
  return {
    expression: decl.initializer !,
    host,
    options,
    checker,
    program,
  };
}

function evaluate<T extends ResolvedValue>(
    code: string, expr: string, supportingFiles: {name: string, contents: string}[] = [],
    foreignFunctionResolver?: ForeignFunctionResolver): T {
  const {expression, checker, program, options, host} = makeExpression(code, expr, supportingFiles);
  const reflectionHost = new TypeScriptReflectionHost(checker);
  const evaluator = new PartialEvaluator(reflectionHost, checker);
  return evaluator.evaluate(expression, foreignFunctionResolver) as T;
}

describe('ngtsc metadata', () => {
  it('reads a file correctly', () => {
    const resolved = evaluate(
        `
        import {Y} from './other';
        const A = Y;
    `,
        'A', [
          {
            name: 'other.ts',
            contents: `
      export const Y = 'test';
      `
          },
        ]);

    expect(resolved.value).toEqual('test');
  });

  it('map access works',
     () => { expect(evaluate('const obj = {a: "test"};', 'obj.a').value).toEqual('test'); });

  it('function calls work', () => {
    expect(evaluate(`function foo(bar) { return bar; }`, 'foo("test")').value).toEqual('test');
  });

  it('conditionals work', () => {
    expect(evaluate(`const x = false; const y = x ? 'true' : 'false';`, 'y').value)
        .toEqual('false');
  });

  it('addition works', () => { expect(evaluate(`const x = 1 + 2;`, 'x').value).toEqual(3); });

  it('static property on class works', () => {
    expect(evaluate(`class Foo { static bar = 'test'; }`, 'Foo.bar').value).toEqual('test');
  });

  it('static property call works', () => {
    expect(evaluate(`class Foo { static bar(test) { return test; } }`, 'Foo.bar("test")').value)
        .toEqual('test');
  });

  it('indirected static property call works', () => {
    expect(evaluate(
               `class Foo { static bar(test) { return test; } }; const fn = Foo.bar;`, 'fn("test")')
               .value)
        .toEqual('test');
  });

  it('array works', () => {
    expect(evaluate(`const x = 'test'; const y = [1, x, 2];`, 'y').unwrap() as any).toEqual([
      1, 'test', 2
    ]);
  });

  it('array spread works', () => {
    expect(evaluate(`const a = [1, 2]; const b = [4, 5]; const c = [...a, 3, ...b];`, 'c').unwrap())
        .toEqual([1, 2, 3, 4, 5]);
  });

  it('&& operations work', () => {
    expect(evaluate(`const a = 'hello', b = 'world';`, 'a && b').value).toEqual('world');
    expect(evaluate(`const a = false, b = 'world';`, 'a && b').value).toEqual(false);
    expect(evaluate(`const a = 'hello', b = 0;`, 'a && b').value).toEqual(0);
  });

  it('|| operations work', () => {
    expect(evaluate(`const a = 'hello', b = 'world';`, 'a || b').value).toEqual('hello');
    expect(evaluate(`const a = false, b = 'world';`, 'a || b').value).toEqual('world');
    expect(evaluate(`const a = 'hello', b = 0;`, 'a || b').value).toEqual('hello');
  });

  it('parentheticals work',
     () => { expect(evaluate(`const a = 3, b = 4;`, 'a * (a + b)').value).toEqual(21); });

  it('array access works',
     () => { expect(evaluate(`const a = [1, 2, 3];`, 'a[1] + a[0]').value).toEqual(3); });

  it('array `length` property access works',
     () => { expect(evaluate(`const a = [1, 2, 3];`, 'a[\'length\'] + 1').value).toEqual(4); });

  it('array `slice` function works', () => {
    expect(evaluate(`const a = [1, 2, 3];`, 'a[\'slice\']()').unwrap()).toEqual([1, 2, 3]);
  });

  it('negation works', () => {
    expect(evaluate(`const x = 3;`, '!x').value).toBe(false);
    expect(evaluate(`const x = 3;`, '!!x').value).toBe(true);
  });

  it('imports work', () => {
    const {program, options, host} = makeProgram([
      {name: 'second.ts', contents: 'export function foo(bar) { return bar; }'},
      {
        name: 'entry.ts',
        contents: `
          import {foo} from './second';
          const target$ = foo;
      `
      },
    ]);
    const checker = program.getTypeChecker();
    const reflectionHost = new TypeScriptReflectionHost(checker);
    const result = getDeclaration(program, 'entry.ts', 'target$', ts.isVariableDeclaration);
    const expr = result.initializer !;
    const evaluator = new PartialEvaluator(reflectionHost, checker);
    const resolved = evaluator.evaluate(expr).value;
    if (!(resolved instanceof Reference)) {
      return fail('Expected expression to resolve to a reference');
    }
    expect(ts.isFunctionDeclaration(resolved.node)).toBe(true);
    const reference = resolved.getIdentityIn(program.getSourceFile('entry.ts') !);
    if (reference === null) {
      return fail('Expected to get an identifier');
    }
    expect(reference.getSourceFile()).toEqual(program.getSourceFile('entry.ts') !);
  });

  it('absolute imports work', () => {
    const {program, options, host} = makeProgram([
      {name: 'node_modules/some_library/index.d.ts', contents: 'export declare function foo(bar);'},
      {
        name: 'entry.ts',
        contents: `
          import {foo} from 'some_library';
          const target$ = foo;
      `
      },
    ]);
    const checker = program.getTypeChecker();
    const reflectionHost = new TypeScriptReflectionHost(checker);
    const result = getDeclaration(program, 'entry.ts', 'target$', ts.isVariableDeclaration);
    const expr = result.initializer !;
    const evaluator = new PartialEvaluator(reflectionHost, checker);
    const resolved = evaluator.evaluate(expr).value;
    if (!(resolved instanceof Reference)) {
      return fail('Expected expression to resolve to an absolute reference');
    }
    expect(owningModuleOf(resolved)).toBe('some_library');
    expect(ts.isFunctionDeclaration(resolved.node)).toBe(true);
    const reference = resolved.getIdentityIn(program.getSourceFile('entry.ts') !);
    expect(reference).not.toBeNull();
    expect(reference !.getSourceFile()).toEqual(program.getSourceFile('entry.ts') !);
  });

  it('reads values from default exports', () => {
    const resolved = evaluate(
        `
      import mod from './second';
      `,
        'mod.property', [
          {name: 'second.ts', contents: 'export default {property: "test"}'},
        ]);
    expect(resolved.value).toEqual('test');
  });

  it('reads values from named exports', () => {
    const resolved = evaluate(`import * as mod from './second';`, 'mod.a.property', [
      {name: 'second.ts', contents: 'export const a = {property: "test"};'},
    ]);
    expect(resolved.value).toEqual('test');
  });

  it('chain of re-exports works', () => {
    const resolved = evaluate(`import * as mod from './direct-reexport';`, 'mod.value.property', [
      {name: 'const.ts', contents: 'export const value = {property: "test"};'},
      {name: 'def.ts', contents: `import {value} from './const'; export default value;`},
      {name: 'indirect-reexport.ts', contents: `import value from './def'; export {value};`},
      {name: 'direct-reexport.ts', contents: `export {value} from './indirect-reexport';`},
    ]);
    expect(resolved.value).toEqual('test');
  });

  it('map spread works', () => {
    const map: Map<string, number> =
        evaluate(`const a = {a: 1}; const b = {b: 2, c: 1}; const c = {...a, ...b, c: 3};`, 'c')
            .unwrap();

    const obj: {[key: string]: number} = {};
    map.forEach((value, key) => obj[key] = value);
    expect(obj).toEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });

  it('indirected-via-object function call works', () => {
    expect(evaluate(
               `
      function fn(res) { return res; }
      const obj = {fn};
    `,
               'obj.fn("test")')
               .value)
        .toEqual('test');
  });

  it('template expressions work',
     () => { expect(evaluate('const a = 2, b = 4;', '`1${a}3${b}5`').value).toEqual('12345'); });

  it('enum resolution works', () => {
    const result = evaluate(
                       `
      enum Foo {
        A,
        B,
        C,
      }

      const r = Foo.B;`,
                       'r')
                       .value;
    if (!(result instanceof EnumValue)) {
      return fail(`result is not an EnumValue`);
    }
    expect(result.enumRef.node.name.text).toBe('Foo');
    expect(result.name).toBe('B');
  });

  it('variable declaration resolution works', () => {
    const value = evaluate(`import {value} from './decl';`, 'value', [
                    {name: 'decl.d.ts', contents: 'export declare let value: number;'},
                  ]).value;
    expect(value instanceof Reference).toBe(true);
  });

  it('should resolve shorthand properties to values', () => {
    const {program} = makeProgram([
      {name: 'entry.ts', contents: `const prop = 42; const target$ = {prop};`},
    ]);
    const checker = program.getTypeChecker();
    const reflectionHost = new TypeScriptReflectionHost(checker);
    const result = getDeclaration(program, 'entry.ts', 'target$', ts.isVariableDeclaration);
    const expr = result.initializer !as ts.ObjectLiteralExpression;
    const prop = expr.properties[0] as ts.ShorthandPropertyAssignment;
    const evaluator = new PartialEvaluator(reflectionHost, checker);
    const resolved = evaluator.evaluate(prop.name);
    expect(resolved.value).toBe(42);
  });

  it('should resolve dynamic values in object literals', () => {
    const {program} = makeProgram([
      {name: 'decl.d.ts', contents: 'export declare const fn: any;'},
      {
        name: 'entry.ts',
        contents: `import {fn} from './decl'; const prop = fn.foo(); const target$ = {value: prop};`
      },
    ]);
    const checker = program.getTypeChecker();
    const reflectionHost = new TypeScriptReflectionHost(checker);
    const result = getDeclaration(program, 'entry.ts', 'target$', ts.isVariableDeclaration);
    const expr = result.initializer !as ts.ObjectLiteralExpression;
    const evaluator = new PartialEvaluator(reflectionHost, checker);
    const resolved = evaluator.evaluate(expr).unwrap();
    if (!(resolved instanceof Map)) {
      return fail('Should have resolved to a Map');
    }
    const value = resolved.get('value') !;
    if (!(value instanceof DynamicValue)) {
      return fail(`Should have resolved 'value' to a DynamicValue`);
    }
    const prop = expr.properties[0] as ts.PropertyAssignment;
    expect(value.node).toBe(prop.initializer);
  });

  it('should resolve enums in template expressions', () => {
    const resolved =
        evaluate(`enum Test { VALUE = 'test', } const value = \`a.\${Test.VALUE}.b\`;`, 'value');
    expect(resolved.value).toBe('a.test.b');
  });

  it('should not attach identifiers to FFR-resolved values', () => {
    const value = evaluate(
                      `
    declare function foo(arg: any): any;
    class Target {}

    const indir = foo(Target);
    const value = indir;
  `,
                      'value', [], firstArgFfr)
                      .value;
    if (!(value instanceof Reference)) {
      return fail('Expected value to be a Reference');
    }
    const id = value.getIdentityIn(value.node.getSourceFile());
    if (id === null) {
      return fail('Expected value to have an identity');
    }
    expect(id.text).toEqual('Target');
  });
});

function owningModuleOf(ref: Reference): string|null {
  return ref.bestGuessOwningModule !== null ? ref.bestGuessOwningModule.specifier : null;
}

function firstArgFfr(
    node: Reference<ts.FunctionDeclaration|ts.MethodDeclaration|ts.FunctionExpression>,
    args: ReadonlyArray<ts.Expression>): ts.Expression {
  return args[0];
}
