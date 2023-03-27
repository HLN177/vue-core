import { reactive } from "./reactive";

export function ref(value: unknown) {
  // wrap value into an object
  const wrapper = {
    value
  };

  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  });

  // let the wrapped value be reactive  
  return reactive(wrapper);
}

export function toRef(obj: any, key: any) {
  const wrapper = {
    get value() {
      return obj[key];
    },
    set value(val) {
      obj[key] = val;
    }
  };

  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  });

  return wrapper;
}

export function toRefs(obj: any) {
  const ret: any = {};
  for (const key in obj) {
    ret[key] = toRef(obj, key);
  }
  return ret;
}

// ref.value => value
// actually proxyRefs will handle unref data returned from setup() 
export function proxyRefs(target: any) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return value.__v_isRef ? value.value : value;
    },
    set(target, key, newValue, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (value.__v_isRef) {
        value.value = newValue;
        return true;
      }
      return Reflect.set(target, key, newValue, receiver);
    }
  });
}