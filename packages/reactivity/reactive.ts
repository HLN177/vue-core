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

/** 
 * reactive system 
 * 1. leverage getter of Proxy to save the effect function into data structure
 * 2. leverage setter of Proxy to update the effect by iterate the effect functions in the data structure 
 */
function reactive(data: Object): any {
  return new Proxy(data, {
    get: function (target, key) {
      track(target, key);
      return Reflect.get(target, key);
    },
    set: function(target, key, newVal) {
      Reflect.set(target, key, newVal);
      trigger(target, key);
      return true;
    }
  });
}

function track(target: Object, key: any) {
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
  // 4. "deps" is a dependence set related to current active effect function
  //    push "deps" into activeEffect.deps as a record
  activeEffect.deps.push(deps as Deps);
}

function trigger(target: Object, key: any) {
  if (bucket.has(target)) {
    // 1. get depsMap from bucket by "target"
    const depMap = bucket.get(target);
    // 2. get effects from depsMap by "key"
    const effects: Set<any> | undefined = depMap!.get(key);
    // 3. prevent forEach from infinite loop 
    const effectsToRun = new Set<ReactiveEffect>();
    // 4. prevent recursive infinitely
    effects && effects.forEach(effectFn => {
      // effect functions would not be excuted if it equals to current active effect func
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn);
      }
    });
    // 5. validation and run the related effect functions
    effectsToRun && effectsToRun.forEach(fn => {
      if (fn.options?.scheduler) {
        fn.options.scheduler(fn);
      } else {
        fn();
      }
    });
  }
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
    // reset diry when the reactive properties inside getter have been changed
    scheduler: () => {
      dirty = true;
      trigger(obj, 'value'); // let computed properties act like the reactive obj and able to trigger outer effect
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

export {
  effect,
  reactive,
  computed
}