/**
 * structure for saving effect function
 */
const bucket = new Set<any>();

/**
 * variable for saving current effect function
 */
let activeEffect: Function;

/**
 * wrap function to register the effect func
 */
function effect(fn: Function) {
  activeEffect = fn;
  fn();
}

/** 
 * reactive system 
 * 1. leverage getter of Proxy to save the effect function into data structure
 * 2. leverage setter of Proxy to update the effect by iterate the effect functions in the data structure 
 */
function reactive(data: Object): any {
  return new Proxy(data, {
    get: function (target, key) {
      if (activeEffect) {
        bucket.add(activeEffect);
      }
      return Reflect.get(target, key);
    },
    set: function(target, key, newVal) {
      Reflect.set(target, key, newVal);
      bucket.forEach(fn => fn());
      return true;
    }
  });
}

export {
  effect,
  reactive
}