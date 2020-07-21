/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectionStrategy, ViewEncapsulation} from '../../core';
import {InterpolationConfig} from '../../ml_parser/interpolation_config';
import * as o from '../../output/output_ast';
import {ParseSourceSpan} from '../../parse_util';
import * as t from '../r3_ast';
import {R3DependencyMetadata} from '../r3_factory';
import {R3Reference} from '../util';


/**
 * Information needed to compile a directive for the render3 runtime.
 */
export interface R3DirectiveMetadata {
  /**
   * Name of the directive type.
   */
  name: string;

  /**
   * An expression representing a reference to the directive itself.
   */
  type: R3Reference;

  /**
   * An expression representing a reference to the directive being compiled, intended for use within
   * a class definition itself.
   *
   * This can differ from the outer `type` if the class is being compiled by ngcc and is inside
   * an IIFE structure that uses a different name internally.
   */
  internalType: o.Expression;

  /**
   * Number of generic type parameters of the type itself.
   */
  typeArgumentCount: number;

  /**
   * A source span for the directive type.
   */
  typeSourceSpan: ParseSourceSpan;

  /**
   * Dependencies of the directive's constructor.
   */
  deps: R3DependencyMetadata[]|'invalid'|null;

  /**
   * Unparsed selector of the directive, or `null` if there was no selector.
   */
  selector: string|null;

  /**
   * Information about the content queries made by the directive.
   */
  queries: R3QueryMetadata[];

  /**
   * Information about the view queries made by the directive.
   */
  viewQueries: R3QueryMetadata[];

  /**
   * Mappings indicating how the directive interacts with its host element (host bindings,
   * listeners, etc).
   */
  host: R3HostMetadata;

  /**
   * Information about usage of specific lifecycle events which require special treatment in the
   * code generator.
   */
  lifecycle: {
    /**
     * Whether the directive uses NgOnChanges.
     */
    usesOnChanges: boolean;
  };

  /**
   * A mapping of input field names to the property names.
   */
  inputs: {[field: string]: string|[string, string]};

  /**
   * A mapping of output field names to the property names.
   */
  outputs: {[field: string]: string};

  /**
   * Whether or not the component or directive inherits from another class
   */
  usesInheritance: boolean;

  /**
   * Whether or not the component or directive inherits its entire decorator from its base class.
   */
  fullInheritance: boolean;

  /**
   * Reference name under which to export the directive's type in a template,
   * if any.
   */
  exportAs: string[]|null;

  /**
   * The list of providers defined in the directive.
   */
  providers: o.Expression|null;
}

/**
 * Information needed to compile a component for the render3 runtime.
 */
export interface R3ComponentMetadata extends R3DirectiveMetadata {
  /**
   * Information about the component's template.
   */
  template: {
    /**
     * Parsed nodes of the template.
     */
    nodes: t.Node[];

    /**
     * Any ng-content selectors extracted from the template. Contains `null` when an ng-content
     * element without selector is present.
     */
    ngContentSelectors: string[];
  };

  /**
   * A map of pipe names to an expression referencing the pipe type which are in the scope of the
   * compilation.
   */
  pipes: Map<string, o.Expression>;

  /**
   * A list of directive selectors and an expression referencing the directive type which are in the
   * scope of the compilation.
   */
  directives: {selector: string, expression: o.Expression}[];

  /**
   * Whether to wrap the 'directives' and/or `pipes` array, if one is generated, in a closure.
   *
   * This is done when the directives or pipes contain forward references.
   */
  wrapDirectivesAndPipesInClosure: boolean;

  /**
   * A collection of styling data that will be applied and scoped to the component.
   */
  styles: string[];

  /**
   * An encapsulation policy for the template and CSS styles. One of:
   * - `ViewEncapsulation.Native`: Use shadow roots. This works only if natively available on the
   *   platform (note that this is marked the as the "deprecated shadow DOM" as of Angular v6.1.
   * - `ViewEncapsulation.Emulated`: Use shimmed CSS that emulates the native behavior.
   * - `ViewEncapsulation.None`: Use global CSS without any encapsulation.
   * - `ViewEncapsulation.ShadowDom`: Use the latest ShadowDOM API to natively encapsulate styles
   * into a shadow root.
   */
  encapsulation: ViewEncapsulation;

  /**
   * A collection of animation triggers that will be used in the component template.
   */
  animations: o.Expression|null;

  /**
   * The list of view providers defined in the component.
   */
  viewProviders: o.Expression|null;

  /**
   * Path to the .ts file in which this template's generated code will be included, relative to
   * the compilation root. This will be used to generate identifiers that need to be globally
   * unique in certain contexts (such as g3).
   */
  relativeContextFilePath: string;

  /**
   * Whether translation variable name should contain external message id
   * (used by Closure Compiler's output of `goog.getMsg` for transition period).
   */
  i18nUseExternalIds: boolean;

  /**
   * Overrides the default interpolation start and end delimiters ({{ and }}).
   */
  interpolation: InterpolationConfig;

  /**
   * Strategy used for detecting changes in the component.
   */
  changeDetection?: ChangeDetectionStrategy;
}

export interface R3DeclareComponentMetadata {
  // Version number of the metadata format. This is used to evolve the metadata
  // interface later - the linker will be able to detect which version a library
  // is using and interpret its metadata accordingly.
  version: 1;

  // The component's unparsed template string.
  template: string;

  // CSS from inline styles and included styleUrls.
  styles: string[];

  // Unparsed selector of the component.
  selector: string;

  // Reference to the component class itself.
  type: o.Expression;

  // Map of inputs, keyed by the name of the input field.
  inputs: {[fieldName: string]: string|[string, string]};

  // Map of outputs, keyed by the name of the output field.
  outputs: {[fieldName: string]: string};

  // Information about host bindings present on the component.
  host: {
    attributes: {[key: string]: o.Expression}; listeners: {[key: string]: string};
    properties: {[key: string]: string};
  };

  // List of directives which matched in the template, including sufficient
  // metadata for each directive to attribute bindings and references within
  // the template to each directive specifically, if the runtime instructions
  // support this.
  directives: {
    // Selector of the directive.
    selector: string;

    // Reference to the directive class (possibly a forward reference).
    type: o.Expression | (() => o.Expression);

    // Property names of the directive's inputs.
    inputs: string[];

    // Event names of the directive's outputs.
    outputs: string[];

    // Names by which this directive exports itself for references.
    exportAs: string[];
  }[];

  // Map of pipe names to an expression representing the pipe class.
  pipes: {[pipeName: string]: o.Expression|(() => o.Expression)};

  // Map of queries from this component.
  queries: {
    [fieldName: string]: {
      // Whether the query is a view query or content query.
      type: 'view'|'content';

      // First result or many results?
      first: boolean;

      // Predicate of the query, which can be either a DI token or
      // a list of refs.
      predicate: o.Expression | string[];

      // Is this a deep query or not?
      descendants: boolean;

      // What to read from the injector of the matched node?
      read: o.Expression | null;

      // Whether the query resolves statically or updates over time?
      static: boolean;
    }
  };

  animations: o.Expression|null;

  // Information about the specific settings of this component and the
  // way it is meant to be compiled.
  changeDetectionStrategy: ChangeDetectionStrategy;
  encapsulation: ViewEncapsulation;
  interpolation: InterpolationConfig;
  i18nUseExternalIds: boolean;
  usesInheritance: boolean;
  fullInheritance: boolean;
  usesOnChanges: boolean;

  // A reference to the `@angular/core` ES module, which allows access
  // to all Angular exports, including Ivy instructions.
  ngImport: o.Expression;
}


/**
 * Information needed to compile a query (view or content).
 */
export interface R3QueryMetadata {
  /**
   * Name of the property on the class to update with query results.
   */
  propertyName: string;

  /**
   * Whether to read only the first matching result, or an array of results.
   */
  first: boolean;

  /**
   * Either an expression representing a type or `InjectionToken` for the query
   * predicate, or a set of string selectors.
   */
  predicate: o.Expression|string[];

  /**
   * Whether to include only direct children or all descendants.
   */
  descendants: boolean;

  /**
   * An expression representing a type to read from each matched node, or null if the default value
   * for a given node is to be returned.
   */
  read: o.Expression|null;

  /**
   * Whether or not this query should collect only static results.
   *
   * If static is true, the query's results will be set on the component after nodes are created,
   * but before change detection runs. This means that any results that relied upon change detection
   * to run (e.g. results inside *ngIf or *ngFor views) will not be collected. Query results are
   * available in the ngOnInit hook.
   *
   * If static is false, the query's results will be set on the component after change detection
   * runs. This means that the query results can contain nodes inside *ngIf or *ngFor views, but
   * the results will not be available in the ngOnInit hook (only in the ngAfterContentInit for
   * content hooks and ngAfterViewInit for view hooks).
   */
  static: boolean;
}

/**
 * Output of render3 directive compilation.
 */
export interface R3DirectiveDef {
  expression: o.Expression;
  type: o.Type;
}

/**
 * Output of render3 component compilation.
 */
export interface R3ComponentDef {
  expression: o.Expression;
  type: o.Type;
}

/**
 * Mappings indicating how the class interacts with its
 * host element (host bindings, listeners, etc).
 */
export interface R3HostMetadata {
  /**
   * A mapping of attribute binding keys to `o.Expression`s.
   */
  attributes: {[key: string]: o.Expression};

  /**
   * A mapping of event binding keys to unparsed expressions.
   */
  listeners: {[key: string]: string};

  /**
   * A mapping of property binding keys to unparsed expressions.
   */
  properties: {[key: string]: string};

  specialAttributes: {styleAttr?: string; classAttr?: string;};
}
