import { ITERATE_KEY, track, trigger } from "./effect";
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
      // get original obj
      const target = (this as Target)[ReactiveFlags.RAW];
      // check if key existed
      const hasKey = mutableInstrumentations.has.call(this, key);
      const res = target.add(key);
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
      // set new value
      target.set(key, value);
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
    }
  };

  return [
    mutableInstrumentations
  ];
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
