import { downgradeInjectable } from '@angular/upgrade/src/aot/downgrade_injectable';
import { INJECTOR_KEY } from '@angular/upgrade/src/aot/constants';

export function main() {
  describe('downgradeInjectable', () => {
    it('should return an Angular 1 annotated factory for the token', () => {
      const factory = downgradeInjectable('someToken');
      expect(factory[0]).toEqual(INJECTOR_KEY);
      expect(factory[1]).toEqual(jasmine.any(Function));
      const injector = {
        get: jasmine.createSpy('get').and.returnValue('service value')
      };
      const value = (factory as any)[1](injector);
      expect(injector.get).toHaveBeenCalledWith('someToken');
      expect(value).toEqual('service value');
    });
  });
}
