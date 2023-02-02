import { effect } from "./effect";

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
export function watch(
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
function traverse(
  value: any,
  seen = new Set()
) {
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