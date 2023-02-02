import { reactive } from "../reactive";
import { watch } from "../watch";

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