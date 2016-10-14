import { ElementRef, EventEmitter } from '@angular/core';

export class UpgradeComponent {
  constructor(selector: string, elementRef: ElementRef) {
  }

  setInput(name: string, value: any) {

  }

  getOutput<T>(name: string): EventEmitter<T> {
    return new EventEmitter<T>();
  }
}