import { TriggerOpTypes } from "./operations";
/**
 * structure for saving effect function
 * target -> key -> effect function
 * WeakMap -> Map -> Set
 */
const bucket = new WeakMap<any, KeyToDepMap>();
type KeyToDepMap = Map<any, Deps>

/**
 * variable for saving current effect function
 */
let activeEffect: ReactiveEffect | undefined;

/**
 * effect function stack
 * handle nested effect
 */
const effectStack: ReactiveEffect[] = [];

type Deps = Set<ReactiveEffect>;

interface ReactiveEffectOptions {
  scheduler?: EffectScheduler, // give user a opportunity to desicde when and how to invoke effect function
  lazy?: Boolean // lazy excute ability
}

type EffectScheduler = (...args: any[]) => any

export interface ReactiveEffect {
  (): any,
  deps: Deps[],
  options: ReactiveEffectOptions | undefined
}

const ITERATE_KEY = Symbol('iterate');

/**
 * wrap function to register the effect func
 */
function effect(
  fn: Function,
  options?: ReactiveEffectOptions
): ReactiveEffect {
  const effectFn: ReactiveEffect = () => {
    cleanupEffect(effectFn);
    activeEffect = effectFn;
    // before invoke effect func, push current effect function into stack
    effectStack.push(effectFn);
    // allow effect fn to return a result 
    const res = fn();
    // after effect func completing, pop and switch to the previous effect func
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.deps = [];
  effectFn.options = options;
  // only excute effect fn when lazy is not true
  if (!options?.lazy) {
    effectFn();
  }

  // expose effect fn for lazy excution
  return effectFn;
}

function cleanupEffect(effectFn: ReactiveEffect) {
  const { deps } = effectFn;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effectFn);
    }
    deps.length = 0;
  }
}

function reactive(data: Object): any {
  return createReactive(data);
}

function shallowReactive(data: Object): any {
  return createReactive(data, true);
}

function readonly(data: Object): any {
  return createReactive(data, false, true);
}

function shallowReadonly(data: Object): any {
  return createReactive(data, true, true);
}

/** 
 * reactive system 
 * 1. leverage getter of Proxy to save the effect function into data structure
 * 2. leverage setter of Proxy to update the effect by iterate the effect functions in the data structure 
 */
function createReactive(
  data: Object,
  isShallow: Boolean = false,
  isReadonly: Boolean = false
): any {
  return new Proxy(data, {
    get: function (target, key, receiver) {
      if (key === 'raw') {
        return target;
      }
      // read only obj and 'symbol' key type do not need to trigger effect function 
      if (!isReadonly && typeof key !== 'symbol') {
        track(target, key);
      }
      const res = Reflect.get(target, key, receiver); // solve getter function by receiver 
      if (isShallow) {
        return res;
      }
      if (typeof res === 'object' && res !== null) {
        return isReadonly ? readonly(res) : reactive(res);
      }
      return res;
    },
    set: function (target, key, newVal, receiver) {
      if (isReadonly) {
        console.warn(`property ${String(key)} is read only`);
        return true;
      }
      const oldVal = Reflect.get(target, key);

      const type = Array.isArray(target) // If the proxy target is an array, it checks whether the index value set is less than the array length 
        ? Number(key) < target.length ? TriggerOpTypes.SET : TriggerOpTypes.ADD
        : Object.prototype.hasOwnProperty.call(target, key) ? TriggerOpTypes.SET : TriggerOpTypes.ADD;
      
      Reflect.set(target, key, newVal, receiver);
      if (target === receiver.raw) { // avoid triggering effect function by prototype
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) { // resolve NaN
          trigger(target, key, type, newVal);
        }
      }
      return true;
    },
    has: function (target, key) { // handle 'in' operator by ECMA-262 13.10.1 & 13.10.1
      track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys: function (target) { // handle 'for...in...'
      // Whether adding new elements to an array or simply changing the length of the array,the length property of the array is being changed essentially.
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
    deleteProperty: function (target, key) {
      if (isReadonly) {
        console.warn(`property ${String(key)} is read only`);
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
        trigger(target, key, TriggerOpTypes.DEL);
      }
      return result;
    }
  });
}

function track(target: Object, key: any) {
  // return directly if activeEffect no existed
  if (!activeEffect) {
    return;
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
  // 4. "deps" is a dependence set related to current active effect function
  //    push "deps" into activeEffect.deps as a record
  activeEffect.deps.push(deps as Deps);
}

function trigger(target: Object, key: any, type: TriggerOpTypes, newVal?: any) {
  // get depsMap from bucket by "target"
  const depMap = bucket.get(target);
  if (!depMap) return;
  // get effects from depsMap by "key"
  const effects: Set<any> | undefined = depMap!.get(key);
  // prevent forEach from infinite loop 
  const effectsToRun = new Set<ReactiveEffect>();
  // prevent recursive infinitely by add effects to the new set
  effects && effects.forEach(effectFn => {
    // effect functions would not be excuted if it equals to current active effect func
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn);
    }
  });

  // when trigger type equals to 'add' and 'del', effects related to 'ITERATE_KEY' should be triggered
  if (TriggerOpTypes.ADD === type || TriggerOpTypes.DEL === type) {
    const iterateEffects: Set<any> | undefined = depMap.get(ITERATE_KEY);
    // prevent recursive infinitely by add iterate effects to the new set
    iterateEffects && iterateEffects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    });
  }

  // When trigger type is 'add' and target type is Array, trigger length dependancies
  if (Array.isArray(target) && TriggerOpTypes.ADD === type) {
    const lengthEffects: Set<any> | undefined = depMap.get('length');
    // prevent recursive infinitely by add iterate effects to the new set
    lengthEffects && lengthEffects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    });
  }

  // when type of target is array and length changed
  if (Array.isArray(target) && key === 'length') {
    depMap && depMap.forEach((effectSet, key) => { // traverse all the index of array
      if (Number(key) >= newVal) { // key >= val should trigger effect dependencies
        effectSet && effectSet.forEach(effectFn => {
          effectFn !== activeEffect && (effectsToRun.add(effectFn));
        });
      }
    });
  }

  // validation and run the related effect functions
  effectsToRun && effectsToRun.forEach(fn => {
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  });
}

function computed(getter: Function) {
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

type WatchCallback = (
  value: any,
  oldVal: any
) => any;

interface WatchOptionsBase {
  /**
   * determine excution timing of opions.scheduler
   * 'pre': todo
   * 'post': excution after DOM update
   * 'sync: : todo
   */
  flush?: 'pre' | 'post' | 'sync'
}

interface WatchOptions extends WatchOptionsBase{
  immediate?: Boolean, // excute callback immediately when watch is set
};

/**
 * watch: watch a reative obj and execute the corresponding callback
 * @param source 
 * @param cb 
 */
function watch(
  source: any,
  cb: WatchCallback,
  option?: WatchOptions
) {
  let getter: Function;
  if (typeof source === 'function') {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let newVal, oldVal: any;

  const job = () => {
    // 1. get new val
    newVal = effectFn();
    // 2. excute callback function
    cb(newVal, oldVal);
    // 3. update old val for next excution
    oldVal = newVal;
  };

  // Internally, the completion of Watch leverages effect and option.scheduler
  const effectFn = effect(
    () => getter(), // register track function by effect
    {
      lazy: true,
      scheduler: () => { // Actually, scheduler is the callback of 'watch'
        if (option?.flush === 'post') {
          const p = Promise.resolve();
          p.then(job);
        } else {
          job();
        }
      }
    }
  );

  if (option?.immediate) {
    job();
  } else {
    oldVal = effectFn(); // manually set old value firstly
  }
}

/**
 * Recrusively traverse a object to register effect function into reative system
 */
function traverse(value: any, seen = new Set()) {
  if (
    typeof value !== 'object' ||
    value === null ||
    value === undefined ||
    seen.has(value)
  ) {
    return;
  }

  seen.add(value);
  for (let key in value) {
    traverse(value[key], seen);
  }

  return value;
}

export {
  effect,
  reactive,
  shallowReactive,
  computed,
  watch,
  readonly,
  shallowReadonly
}