import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers
} from "./baseHandlers";

/** 
 * exsiting proxy map
*/
const reactiveMap = new WeakMap<any, any>();
const shallowReactiveMap = new WeakMap<any, any>();
const readonlyMap = new WeakMap<any, any>();
const shallowReadonlyMap = new WeakMap<any, any>();

function reactive(obj: Object): any {
  return createReactiveObject(
    obj,
    mutableHandlers,
    reactiveMap
  );
}

function shallowReactive(obj: Object): any {
  return createReactiveObject(
    obj,
    shallowReactiveHandlers,
    shallowReactiveMap
  );
}

function readonly(obj: Object): any {
  return createReactiveObject(
    obj,
    readonlyHandlers,
    readonlyMap
  );
}

function shallowReadonly(obj: Object): any {
  return createReactiveObject(
    obj,
    shallowReadonlyHandlers,
    shallowReadonlyMap
  );
}

/** 
 * reactive system 
 * 1. leverage getter of Proxy to save the effect function into data structure
 * 2. leverage setter of Proxy to update the effect by iterate the effect functions in the data structure 
 */
function createReactiveObject(
  data: Object,
  baseHandlers: ProxyHandler<object>,
  proxyMap: WeakMap<Object, any>
) {
  // avoid multiple proxy creation of same object
  const existionProxy = proxyMap.get(data);
  if (existionProxy) {
    return existionProxy;
  }

  const proxy = new Proxy(data, baseHandlers);

  proxyMap.set(data, proxy);

  return proxy;
}

export {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly
}