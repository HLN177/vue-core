import { toRawType } from "../tools";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReactiveHandlers,
  shallowReadonlyHandlers
} from "./baseHandlers";

import { mutableCollectionHandlers } from "./collectionHandlers";

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

function getTargetType(value: unknown): TargetType {
  return targetTypeMap(toRawType(value));
}

export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw'
}
export interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}

/** 
 * exsiting proxy map
*/
const reactiveMap = new WeakMap<Target, any>();
const shallowReactiveMap = new WeakMap<Target, any>();
const readonlyMap = new WeakMap<Target, any>();
const shallowReadonlyMap = new WeakMap<Target, any>();

function reactive(obj: Object): any {
  return createReactiveObject(
    obj,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}

function shallowReactive(obj: Object): any {
  return createReactiveObject(
    obj,
    shallowReactiveHandlers,
    {},
    shallowReactiveMap
  );
}

function readonly(obj: Object): any {
  return createReactiveObject(
    obj,
    readonlyHandlers,
    {},
    readonlyMap
  );
}

function shallowReadonly(obj: Object): any {
  return createReactiveObject(
    obj,
    shallowReadonlyHandlers,
    {},
    shallowReadonlyMap
  );
}

/** 
 * reactive system 
 * 1. leverage getter of Proxy to save the effect function into data structure
 * 2. leverage setter of Proxy to update the effect by iterate the effect functions in the data structure 
 */
function createReactiveObject(
  target: Target,
  baseHandlers: ProxyHandler<object>,
  collectionHandlers: ProxyHandler<object> = {},
  proxyMap: WeakMap<Target, any>
) {
  // avoid multiple proxy creation of same object
  const existionProxy = proxyMap.get(target);
  if (existionProxy) {
    return existionProxy;
  }

  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) {
    return target;
  }
  const proxy = new Proxy(
    target,
    targetType === TargetType.COMMON ? baseHandlers : collectionHandlers
  );

  proxyMap.set(target, proxy);

  return proxy;
}

export {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly
}