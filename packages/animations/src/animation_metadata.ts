/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
export interface StyleData { [key: string]: string|number; }

/**
* @description Collects animation-step timing parameters for an animation step.  
* @see AnimationAnimateMetadata, {@link animate animate()}.
* @param duration The full duration of an animation step. A number and optional time unit, 
*    such as "1s" or "10ms" for one second and 10 milliseconds, respectively.
*    The default unit is milliseconds.
* @param delay The delay in applying an animation step. A number and optional time unit. 
*    The default unit is milliseconds.
* @param easing An easing style that controls how an animations step accelerates
*     and decelerates during its run time. An easing function, or one of the following constants: 
* - `ease-in`
* - `ease-out`
* - `ease-in-and-out`
*/
export declare type AnimateTimings = {
    duration: number,
    delay: number,
    easing: string | null
};

/**
 * @description Options that control animation styling and timing.
 * 
 * The following animation functions accept animation option data:
 *
 * - {@link transition transition()}
 * - {@link sequence sequence()}
 * - {@link group group()}
 * - {@link query query()}
 * - {@link animation animation()}
 * - {@link useAnimation useAnimation()}
 * - {@link animateChild animateChild()}
 *
 * Programmatic animations built using {@link AnimationBuilder the AnimationBuilder service} also
 * make use of AnimationOptions.
 * 
 * @param delay Optional. Sets a time-delay for initiating an animation action.
 *    Default is 0, meaning no delay.
 *    ?? default unit for number? string values is number unit? allowed unit specs?
 * @param params Optional. A set of developer-defined parameters that modify styling and timing  
 *    when an animation action starts. An array of key-value pairs, where the provided value 
 *    is used as a default.   
 */
export declare interface AnimationOptions {
    delay?: number|string;
    params?: {[name: string]: any};
}

/**
 * @description Adds duration options to control animation styling and timing for a child animation. 
 * 
 * @param duration Optional. Sets a duration value for a child animation.
 * ??number of what? what are string values? interaction with delay?  default?
 * @see {@link animateChild animateChild()}
 */
export declare interface AnimateChildOptions extends AnimationOptions { duration?: number|string; }

/**
 * @description Constants for the categories of parameters that can be defined for animations.
 *  
 * A corresponding function defines a  set of parameters for each category, and 
 * collects them into a corresponding {@link AnimationMetadata AnimationMetadata} child interface.
 *
 * @param State Associates a named animation state with a set of CSS styles. 
 *  See {@link AnimationStateMetadata AnimationStateMetadata} {@link state state()}  
 * @param Transition Collects data for a transition from one animation state to another.
 *  See {@link AnimationTransitionMetadata AnimationTransitionMetadata} {@link transition transition()} 
 * @param Sequence Collects a set of animation steps.
 *  See {@link AnimationSequenceMetadata AnimationSequenceMetadata} {@link sequence sequence()}  
 * @param Group  Collects a set of animation steps.
 *  See {@link AnimationGroupMetadata AnimationGroupMetadata} {@link group group()} 
 * @param Animate Defines an animation step.
 *  See {@link AnimationAnimateMetadata AnimationAnimateMetadata} {@link animate animate()} 
 * @param Keyframes Collects a set of animation steps.
 *  See {@link AnimationKeyframesMetadata AnimationKeyframesMetadata} {@link keyframes keyframes()} 
 * @param Style Collects a set of CSS property-value pairs into a named style.
 *  See {@link AnimationStyleMetadata AnimationStyleMetadata} {@link style style()}
 * @param Trigger Associates an animation with an entry trigger that can be attached to an element.
 *  See {@link AnimationTriggerMetadata AnimationTriggerMetadata} {@link trigger trigger()}
 * @param Reference Encapsulates a re-usable animation. 
 *  See {@link AnimationReferenceMetadata AnimationReferenceMetadata} {@link animation animation()}
 * @param AnimateChild Collects data to use in executing child animations returned by a query.
 *  See {@link AnimationAnimateChildMetadata AnimationAnimateChildMetadata} {@link animateChild animateChild()}
 * @param AnimateRef ???
 *   See {@link AnimationAnimateRefMetadata AnimationAnimateRefMetadata} {@link useAnimation useAnimation()}
 * @param Query Collects child-animation query data.
 *   See {@link AnimationQueryMetadata AnimationQueryMetadata} {@link query query()}     
 * @param Stagger Collects data for staggering an animation sequence.
 * 
 */
export const enum AnimationMetadataType {
    State = 0,
    Transition = 1,
    Sequence = 2,
    Group = 3,
    Animate = 4,
    Keyframes = 5,
    Style = 6,
    Trigger = 7,
    Reference = 8,
    AnimateChild = 9,
    AnimateRef = 10,
    Query = 11,
    Stagger = 12
}

/**
 * Specifies automatic styling.
 */
export const AUTO_STYLE = '*';

/**
 * Base for animation data structures.
 */
export interface AnimationMetadata { type: AnimationMetadataType; }

/**
 * @description Encapsulates an animation trigger. Instantiated and returned by the 
 * {@link trigger trigger()} function.
 * 
 * @param name The trigger name, used to associate it with an element. Unique within the component. ???
 * @param definitions An animation definition object, containing an array of state and transition declarations.
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 */
export interface AnimationTriggerMetadata extends AnimationMetadata {
    name: string;
    definitions: AnimationMetadata[];
    options: {params?: {[name: string]: any}}|null;
}

/**
 * @description Encapsulates an animation state by associating a state name with a set of CSS styles. 
 * Instantiated and returned by the {@link state state()} function.
 *
 * @param name The state name, unique within the component. ???
 * @param styles The CSS styles associated with this state.
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and
 *    can be overridden on invocation.
 */
export interface AnimationStateMetadata extends AnimationMetadata {
    name: string;
    styles: AnimationStyleMetadata;
    options?: {params: {[name: string]: any}};
}

/**
 * @description Encapsulates an animation transition. Instantiated and returned by the 
 * {@link transition transition()} function. 
 *
 * @param expr An expression that describes a  state change.
 * @param animation  One or more animation objects to which this transition applies.
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation. Default delay is 0.
 */
export interface AnimationTransitionMetadata extends AnimationMetadata {
    expr: string|((fromState: string, toState: string) => boolean);
    animation: AnimationMetadata|AnimationMetadata[];
    options: AnimationOptions|null;
}

/**
 * @description Encapsulates a reusable animation, which is a collection of individual animation steps. 
 * Instantiated and returned by the {@link animation animation()} function, and 
 * passed to the {@link useAnimation useAnimation()} function.
 * 
 * @param animation One or more animation step objects.
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 */
export interface AnimationReferenceMetadata extends AnimationMetadata {
    animation: AnimationMetadata|AnimationMetadata[];
    options: AnimationOptions|null;
}

/**
 * @description Encapsulates an animation query. Instantiated and returned by
 * the {@link query query()} function. 
 * 
 * @param selector The HTML tag for this query.
 * @param animation One or more animation steps.
 * @param options Optional. A query options object.
 */
export interface AnimationQueryMetadata extends AnimationMetadata {
    selector: string;
    animation: AnimationMetadata|AnimationMetadata[];
    options: AnimationQueryOptions|null;
}

/**
 * @description Encapsulates a keyframes sequence. Instantiated and returned by
 * the {@link keyframes keyframes()} function. 
 *
 * @param steps A collection of animation steps.
 */
export interface AnimationKeyframesSequenceMetadata extends AnimationMetadata {
    steps: AnimationStyleMetadata[];
}

/**
 * @description Encapsulates an animation style. Instantiated and returned by
 * the {@link style style()} function.  
 * 
 * @param styles A set of CSS style properties.
 * @param offset ??
 */
export interface AnimationStyleMetadata extends AnimationMetadata {
    styles: '*'|{[key: string]: string | number}|Array<{[key: string]: string | number}|'*'>;
    offset: number|null;
}

/**
 * @description Encapsulates an animation step. Instantiated and returned by
 * the {@link animate animate()} function.   
 *
 * @param timings The timing data for the step.
 * @param styles A set of styles used in the step.
 */
export interface AnimationAnimateMetadata extends AnimationMetadata {
    timings: string|number|AnimateTimings;
    styles: AnimationStyleMetadata|AnimationKeyframesSequenceMetadata|null;
}

/**
 *  @description Encapsulates a child animation, that can be run explicitly when the parent is run. 
 *  Instantiated and returned by the {@link animateChild animateChild()} function.
 *
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 */
export interface AnimationAnimateChildMetadata extends AnimationMetadata {
    options: AnimationOptions|null;
}

/**
 * @description Encapsulates a reusable animation. 
 * Instantiated and returned by the {@link useAnimation useAnimation()} function.
 *
 * @param animation An animation reference object.
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 */
export interface AnimationAnimateRefMetadata extends AnimationMetadata {
    animation: AnimationReferenceMetadata;
    options: AnimationOptions|null;
}

/**
 * @description Encapsulates an animation sequence. 
 * Instantiated and returned by the {@link sequence sequence()} function.  
 * 
 * @param steps An array of animation step objects.
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 */
export interface AnimationSequenceMetadata extends AnimationMetadata {
    steps: AnimationMetadata[];
    options: AnimationOptions|null;
}

/**
 * @description Encapsulates an animation group. 
 * Instantiated and returned by the {@link group group()} function.
 * 
 * @param steps One or more animation or style steps that form this group. 
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 */
export interface AnimationGroupMetadata extends AnimationMetadata {
    steps: AnimationMetadata[];
    options: AnimationOptions|null;
}

/**
 * @description Encapsulates animation query options. 
 * Passed to the {@link query query()} function. 
 *
 * @param optional Optional. True if this query is optional, false if it is required.
 * @param limit Optional. A maximum total number of results to return from the query.
 *    If negative, results are limited from the end of the query list towards the beginning.  
 */
export declare interface AnimationQueryOptions extends AnimationOptions {
    optional?: boolean;
    limit?: number;
}

/**
 * @description Encapsulates staggering parameters for a set of animation steps. 
 * Instantiated and returned by the {@link stagger stagger()} function. 
 *
 *  @param timings The timing data for the steps.
 *  @param animation One or more animation steps. 
 **/
export interface AnimationStaggerMetadata extends AnimationMetadata {
    timings: string|number;
    animation: AnimationMetadata|AnimationMetadata[];
}

/**
 * @description Creates a named animation trigger, containing a  list of {@link state state} 
 * and {@link transition transition} entries to be evaluated when the expression 
 * bound to the trigger changes. 
 * 
 * @param name An identifying string.
 * @param definitions  An animation definition object, containing an array of {@link state state}
 *   and {@link transition transition} declarations.
 *
 * @return An {@link AnimationTriggerMetadata AnimationTriggerMetadata} object that encapsulates the trigger data.
 * 
 * @notes Define an animation trigger in the 
 * {@link Component#animations `@Component.animations` section}. 
 * In the template, reference the trigger by name and bind it to a trigger expression that 
 * evaluates to a defined animation state, using the following format: 
 * `[@triggerName]="expression"`
 *
 * Animation trigger bindings convert all values to strings, and then match the previous and current values against
 * any linked transitions. Booleans can be specified as `1` or `true` and `0` or `false`.
 *
 * ### Usage Example 
 * The following example creates an animation trigger reference based on the provided name value. 
 * The provided animation value is expected to be an array consisting of state and transition declarations.
 * 
 * ```typescript
 * @Component({
 *   selector: 'my-component',
 *   templateUrl: 'my-component-tpl.html',
 *   animations: [
 *     trigger("myAnimationTrigger", [
 *       state(...),
 *       state(...),
 *       transition(...),
 *       transition(...)
 *     ])
 *   ]
 * })
 * class MyComponent {
 *   myStatusExp = "something";
 * }
 * ```
 *
 * The template associated with this component makes use of the defined trigger 
 * by binding to an element within its template code.
 *
 * ```html
 * <!-- somewhere inside of my-component-tpl.html -->
 * <div [@myAnimationTrigger]="myStatusExp">...</div>
 * ```
 *
 */
export function trigger(
        name: string, 
        definitions: AnimationMetadata[]): 
    AnimationTriggerMetadata {
return {type: AnimationMetadataType.Trigger, name, definitions, options: {}};
}

/**
 * @description Defines an animation step that combines styling information with timing information.
 * 
 * @param timings Sets `AnimateTimings` for the parent animation.
 *     A string in the format "duration [delay] [easing]". 
 *  - Duration and delay are expressed as a number and optional time unit, 
 *     such as "1s" or "10ms" for one second and 10 milliseconds, respectively.
 *     The default unit is milliseconds. 
 *  - The easing value controls how the animation accelerates and decelerates 
 *        during its runtime. Value is one of  `ease`, `ease-in`, `ease-out`, or
 *        `ease-in-out`; or a TypeScript function that returns an easing 
 *        (specification/curve??. where are constants defined?) 
 *        If not supplied, no easing is applied. 
 *  
 *      For example, the string "1s 100ms ease-out" specifies a duration of 
 *      1000 milliseconds, and delay of 100 ms, and the "ease-out" easing style, 
 *      which decelerates near the end of the duration.
 * @param styles Optional. Sets AnimationStyles for the parent animation. 
 *      A function call to either {@link style  style()} or {@link keyframes keyframes()} 
 *      that returns a collection of CSS style entries to be applied to the parent animation.
 *      When null, uses the styles from the destination state. 
 *      This is useful when describing an animation step that will complete an animation; 
 *      see {@link transition#the-final-animate-call animating to the final state}).
 * @returns An {@link AnimationAnimateMetadata AnimationAnimateMetadata} object that 
 *      encapsulates the animation step.
 * 
 * @usageNotes Call within an animation {@link sequence sequence()}, {@link group group()}, or
 * {@link transition transition()} call to specify an animation step 
 * that applies given style data to the parent animation for a given amount of time.
 *
 * ## Syntax Examples 
 * ### Timing Examples 
 *  The following examples show various `timings` specifications.
 * 
 *    <table>
 *      <tr>
 *        <td>
 * 
 * `animate(500)`
 * 
 *      </td>
 *        <td>Duration is 500 milliseconds.</td>
 *      </tr>
 *      <tr>
 *        <td>
 * 
 * `animate("1s")`
 * 
 *      </td>
 *        <td>Duration is 1000 milliseconds.</td>
 *      </tr>
 *      <tr>
 *        <td>
 * 
 * `animate("100ms 0.5s")`
 * 
 *      </td>
 *        <td>Duration is 100 milliseconds, delay is 500 milliseconds.</td>
 *      </tr>
 *      <tr>
 *        <td>
 * 
 * `animate("5s ease")`
 * 
 *      </td>
 *        <td>Duration is 5000 milliseconds, easing is (what??) </td>
 *       </tr>
 *      <tr>
 *        <td>
 * 
 * `animate("5s 10ms cubic-bezier(.17,.67,.88,.1)")`
 * 
 * </td>
 *        <td>Duration is 5000 milliseconds, delay is 10 milliseconds, easing is (what??) </td>
 *      </tr>
 *    </table>
 * 
 * ### Style Examples 
 * The following examples show various `styles` specifications.
 * 
 *    <table>
 *      <tr>
 *        <td>
 * 
 *              `animate(500, style({ background: "red" }))`
 * 
 *        </td>
 *        <td>Calls style() to set a single CSS style.</td>
 *      </tr>
 *      <tr>
 *        <td><pre>animate(500, keyframes(
     [style({ background: "blue" })),
     style({ background: "red" }))])</pre> </td>
 *        <td>Calls keyframes() to set a CSS style to different values for successive keyframes.</td>
 *      </tr>
 *    </table>
 * 
 */
export function animate(
    timings: string | number, 
    styles: AnimationStyleMetadata | AnimationKeyframesSequenceMetadata |
     null = null): 
 AnimationAnimateMetadata {
return {type: AnimationMetadataType.Animate, styles, timings};
}

/**
 * @description Defines a list of animation steps to be run in parallel. 
 * 
 * @param steps An array of animation step objects.
 * - When steps are defined by {@link style style()} or {@link animate animate()} 
 *  function calls, each call within the group is executed instantly. 
 * - To specify offset styles to be applied at a later time, define steps with
 *   {@link keyframes keyframes()}, or use {@link animate animate()} calls
 *   with a delay value. For example: 
 * ``` typescript
 * group([
 *   animate("1s", { background: "black" }))
 *   animate("2s", { color: "white" }))
 * ])
 * ```    
 *  
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 *
 * @return An {@link AnimationGroupMetadata AnimationGroupMetadata} object that encapsulates the group data.
 * 
 * @usageNotes Grouped animations are useful when a series of styles must be 
 * animated at different starting times and closed off at different ending times.
 *
 * When called within a {@link sequence sequence()} or a 
 * {@link transition transition()} call, does not continue to the next 
 * instruction until all of the inner animation steps have completed.
 *
 *
 */
export function group(
   steps: AnimationMetadata[], 
   options: AnimationOptions | null = null):
 AnimationGroupMetadata { 
return {type: AnimationMetadataType.Group, steps, options};
 }

/**
 * @description Defines a list of animation steps to be run sequentially, one by one.
 *
 * @param steps An array of animation step objects.
 * - Steps defined by {@link style style()} calls apply the styling data immediately. 
 * - Steps defined by {@link animate animate()} calls apply the styling data over time
 *   as specified by the timing data.
 * ``` typescript
 * sequence([
 *   style({ opacity: 0 })),
 *   animate("1s", { opacity: 1 }))
 * ]) 
 * ```
 *  
 * @param options Optional. An options object containing a delay and 
 *    developer-defined parameters that provide styling defaults and 
 *    can be overridden on invocation.
 *
 * @return An {@link AnimationSequenceMetadata AnimationSequenceMetadata} object that encapsulates the sequence data.
 *
 * @usageNotes Sequential application is the default when you pass an array of steps to a 
 * {@link transition transition()} call. 
 * Compare to {@link group group()} call, which runs animation steps in parallel. 
 *
 * When used within a {@link group group()} or a {@link transition transition()} call, 
 * continues to the next instruction only after each of the inner animation
 * steps have completed.
 * 
 **/
export function sequence(
    steps: AnimationMetadata[], 
    options: AnimationOptions | null = null):
 AnimationSequenceMetadata {
return {type: AnimationMetadataType.Sequence, steps, options};
}

/**
 * @description Declares a key/value object containing CSS properties/styles that 
 * can then be used for {@link state animation states}, within an {@link sequence animation sequence}, 
 * or as styling data for both {@link animate animate} and {@link keyframes keyframes}.
 *
 * @param tokens A set of CSS styles or HTML styles associated with an animation state.  
 *     The value can be any of the following:
 * - A key-value style pair associating a CSS property with a value. 
 * - An array of key-value style pairs. 
 * - An asterisk (*), to use auto-styling, where styles are derived from the element 
 *      being animated and applied to the animation when it starts.  
 * 
 * Auto-styling can be used to define a state that depends on layout or other environmental factors.
 * 
 * @return An {@link AnimationStyleMetadata AnimationStyleMetadata} object that encapsulates the style data.
 * 
 * * @usageNotes
 * ### Usage
 * The following examples create animation styles that collect a set of CSS property values:
 * 
 * ```
 * // string values for CSS properties
 * style({ background: "red", color: "blue" })
 * 
 * // numerical pixel values 
 * style({ width: 100, height: 0 })</pre>
 * ```
 * 
 * The following example uses auto-styling to allow a component to animate from
 * a height of 0 up to the height of the parent element:
 * 
 * ```
 * style({ height: 0 }),
 * animate("1s", style({ height: "*" }))
 * ```
 * 
 **/
export function style(
    tokens: '*' | {[key: string]: string | number} | Array<'*'|{[key: string]: string | number}>):
  AnimationStyleMetadata {
return {type: AnimationMetadataType.Style, styles: tokens, offset: null};
}

/**
 * @description Declares an animation state within a trigger attached to an element. 
 * 
 * @param name One or more names for the defined state in a comma-separated string. 
 *      A "stateNameExpr" can be one or more state names separated by commas.
 * ("stateNameExpr" does not occur anywhere else on the page - is it the correct type for the name param?) 
 * The following reserved state names can be supplied to define a style for specific usage:
 * 
 * - `void` You can associate styles with this name to be used when 
 *          the element is detached from the application. For example, when an ngIf evaluates 
 *          to false, the state of the associated element is void.<li>
 *  - `*` (asterisk) Indicates the default state. You can associate styles with this name
 *   to be used as the fallback when the state that is being animated is not declared 
 *   within the trigger. 
 * 
 * @param styles A set of CSS styles associated with this state, created using the {@link style style()} function. 
 *      This set of styles persists on the element once the state has been reached.
 * 
 * @param options Optional. Parameters that can be passed to the state when it is invoked. 0 or more key-value pairs.
 * 
 * @return An {@link AnimationStateMetadata AnimationStateMetadata} object that encapsulates the new state data.
 * 
 * @usageNotes Use the {@link trigger trigger()} function to register states to an animation trigger. 
 * Use the {@link transition transition()} function to animate between states.
 *  When a state is active within a component, its associated styles persist on the element, 
 * even when the animation ends.
 * 
 **/
export function state(
    name: string, 
    styles: AnimationStyleMetadata,
    options?: {params: {[name: string]: any}}): 
  AnimationStateMetadata {
return {type: AnimationMetadataType.State, name, styles, options};
}

/**
 *  @description Collects a set of animation styles, associating each style with an optional `offset` value.
 * 
 *  @param steps A set of animation styles with offset data.  
 *  @returns An {@link AnimationKeyframesMetadata AnimationKeyframesMetadata} object that encapsulates the keyframes data.
 * 
 *  @usageNotes Use with the {@link animate animate()} call. Instead of applying animations from the current state
 * to the destination state, keyframes describe how each style entry is applied and at what point 
 * within the animation arc (like CSS Keyframe Animations).
 *
 * ### Usage
 *
 * For each `style()` entry an `offset` value can be set. Doing so allows to specifiy at what
 * percentage of the animate time the styles will be applied.
 *
 * ```typescript
 * // the provided offset values describe when each backgroundColor value is applied.
 * animate("5s", keyframes([
 *   style({ backgroundColor: "red", offset: 0 }),
 *   style({ backgroundColor: "blue", offset: 0.2 }),
 *   style({ backgroundColor: "orange", offset: 0.3 }),
 *   style({ backgroundColor: "black", offset: 1 })
 * ]))
 * ```
 *
 * Alternatively, if there are no `offset` values used within the style entries then the offsets
 * will be calculated automatically.
 *
 * ```typescript
 * animate("5s", keyframes([
 *   style({ backgroundColor: "red" }) // offset = 0
 *   style({ backgroundColor: "blue" }) // offset = 0.33
 *   style({ backgroundColor: "orange" }) // offset = 0.66
 *   style({ backgroundColor: "black" }) // offset = 1
 * ]))
 * ```
 *
 * {@example core/animation/ts/dsl/animation_example.ts region='Component'}
 * 
 */
export function keyframes(
    steps: AnimationStyleMetadata[]): 
  AnimationKeyframesSequenceMetadata {
return {type: AnimationMetadataType.Keyframes, steps};
}

/**
 * @description Declares an animation transition as a sequence of animation steps to run when a given 
 * condition is satisfied.
 *    
 * @param stateChangeExpr A Boolean expression or function that compares the previous and current 
 *   animation states, and returns true if this transition should occur. Note that  "true" and "false" 
 *   match 1 and 0, respectively. An expression is evaluated each time a state change occurs in the animation trigger element. 
 *   The animation steps run when the expression evaluates to true.
 *   
 * - A state-change string takes the form "state1 => state2", where each side is a defined animation state, 
 *   or an asterix (*) to refer to a dynamic start or end state. 
 *   - The expression string can contain multiple comma-separated statements; 
 *      for example "state1=>state2,state3=>state4". 
 *   - Special values `:enter` and `:leave` initiate a transition on the entry and exit states, 
 *       equivalent to  "void => *"  and "* => void". 
 *   - Special values `:increment` and `:decrement` initiate a transition when a numeric value has 
 *       increased or decreased in value. 
 * - A function is executed each time a state change occurs in the animation trigger element. 
 *        The animation steps run when the function returns true.  
 *     
 * @param steps One or more animation objects, as returned by the {@link animate animate()} or
 *    {@link sequence sequence()} function, that form a transformation from one state to another.  
 *    A sequence is used by default when you pass an array. 
 * @param options Optional. An options object that can contain a delay value for the start of the animation, 
 *   and additional developer-defined parameters. Provided values for additional parameters are used as defaults, 
 *   and override values can be passed to the caller on invocation.
 * @returns An {@link AnimationTransitionMetadata AnimationTransitionMetadata} object that encapsulates the 
 *   transition data. 
 * 
 * @usageNotes The condition is a Boolean expression or function that compares the previous and current animation states,
 * and returns true if this transition should occur. When a transition is defined that matches the state criteria, 
 * the associated animation is triggered. 
 *
 * Note that when you call the {@link sequence sequence()} function within a {@link group group()} 
 * or a {@link transition transition()} call, execution does not continue to the next instruction 
 * until each of the inner animation steps have completed.
 * 
 * ### Syntax examples 
 * The template associated with a component binds an animation trigger to an element.
 * 
 * ```
 * <!-- somewhere inside of my-component-tpl.html -->
 * <div [@myAnimationTrigger]="myStatusExp">...</div>
 * ``` 
 * All transitions are defined within an animation trigger, along with named states that the transitions 
 * change to and from. 
 * 
 * ```
 * trigger("myAnimationTrigger", [
 * // define states
 * state("on", style({ background: "green" })),
 * state("off", style({ background: "grey" })),
 * ...
 * The following examples define transitions between the two defined states (and default states), 
 * using various options:
 * ```
 * // Transition occurs when the state value
 * // bound to "myAnimationTrigger" changes from "on" to "off"
 * transition("on => off", animate(500)),
 *  // Run the same animation for both directions
 * transition("on <=> off", animate(500)),
 *  // Define multiple state-change pairs separated by commas
 * transition("on => off, off => void", animate(500))
 * ]
 * ```
 * 
 * ### Special values for state-change expressions
 *
 * - Catch-all state change for when an element is inserted into the page and the 
 *     destination state is unknown:
 * 
 * ```typescript
 * transition("void => *", [
 *        style({ opacity: 0 }),
 *         animate(500)
 *      ])
 * ```
 * - Capture a state change between any states:
 * 
 *  ```transition("* => *", animate("1s 0s"))```
 *  
 * - Entry and exit transitions:
 * 
 * ```transition(":enter", [
 *      style({ opacity: 0 }),
 *     animate(500, style({ opacity: 1 }))
 *    ]),
 *    transition(":leave", [
 *      animate(500, style({ opacity: 0 }))
 *    ])
 * ```
 * 
 * Using `:increment` and `:decrement` to initiate transitions:
 * 
 * {@example core/animation/ts/dsl/animation_example.ts region='Component'}
 *
 * ### State change functions
 * A function that invokes an animation when true:
 *
 * ```
 * transition((fromState, toState) => 
 *      {
 *      return fromState == "off" && toState == "on";
 *      },  
 *      animate("1s 0s"))
 * ```
 * 
 **/
export function transition(
 stateChangeExpr: string | ((fromState: string, toState: string) => boolean),
 steps: AnimationMetadata | AnimationMetadata[],
 options: AnimationOptions | null = null): AnimationTransitionMetadata {
return {type: AnimationMetadataType.Transition, expr: stateChangeExpr, animation: steps, options};
}

/**
 * @description Produces a reusable animation that can be invoked in another animation or sequence, 
 * by calling the {@link useAnimation useAnimation()} function.
 * 
 * @param steps One or more animation objects, as returned by the `animate()` or `sequence()` function, 
 *    that form a transformation from one state to another. A sequence is used by default when you pass an array. 
 * @param options Optional. An options object that can contain a delay value for the start of the animation, 
 *   and additional developer-defined parameters. Provided values for additional parameters are used as defaults, 
 *   and override values can be passed to the caller on invocation.
 * @returns An {@link AnimationReferenceMetadata AnimationReferenceMetadata} object that encapsulates the animation data. 
 * 
 * @example
 *
 * ```
 * var fadeAnimation = animation([
 *   style({ opacity: '{{ start }}' }),
 *   animate('{{ time }}',
 *     style({ opacity: '{{ end }}'}))
 * ], { params: { time: '1000ms', start: 0, end: 1 }});
 * ```
 *
 * If parameters are attached to an animation then they act as **default parameter values**. When an
 * animation is invoked via `useAnimation` then parameter values are allowed to be passed in
 * directly. If any of the passed in parameter values are missing then the default values will be
 * used. If one or more parameter values are missing before animated, an error is thrown.
 *
 * ```
 * useAnimation(fadeAnimation, {
 *   params: {
 *     time: '2s',
 *     start: 1,
 *     end: 0
 *   }
 * })
 * ```
 *
 */
export function animation(
 steps: AnimationMetadata | AnimationMetadata[],
 options: AnimationOptions | null = null): AnimationReferenceMetadata {
return {type: AnimationMetadataType.Reference, animation: steps, options};
}

/**
 * @description Executes a queried inner animation element within an animation sequence.
 *
 * @param options Optional. An options object that can contain a delay value for the start of the animation, 
 *   and additional override values for developer-defined parameters. 
 * @return An {@link AnimationChildMetadata AnimationChildMetadata} object that encapsulates the child animation data. 
 * 
 * @usageNotes Each time an animation is triggered in Angular, the parent animation
 * has priority and any child animations are blocked. In order
 * for a child animation to run, the parent animation must query each of the elements
 * containing child animations, and run them using this function.
 * 
 * Note that this feature designed to be used with {@link query query()} and it will only work
 * with animations that are assigned using the Angular animation library. CSS keyframes
 * and transitions are not handled by this API.
 * 
 */
export function animateChild(options: AnimateChildOptions | null = null):
 AnimationAnimateChildMetadata {
return {type: AnimationMetadataType.AnimateChild, options};
}

/**
 * @description Starts a reusable animation that is created using the {@link animation animation()} function.
 *
 * @param animation The reusable animation to start.
 * @param options Optional. An options object that can contain a delay value for the start of the animation, 
 *   and additional override values for developer-defined parameters. 
 * @return An {@link AnimationRefMetadata AnimationRefMetadata} object that encapsulates the animation parameters.
 */
export function useAnimation(
 animation: AnimationReferenceMetadata,
 options: AnimationOptions | null = null): AnimationAnimateRefMetadata {
return {type: AnimationMetadataType.AnimateRef, animation, options};
}

/**
 * @description Finds one or more inner elements within the current element that is
 * being animated within a sequence. Use with {@link animateChild animateChild()}
 * 
 * @param selector The element to query, or a set of elements that contain Angular-specific
 *    characteristics, specified with one or more of the following tokens.
 *  - `query(":enter")`/`query(":leave")` : Query for newly inserted/removed elements. 
 *  - `query(":animating")` : Query all currently animating elements.
 *  - `query("@triggerName")` : Query elements that contain an animation trigger.
 *  - `query("@*")` : Query all elements that contain an animation triggers.
 *  - `query(":self")` : Include the current element into the animation sequence.
 *
 * Tokens can be merged into a combined query selector string. For example:
 *
 *  ```
 *  query(':self, .record:enter, .record:leave, @subTrigger', [...])
 *  ```
 * 
 * @param animation One or more animation steps to apply to the queried element or elements. 
 *    An array is treated as an animation sequence.
 * @param options Optional. An options object.
 *  - Use the 'limit' field to limit the total number of items to collect. For example:   
 *
 * ```js
 * query('div', [
 *   animate(...),
 *   animate(...)
 * ], { limit: 1 })
 * ```
 *
 * By default, throws an error when zero items are found. Set the 
 * `optional` flag to ignore this error. For example:
 *
 * ```js
 * query('.some-element-that-may-not-be-there', [
 *   animate(...),
 *   animate(...)
 * ], { optional: true })
 * ```
 * 
 * @return An {@link AnimationQueryMetadata AnimationQueryMetadata} object that encapsulates the query data. 
 *
 * @usageNotes  
 * The following example queries for inner elements and animates them 
 * individually using {@link animateChild animateChild()} 
 *
 * ```
 * @Component({
 *   selector: 'inner',
 *   template: `
 *     <div [@queryAnimation]="exp">
 *       <h1>Title</h1>
 *       <div class="content">
 *         Blah blah blah
 *       </div>
 *     </div>
 *   `,
 *   animations: [
 *    trigger('queryAnimation', [
 *      transition('* => goAnimate', [
 *        // hide the inner elements
 *        query('h1', style({ opacity: 0 })),
 *        query('.content', style({ opacity: 0 })),
 *
 *        // animate the inner elements in, one by one
 *        query('h1', animate(1000, style({ opacity: 1 })),
 *        query('.content', animate(1000, style({ opacity: 1 })),
 *      ])
 *    ])
 *  ]
 * })
 * class Cmp {
 *   exp = '';
 *
 *   goAnimate() {
 *     this.exp = 'goAnimate';
 *   }
 * }
 * ```
 * 
 */
export function query(
    selector: string, animation: AnimationMetadata | AnimationMetadata[],
    options: AnimationQueryOptions | null = null): 
 AnimationQueryMetadata {
return {type: AnimationMetadataType.Query, selector, animation, options};
}

/**
 * @description Use within an animation {@link query query()} call to issue a timing gap after each queried item
 * is animated.
 * 
 * @param timings A delay value.
 * @param animation One ore more animation steps.
 * @returns An {@link AnimationStaggerMetadata AnimationStaggerMetadata} object that 
 *   encapsulates the stagger data. 
 
 * @usageNotes
 * 
 * ### Usage Example
 *
 * In the following example, a container element wraps a list of items stamped out
 * by an ngFor. The container element contains an animation trigger that will later be set
 * to query for each of the inner items.
 * 
 * Each time items are added, the opacity fade-in animation runs,
 * and each removed item is faded out.
 * When either of these animations occur, the stagger effect is
 * applied after each item's animation is started.
 *
 * ```html
 * <!-- list.component.html -->
 * <button (click)="toggle()">Show / Hide Items</button>
 * <hr />
 * <div [@listAnimation]="items.length">
 *   <div *ngFor="let item of items">
 *     {{ item }}
 *   </div>
 * </div>
 * ```
 *
 * Here is the component code:
 *
 * ```ts
 * import {trigger, transition, style, animate, query, stagger} from '@angular/animations';
 * @Component({
 *   templateUrl: 'list.component.html',
 *   animations: [
 *     trigger('listAnimation', [
 *        //...
 *     ])
 *   ]
 * })
 * class ListComponent {
 *   items = [];
 *
 *   showItems() {
 *     this.items = [0,1,2,3,4];
 *   }
 *
 *   hideItems() {
 *     this.items = [];
 *   }
 *
 *   toggle() {
 *     this.items.length ? this.hideItems() : this.showItems();
 *    }
 *  }
 * ```
 *
 * Here is the animation trigger code:
 *
 * ```ts
 * trigger('listAnimation', [
 *   transition('* => *', [ // each time the binding value changes
 *     query(':leave', [
 *       stagger(100, [
 *         animate('0.5s', style({ opacity: 0 }))
 *       ])
 *     ]),
 *     query(':enter', [
 *       style({ opacity: 0 }),
 *       stagger(100, [
 *         animate('0.5s', style({ opacity: 1 }))
 *       ])
 *     ])
 *   ])
 * ])
 * ```
 *
 */
export function stagger(
    timings: string | number,
    animation: AnimationMetadata | AnimationMetadata[]): 
  AnimationStaggerMetadata {
return {type: AnimationMetadataType.Stagger, timings, animation};
}