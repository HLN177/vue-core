import { toRawType } from "../tools";
import { TriggerOpTypes } from "./operations";
/**
 * structure for saving effect function
 * target -> key -> effect function
 * WeakMap -> Map -> Set
 */
type KeyToDepMap = Map<any, Deps>;
const bucket = new WeakMap<any, KeyToDepMap>();

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

export const ITERATE_KEY = Symbol('iterate');

let shouldTrack = true;

export function pauseTracking() {
  shouldTrack = false
}

export function enableTracking() {
  shouldTrack = true
}

/**
 * wrap function to register the effect func
 */
export function effect(
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

export function track(target: Object, key: any) {
  // return directly if activeEffect no existed
  if (!shouldTrack || !activeEffect) {
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

export function trigger(
  target: Object,
  key: any,
  type: TriggerOpTypes,
  newVal?: any
) {
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
  if (
    TriggerOpTypes.ADD === type ||
    TriggerOpTypes.DEL === type ||
    TriggerOpTypes.SET === type && toRawType(target) === 'Map' // Value in Map forEach interation is considered
  ) {
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