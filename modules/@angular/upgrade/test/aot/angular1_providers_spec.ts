import { $injectorFactory } from '@angular/upgrade/src/aot/angular1_providers';

export function main() {
  describe('$injectorFactory', () => {
    it('should return and clear the injector value that was attached to it previously', () => {
      const mockInjector = { get: () => {}, has: () => false };
      $injectorFactory.$injector = mockInjector;

      const injector = $injectorFactory();

      expect(injector).toBe(mockInjector);
      expect($injectorFactory.$injector).toBe(null);
    });
  });
}