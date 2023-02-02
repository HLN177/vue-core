import { reactive, readonly } from "./reactive";
import {
  track,
  trigger,
  pauseTracking,
  enableTracking,
  ITERATE_KEY
} from "./effect";
import { TriggerOpTypes } from "./operations";

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

export const arrayInstrumentations = createArrayInstrumentations();

const get = createGetter();
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter();

function createGetter(
  isReadonly: boolean = false,
  isShallow: boolean = false
) {
  return function get(
    target: object,
    key: string | symbol,
    receiver: object
  ) {
    if (key === 'raw') {
      return target;
    }
    // intercept and rewrite some original array methods
    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key);
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
  }
}

function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    newVal: unknown,
    receiver: object
  ) {
    const oldVal = Reflect.get(target, key);

    const type = Array.isArray(target) // If the proxy target is an array, it checks whether the index value set is less than the array length 
      ? Number(key) < target.length ? TriggerOpTypes.SET : TriggerOpTypes.ADD
      : Object.prototype.hasOwnProperty.call(target, key) ? TriggerOpTypes.SET : TriggerOpTypes.ADD;
    
    Reflect.set(target, key, newVal, receiver);
    // @ts-expect-error
    if (target === receiver!.raw) { // avoid triggering effect function by prototype
      if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) { // resolve NaN
        trigger(target, key, type, newVal);
      }
    }
    return true;
  }
}


function has( // handle 'in' operator by ECMA-262 13.10.1 & 13.10.1
  target: object,
  key: string | symbol
) {
  track(target, key);
  return Reflect.has(target, key);
}

function ownKeys(target: object) { // handle 'for...in...'
  // Whether adding new elements to an array or simply changing the length of the array,the length property of the array is being changed essentially.
  track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
  return Reflect.ownKeys(target);
}

function deleteProperty(target: object, key: string | symbol) {
  // if (isReadonly) {
  //   console.warn(`property ${String(key)} is read only`);
  //   return true;
  // }
  const hadKey = Object.prototype.hasOwnProperty.call(target, key);
  const result = Reflect.deleteProperty(target, key);
  if (result && hadKey) {
    trigger(target, key, TriggerOpTypes.DEL);
  }
  return result;
}

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  has,
  ownKeys,
  deleteProperty
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`property ${String(key)} is read only`);
    return true;
  },
  deleteProperty(target, key) {
    console.warn(`property ${String(key)} is read only`);
    return true;
  }
}

export const shallowReactiveHandlers: ProxyHandler<object> = Object.assign(
  {},
  mutableHandlers,
  {
    get: shallowGet
  }
);

export const shallowReadonlyHandlers: ProxyHandler<object> = Object.assign(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
);