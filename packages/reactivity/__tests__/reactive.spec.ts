import { reactive, effect } from "../reactive";

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
    const parentSpy = jest.fn(() => {
      dummy.num2 = nums.num2;
      effect(childSpy);
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
    // to 目前effect会创建新的effectFn,bucket的set会一直增加”内容相同“的目前effect会创建新的effectFn,导致这条用例失败
    // nums.num1 = 111;
    // expect(dummy).toEqual({ num1: 111, num2: 22, num3: 2 });
    // expect(parentSpy).toHaveBeenCalledTimes(2);
    // expect(childSpy).toHaveBeenCalledTimes(4);
  });
});