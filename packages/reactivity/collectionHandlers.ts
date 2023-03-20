import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from "./effect";
import { TriggerOpTypes } from "./operations";
import { reactive, ReactiveFlags, Target } from "./reactive";

function createInstrumentations() {
  const mutableInstrumentations: Record<string, Function> = {
    get size() {
      // get original obj
      const target = (this as Target)[ReactiveFlags.RAW];
      track(target, ITERATE_KEY);
      return Reflect.get(target, 'size', target);
    },
    get: function (key: unknown) {
      // get original obj
      const target = (this as Target)[ReactiveFlags.RAW];
      // check if key existed
      const hasKey = mutableInstrumentations.has.call(this, key);
      track(target, key);
      const res = target.get(key);
      if (hasKey) {
        return typeof res === 'object' ? reactive(res) : res;
      }
      return res;
    },
    add: function (key: unknown) {
      const rawVal = (key as Target)[ReactiveFlags.RAW] || key;
      // get original obj
      const target = (this as Target)[ReactiveFlags.RAW];
      // check if key existed
      const hasKey = mutableInstrumentations.has.call(this, rawVal);
      const res = target.add(rawVal);
      if (!hasKey) {
        trigger(target, ITERATE_KEY, TriggerOpTypes.ADD);
      }
      return res;
    },
    set: function (key: unknown, value: unknown) {
      const target = (this as Target)[ReactiveFlags.RAW];
      const hasKey = mutableInstrumentations.has.call(this, key);
      // get old value
      const oldVal = target.get(key);
      // if value is a reactive object, should not be added to the raw collection.
      // Prevent trigger effect from munipulating on original obj 
      const rawVal = (value as Target)[ReactiveFlags.RAW] || value;
      // set new value
      target.set(key, rawVal);
      // if key did not existed, it is an add operation
      if (!hasKey) {
        trigger(target, key, TriggerOpTypes.ADD);
      } else if (oldVal !== value && (oldVal === oldVal || value === value)) {
        trigger(target, key, TriggerOpTypes.SET);
      }
    },
    delete: function (key: unknown) {
      const target = (this as Target)[ReactiveFlags.RAW];
      const hasKey = mutableInstrumentations.has.call(this, key);
      const res = target.delete(key);
      if (hasKey) {
        trigger(target, ITERATE_KEY, TriggerOpTypes.DEL);
      }
      return res;
    },
    has: function (key: unknown) {
      const target = (this as Target)[ReactiveFlags.RAW];
      const res = target.has(key);
      return res;
    },
    forEach: function (callback: Function, thisArg: any) {
      // wrap function transfer data to reactive data
      const wrap = (val: any) => typeof val === 'object' ? reactive(val) : val;
      const target = (this as Target)[ReactiveFlags.RAW];
      track(target, ITERATE_KEY);
      // invoke callback manually and implement deep reactive by wrap function
      target.forEach((val: unknown, key: unknown) => {
        callback.call(thisArg, wrap(val), wrap(key), this);
      });
    },
    [Symbol.iterator]: iterationMethod,
    entries: iterationMethod,
    values: valuesIterationMethod,
    keys: keysIterationMethod
  };

  return [
    mutableInstrumentations
  ];
}

function iterationMethod() {
  // @ts-expect-error
  const target = (this as any)[ReactiveFlags.RAW];
  const itr = target[Symbol.iterator]();
  const wrap = (val: any) => typeof val === 'object' && val !== null ? reactive(val) : val;
  track(target, ITERATE_KEY);
  // return customized iterator
  return {
    // 迭代器协议
    next() {
      const { value, done } = itr.next();
      return {
        value: value ? [wrap(value[0]), wrap(value[1])] : value,
        done
      };
    },
    // 实现可迭代协议
    [Symbol.iterator]() {
      return this;
    }
  }
}

function valuesIterationMethod() {
  // @ts-expect-error
  const target = (this as any)[ReactiveFlags.RAW];
  const itr = target.values();
  const wrap = (val: any) => typeof val === 'object' && val !== null ? reactive(val) : val;
  track(target, ITERATE_KEY);
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: wrap(value),
        done
      };
    },
    [Symbol.iterator]() {
      return this;
    }
  }
}

function keysIterationMethod() {
  // @ts-expect-error
  const target = (this as any)[ReactiveFlags.RAW];
  const itr = target.keys();
  const wrap = (val: any) => typeof val === 'object' && val !== null ? reactive(val) : val;
  track(target, MAP_KEY_ITERATE_KEY); // value change will not trigger effect about keys()
  return {
    next() {
      const { value, done } = itr.next();
      return {
        value: wrap(value),
        done
      };
    },
    [Symbol.iterator]() {
      return this;
    }
  }
}

const [
  mutableInstrumentations
] = createInstrumentations();

function createInstrumentationGetter(
  isReadonly: boolean = false,
  shallow: boolean = false
) {
  const instrumentations = mutableInstrumentations;
  return function get(
    target: object,
    key: string | symbol,
    receiver: object
  ) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.RAW) {
      return target;
    }

    return Reflect.get(
      instrumentations.hasOwnProperty(key) && key in target ? instrumentations : target,
      key,
      receiver
    );
  }
}

export const mutableCollectionHandlers: ProxyHandler<object> = {
  get: createInstrumentationGetter(false, false)
}
