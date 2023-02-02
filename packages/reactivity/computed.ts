import { TriggerOpTypes } from "./operations";
import { effect, trigger, track } from "./effect";

export function computed(getter: Function) {
  // to save the previous value
  let value: any;

  /**
   * a flag stand for this computed property should de computed again or not
   * if dirty is false, obj.value will return value from memory directly
  */ 
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    // reset dirty when the reactive properties inside getter have been changed
    scheduler: () => {
      dirty = true;
      trigger(obj, 'value', TriggerOpTypes.SET); // let computed properties act like the reactive obj and able to trigger outer effect
    }
  });

  const obj = {
    get value() {
      if (dirty) { // compute value agian if needed
        value = effectFn();
        dirty = false;
      }
      track(obj, 'value'); // let computed properties act like the reactive obj and able to trigger outer effect
      return value;
    }
  };
  
  return obj;
}