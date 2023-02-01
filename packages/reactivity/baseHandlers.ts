import { pauseTracking, enableTracking } from "./reactive";

const arrayInstrumentations = createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {};

  ['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
    const originalMethod = Array.prototype[method as any];
    instrumentations[method] = function (...args: any[]) {
      // run the method using the original args first (which may be reactive proxy object)
      let result = originalMethod.apply(this, args);
      if (!result || result === -1) {
        // if that didn't work, run it again using raw values.
        result = originalMethod.apply(this.raw, args);
      }
      return result;
    }
  });
  
  // instrument length-altering mutation methods to avoid length being tracked
  ['push', 'splice', 'slice', 'pop', 'shift', 'unshift'].forEach(method => {
    const originalMethod = Array.prototype[method as any];
    instrumentations[method] = function (...args: any[]) {
      pauseTracking();
      let result = originalMethod.apply(this, args);
      enableTracking();
      return result;
    }
  });

  return instrumentations;
}

export {
  arrayInstrumentations
};