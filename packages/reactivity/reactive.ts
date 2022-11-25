/**
 * structure for saving effect function
 * target -> key -> effect function
 * WeakMap -> Map -> Set
 */
const bucket = new WeakMap<any, KeyToDepMap>();
type Dep = Set<any>;
type KeyToDepMap = Map<any, Dep>

/**
 * variable for saving current effect function
 */
let activeEffect: Function | null;

/**
 * wrap function to register the effect func
 */
function effect(fn: Function) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

/** 
 * reactive system 
 * 1. leverage getter of Proxy to save the effect function into data structure
 * 2. leverage setter of Proxy to update the effect by iterate the effect functions in the data structure 
 */
function reactive(data: Object): any {
  return new Proxy(data, {
    get: function (target, key) {
      // return directly if activeEffect no existed
      if (!activeEffect) {
        return Reflect.get(target, key);
      }
      // 1. get depsMap from bucket by "target", depsMap is a "Map"
      if (!bucket.has(target)) {
        bucket.set(target, new Map());
      }
      const depMap = bucket.get(target);
      // 2. get deps from depsMap by "key", deps is a "Set"
      // deps saves all the side effect function which related to the "key"
      if (!depMap!.has(key)) {
        depMap!.set(key, new Set());
      }
      const deps = depMap!.get(key);
      // 3. save the current active effect function into bucket
      deps!.add(activeEffect);

      return Reflect.get(target, key);
    },
    set: function(target, key, newVal) {
      Reflect.set(target, key, newVal);
      if (bucket.has(target)) {
        // 1. get depsMap from bucket by "target"
        const depMap = bucket.get(target);
        // 2. get effects from depsMap by "key"
        const effects: Set<any> | undefined = depMap!.get(key);
        // 3. validation and run the related effect functions
        effects && effects.forEach(fn => fn && fn());
      }
      return true;
    }
  });
}

export {
  effect,
  reactive
}