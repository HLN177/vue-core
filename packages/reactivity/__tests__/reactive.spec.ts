import { reactive, shallowReactive, effect, ReactiveEffect, computed, watch, readonly, shallowReadonly } from "../reactive";

describe('reactivity/reactive', () => {
  test('Object', () => {
    const original = { foo: 'test1' };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    // get
    expect(observed.foo).toBe('test1');
    // has
    expect('foo' in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(['foo']);
  });

  it('should run the passed function once (wrapped by a effect)', () => {
    const fnSpy = jest.fn(() => { });
    effect(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it('should observe basic properties', () => {
    let dummy
    const counter = reactive({ num: 0 });
    effect(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  })

  test('side effect will executed accurately', () => {
    let dummy1, dummy2;
    const original = {
      name1: 'test1',
      name2: 'test2'
    };
    const observed = reactive(original);
    const fnSpy1 = jest.fn(() => {
      dummy1 = observed.name1;
    });
    const fnSpy2 = jest.fn(() => {
      dummy2 = observed.name2;
    })
    effect(fnSpy1);
    effect(fnSpy2);
    expect(fnSpy1).toHaveBeenCalledTimes(1);
    expect(fnSpy2).toHaveBeenCalledTimes(1);
    observed.name1 = 'test3';
    expect(dummy1).toBe('test3');
    expect(dummy2).toBe('test2');
    expect(fnSpy1).toHaveBeenCalledTimes(2);
    expect(fnSpy2).toHaveBeenCalledTimes(1);
  });

  test('branch switch and clean up', () => {
    let dummy;
    const original = {
      isOk: true,
      text: 'Hello'
    };
    const observed = reactive(original);
    const fnSpy = jest.fn(() => {
      dummy = observed.isOk ? observed.text : 'Hell';
    });
    effect(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
    expect(dummy).toBe('Hello');
    observed.isOk = false;
    expect(fnSpy).toHaveBeenCalledTimes(2);
    expect(dummy).toBe('Hell');
    observed.text = 'Hello World';
    expect(dummy).toBe('Hell');
    expect(fnSpy).toHaveBeenCalledTimes(2);
  });

  test('nested effect and effect stack', () => {
    const nums = reactive({ num1: 0, num2: 1, num3: 2 })
    const dummy: any = {}
    const childSpy = jest.fn(() => {
      dummy.num1 = nums.num1;
    })
    const childEffect = effect(childSpy, {
      lazy: true
    });
    const parentSpy = jest.fn(() => {
      dummy.num2 = nums.num2;
      childEffect();
      dummy.num3 = nums.num3;
    });
    effect(parentSpy);
    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(1);
    nums.num1 = 11;
    expect(dummy).toEqual({ num1: 11, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(2);
    nums.num2 = 22;
    expect(dummy).toEqual({ num1: 11, num2: 22, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(2);
    expect(childSpy).toHaveBeenCalledTimes(3);
    nums.num1 = 111;
    expect(dummy).toEqual({ num1: 111, num2: 22, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(2);
    expect(childSpy).toHaveBeenCalledTimes(4);
  });

  it('should not recursive infinitely', () => {
    const observed = reactive({ value: 1 });
    const spy = jest.fn(() => {
      observed.value++;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.value = 2;
    expect(spy).toHaveBeenCalledTimes(2); // ??????????????????: reactive set function ?????????????????????, ???????????????????????????trigger effect function
  });

  test('scheduler', () => {
    // determine a job queue
    const jobQueue = new Set<ReactiveEffect>();
    // generate a promise for micro task using
    const p = Promise.resolve();
    // a flag stand for the queue is flushing or not
    let isFlushing = false;
    function flushJob() {
      if (isFlushing) {
        return;
      }
      isFlushing = true;
      p.then(() => {
        jobQueue.forEach(fn => fn());
      }).finally(() => {
        isFlushing = false;
      })
    }
    let dummy: number;
    const observed = reactive({value: 0});
    const spyLog = jest.fn(() => {
      dummy = observed.value;
    });
    effect(spyLog, {
      scheduler(fn: ReactiveEffect) {
        jobQueue.add(fn);
        flushJob();
      }
    });
    expect(spyLog).toHaveBeenCalledTimes(1);
    observed.value++;
    observed.value++;
    observed.value++;
    observed.value++;
    p.then(() => {
      expect(dummy).toBe(4);
      expect(spyLog).toHaveBeenCalledTimes(2);
    });
    /**
     * ??????jobQueue???set, ??????jobQueue??????????????????,?????????effect func
     * flushJob???????????????4???,?????????isFlushing, ?????????????????????????????????, flushJob??????????????????
     * ????????????????????????????????????????????????,???????????????????????????
     */
  });

  it('should reactive getter function', () => {
    let result;
    const obj = {
      foo: 1,
      get bar() {
        return this.foo;
      }
    };
    const observed = reactive(obj);
    const spy = jest.fn(() => {
      result = observed.bar;
    });
    effect(spy);
    observed.foo++;
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result).toBe(2);
  });

  it("should reactive 'in' operator", () => { 
    const observed = reactive({
      foo: 1
    });
    const spy = jest.fn(() => { 
      'foo' in observed;
    });
    effect(spy);
    observed.foo++;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("should reactive 'for...in...'", () => {
    const observed = reactive({
      foo: 1
    });
    const spy = jest.fn(() => {
      for (let i in observed) {
        console.log(i);
      }
    });
    effect(spy);
    observed.foo1 = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("should not reactive 'for...in...' while value updating", () => {
    const observed = reactive({
      foo: 1
    });
    const spy = jest.fn(() => {
      for (let i in observed) {
        console.log(i);
      }
    });
    effect(spy);
    observed.foo = 2;
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should reative object delete property', () => {
    const observed = reactive({
      foo: 1,
      foo1: 2
    });
    const spy = jest.fn(() => {
      for (let i in observed) {
        console.log(i);
      }
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    delete observed.foo1;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should not trigger effect function if value unchanged', () => {
    const observed = reactive({
      foo: 1
    });

    const spy = jest.fn(() => {
      console.log(observed.foo);
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.foo = 1;
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not trigger effect function if new value equals to NaN as well as old value', () => {
    const observed = reactive({
      foo: NaN
    });
    const spy = jest.fn(() => {
      console.log(observed.foo);
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.foo = NaN;
    expect(spy).toHaveBeenCalledTimes(1);
    observed.foo = 1;
    expect(spy).toHaveBeenCalledTimes(2);
    observed.foo = NaN;
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should reactive property inherted from parent reactive object', () => {
    const obj = {};
    const proto = {
      bar: 1
    };
    const child = reactive(obj);
    const parent = reactive(proto);
    Object.setPrototypeOf(child, parent);
    const spy = jest.fn(() => {
      console.log(child.bar);
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    child.bar = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should reactive nested obj', () => {
    const observed = reactive({
      nested: {
        foo: 1
      }
    });
    const spy = jest.fn(() => {
      return observed.nested.foo;
    });
    effect(spy);
    observed.nested.foo = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should create shallow reactive obj', () => {
    const observed = shallowReactive({
      nested: {
        foo: 1
      }
    });
    const spy = jest.fn(() => {
      return observed.nested.foo;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    observed.nested = {
      bar: 1
    };
    expect(spy).toHaveBeenCalledTimes(2);
    observed.nested.bar = 2;
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should create read only object', () => {
    const obj = readonly({
      nested: {
        boo: 1
      }
    });
    const spy = jest.fn(() => {
      return obj.nested.boo;
    })
    effect(spy);
    obj.nested.boo = 2;
    obj.nested = {
      foo: 1
    };
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should create shallow read only object', () => {
    const obj = shallowReadonly({
      nested: {
        boo: 1
      }
    });
    const spy = jest.fn(() => {
      return obj.nested.boo;
    })
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    obj.nested = {
      foo: 1
    };
    expect(spy).toHaveBeenCalledTimes(1);
    obj.nested.boo = 2;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(obj.raw).toEqual({
      nested: {
        boo: 2
      }
    })
  });
});

describe('reactivity/comupted', () => {
  it('lazily', () => {
    let dummy;
    const observed = reactive({ value: 1 });
    const spy = jest.fn(() => {
      dummy = observed.value;
    });
    const cValue = effect(
      spy,
      {
        lazy: true
      }
    );
    expect(spy).toHaveBeenCalledTimes(0);
    expect(dummy).toBe(undefined);
    cValue();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
  });

  test('effect function could return result', () => {
    const observed = reactive({
      value1: 1,
      value2: 2
    });
    const spy = jest.fn(() => {
      return observed.value1 + observed.value2
    });
    const cValue = effect(spy, {
      lazy: true
    });
    expect(spy).toHaveBeenCalledTimes(0);
    expect(cValue()).toBe(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('computed could return result lazily', () => {
    const observed = reactive({ value1: 1, value2: 2 });
    const spy = jest.fn(() => {
      return observed.value1 + observed.value2;
    });
    const cValue = computed(spy);
    expect(spy).toHaveBeenCalledTimes(0);
    const res = cValue.value;
    expect(res).toBe(3);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not compute until needed', () => {
    const value = reactive({ foo: 1 });
    const getter = jest.fn(() => value.foo);
    const cValue = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled()

    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed
    value.foo = 2
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  });

  it('should trigger effect', () => {
    const value = reactive({ foo: 1 });
    const cValue = computed(() => value.foo);
    let dummy;
    effect(() => {
      dummy = cValue.value;
    });
    expect(dummy).toBe(1);
    value.foo = 2;
    expect(dummy).toBe(2);
  })
});

describe('reactivity/watch', () => {
  it('can watch reactive object', () => {
    const observed = reactive({
      foo1: 1,
      foo2: []
    });
    const spy = jest.fn(() => { });
    watch(observed, spy); // watch reactive object
    observed.foo1 = 2;
    expect(spy).toHaveBeenCalledTimes(1);
    observed.foo2 = [1];
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should watch nested reactive object', () => {
    const observed = reactive({
      nested: {
        foo: 2
      }
    });
    const callbackSpy = jest.fn(() => { });
    watch(observed, callbackSpy);
    expect(callbackSpy).toHaveBeenCalledTimes(0);
    observed.nested.foo = 1;
    expect(callbackSpy).toHaveBeenCalledTimes(1);
  });

  it('can watch a getter function', () => {
    const observed = reactive({
      foo1: 1
    });
    const callbackSpy = jest.fn(() => { });
    watch(() => observed.foo1, callbackSpy);
    expect(callbackSpy).toHaveBeenCalledTimes(0);
    observed.foo1 = 2;
    expect(callbackSpy).toHaveBeenCalledTimes(1);
    observed.foo2 = 3;
    expect(callbackSpy).toHaveBeenCalledTimes(1);
  });

  it('should able to access new value and old value in watch callback function', () => { 
    const observed = reactive({
      foo: 1
    });
    
    let newValue, oldValue;
    
    watch(
      () => observed.foo,
      (newVal, oldVal) => {
        newValue = newVal;
        oldValue = oldVal;
      }
    );

    observed.foo = 2;
    expect(newValue).toBe(2);
    expect(oldValue).toBe(1);
    observed.foo = 3;
    expect(newValue).toBe(3);
    expect(oldValue).toBe(2);
  });

  it('should able to excute callback function immediately', () => { 
    const observed = reactive({
      foo: 1
    });
    
    let newValue, oldValue;
    
    watch(
      () => observed.foo,
      (newVal, oldVal) => {
        newValue = newVal;
        oldValue = oldVal;
      },
      {
        immediate: true
      }
    );
    expect(newValue).toBe(1);
    expect(oldValue).toBe(undefined);

    observed.foo = 2;
    expect(newValue).toBe(2);
    expect(oldValue).toBe(1);
  });

  it('can control excution timing of scheduler', () => {
    const observed = reactive({ foo: 1 });
    let result: string;
    watch(
      () => observed.foo,
      () => {
        result = 'callback';
      },
      {
        flush: 'post'
      }
    );
    observed.foo = 2;
    result = 'direct';
    Promise.resolve().then(() => { 
      expect(result).toBe('callback');
    });
  });
});