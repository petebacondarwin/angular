/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Inject, Injectable, NgZone} from '@angular/core';

import {getDOM} from '../dom_adapter';
import {DOCUMENT} from '../dom_tokens';

import {EventManagerPlugin} from './event_manager';

/**
 * Defines supported modifiers for key events.
 */
const MODIFIER_KEYS = ['alt', 'control', 'meta', 'shift'];

/**
 * Retrieves modifiers from key-event objects.
 */
const MODIFIER_KEY_GETTERS: {[key: string]: (event: KeyboardEvent) => boolean} = {
  'alt': (event: KeyboardEvent) => event.altKey,
  'control': (event: KeyboardEvent) => event.ctrlKey,
  'meta': (event: KeyboardEvent) => event.metaKey,
  'shift': (event: KeyboardEvent) => event.shiftKey
};

/**
 * @experimental
 * @description An injectable service that provides support for handling of key events in Angular.
 */
@Injectable()
export class KeyEventsPlugin extends EventManagerPlugin {
  constructor(@Inject(DOCUMENT) doc: any) { super(doc); }

   /**
     * Reports whether a named key event is supported.
     * @param eventName The event name to query.
     * @return True if the named key event is supported.
     */
  supports(eventName: string): boolean { return KeyEventsPlugin.parseEventName(eventName) != null; }

   /**
     * Registers a handler for a specific element and key event.
     * @param element The HTML element to receive event notifications.
     * @param eventName The name of the key event to listen for. 
     * @param handler A function to call when the notification occurs. Receives the 
     *  event object as an argument.
     * @returns The key event that was registered.
     */
   addEventListener(element: HTMLElement, eventName: string, handler: Function): Function {
    const parsedEvent = KeyEventsPlugin.parseEventName(eventName) !;

    const outsideHandler =
        KeyEventsPlugin.eventCallback(parsedEvent['fullKey'], handler, this.manager.getZone());

    return this.manager.getZone().runOutsideAngular(() => {
      return getDOM().onAndCancel(element, parsedEvent['domEventName'], outsideHandler);
    });
  }

  /**
   * Parses an event-name string to find key combinations.
   * @param eventName The event name.
   * @returns A dictionary ??? that contains the key combination.
   */
 static parseEventName(eventName: string): {[key: string]: string}|null {
    const parts: string[] = eventName.toLowerCase().split('.');

    const domEventName = parts.shift();
    if ((parts.length === 0) || !(domEventName === 'keydown' || domEventName === 'keyup')) {
      return null;
    }

    const key = KeyEventsPlugin._normalizeKey(parts.pop() !);

    let fullKey = '';
    MODIFIER_KEYS.forEach(modifierName => {
      const index: number = parts.indexOf(modifierName);
      if (index > -1) {
        parts.splice(index, 1);
        fullKey += modifierName + '.';
      }
    });
    fullKey += key;

    if (parts.length != 0 || key.length === 0) {
      // returning null instead of throwing to let another plugin process the event
      return null;
    }

    const result: {[k: string]: string} = {};
    result['domEventName'] = domEventName;
    result['fullKey'] = fullKey;
    return result;
  }

   /**
    * Constructs an event name string from events that combine multiple key actions.  ???
    * @param event The keyboard-event object.
    */
   static getEventFullKey(event: KeyboardEvent): string {
    let fullKey = '';
    let key = getDOM().getEventKey(event);
    key = key.toLowerCase();
    if (key === ' ') {
      key = 'space';  // for readability
    } else if (key === '.') {
      key = 'dot';  // because '.' is used as a separator in event names
    }
    MODIFIER_KEYS.forEach(modifierName => {
      if (modifierName != key) {
        const modifierGetter = MODIFIER_KEY_GETTERS[modifierName];
        if (modifierGetter(event)) {
          fullKey += modifierName + '.';
        }
      }
    });
    fullKey += key;
    return fullKey;
  }

  /**
   * ???
   * @param fullKey 
   * @param handler 
   * @param zone 
   */
  static eventCallback(fullKey: any, handler: Function, zone: NgZone): Function {
    return (event: any /** TODO #9100 */) => {
      if (KeyEventsPlugin.getEventFullKey(event) === fullKey) {
        zone.runGuarded(() => handler(event));
      }
    };
  }

  /** @internal */
  static _normalizeKey(keyName: string): string {
    // TODO: switch to a Map if the mapping grows too much
    switch (keyName) {
      case 'esc':
        return 'escape';
      default:
        return keyName;
    }
  }
}
