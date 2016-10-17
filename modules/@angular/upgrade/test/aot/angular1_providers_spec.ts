import {injectorFactory, setTempInjectorRef} from '@angular/upgrade/src/aot/angular1_providers';

export function main() {
  describe('$injectorFactory', () => {
    it('should return the injector value that was previously set', () => {
      const mockInjector = {get: () => {}, has: () => false};
      setTempInjectorRef(mockInjector);
      const injector = injectorFactory();
      expect(injector).toBe(mockInjector);
    });
  });
}