import { reactive, shallowReactive, readonly, shallowReadonly } from "../reactive";
import { effect, ReactiveEffect } from "../effect";

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
    expect(spy).toHaveBeenCalledTimes(2); // 用例失败因为: reactive set function 增加新旧值判断, 如果新旧值相等则不trigger effect function
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
     * 由于jobQueue是set, 所以jobQueue中只会有一项,当前的effect func
     * flushJob会连续执行4次,都由于isFlushing, 实际上在一个事件循环内, flushJob只会执行一次
     * 该功能有点类似多次修改响应式数据,但只会触发一次更新
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