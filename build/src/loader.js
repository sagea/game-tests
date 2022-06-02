var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn2, res) => function __init() {
  return fn2 && (res = (0, fn2[__getOwnPropNames(fn2)[0]])(fn2 = 0)), res;
};
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};

// node_modules/.pnpm/comlink@4.3.1/node_modules/comlink/dist/esm/comlink.mjs
function expose(obj, ep = self) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }
    const { id: id2, type, path } = Object.assign({ path: [] }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj2, prop) => obj2[prop], obj);
      const rawValue = path.reduce((obj2, prop) => obj2[prop], obj);
      switch (type) {
        case "GET":
          {
            returnValue = rawValue;
          }
          break;
        case "SET":
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;
        case "APPLY":
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;
        case "CONSTRUCT":
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;
        case "ENDPOINT":
          {
            const { port1, port2 } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;
        case "RELEASE":
          {
            returnValue = void 0;
          }
          break;
        default:
          return;
      }
    } catch (value) {
      returnValue = { value, [throwMarker]: 0 };
    }
    Promise.resolve(returnValue).catch((value) => {
      return { value, [throwMarker]: 0 };
    }).then((returnValue2) => {
      const [wireValue, transferables] = toWireValue(returnValue2);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id: id2 }), transferables);
      if (type === "RELEASE") {
        ep.removeEventListener("message", callback);
        closeEndPoint(ep);
      }
    });
  });
  if (ep.start) {
    ep.start();
  }
}
function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint))
    endpoint.close();
}
function wrap(ep, target) {
  return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}
function createProxy(ep, path = [], target = function() {
}) {
  let isProxyReleased = false;
  const proxy2 = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);
      if (prop === releaseProxy) {
        return () => {
          return requestResponseMessage(ep, {
            type: "RELEASE",
            path: path.map((p2) => p2.toString())
          }).then(() => {
            closeEndPoint(ep);
            isProxyReleased = true;
          });
        };
      }
      if (prop === "then") {
        if (path.length === 0) {
          return { then: () => proxy2 };
        }
        const r2 = requestResponseMessage(ep, {
          type: "GET",
          path: path.map((p2) => p2.toString())
        }).then(fromWireValue);
        return r2.then.bind(r2);
      }
      return createProxy(ep, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, {
        type: "SET",
        path: [...path, prop].map((p2) => p2.toString()),
        value
      }, transferables).then(fromWireValue);
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last2 = path[path.length - 1];
      if (last2 === createEndpoint) {
        return requestResponseMessage(ep, {
          type: "ENDPOINT"
        }).then(fromWireValue);
      }
      if (last2 === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: "APPLY",
        path: path.map((p2) => p2.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: "CONSTRUCT",
        path: path.map((p2) => p2.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }
  });
  return proxy2;
}
function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map((v3) => v3[0]), myFlat(processed.map((v3) => v3[1]))];
}
function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}
function proxy(obj) {
  return Object.assign(obj, { [proxyMarker]: true });
}
function toWireValue(value) {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [
        {
          type: "HANDLER",
          name,
          value: serializedValue
        },
        transferables
      ];
    }
  }
  return [
    {
      type: "RAW",
      value
    },
    transferCache.get(value) || []
  ];
}
function fromWireValue(value) {
  switch (value.type) {
    case "HANDLER":
      return transferHandlers.get(value.name).deserialize(value.value);
    case "RAW":
      return value.value;
  }
}
function requestResponseMessage(ep, msg, transfers) {
  return new Promise((resolve) => {
    const id2 = generateUUID();
    ep.addEventListener("message", function l2(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id2) {
        return;
      }
      ep.removeEventListener("message", l2);
      resolve(ev.data);
    });
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id: id2 }, msg), transfers);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
var proxyMarker, createEndpoint, releaseProxy, throwMarker, isObject, proxyTransferHandler, throwTransferHandler, transferHandlers, transferCache;
var init_comlink = __esm({
  "node_modules/.pnpm/comlink@4.3.1/node_modules/comlink/dist/esm/comlink.mjs"() {
    proxyMarker = Symbol("Comlink.proxy");
    createEndpoint = Symbol("Comlink.endpoint");
    releaseProxy = Symbol("Comlink.releaseProxy");
    throwMarker = Symbol("Comlink.thrown");
    isObject = (val) => typeof val === "object" && val !== null || typeof val === "function";
    proxyTransferHandler = {
      canHandle: (val) => isObject(val) && val[proxyMarker],
      serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port1);
        return [port2, [port2]];
      },
      deserialize(port) {
        port.start();
        return wrap(port);
      }
    };
    throwTransferHandler = {
      canHandle: (value) => isObject(value) && throwMarker in value,
      serialize({ value }) {
        let serialized;
        if (value instanceof Error) {
          serialized = {
            isError: true,
            value: {
              message: value.message,
              name: value.name,
              stack: value.stack
            }
          };
        } else {
          serialized = { isError: false, value };
        }
        return [serialized, []];
      },
      deserialize(serialized) {
        if (serialized.isError) {
          throw Object.assign(new Error(serialized.value.message), serialized.value);
        }
        throw serialized.value;
      }
    };
    transferHandlers = /* @__PURE__ */ new Map([
      ["proxy", proxyTransferHandler],
      ["throw", throwTransferHandler]
    ]);
    transferCache = /* @__PURE__ */ new WeakMap();
  }
});

// src/CBTracker.ts
var CBTracker;
var init_CBTracker = __esm({
  "src/CBTracker.ts"() {
    CBTracker = (labelName) => {
      const events = /* @__PURE__ */ new Set();
      const once2 = (...callbacks) => {
        callbacks.forEach((callback) => events.add(["once", callback]));
      };
      const add2 = (...callbacks) => {
        callbacks.forEach((callback) => events.add(["always", callback]));
      };
      return {
        once: once2,
        add: add2,
        *[Symbol.iterator]() {
          for (const ev of events) {
            const [type, callback] = ev;
            if (type === "once") {
              events.delete(ev);
            }
            yield callback;
          }
        }
      };
    };
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/F.js
var init_F = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/F.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/T.js
var init_T = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/T.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/__.js
var init__ = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/__.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isPlaceholder.js
function _isPlaceholder(a2) {
  return a2 != null && typeof a2 === "object" && a2["@@functional/placeholder"] === true;
}
var init_isPlaceholder = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isPlaceholder.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry1.js
function _curry1(fn2) {
  return function f1(a2) {
    if (arguments.length === 0 || _isPlaceholder(a2)) {
      return f1;
    } else {
      return fn2.apply(this, arguments);
    }
  };
}
var init_curry1 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry1.js"() {
    init_isPlaceholder();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry2.js
function _curry2(fn2) {
  return function f2(a2, b2) {
    switch (arguments.length) {
      case 0:
        return f2;
      case 1:
        return _isPlaceholder(a2) ? f2 : _curry1(function(_b) {
          return fn2(a2, _b);
        });
      default:
        return _isPlaceholder(a2) && _isPlaceholder(b2) ? f2 : _isPlaceholder(a2) ? _curry1(function(_a) {
          return fn2(_a, b2);
        }) : _isPlaceholder(b2) ? _curry1(function(_b) {
          return fn2(a2, _b);
        }) : fn2(a2, b2);
    }
  };
}
var init_curry2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry2.js"() {
    init_curry1();
    init_isPlaceholder();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/add.js
var init_add = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/add.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_concat.js
function _concat(set1, set2) {
  set1 = set1 || [];
  set2 = set2 || [];
  var idx;
  var len1 = set1.length;
  var len2 = set2.length;
  var result = [];
  idx = 0;
  while (idx < len1) {
    result[result.length] = set1[idx];
    idx += 1;
  }
  idx = 0;
  while (idx < len2) {
    result[result.length] = set2[idx];
    idx += 1;
  }
  return result;
}
var init_concat = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_concat.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_arity.js
function _arity(n2, fn2) {
  switch (n2) {
    case 0:
      return function() {
        return fn2.apply(this, arguments);
      };
    case 1:
      return function(a0) {
        return fn2.apply(this, arguments);
      };
    case 2:
      return function(a0, a1) {
        return fn2.apply(this, arguments);
      };
    case 3:
      return function(a0, a1, a2) {
        return fn2.apply(this, arguments);
      };
    case 4:
      return function(a0, a1, a2, a3) {
        return fn2.apply(this, arguments);
      };
    case 5:
      return function(a0, a1, a2, a3, a4) {
        return fn2.apply(this, arguments);
      };
    case 6:
      return function(a0, a1, a2, a3, a4, a5) {
        return fn2.apply(this, arguments);
      };
    case 7:
      return function(a0, a1, a2, a3, a4, a5, a6) {
        return fn2.apply(this, arguments);
      };
    case 8:
      return function(a0, a1, a2, a3, a4, a5, a6, a7) {
        return fn2.apply(this, arguments);
      };
    case 9:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
        return fn2.apply(this, arguments);
      };
    case 10:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
        return fn2.apply(this, arguments);
      };
    default:
      throw new Error("First argument to _arity must be a non-negative integer no greater than ten");
  }
}
var init_arity = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_arity.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curryN.js
function _curryN(length, received, fn2) {
  return function() {
    var combined = [];
    var argsIdx = 0;
    var left2 = length;
    var combinedIdx = 0;
    while (combinedIdx < received.length || argsIdx < arguments.length) {
      var result;
      if (combinedIdx < received.length && (!_isPlaceholder(received[combinedIdx]) || argsIdx >= arguments.length)) {
        result = received[combinedIdx];
      } else {
        result = arguments[argsIdx];
        argsIdx += 1;
      }
      combined[combinedIdx] = result;
      if (!_isPlaceholder(result)) {
        left2 -= 1;
      }
      combinedIdx += 1;
    }
    return left2 <= 0 ? fn2.apply(this, combined) : _arity(left2, _curryN(length, combined, fn2));
  };
}
var init_curryN = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curryN.js"() {
    init_arity();
    init_isPlaceholder();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/curryN.js
var curryN, curryN_default;
var init_curryN2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/curryN.js"() {
    init_arity();
    init_curry1();
    init_curry2();
    init_curryN();
    curryN = /* @__PURE__ */ _curry2(function curryN2(length, fn2) {
      if (length === 1) {
        return _curry1(fn2);
      }
      return _arity(length, _curryN(length, [], fn2));
    });
    curryN_default = curryN;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/addIndex.js
var init_addIndex = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/addIndex.js"() {
    init_concat();
    init_curry1();
    init_curryN2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry3.js
var init_curry3 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry3.js"() {
    init_curry1();
    init_curry2();
    init_isPlaceholder();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/adjust.js
var init_adjust = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/adjust.js"() {
    init_concat();
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArray.js
var isArray_default;
var init_isArray = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArray.js"() {
    isArray_default = Array.isArray || function _isArray(val) {
      return val != null && val.length >= 0 && Object.prototype.toString.call(val) === "[object Array]";
    };
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isTransformer.js
function _isTransformer(obj) {
  return obj != null && typeof obj["@@transducer/step"] === "function";
}
var init_isTransformer = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isTransformer.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dispatchable.js
function _dispatchable(methodNames, transducerCreator, fn2) {
  return function() {
    if (arguments.length === 0) {
      return fn2();
    }
    var obj = arguments[arguments.length - 1];
    if (!isArray_default(obj)) {
      var idx = 0;
      while (idx < methodNames.length) {
        if (typeof obj[methodNames[idx]] === "function") {
          return obj[methodNames[idx]].apply(obj, Array.prototype.slice.call(arguments, 0, -1));
        }
        idx += 1;
      }
      if (_isTransformer(obj)) {
        var transducer = transducerCreator.apply(null, Array.prototype.slice.call(arguments, 0, -1));
        return transducer(obj);
      }
    }
    return fn2.apply(this, arguments);
  };
}
var init_dispatchable = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dispatchable.js"() {
    init_isArray();
    init_isTransformer();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_reduced.js
var init_reduced = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_reduced.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfBase.js
var xfBase_default;
var init_xfBase = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfBase.js"() {
    xfBase_default = {
      init: function() {
        return this.xf["@@transducer/init"]();
      },
      result: function(result) {
        return this.xf["@@transducer/result"](result);
      }
    };
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xall.js
var init_xall = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xall.js"() {
    init_curry2();
    init_reduced();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/all.js
var init_all = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/all.js"() {
    init_curry2();
    init_dispatchable();
    init_xall();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/max.js
var init_max = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/max.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_map.js
function _map(fn2, functor) {
  var idx = 0;
  var len = functor.length;
  var result = Array(len);
  while (idx < len) {
    result[idx] = fn2(functor[idx]);
    idx += 1;
  }
  return result;
}
var init_map = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_map.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isString.js
function _isString(x2) {
  return Object.prototype.toString.call(x2) === "[object String]";
}
var init_isString = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isString.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArrayLike.js
var _isArrayLike, isArrayLike_default;
var init_isArrayLike = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArrayLike.js"() {
    init_curry1();
    init_isArray();
    init_isString();
    _isArrayLike = /* @__PURE__ */ _curry1(function isArrayLike(x2) {
      if (isArray_default(x2)) {
        return true;
      }
      if (!x2) {
        return false;
      }
      if (typeof x2 !== "object") {
        return false;
      }
      if (_isString(x2)) {
        return false;
      }
      if (x2.length === 0) {
        return true;
      }
      if (x2.length > 0) {
        return x2.hasOwnProperty(0) && x2.hasOwnProperty(x2.length - 1);
      }
      return false;
    });
    isArrayLike_default = _isArrayLike;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xwrap.js
function _xwrap(fn2) {
  return new XWrap(fn2);
}
var XWrap;
var init_xwrap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xwrap.js"() {
    XWrap = /* @__PURE__ */ function() {
      function XWrap2(fn2) {
        this.f = fn2;
      }
      XWrap2.prototype["@@transducer/init"] = function() {
        throw new Error("init not implemented on XWrap");
      };
      XWrap2.prototype["@@transducer/result"] = function(acc) {
        return acc;
      };
      XWrap2.prototype["@@transducer/step"] = function(acc, x2) {
        return this.f(acc, x2);
      };
      return XWrap2;
    }();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/bind.js
var bind, bind_default;
var init_bind = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/bind.js"() {
    init_arity();
    init_curry2();
    bind = /* @__PURE__ */ _curry2(function bind2(fn2, thisObj) {
      return _arity(fn2.length, function() {
        return fn2.apply(thisObj, arguments);
      });
    });
    bind_default = bind;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_reduce.js
function _arrayReduce(xf, acc, list) {
  var idx = 0;
  var len = list.length;
  while (idx < len) {
    acc = xf["@@transducer/step"](acc, list[idx]);
    if (acc && acc["@@transducer/reduced"]) {
      acc = acc["@@transducer/value"];
      break;
    }
    idx += 1;
  }
  return xf["@@transducer/result"](acc);
}
function _iterableReduce(xf, acc, iter) {
  var step = iter.next();
  while (!step.done) {
    acc = xf["@@transducer/step"](acc, step.value);
    if (acc && acc["@@transducer/reduced"]) {
      acc = acc["@@transducer/value"];
      break;
    }
    step = iter.next();
  }
  return xf["@@transducer/result"](acc);
}
function _methodReduce(xf, acc, obj, methodName) {
  return xf["@@transducer/result"](obj[methodName](bind_default(xf["@@transducer/step"], xf), acc));
}
function _reduce(fn2, acc, list) {
  if (typeof fn2 === "function") {
    fn2 = _xwrap(fn2);
  }
  if (isArrayLike_default(list)) {
    return _arrayReduce(fn2, acc, list);
  }
  if (typeof list["fantasy-land/reduce"] === "function") {
    return _methodReduce(fn2, acc, list, "fantasy-land/reduce");
  }
  if (list[symIterator] != null) {
    return _iterableReduce(fn2, acc, list[symIterator]());
  }
  if (typeof list.next === "function") {
    return _iterableReduce(fn2, acc, list);
  }
  if (typeof list.reduce === "function") {
    return _methodReduce(fn2, acc, list, "reduce");
  }
  throw new TypeError("reduce: list must be array or iterable");
}
var symIterator;
var init_reduce = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_reduce.js"() {
    init_isArrayLike();
    init_xwrap();
    init_bind();
    symIterator = typeof Symbol !== "undefined" ? Symbol.iterator : "@@iterator";
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xmap.js
var XMap, _xmap, xmap_default;
var init_xmap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xmap.js"() {
    init_curry2();
    init_xfBase();
    XMap = /* @__PURE__ */ function() {
      function XMap2(f2, xf) {
        this.xf = xf;
        this.f = f2;
      }
      XMap2.prototype["@@transducer/init"] = xfBase_default.init;
      XMap2.prototype["@@transducer/result"] = xfBase_default.result;
      XMap2.prototype["@@transducer/step"] = function(result, input) {
        return this.xf["@@transducer/step"](result, this.f(input));
      };
      return XMap2;
    }();
    _xmap = /* @__PURE__ */ _curry2(function _xmap2(f2, xf) {
      return new XMap(f2, xf);
    });
    xmap_default = _xmap;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_has.js
function _has(prop, obj) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
var init_has = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_has.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArguments.js
var toString, _isArguments, isArguments_default;
var init_isArguments = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArguments.js"() {
    init_has();
    toString = Object.prototype.toString;
    _isArguments = /* @__PURE__ */ function() {
      return toString.call(arguments) === "[object Arguments]" ? function _isArguments2(x2) {
        return toString.call(x2) === "[object Arguments]";
      } : function _isArguments2(x2) {
        return _has("callee", x2);
      };
    }();
    isArguments_default = _isArguments;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/keys.js
var hasEnumBug, nonEnumerableProps, hasArgsEnumBug, contains, keys, keys_default;
var init_keys = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/keys.js"() {
    init_curry1();
    init_has();
    init_isArguments();
    hasEnumBug = !/* @__PURE__ */ {
      toString: null
    }.propertyIsEnumerable("toString");
    nonEnumerableProps = ["constructor", "valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"];
    hasArgsEnumBug = /* @__PURE__ */ function() {
      "use strict";
      return arguments.propertyIsEnumerable("length");
    }();
    contains = function contains2(list, item) {
      var idx = 0;
      while (idx < list.length) {
        if (list[idx] === item) {
          return true;
        }
        idx += 1;
      }
      return false;
    };
    keys = typeof Object.keys === "function" && !hasArgsEnumBug ? /* @__PURE__ */ _curry1(function keys2(obj) {
      return Object(obj) !== obj ? [] : Object.keys(obj);
    }) : /* @__PURE__ */ _curry1(function keys3(obj) {
      if (Object(obj) !== obj) {
        return [];
      }
      var prop, nIdx;
      var ks = [];
      var checkArgsLength = hasArgsEnumBug && isArguments_default(obj);
      for (prop in obj) {
        if (_has(prop, obj) && (!checkArgsLength || prop !== "length")) {
          ks[ks.length] = prop;
        }
      }
      if (hasEnumBug) {
        nIdx = nonEnumerableProps.length - 1;
        while (nIdx >= 0) {
          prop = nonEnumerableProps[nIdx];
          if (_has(prop, obj) && !contains(ks, prop)) {
            ks[ks.length] = prop;
          }
          nIdx -= 1;
        }
      }
      return ks;
    });
    keys_default = keys;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/map.js
var map, map_default;
var init_map2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/map.js"() {
    init_curry2();
    init_dispatchable();
    init_map();
    init_reduce();
    init_xmap();
    init_curryN2();
    init_keys();
    map = /* @__PURE__ */ _curry2(/* @__PURE__ */ _dispatchable(["fantasy-land/map", "map"], xmap_default, function map2(fn2, functor) {
      switch (Object.prototype.toString.call(functor)) {
        case "[object Function]":
          return curryN_default(functor.length, function() {
            return fn2.call(this, functor.apply(this, arguments));
          });
        case "[object Object]":
          return _reduce(function(acc, key) {
            acc[key] = fn2(functor[key]);
            return acc;
          }, {}, keys_default(functor));
        default:
          return _map(fn2, functor);
      }
    }));
    map_default = map;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isInteger.js
var isInteger_default;
var init_isInteger = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isInteger.js"() {
    isInteger_default = Number.isInteger || function _isInteger(n2) {
      return n2 << 0 === n2;
    };
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/nth.js
var init_nth = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/nth.js"() {
    init_curry2();
    init_isString();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/prop.js
var init_prop = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/prop.js"() {
    init_curry2();
    init_isInteger();
    init_nth();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pluck.js
var init_pluck = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pluck.js"() {
    init_curry2();
    init_map2();
    init_prop();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduce.js
var init_reduce2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduce.js"() {
    init_curry3();
    init_reduce();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/allPass.js
var init_allPass = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/allPass.js"() {
    init_curry1();
    init_curryN2();
    init_max();
    init_pluck();
    init_reduce2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/always.js
var init_always = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/always.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/and.js
var init_and = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/and.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xany.js
var init_xany = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xany.js"() {
    init_curry2();
    init_reduced();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/any.js
var init_any = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/any.js"() {
    init_curry2();
    init_dispatchable();
    init_xany();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/anyPass.js
var init_anyPass = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/anyPass.js"() {
    init_curry1();
    init_curryN2();
    init_max();
    init_pluck();
    init_reduce2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ap.js
var ap, ap_default;
var init_ap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ap.js"() {
    init_concat();
    init_curry2();
    init_reduce();
    init_map2();
    ap = /* @__PURE__ */ _curry2(function ap2(applyF, applyX) {
      return typeof applyX["fantasy-land/ap"] === "function" ? applyX["fantasy-land/ap"](applyF) : typeof applyF.ap === "function" ? applyF.ap(applyX) : typeof applyF === "function" ? function(x2) {
        return applyF(x2)(applyX(x2));
      } : _reduce(function(acc, f2) {
        return _concat(acc, map_default(f2, applyX));
      }, [], applyF);
    });
    ap_default = ap;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_aperture.js
var init_aperture = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_aperture.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xaperture.js
var init_xaperture = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xaperture.js"() {
    init_concat();
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/aperture.js
var init_aperture2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/aperture.js"() {
    init_aperture();
    init_curry2();
    init_dispatchable();
    init_xaperture();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/append.js
var init_append = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/append.js"() {
    init_concat();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/apply.js
var init_apply = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/apply.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/values.js
var init_values = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/values.js"() {
    init_curry1();
    init_keys();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/applySpec.js
var init_applySpec = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/applySpec.js"() {
    init_curry1();
    init_isArray();
    init_apply();
    init_curryN2();
    init_max();
    init_pluck();
    init_reduce2();
    init_keys();
    init_values();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/applyTo.js
var init_applyTo = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/applyTo.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ascend.js
var init_ascend = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ascend.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_assoc.js
var init_assoc = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_assoc.js"() {
    init_isArray();
    init_isInteger();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/isNil.js
var isNil, isNil_default;
var init_isNil = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/isNil.js"() {
    init_curry1();
    isNil = /* @__PURE__ */ _curry1(function isNil2(x2) {
      return x2 == null;
    });
    isNil_default = isNil;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/assocPath.js
var init_assocPath = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/assocPath.js"() {
    init_curry3();
    init_has();
    init_isInteger();
    init_assoc();
    init_isNil();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/assoc.js
var init_assoc2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/assoc.js"() {
    init_curry3();
    init_assocPath();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/nAry.js
var init_nAry = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/nAry.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/binary.js
var init_binary = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/binary.js"() {
    init_curry1();
    init_nAry();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isFunction.js
var init_isFunction = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isFunction.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/liftN.js
var liftN, liftN_default;
var init_liftN = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/liftN.js"() {
    init_curry2();
    init_reduce();
    init_ap();
    init_curryN2();
    init_map2();
    liftN = /* @__PURE__ */ _curry2(function liftN2(arity, fn2) {
      var lifted = curryN_default(arity, fn2);
      return curryN_default(arity, function() {
        return _reduce(ap_default, map_default(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
      });
    });
    liftN_default = liftN;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lift.js
var lift, lift_default;
var init_lift = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lift.js"() {
    init_curry1();
    init_liftN();
    lift = /* @__PURE__ */ _curry1(function lift2(fn2) {
      return liftN_default(fn2.length, fn2);
    });
    lift_default = lift;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/both.js
var init_both = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/both.js"() {
    init_curry2();
    init_isFunction();
    init_and();
    init_lift();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/call.js
var init_call = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/call.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_makeFlat.js
var init_makeFlat = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_makeFlat.js"() {
    init_isArrayLike();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_forceReduced.js
var init_forceReduced = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_forceReduced.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_flatCat.js
var init_flatCat = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_flatCat.js"() {
    init_forceReduced();
    init_isArrayLike();
    init_reduce();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xchain.js
var init_xchain = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xchain.js"() {
    init_curry2();
    init_flatCat();
    init_map2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/chain.js
var init_chain = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/chain.js"() {
    init_curry2();
    init_dispatchable();
    init_makeFlat();
    init_xchain();
    init_map2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/clamp.js
var init_clamp = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/clamp.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_cloneRegExp.js
var init_cloneRegExp = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_cloneRegExp.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/type.js
var init_type = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/type.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_clone.js
var init_clone = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_clone.js"() {
    init_cloneRegExp();
    init_type();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/clone.js
var init_clone2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/clone.js"() {
    init_clone();
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/collectBy.js
var init_collectBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/collectBy.js"() {
    init_curry2();
    init_reduce();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/comparator.js
var init_comparator = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/comparator.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/not.js
var not, not_default;
var init_not = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/not.js"() {
    init_curry1();
    not = /* @__PURE__ */ _curry1(function not2(a2) {
      return !a2;
    });
    not_default = not;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/complement.js
var complement, complement_default;
var init_complement = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/complement.js"() {
    init_lift();
    init_not();
    complement = /* @__PURE__ */ lift_default(not_default);
    complement_default = complement;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_pipe.js
var init_pipe = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_pipe.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_checkForMethod.js
var init_checkForMethod = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_checkForMethod.js"() {
    init_isArray();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/slice.js
var init_slice = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/slice.js"() {
    init_checkForMethod();
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tail.js
var init_tail = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tail.js"() {
    init_checkForMethod();
    init_curry1();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pipe.js
var init_pipe2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pipe.js"() {
    init_arity();
    init_pipe();
    init_reduce2();
    init_tail();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reverse.js
var init_reverse = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reverse.js"() {
    init_curry1();
    init_isString();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/compose.js
var init_compose = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/compose.js"() {
    init_pipe2();
    init_reverse();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/head.js
var init_head = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/head.js"() {
    init_nth();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_identity.js
var init_identity = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_identity.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/identity.js
var init_identity2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/identity.js"() {
    init_curry1();
    init_identity();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pipeWith.js
var init_pipeWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pipeWith.js"() {
    init_arity();
    init_curry2();
    init_head();
    init_reduce();
    init_tail();
    init_identity2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/composeWith.js
var init_composeWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/composeWith.js"() {
    init_curry2();
    init_pipeWith();
    init_reverse();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_arrayFromIterator.js
var init_arrayFromIterator = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_arrayFromIterator.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_includesWith.js
var init_includesWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_includesWith.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_functionName.js
var init_functionName = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_functionName.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_objectIs.js
var init_objectIs = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_objectIs.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_equals.js
var init_equals = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_equals.js"() {
    init_arrayFromIterator();
    init_includesWith();
    init_functionName();
    init_has();
    init_objectIs();
    init_keys();
    init_type();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/equals.js
var init_equals2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/equals.js"() {
    init_curry2();
    init_equals();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_indexOf.js
var init_indexOf = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_indexOf.js"() {
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_includes.js
var init_includes = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_includes.js"() {
    init_indexOf();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_quote.js
var init_quote = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_quote.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_toISOString.js
var pad, _toISOString;
var init_toISOString = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_toISOString.js"() {
    pad = function pad2(n2) {
      return (n2 < 10 ? "0" : "") + n2;
    };
    _toISOString = typeof Date.prototype.toISOString === "function" ? function _toISOString2(d2) {
      return d2.toISOString();
    } : function _toISOString3(d2) {
      return d2.getUTCFullYear() + "-" + pad(d2.getUTCMonth() + 1) + "-" + pad(d2.getUTCDate()) + "T" + pad(d2.getUTCHours()) + ":" + pad(d2.getUTCMinutes()) + ":" + pad(d2.getUTCSeconds()) + "." + (d2.getUTCMilliseconds() / 1e3).toFixed(3).slice(2, 5) + "Z";
    };
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_complement.js
var init_complement2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_complement.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_filter.js
var init_filter = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_filter.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isObject.js
var init_isObject = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isObject.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfilter.js
var init_xfilter = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfilter.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/filter.js
var init_filter2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/filter.js"() {
    init_curry2();
    init_dispatchable();
    init_filter();
    init_isObject();
    init_reduce();
    init_xfilter();
    init_keys();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reject.js
var init_reject = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reject.js"() {
    init_complement2();
    init_curry2();
    init_filter2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_toString.js
var init_toString = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_toString.js"() {
    init_includes();
    init_map();
    init_quote();
    init_toISOString();
    init_keys();
    init_reject();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toString.js
var init_toString2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toString.js"() {
    init_curry1();
    init_toString();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/concat.js
var init_concat2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/concat.js"() {
    init_curry2();
    init_isArray();
    init_isFunction();
    init_isString();
    init_toString2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/cond.js
var init_cond = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/cond.js"() {
    init_arity();
    init_curry1();
    init_map2();
    init_max();
    init_reduce2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/curry.js
var curry, curry_default;
var init_curry = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/curry.js"() {
    init_curry1();
    init_curryN2();
    curry = /* @__PURE__ */ _curry1(function curry2(fn2) {
      return curryN_default(fn2.length, fn2);
    });
    curry_default = curry;
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/constructN.js
var init_constructN = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/constructN.js"() {
    init_curry2();
    init_curry();
    init_nAry();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/construct.js
var init_construct = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/construct.js"() {
    init_curry1();
    init_constructN();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/converge.js
var init_converge = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/converge.js"() {
    init_curry2();
    init_map();
    init_curryN2();
    init_max();
    init_pluck();
    init_reduce2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/count.js
var init_count = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/count.js"() {
    init_reduce();
    init_curry();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xreduceBy.js
var init_xreduceBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xreduceBy.js"() {
    init_curryN();
    init_has();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduceBy.js
var init_reduceBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduceBy.js"() {
    init_clone();
    init_curryN();
    init_dispatchable();
    init_has();
    init_reduce();
    init_reduced();
    init_xreduceBy();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/countBy.js
var init_countBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/countBy.js"() {
    init_reduceBy();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dec.js
var init_dec = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dec.js"() {
    init_add();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/defaultTo.js
var init_defaultTo = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/defaultTo.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/descend.js
var init_descend = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/descend.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_Set.js
var init_Set = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_Set.js"() {
    init_includes();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/difference.js
var init_difference = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/difference.js"() {
    init_curry2();
    init_Set();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/differenceWith.js
var init_differenceWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/differenceWith.js"() {
    init_includesWith();
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/remove.js
var init_remove = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/remove.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dissoc.js
var init_dissoc = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dissoc.js"() {
    init_isInteger();
    init_isArray();
    init_remove();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dissocPath.js
var init_dissocPath = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dissocPath.js"() {
    init_curry2();
    init_dissoc();
    init_isInteger();
    init_isArray();
    init_assoc2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dissoc.js
var init_dissoc2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dissoc.js"() {
    init_curry2();
    init_dissocPath();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/divide.js
var init_divide = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/divide.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdrop.js
var init_xdrop = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdrop.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/drop.js
var init_drop = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/drop.js"() {
    init_curry2();
    init_dispatchable();
    init_xdrop();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xtake.js
var init_xtake = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xtake.js"() {
    init_curry2();
    init_reduced();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/take.js
var init_take = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/take.js"() {
    init_curry2();
    init_dispatchable();
    init_xtake();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dropLast.js
var init_dropLast = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dropLast.js"() {
    init_take();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropLast.js
var init_xdropLast = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropLast.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropLast.js
var init_dropLast2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropLast.js"() {
    init_curry2();
    init_dispatchable();
    init_dropLast();
    init_xdropLast();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dropLastWhile.js
var init_dropLastWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dropLastWhile.js"() {
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropLastWhile.js
var init_xdropLastWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropLastWhile.js"() {
    init_curry2();
    init_reduce();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropLastWhile.js
var init_dropLastWhile2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropLastWhile.js"() {
    init_curry2();
    init_dispatchable();
    init_dropLastWhile();
    init_xdropLastWhile();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropRepeatsWith.js
var init_xdropRepeatsWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropRepeatsWith.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/last.js
var init_last = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/last.js"() {
    init_nth();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropRepeatsWith.js
var init_dropRepeatsWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropRepeatsWith.js"() {
    init_curry2();
    init_dispatchable();
    init_xdropRepeatsWith();
    init_last();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropRepeats.js
var init_dropRepeats = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropRepeats.js"() {
    init_curry1();
    init_dispatchable();
    init_xdropRepeatsWith();
    init_dropRepeatsWith();
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropWhile.js
var init_xdropWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xdropWhile.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropWhile.js
var init_dropWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/dropWhile.js"() {
    init_curry2();
    init_dispatchable();
    init_xdropWhile();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/or.js
var init_or = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/or.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/either.js
var init_either = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/either.js"() {
    init_curry2();
    init_isFunction();
    init_lift();
    init_or();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isTypedArray.js
var init_isTypedArray = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isTypedArray.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/empty.js
var init_empty = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/empty.js"() {
    init_curry1();
    init_isArguments();
    init_isArray();
    init_isObject();
    init_isString();
    init_isTypedArray();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/takeLast.js
var init_takeLast = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/takeLast.js"() {
    init_curry2();
    init_drop();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/endsWith.js
var init_endsWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/endsWith.js"() {
    init_curry2();
    init_equals2();
    init_takeLast();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/eqBy.js
var init_eqBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/eqBy.js"() {
    init_curry3();
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/eqProps.js
var init_eqProps = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/eqProps.js"() {
    init_curry3();
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/evolve.js
var init_evolve = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/evolve.js"() {
    init_curry2();
    init_isArray();
    init_isObject();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfind.js
var init_xfind = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfind.js"() {
    init_curry2();
    init_reduced();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/find.js
var init_find = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/find.js"() {
    init_curry2();
    init_dispatchable();
    init_xfind();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfindIndex.js
var init_xfindIndex = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfindIndex.js"() {
    init_curry2();
    init_reduced();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/findIndex.js
var init_findIndex = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/findIndex.js"() {
    init_curry2();
    init_dispatchable();
    init_xfindIndex();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfindLast.js
var init_xfindLast = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfindLast.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/findLast.js
var init_findLast = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/findLast.js"() {
    init_curry2();
    init_dispatchable();
    init_xfindLast();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfindLastIndex.js
var init_xfindLastIndex = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfindLastIndex.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/findLastIndex.js
var init_findLastIndex = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/findLastIndex.js"() {
    init_curry2();
    init_dispatchable();
    init_xfindLastIndex();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/flatten.js
var init_flatten = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/flatten.js"() {
    init_curry1();
    init_makeFlat();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/flip.js
var init_flip = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/flip.js"() {
    init_curry1();
    init_curryN2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/forEach.js
var init_forEach = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/forEach.js"() {
    init_checkForMethod();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/forEachObjIndexed.js
var init_forEachObjIndexed = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/forEachObjIndexed.js"() {
    init_curry2();
    init_keys();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/fromPairs.js
var init_fromPairs = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/fromPairs.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/groupBy.js
var init_groupBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/groupBy.js"() {
    init_checkForMethod();
    init_curry2();
    init_reduceBy();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/groupWith.js
var init_groupWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/groupWith.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/gt.js
var init_gt = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/gt.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/gte.js
var init_gte = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/gte.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/hasPath.js
var init_hasPath = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/hasPath.js"() {
    init_curry2();
    init_has();
    init_isNil();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/has.js
var init_has2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/has.js"() {
    init_curry2();
    init_hasPath();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/hasIn.js
var init_hasIn = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/hasIn.js"() {
    init_curry2();
    init_isNil();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/identical.js
var init_identical = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/identical.js"() {
    init_objectIs();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ifElse.js
var init_ifElse = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ifElse.js"() {
    init_curry3();
    init_curryN2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/inc.js
var init_inc = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/inc.js"() {
    init_add();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/includes.js
var init_includes2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/includes.js"() {
    init_includes();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/indexBy.js
var init_indexBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/indexBy.js"() {
    init_reduceBy();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/indexOf.js
var init_indexOf2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/indexOf.js"() {
    init_curry2();
    init_indexOf();
    init_isArray();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/init.js
var init_init = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/init.js"() {
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/innerJoin.js
var init_innerJoin = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/innerJoin.js"() {
    init_includesWith();
    init_curry3();
    init_filter();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/insert.js
var init_insert = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/insert.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/insertAll.js
var init_insertAll = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/insertAll.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xuniqBy.js
var init_xuniqBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xuniqBy.js"() {
    init_curry2();
    init_Set();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uniqBy.js
var init_uniqBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uniqBy.js"() {
    init_Set();
    init_curry2();
    init_dispatchable();
    init_xuniqBy();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uniq.js
var init_uniq = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uniq.js"() {
    init_identity2();
    init_uniqBy();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/intersection.js
var init_intersection = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/intersection.js"() {
    init_includes();
    init_curry2();
    init_filter();
    init_flip();
    init_uniq();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/intersperse.js
var init_intersperse = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/intersperse.js"() {
    init_checkForMethod();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_objectAssign.js
var init_objectAssign = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_objectAssign.js"() {
    init_has();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/objOf.js
var init_objOf = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/objOf.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_stepCat.js
var init_stepCat = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_stepCat.js"() {
    init_objectAssign();
    init_identity();
    init_isArrayLike();
    init_isTransformer();
    init_objOf();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/into.js
var init_into = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/into.js"() {
    init_clone();
    init_curry3();
    init_isTransformer();
    init_reduce();
    init_stepCat();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/invert.js
var init_invert = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/invert.js"() {
    init_curry1();
    init_has();
    init_keys();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/invertObj.js
var init_invertObj = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/invertObj.js"() {
    init_curry1();
    init_keys();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/invoker.js
var init_invoker = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/invoker.js"() {
    init_curry2();
    init_isFunction();
    init_curryN2();
    init_toString2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/is.js
var init_is = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/is.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/isEmpty.js
var init_isEmpty = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/isEmpty.js"() {
    init_curry1();
    init_empty();
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/join.js
var init_join = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/join.js"() {
    init_invoker();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/juxt.js
var init_juxt = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/juxt.js"() {
    init_curry1();
    init_converge();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/keysIn.js
var init_keysIn = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/keysIn.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lastIndexOf.js
var init_lastIndexOf = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lastIndexOf.js"() {
    init_curry2();
    init_isArray();
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isNumber.js
var init_isNumber = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isNumber.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/length.js
var init_length = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/length.js"() {
    init_curry1();
    init_isNumber();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lens.js
var init_lens = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lens.js"() {
    init_curry2();
    init_map2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/update.js
var init_update = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/update.js"() {
    init_curry3();
    init_adjust();
    init_always();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lensIndex.js
var init_lensIndex = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lensIndex.js"() {
    init_curry1();
    init_lens();
    init_nth();
    init_update();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/paths.js
var init_paths = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/paths.js"() {
    init_curry2();
    init_isInteger();
    init_nth();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/path.js
var init_path = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/path.js"() {
    init_curry2();
    init_paths();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lensPath.js
var init_lensPath = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lensPath.js"() {
    init_curry1();
    init_assocPath();
    init_lens();
    init_path();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lensProp.js
var init_lensProp = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lensProp.js"() {
    init_curry1();
    init_assoc2();
    init_lens();
    init_prop();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lt.js
var init_lt = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lt.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lte.js
var init_lte = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lte.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mapAccum.js
var init_mapAccum = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mapAccum.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mapAccumRight.js
var init_mapAccumRight = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mapAccumRight.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mapObjIndexed.js
var init_mapObjIndexed = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mapObjIndexed.js"() {
    init_curry2();
    init_reduce();
    init_keys();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/match.js
var init_match = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/match.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mathMod.js
var init_mathMod = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mathMod.js"() {
    init_curry2();
    init_isInteger();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/maxBy.js
var init_maxBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/maxBy.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sum.js
var init_sum = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sum.js"() {
    init_add();
    init_reduce2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mean.js
var init_mean = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mean.js"() {
    init_curry1();
    init_sum();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/median.js
var init_median = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/median.js"() {
    init_curry1();
    init_mean();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/memoizeWith.js
var init_memoizeWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/memoizeWith.js"() {
    init_arity();
    init_curry2();
    init_has();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeAll.js
var init_mergeAll = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeAll.js"() {
    init_objectAssign();
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeWithKey.js
var init_mergeWithKey = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeWithKey.js"() {
    init_curry3();
    init_has();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepWithKey.js
var init_mergeDeepWithKey = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepWithKey.js"() {
    init_curry3();
    init_isObject();
    init_mergeWithKey();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepLeft.js
var init_mergeDeepLeft = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepLeft.js"() {
    init_curry2();
    init_mergeDeepWithKey();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepRight.js
var init_mergeDeepRight = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepRight.js"() {
    init_curry2();
    init_mergeDeepWithKey();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepWith.js
var init_mergeDeepWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeDeepWith.js"() {
    init_curry3();
    init_mergeDeepWithKey();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeLeft.js
var init_mergeLeft = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeLeft.js"() {
    init_objectAssign();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeRight.js
var init_mergeRight = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeRight.js"() {
    init_objectAssign();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeWith.js
var init_mergeWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeWith.js"() {
    init_curry3();
    init_mergeWithKey();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/min.js
var init_min = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/min.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/minBy.js
var init_minBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/minBy.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_modify.js
var init_modify = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_modify.js"() {
    init_isArray();
    init_isInteger();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/modifyPath.js
var init_modifyPath = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/modifyPath.js"() {
    init_curry3();
    init_isArray();
    init_isObject();
    init_has();
    init_assoc();
    init_modify();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/modify.js
var init_modify2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/modify.js"() {
    init_curry3();
    init_modifyPath();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/modulo.js
var init_modulo = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/modulo.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/move.js
var init_move = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/move.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/multiply.js
var init_multiply = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/multiply.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partialObject.js
var init_partialObject = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partialObject.js"() {
    init_mergeDeepRight();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/negate.js
var init_negate = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/negate.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/none.js
var init_none = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/none.js"() {
    init_complement2();
    init_curry2();
    init_all();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/nthArg.js
var init_nthArg = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/nthArg.js"() {
    init_curry1();
    init_curryN2();
    init_nth();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/o.js
var init_o = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/o.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_of.js
var init_of = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_of.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/of.js
var init_of2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/of.js"() {
    init_curry1();
    init_of();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/omit.js
var init_omit = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/omit.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/on.js
var init_on = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/on.js"() {
    init_curryN();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/once.js
var init_once = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/once.js"() {
    init_arity();
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_assertPromise.js
var init_assertPromise = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_assertPromise.js"() {
    init_isFunction();
    init_toString();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/otherwise.js
var init_otherwise = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/otherwise.js"() {
    init_curry2();
    init_assertPromise();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/over.js
var init_over = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/over.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pair.js
var init_pair = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pair.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_createPartialApplicator.js
var init_createPartialApplicator = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_createPartialApplicator.js"() {
    init_arity();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partial.js
var init_partial = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partial.js"() {
    init_concat();
    init_createPartialApplicator();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partialRight.js
var init_partialRight = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partialRight.js"() {
    init_concat();
    init_createPartialApplicator();
    init_flip();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partition.js
var init_partition = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/partition.js"() {
    init_filter2();
    init_juxt();
    init_reject();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pathEq.js
var init_pathEq = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pathEq.js"() {
    init_curry3();
    init_equals2();
    init_path();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pathOr.js
var init_pathOr = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pathOr.js"() {
    init_curry3();
    init_defaultTo();
    init_path();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pathSatisfies.js
var init_pathSatisfies = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pathSatisfies.js"() {
    init_curry3();
    init_path();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pick.js
var init_pick = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pick.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pickAll.js
var init_pickAll = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pickAll.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pickBy.js
var init_pickBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pickBy.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/prepend.js
var init_prepend = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/prepend.js"() {
    init_concat();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/product.js
var init_product = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/product.js"() {
    init_multiply();
    init_reduce2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/useWith.js
var init_useWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/useWith.js"() {
    init_curry2();
    init_curryN2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/project.js
var init_project = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/project.js"() {
    init_map();
    init_identity2();
    init_pickAll();
    init_useWith();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_promap.js
var init_promap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_promap.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xpromap.js
var init_xpromap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xpromap.js"() {
    init_curry3();
    init_xfBase();
    init_promap();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/promap.js
var init_promap2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/promap.js"() {
    init_curry3();
    init_dispatchable();
    init_promap();
    init_xpromap();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propEq.js
var init_propEq = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propEq.js"() {
    init_curry3();
    init_prop();
    init_equals2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propIs.js
var init_propIs = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propIs.js"() {
    init_curry3();
    init_prop();
    init_is();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propOr.js
var init_propOr = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propOr.js"() {
    init_curry3();
    init_defaultTo();
    init_prop();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propSatisfies.js
var init_propSatisfies = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/propSatisfies.js"() {
    init_curry3();
    init_prop();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/props.js
var init_props = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/props.js"() {
    init_curry2();
    init_path();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/range.js
var init_range = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/range.js"() {
    init_curry2();
    init_isNumber();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduceRight.js
var init_reduceRight = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduceRight.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduceWhile.js
var init_reduceWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduceWhile.js"() {
    init_curryN();
    init_reduce();
    init_reduced();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduced.js
var init_reduced2 = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduced.js"() {
    init_curry1();
    init_reduced();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/times.js
var init_times = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/times.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/repeat.js
var init_repeat = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/repeat.js"() {
    init_curry2();
    init_always();
    init_times();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/replace.js
var init_replace = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/replace.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/scan.js
var init_scan = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/scan.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sequence.js
var init_sequence = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sequence.js"() {
    init_curry2();
    init_ap();
    init_map2();
    init_prepend();
    init_reduceRight();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/set.js
var init_set = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/set.js"() {
    init_curry3();
    init_always();
    init_over();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sort.js
var init_sort = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sort.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sortBy.js
var init_sortBy = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sortBy.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sortWith.js
var init_sortWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/sortWith.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/split.js
var init_split = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/split.js"() {
    init_invoker();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitAt.js
var init_splitAt = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitAt.js"() {
    init_curry2();
    init_length();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitEvery.js
var init_splitEvery = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitEvery.js"() {
    init_curry2();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitWhen.js
var init_splitWhen = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitWhen.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitWhenever.js
var init_splitWhenever = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/splitWhenever.js"() {
    init_curryN();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/startsWith.js
var init_startsWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/startsWith.js"() {
    init_curry2();
    init_equals2();
    init_take();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/subtract.js
var init_subtract = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/subtract.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/symmetricDifference.js
var init_symmetricDifference = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/symmetricDifference.js"() {
    init_curry2();
    init_concat2();
    init_difference();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/symmetricDifferenceWith.js
var init_symmetricDifferenceWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/symmetricDifferenceWith.js"() {
    init_curry3();
    init_concat2();
    init_differenceWith();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/takeLastWhile.js
var init_takeLastWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/takeLastWhile.js"() {
    init_curry2();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xtakeWhile.js
var init_xtakeWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xtakeWhile.js"() {
    init_curry2();
    init_reduced();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/takeWhile.js
var init_takeWhile = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/takeWhile.js"() {
    init_curry2();
    init_dispatchable();
    init_xtakeWhile();
    init_slice();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xtap.js
var init_xtap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xtap.js"() {
    init_curry2();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tap.js
var init_tap = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tap.js"() {
    init_curry2();
    init_dispatchable();
    init_xtap();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isRegExp.js
var init_isRegExp = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isRegExp.js"() {
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/test.js
var init_test = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/test.js"() {
    init_cloneRegExp();
    init_curry2();
    init_isRegExp();
    init_toString2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/andThen.js
var init_andThen = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/andThen.js"() {
    init_curry2();
    init_assertPromise();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toLower.js
var init_toLower = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toLower.js"() {
    init_invoker();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toPairs.js
var init_toPairs = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toPairs.js"() {
    init_curry1();
    init_has();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toPairsIn.js
var init_toPairsIn = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toPairsIn.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toUpper.js
var init_toUpper = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/toUpper.js"() {
    init_invoker();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/transduce.js
var init_transduce = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/transduce.js"() {
    init_reduce();
    init_xwrap();
    init_curryN2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/transpose.js
var init_transpose = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/transpose.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/traverse.js
var init_traverse = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/traverse.js"() {
    init_curry3();
    init_map2();
    init_sequence();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/trim.js
var hasProtoTrim;
var init_trim = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/trim.js"() {
    init_curry1();
    hasProtoTrim = typeof String.prototype.trim === "function";
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tryCatch.js
var init_tryCatch = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tryCatch.js"() {
    init_arity();
    init_concat();
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unapply.js
var init_unapply = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unapply.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unary.js
var init_unary = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unary.js"() {
    init_curry1();
    init_nAry();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uncurryN.js
var init_uncurryN = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uncurryN.js"() {
    init_curry2();
    init_curryN2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unfold.js
var init_unfold = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unfold.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/union.js
var init_union = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/union.js"() {
    init_concat();
    init_curry2();
    init_compose();
    init_uniq();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xuniqWith.js
var init_xuniqWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xuniqWith.js"() {
    init_curry2();
    init_includesWith();
    init_xfBase();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uniqWith.js
var init_uniqWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/uniqWith.js"() {
    init_curry2();
    init_dispatchable();
    init_includesWith();
    init_xuniqWith();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unionWith.js
var init_unionWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unionWith.js"() {
    init_concat();
    init_curry3();
    init_uniqWith();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unless.js
var init_unless = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unless.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unnest.js
var init_unnest = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unnest.js"() {
    init_identity();
    init_chain();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/until.js
var init_until = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/until.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unwind.js
var init_unwind = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/unwind.js"() {
    init_curry2();
    init_isArray();
    init_map();
    init_assoc();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/valuesIn.js
var init_valuesIn = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/valuesIn.js"() {
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/view.js
var init_view = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/view.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/when.js
var init_when = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/when.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/where.js
var init_where = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/where.js"() {
    init_curry2();
    init_has();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/whereAny.js
var init_whereAny = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/whereAny.js"() {
    init_curry2();
    init_has();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/whereEq.js
var init_whereEq = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/whereEq.js"() {
    init_curry2();
    init_equals2();
    init_map2();
    init_where();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/without.js
var init_without = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/without.js"() {
    init_includes();
    init_curry2();
    init_flip();
    init_reject();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/xor.js
var init_xor = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/xor.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/xprod.js
var init_xprod = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/xprod.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/zip.js
var init_zip = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/zip.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/zipObj.js
var init_zipObj = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/zipObj.js"() {
    init_curry2();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/zipWith.js
var init_zipWith = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/zipWith.js"() {
    init_curry3();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/thunkify.js
var init_thunkify = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/thunkify.js"() {
    init_curryN2();
    init_curry1();
  }
});

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/index.js
var init_es = __esm({
  "node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/index.js"() {
    init_F();
    init_T();
    init__();
    init_add();
    init_addIndex();
    init_adjust();
    init_all();
    init_allPass();
    init_always();
    init_and();
    init_any();
    init_anyPass();
    init_ap();
    init_aperture2();
    init_append();
    init_apply();
    init_applySpec();
    init_applyTo();
    init_ascend();
    init_assoc2();
    init_assocPath();
    init_binary();
    init_bind();
    init_both();
    init_call();
    init_chain();
    init_clamp();
    init_clone2();
    init_collectBy();
    init_comparator();
    init_complement();
    init_compose();
    init_composeWith();
    init_concat2();
    init_cond();
    init_construct();
    init_constructN();
    init_converge();
    init_count();
    init_countBy();
    init_curry();
    init_curryN2();
    init_dec();
    init_defaultTo();
    init_descend();
    init_difference();
    init_differenceWith();
    init_dissoc2();
    init_dissocPath();
    init_divide();
    init_drop();
    init_dropLast2();
    init_dropLastWhile2();
    init_dropRepeats();
    init_dropRepeatsWith();
    init_dropWhile();
    init_either();
    init_empty();
    init_endsWith();
    init_eqBy();
    init_eqProps();
    init_equals2();
    init_evolve();
    init_filter2();
    init_find();
    init_findIndex();
    init_findLast();
    init_findLastIndex();
    init_flatten();
    init_flip();
    init_forEach();
    init_forEachObjIndexed();
    init_fromPairs();
    init_groupBy();
    init_groupWith();
    init_gt();
    init_gte();
    init_has2();
    init_hasIn();
    init_hasPath();
    init_head();
    init_identical();
    init_identity2();
    init_ifElse();
    init_inc();
    init_includes2();
    init_indexBy();
    init_indexOf2();
    init_init();
    init_innerJoin();
    init_insert();
    init_insertAll();
    init_intersection();
    init_intersperse();
    init_into();
    init_invert();
    init_invertObj();
    init_invoker();
    init_is();
    init_isEmpty();
    init_isNil();
    init_join();
    init_juxt();
    init_keys();
    init_keysIn();
    init_last();
    init_lastIndexOf();
    init_length();
    init_lens();
    init_lensIndex();
    init_lensPath();
    init_lensProp();
    init_lift();
    init_liftN();
    init_lt();
    init_lte();
    init_map2();
    init_mapAccum();
    init_mapAccumRight();
    init_mapObjIndexed();
    init_match();
    init_mathMod();
    init_max();
    init_maxBy();
    init_mean();
    init_median();
    init_memoizeWith();
    init_mergeAll();
    init_mergeDeepLeft();
    init_mergeDeepRight();
    init_mergeDeepWith();
    init_mergeDeepWithKey();
    init_mergeLeft();
    init_mergeRight();
    init_mergeWith();
    init_mergeWithKey();
    init_min();
    init_minBy();
    init_modify2();
    init_modifyPath();
    init_modulo();
    init_move();
    init_multiply();
    init_nAry();
    init_partialObject();
    init_negate();
    init_none();
    init_not();
    init_nth();
    init_nthArg();
    init_o();
    init_objOf();
    init_of2();
    init_omit();
    init_on();
    init_once();
    init_or();
    init_otherwise();
    init_over();
    init_pair();
    init_partial();
    init_partialRight();
    init_partition();
    init_path();
    init_paths();
    init_pathEq();
    init_pathOr();
    init_pathSatisfies();
    init_pick();
    init_pickAll();
    init_pickBy();
    init_pipe2();
    init_pipeWith();
    init_pluck();
    init_prepend();
    init_product();
    init_project();
    init_promap2();
    init_prop();
    init_propEq();
    init_propIs();
    init_propOr();
    init_propSatisfies();
    init_props();
    init_range();
    init_reduce2();
    init_reduceBy();
    init_reduceRight();
    init_reduceWhile();
    init_reduced2();
    init_reject();
    init_remove();
    init_repeat();
    init_replace();
    init_reverse();
    init_scan();
    init_sequence();
    init_set();
    init_slice();
    init_sort();
    init_sortBy();
    init_sortWith();
    init_split();
    init_splitAt();
    init_splitEvery();
    init_splitWhen();
    init_splitWhenever();
    init_startsWith();
    init_subtract();
    init_sum();
    init_symmetricDifference();
    init_symmetricDifferenceWith();
    init_tail();
    init_take();
    init_takeLast();
    init_takeLastWhile();
    init_takeWhile();
    init_tap();
    init_test();
    init_andThen();
    init_times();
    init_toLower();
    init_toPairs();
    init_toPairsIn();
    init_toString2();
    init_toUpper();
    init_transduce();
    init_transpose();
    init_traverse();
    init_trim();
    init_tryCatch();
    init_type();
    init_unapply();
    init_unary();
    init_uncurryN();
    init_unfold();
    init_union();
    init_unionWith();
    init_uniq();
    init_uniqBy();
    init_uniqWith();
    init_unless();
    init_unnest();
    init_until();
    init_unwind();
    init_update();
    init_useWith();
    init_values();
    init_valuesIn();
    init_view();
    init_when();
    init_where();
    init_whereAny();
    init_whereEq();
    init_without();
    init_xor();
    init_xprod();
    init_zip();
    init_zipObj();
    init_zipWith();
    init_thunkify();
  }
});

// src/utilities/generic.ts
var isFunction, isNotNil, random, createEnum;
var init_generic = __esm({
  "src/utilities/generic.ts"() {
    init_es();
    isFunction = (item) => typeof item === "function";
    isNotNil = complement_default(isNil_default);
    random = (from, to = 0) => {
      const min = Math.min(from, to);
      const max = Math.max(from, to);
      return Math.random() * (max - min) + min;
    };
    createEnum = (...args) => {
      return Object.fromEntries(args.map((enumName, index) => [
        [enumName, index],
        [index, enumName]
      ]).flat());
    };
  }
});

// node_modules/.pnpm/immer@9.0.14/node_modules/immer/dist/immer.esm.mjs
function n(n2) {
  for (var r2 = arguments.length, t2 = Array(r2 > 1 ? r2 - 1 : 0), e2 = 1; e2 < r2; e2++)
    t2[e2 - 1] = arguments[e2];
  if (true) {
    var i2 = Y[n2], o2 = i2 ? typeof i2 == "function" ? i2.apply(null, t2) : i2 : "unknown error nr: " + n2;
    throw Error("[Immer] " + o2);
  }
  throw Error("[Immer] minified error nr: " + n2 + (t2.length ? " " + t2.map(function(n3) {
    return "'" + n3 + "'";
  }).join(",") : "") + ". Find the full error at: https://bit.ly/3cXEKWf");
}
function r(n2) {
  return !!n2 && !!n2[Q];
}
function t(n2) {
  return !!n2 && (function(n3) {
    if (!n3 || typeof n3 != "object")
      return false;
    var r2 = Object.getPrototypeOf(n3);
    if (r2 === null)
      return true;
    var t2 = Object.hasOwnProperty.call(r2, "constructor") && r2.constructor;
    return t2 === Object || typeof t2 == "function" && Function.toString.call(t2) === Z;
  }(n2) || Array.isArray(n2) || !!n2[L] || !!n2.constructor[L] || s(n2) || v(n2));
}
function i(n2, r2, t2) {
  t2 === void 0 && (t2 = false), o(n2) === 0 ? (t2 ? Object.keys : nn)(n2).forEach(function(e2) {
    t2 && typeof e2 == "symbol" || r2(e2, n2[e2], n2);
  }) : n2.forEach(function(t3, e2) {
    return r2(e2, t3, n2);
  });
}
function o(n2) {
  var r2 = n2[Q];
  return r2 ? r2.i > 3 ? r2.i - 4 : r2.i : Array.isArray(n2) ? 1 : s(n2) ? 2 : v(n2) ? 3 : 0;
}
function u(n2, r2) {
  return o(n2) === 2 ? n2.has(r2) : Object.prototype.hasOwnProperty.call(n2, r2);
}
function a(n2, r2) {
  return o(n2) === 2 ? n2.get(r2) : n2[r2];
}
function f(n2, r2, t2) {
  var e2 = o(n2);
  e2 === 2 ? n2.set(r2, t2) : e2 === 3 ? (n2.delete(r2), n2.add(t2)) : n2[r2] = t2;
}
function c(n2, r2) {
  return n2 === r2 ? n2 !== 0 || 1 / n2 == 1 / r2 : n2 != n2 && r2 != r2;
}
function s(n2) {
  return X && n2 instanceof Map;
}
function v(n2) {
  return q && n2 instanceof Set;
}
function p(n2) {
  return n2.o || n2.t;
}
function l(n2) {
  if (Array.isArray(n2))
    return Array.prototype.slice.call(n2);
  var r2 = rn(n2);
  delete r2[Q];
  for (var t2 = nn(r2), e2 = 0; e2 < t2.length; e2++) {
    var i2 = t2[e2], o2 = r2[i2];
    o2.writable === false && (o2.writable = true, o2.configurable = true), (o2.get || o2.set) && (r2[i2] = { configurable: true, writable: true, enumerable: o2.enumerable, value: n2[i2] });
  }
  return Object.create(Object.getPrototypeOf(n2), r2);
}
function d(n2, e2) {
  return e2 === void 0 && (e2 = false), y(n2) || r(n2) || !t(n2) ? n2 : (o(n2) > 1 && (n2.set = n2.add = n2.clear = n2.delete = h), Object.freeze(n2), e2 && i(n2, function(n3, r2) {
    return d(r2, true);
  }, true), n2);
}
function h() {
  n(2);
}
function y(n2) {
  return n2 == null || typeof n2 != "object" || Object.isFrozen(n2);
}
function b(r2) {
  var t2 = tn[r2];
  return t2 || n(18, r2), t2;
}
function m(n2, r2) {
  tn[n2] || (tn[n2] = r2);
}
function _() {
  return U || n(0), U;
}
function j(n2, r2) {
  r2 && (b("Patches"), n2.u = [], n2.s = [], n2.v = r2);
}
function O(n2) {
  g(n2), n2.p.forEach(S), n2.p = null;
}
function g(n2) {
  n2 === U && (U = n2.l);
}
function w(n2) {
  return U = { p: [], l: U, h: n2, m: true, _: 0 };
}
function S(n2) {
  var r2 = n2[Q];
  r2.i === 0 || r2.i === 1 ? r2.j() : r2.O = true;
}
function P(r2, e2) {
  e2._ = e2.p.length;
  var i2 = e2.p[0], o2 = r2 !== void 0 && r2 !== i2;
  return e2.h.g || b("ES5").S(e2, r2, o2), o2 ? (i2[Q].P && (O(e2), n(4)), t(r2) && (r2 = M(e2, r2), e2.l || x(e2, r2)), e2.u && b("Patches").M(i2[Q].t, r2, e2.u, e2.s)) : r2 = M(e2, i2, []), O(e2), e2.u && e2.v(e2.u, e2.s), r2 !== H ? r2 : void 0;
}
function M(n2, r2, t2) {
  if (y(r2))
    return r2;
  var e2 = r2[Q];
  if (!e2)
    return i(r2, function(i2, o3) {
      return A(n2, e2, r2, i2, o3, t2);
    }, true), r2;
  if (e2.A !== n2)
    return r2;
  if (!e2.P)
    return x(n2, e2.t, true), e2.t;
  if (!e2.I) {
    e2.I = true, e2.A._--;
    var o2 = e2.i === 4 || e2.i === 5 ? e2.o = l(e2.k) : e2.o;
    i(e2.i === 3 ? new Set(o2) : o2, function(r3, i2) {
      return A(n2, e2, o2, r3, i2, t2);
    }), x(n2, o2, false), t2 && n2.u && b("Patches").R(e2, t2, n2.u, n2.s);
  }
  return e2.o;
}
function A(e2, i2, o2, a2, c3, s2) {
  if (c3 === o2 && n(5), r(c3)) {
    var v3 = M(e2, c3, s2 && i2 && i2.i !== 3 && !u(i2.D, a2) ? s2.concat(a2) : void 0);
    if (f(o2, a2, v3), !r(v3))
      return;
    e2.m = false;
  }
  if (t(c3) && !y(c3)) {
    if (!e2.h.F && e2._ < 1)
      return;
    M(e2, c3), i2 && i2.A.l || x(e2, c3);
  }
}
function x(n2, r2, t2) {
  t2 === void 0 && (t2 = false), n2.h.F && n2.m && d(r2, t2);
}
function z(n2, r2) {
  var t2 = n2[Q];
  return (t2 ? p(t2) : n2)[r2];
}
function I(n2, r2) {
  if (r2 in n2)
    for (var t2 = Object.getPrototypeOf(n2); t2; ) {
      var e2 = Object.getOwnPropertyDescriptor(t2, r2);
      if (e2)
        return e2;
      t2 = Object.getPrototypeOf(t2);
    }
}
function k(n2) {
  n2.P || (n2.P = true, n2.l && k(n2.l));
}
function E(n2) {
  n2.o || (n2.o = l(n2.t));
}
function R(n2, r2, t2) {
  var e2 = s(r2) ? b("MapSet").N(r2, t2) : v(r2) ? b("MapSet").T(r2, t2) : n2.g ? function(n3, r3) {
    var t3 = Array.isArray(n3), e3 = { i: t3 ? 1 : 0, A: r3 ? r3.A : _(), P: false, I: false, D: {}, l: r3, t: n3, k: null, o: null, j: null, C: false }, i2 = e3, o2 = en;
    t3 && (i2 = [e3], o2 = on);
    var u2 = Proxy.revocable(i2, o2), a2 = u2.revoke, f2 = u2.proxy;
    return e3.k = f2, e3.j = a2, f2;
  }(r2, t2) : b("ES5").J(r2, t2);
  return (t2 ? t2.A : _()).p.push(e2), e2;
}
function D(e2) {
  return r(e2) || n(22, e2), function n2(r2) {
    if (!t(r2))
      return r2;
    var e3, u2 = r2[Q], c3 = o(r2);
    if (u2) {
      if (!u2.P && (u2.i < 4 || !b("ES5").K(u2)))
        return u2.t;
      u2.I = true, e3 = F(r2, c3), u2.I = false;
    } else
      e3 = F(r2, c3);
    return i(e3, function(r3, t2) {
      u2 && a(u2.t, r3) === t2 || f(e3, r3, n2(t2));
    }), c3 === 3 ? new Set(e3) : e3;
  }(e2);
}
function F(n2, r2) {
  switch (r2) {
    case 2:
      return new Map(n2);
    case 3:
      return Array.from(n2);
  }
  return l(n2);
}
function N() {
  function t2(n2, r2) {
    var t3 = s2[n2];
    return t3 ? t3.enumerable = r2 : s2[n2] = t3 = { configurable: true, enumerable: r2, get: function() {
      var r3 = this[Q];
      return f2(r3), en.get(r3, n2);
    }, set: function(r3) {
      var t4 = this[Q];
      f2(t4), en.set(t4, n2, r3);
    } }, t3;
  }
  function e2(n2) {
    for (var r2 = n2.length - 1; r2 >= 0; r2--) {
      var t3 = n2[r2][Q];
      if (!t3.P)
        switch (t3.i) {
          case 5:
            a2(t3) && k(t3);
            break;
          case 4:
            o2(t3) && k(t3);
        }
    }
  }
  function o2(n2) {
    for (var r2 = n2.t, t3 = n2.k, e3 = nn(t3), i2 = e3.length - 1; i2 >= 0; i2--) {
      var o3 = e3[i2];
      if (o3 !== Q) {
        var a3 = r2[o3];
        if (a3 === void 0 && !u(r2, o3))
          return true;
        var f3 = t3[o3], s3 = f3 && f3[Q];
        if (s3 ? s3.t !== a3 : !c(f3, a3))
          return true;
      }
    }
    var v3 = !!r2[Q];
    return e3.length !== nn(r2).length + (v3 ? 0 : 1);
  }
  function a2(n2) {
    var r2 = n2.k;
    if (r2.length !== n2.t.length)
      return true;
    var t3 = Object.getOwnPropertyDescriptor(r2, r2.length - 1);
    if (t3 && !t3.get)
      return true;
    for (var e3 = 0; e3 < r2.length; e3++)
      if (!r2.hasOwnProperty(e3))
        return true;
    return false;
  }
  function f2(r2) {
    r2.O && n(3, JSON.stringify(p(r2)));
  }
  var s2 = {};
  m("ES5", { J: function(n2, r2) {
    var e3 = Array.isArray(n2), i2 = function(n3, r3) {
      if (n3) {
        for (var e4 = Array(r3.length), i3 = 0; i3 < r3.length; i3++)
          Object.defineProperty(e4, "" + i3, t2(i3, true));
        return e4;
      }
      var o4 = rn(r3);
      delete o4[Q];
      for (var u2 = nn(o4), a3 = 0; a3 < u2.length; a3++) {
        var f3 = u2[a3];
        o4[f3] = t2(f3, n3 || !!o4[f3].enumerable);
      }
      return Object.create(Object.getPrototypeOf(r3), o4);
    }(e3, n2), o3 = { i: e3 ? 5 : 4, A: r2 ? r2.A : _(), P: false, I: false, D: {}, l: r2, t: n2, k: i2, o: null, O: false, C: false };
    return Object.defineProperty(i2, Q, { value: o3, writable: true }), i2;
  }, S: function(n2, t3, o3) {
    o3 ? r(t3) && t3[Q].A === n2 && e2(n2.p) : (n2.u && function n3(r2) {
      if (r2 && typeof r2 == "object") {
        var t4 = r2[Q];
        if (t4) {
          var e3 = t4.t, o4 = t4.k, f3 = t4.D, c3 = t4.i;
          if (c3 === 4)
            i(o4, function(r3) {
              r3 !== Q && (e3[r3] !== void 0 || u(e3, r3) ? f3[r3] || n3(o4[r3]) : (f3[r3] = true, k(t4)));
            }), i(e3, function(n4) {
              o4[n4] !== void 0 || u(o4, n4) || (f3[n4] = false, k(t4));
            });
          else if (c3 === 5) {
            if (a2(t4) && (k(t4), f3.length = true), o4.length < e3.length)
              for (var s3 = o4.length; s3 < e3.length; s3++)
                f3[s3] = false;
            else
              for (var v3 = e3.length; v3 < o4.length; v3++)
                f3[v3] = true;
            for (var p2 = Math.min(o4.length, e3.length), l2 = 0; l2 < p2; l2++)
              o4.hasOwnProperty(l2) || (f3[l2] = true), f3[l2] === void 0 && n3(o4[l2]);
          }
        }
      }
    }(n2.p[0]), e2(n2.p));
  }, K: function(n2) {
    return n2.i === 4 ? o2(n2) : a2(n2);
  } });
}
function T() {
  function e2(n2) {
    if (!t(n2))
      return n2;
    if (Array.isArray(n2))
      return n2.map(e2);
    if (s(n2))
      return new Map(Array.from(n2.entries()).map(function(n3) {
        return [n3[0], e2(n3[1])];
      }));
    if (v(n2))
      return new Set(Array.from(n2).map(e2));
    var r2 = Object.create(Object.getPrototypeOf(n2));
    for (var i2 in n2)
      r2[i2] = e2(n2[i2]);
    return u(n2, L) && (r2[L] = n2[L]), r2;
  }
  function f2(n2) {
    return r(n2) ? e2(n2) : n2;
  }
  var c3 = "add";
  m("Patches", { $: function(r2, t2) {
    return t2.forEach(function(t3) {
      for (var i2 = t3.path, u2 = t3.op, f3 = r2, s2 = 0; s2 < i2.length - 1; s2++) {
        var v3 = o(f3), p2 = "" + i2[s2];
        v3 !== 0 && v3 !== 1 || p2 !== "__proto__" && p2 !== "constructor" || n(24), typeof f3 == "function" && p2 === "prototype" && n(24), typeof (f3 = a(f3, p2)) != "object" && n(15, i2.join("/"));
      }
      var l2 = o(f3), d2 = e2(t3.value), h2 = i2[i2.length - 1];
      switch (u2) {
        case "replace":
          switch (l2) {
            case 2:
              return f3.set(h2, d2);
            case 3:
              n(16);
            default:
              return f3[h2] = d2;
          }
        case c3:
          switch (l2) {
            case 1:
              return h2 === "-" ? f3.push(d2) : f3.splice(h2, 0, d2);
            case 2:
              return f3.set(h2, d2);
            case 3:
              return f3.add(d2);
            default:
              return f3[h2] = d2;
          }
        case "remove":
          switch (l2) {
            case 1:
              return f3.splice(h2, 1);
            case 2:
              return f3.delete(h2);
            case 3:
              return f3.delete(t3.value);
            default:
              return delete f3[h2];
          }
        default:
          n(17, u2);
      }
    }), r2;
  }, R: function(n2, r2, t2, e3) {
    switch (n2.i) {
      case 0:
      case 4:
      case 2:
        return function(n3, r3, t3, e4) {
          var o2 = n3.t, s2 = n3.o;
          i(n3.D, function(n4, i2) {
            var v3 = a(o2, n4), p2 = a(s2, n4), l2 = i2 ? u(o2, n4) ? "replace" : c3 : "remove";
            if (v3 !== p2 || l2 !== "replace") {
              var d2 = r3.concat(n4);
              t3.push(l2 === "remove" ? { op: l2, path: d2 } : { op: l2, path: d2, value: p2 }), e4.push(l2 === c3 ? { op: "remove", path: d2 } : l2 === "remove" ? { op: c3, path: d2, value: f2(v3) } : { op: "replace", path: d2, value: f2(v3) });
            }
          });
        }(n2, r2, t2, e3);
      case 5:
      case 1:
        return function(n3, r3, t3, e4) {
          var i2 = n3.t, o2 = n3.D, u2 = n3.o;
          if (u2.length < i2.length) {
            var a2 = [u2, i2];
            i2 = a2[0], u2 = a2[1];
            var s2 = [e4, t3];
            t3 = s2[0], e4 = s2[1];
          }
          for (var v3 = 0; v3 < i2.length; v3++)
            if (o2[v3] && u2[v3] !== i2[v3]) {
              var p2 = r3.concat([v3]);
              t3.push({ op: "replace", path: p2, value: f2(u2[v3]) }), e4.push({ op: "replace", path: p2, value: f2(i2[v3]) });
            }
          for (var l2 = i2.length; l2 < u2.length; l2++) {
            var d2 = r3.concat([l2]);
            t3.push({ op: c3, path: d2, value: f2(u2[l2]) });
          }
          i2.length < u2.length && e4.push({ op: "replace", path: r3.concat(["length"]), value: i2.length });
        }(n2, r2, t2, e3);
      case 3:
        return function(n3, r3, t3, e4) {
          var i2 = n3.t, o2 = n3.o, u2 = 0;
          i2.forEach(function(n4) {
            if (!o2.has(n4)) {
              var i3 = r3.concat([u2]);
              t3.push({ op: "remove", path: i3, value: n4 }), e4.unshift({ op: c3, path: i3, value: n4 });
            }
            u2++;
          }), u2 = 0, o2.forEach(function(n4) {
            if (!i2.has(n4)) {
              var o3 = r3.concat([u2]);
              t3.push({ op: c3, path: o3, value: n4 }), e4.unshift({ op: "remove", path: o3, value: n4 });
            }
            u2++;
          });
        }(n2, r2, t2, e3);
    }
  }, M: function(n2, r2, t2, e3) {
    t2.push({ op: "replace", path: [], value: r2 === H ? void 0 : r2 }), e3.push({ op: "replace", path: [], value: n2 });
  } });
}
function C() {
  function r2(n2, r3) {
    function t2() {
      this.constructor = n2;
    }
    a2(n2, r3), n2.prototype = (t2.prototype = r3.prototype, new t2());
  }
  function e2(n2) {
    n2.o || (n2.D = /* @__PURE__ */ new Map(), n2.o = new Map(n2.t));
  }
  function o2(n2) {
    n2.o || (n2.o = /* @__PURE__ */ new Set(), n2.t.forEach(function(r3) {
      if (t(r3)) {
        var e3 = R(n2.A.h, r3, n2);
        n2.p.set(r3, e3), n2.o.add(e3);
      } else
        n2.o.add(r3);
    }));
  }
  function u2(r3) {
    r3.O && n(3, JSON.stringify(p(r3)));
  }
  var a2 = function(n2, r3) {
    return (a2 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(n3, r4) {
      n3.__proto__ = r4;
    } || function(n3, r4) {
      for (var t2 in r4)
        r4.hasOwnProperty(t2) && (n3[t2] = r4[t2]);
    })(n2, r3);
  }, f2 = function() {
    function n2(n3, r3) {
      return this[Q] = { i: 2, l: r3, A: r3 ? r3.A : _(), P: false, I: false, o: void 0, D: void 0, t: n3, k: this, C: false, O: false }, this;
    }
    r2(n2, Map);
    var o3 = n2.prototype;
    return Object.defineProperty(o3, "size", { get: function() {
      return p(this[Q]).size;
    } }), o3.has = function(n3) {
      return p(this[Q]).has(n3);
    }, o3.set = function(n3, r3) {
      var t2 = this[Q];
      return u2(t2), p(t2).has(n3) && p(t2).get(n3) === r3 || (e2(t2), k(t2), t2.D.set(n3, true), t2.o.set(n3, r3), t2.D.set(n3, true)), this;
    }, o3.delete = function(n3) {
      if (!this.has(n3))
        return false;
      var r3 = this[Q];
      return u2(r3), e2(r3), k(r3), r3.t.has(n3) ? r3.D.set(n3, false) : r3.D.delete(n3), r3.o.delete(n3), true;
    }, o3.clear = function() {
      var n3 = this[Q];
      u2(n3), p(n3).size && (e2(n3), k(n3), n3.D = /* @__PURE__ */ new Map(), i(n3.t, function(r3) {
        n3.D.set(r3, false);
      }), n3.o.clear());
    }, o3.forEach = function(n3, r3) {
      var t2 = this;
      p(this[Q]).forEach(function(e3, i2) {
        n3.call(r3, t2.get(i2), i2, t2);
      });
    }, o3.get = function(n3) {
      var r3 = this[Q];
      u2(r3);
      var i2 = p(r3).get(n3);
      if (r3.I || !t(i2))
        return i2;
      if (i2 !== r3.t.get(n3))
        return i2;
      var o4 = R(r3.A.h, i2, r3);
      return e2(r3), r3.o.set(n3, o4), o4;
    }, o3.keys = function() {
      return p(this[Q]).keys();
    }, o3.values = function() {
      var n3, r3 = this, t2 = this.keys();
      return (n3 = {})[V] = function() {
        return r3.values();
      }, n3.next = function() {
        var n4 = t2.next();
        return n4.done ? n4 : { done: false, value: r3.get(n4.value) };
      }, n3;
    }, o3.entries = function() {
      var n3, r3 = this, t2 = this.keys();
      return (n3 = {})[V] = function() {
        return r3.entries();
      }, n3.next = function() {
        var n4 = t2.next();
        if (n4.done)
          return n4;
        var e3 = r3.get(n4.value);
        return { done: false, value: [n4.value, e3] };
      }, n3;
    }, o3[V] = function() {
      return this.entries();
    }, n2;
  }(), c3 = function() {
    function n2(n3, r3) {
      return this[Q] = { i: 3, l: r3, A: r3 ? r3.A : _(), P: false, I: false, o: void 0, t: n3, k: this, p: /* @__PURE__ */ new Map(), O: false, C: false }, this;
    }
    r2(n2, Set);
    var t2 = n2.prototype;
    return Object.defineProperty(t2, "size", { get: function() {
      return p(this[Q]).size;
    } }), t2.has = function(n3) {
      var r3 = this[Q];
      return u2(r3), r3.o ? !!r3.o.has(n3) || !(!r3.p.has(n3) || !r3.o.has(r3.p.get(n3))) : r3.t.has(n3);
    }, t2.add = function(n3) {
      var r3 = this[Q];
      return u2(r3), this.has(n3) || (o2(r3), k(r3), r3.o.add(n3)), this;
    }, t2.delete = function(n3) {
      if (!this.has(n3))
        return false;
      var r3 = this[Q];
      return u2(r3), o2(r3), k(r3), r3.o.delete(n3) || !!r3.p.has(n3) && r3.o.delete(r3.p.get(n3));
    }, t2.clear = function() {
      var n3 = this[Q];
      u2(n3), p(n3).size && (o2(n3), k(n3), n3.o.clear());
    }, t2.values = function() {
      var n3 = this[Q];
      return u2(n3), o2(n3), n3.o.values();
    }, t2.entries = function() {
      var n3 = this[Q];
      return u2(n3), o2(n3), n3.o.entries();
    }, t2.keys = function() {
      return this.values();
    }, t2[V] = function() {
      return this.values();
    }, t2.forEach = function(n3, r3) {
      for (var t3 = this.values(), e3 = t3.next(); !e3.done; )
        n3.call(r3, e3.value, e3.value, this), e3 = t3.next();
    }, n2;
  }();
  m("MapSet", { N: function(n2, r3) {
    return new f2(n2, r3);
  }, T: function(n2, r3) {
    return new c3(n2, r3);
  } });
}
function J() {
  N(), C(), T();
}
var G, U, W, X, q, B, H, L, Q, V, Y, Z, nn, rn, tn, en, on, un, an, fn, cn, sn, vn, pn, ln, dn;
var init_immer_esm = __esm({
  "node_modules/.pnpm/immer@9.0.14/node_modules/immer/dist/immer.esm.mjs"() {
    W = typeof Symbol != "undefined" && typeof Symbol("x") == "symbol";
    X = typeof Map != "undefined";
    q = typeof Set != "undefined";
    B = typeof Proxy != "undefined" && Proxy.revocable !== void 0 && typeof Reflect != "undefined";
    H = W ? Symbol.for("immer-nothing") : ((G = {})["immer-nothing"] = true, G);
    L = W ? Symbol.for("immer-draftable") : "__$immer_draftable";
    Q = W ? Symbol.for("immer-state") : "__$immer_state";
    V = typeof Symbol != "undefined" && Symbol.iterator || "@@iterator";
    Y = { 0: "Illegal state", 1: "Immer drafts cannot have computed properties", 2: "This object has been frozen and should not be mutated", 3: function(n2) {
      return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + n2;
    }, 4: "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.", 5: "Immer forbids circular references", 6: "The first or second argument to `produce` must be a function", 7: "The third argument to `produce` must be a function or undefined", 8: "First argument to `createDraft` must be a plain object, an array, or an immerable object", 9: "First argument to `finishDraft` must be a draft returned by `createDraft`", 10: "The given draft is already finalized", 11: "Object.defineProperty() cannot be used on an Immer draft", 12: "Object.setPrototypeOf() cannot be used on an Immer draft", 13: "Immer only supports deleting array indices", 14: "Immer only supports setting array indices and the 'length' property", 15: function(n2) {
      return "Cannot apply patch, path doesn't resolve: " + n2;
    }, 16: 'Sets cannot have "replace" patches.', 17: function(n2) {
      return "Unsupported patch operation: " + n2;
    }, 18: function(n2) {
      return "The plugin for '" + n2 + "' has not been loaded into Immer. To enable the plugin, import and call `enable" + n2 + "()` when initializing your application.";
    }, 20: "Cannot use proxies if Proxy, Proxy.revocable or Reflect are not available", 21: function(n2) {
      return "produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '" + n2 + "'";
    }, 22: function(n2) {
      return "'current' expects a draft, got: " + n2;
    }, 23: function(n2) {
      return "'original' expects a draft, got: " + n2;
    }, 24: "Patching reserved attributes like __proto__, prototype and constructor is not allowed" };
    Z = "" + Object.prototype.constructor;
    nn = typeof Reflect != "undefined" && Reflect.ownKeys ? Reflect.ownKeys : Object.getOwnPropertySymbols !== void 0 ? function(n2) {
      return Object.getOwnPropertyNames(n2).concat(Object.getOwnPropertySymbols(n2));
    } : Object.getOwnPropertyNames;
    rn = Object.getOwnPropertyDescriptors || function(n2) {
      var r2 = {};
      return nn(n2).forEach(function(t2) {
        r2[t2] = Object.getOwnPropertyDescriptor(n2, t2);
      }), r2;
    };
    tn = {};
    en = { get: function(n2, r2) {
      if (r2 === Q)
        return n2;
      var e2 = p(n2);
      if (!u(e2, r2))
        return function(n3, r3, t2) {
          var e3, i3 = I(r3, t2);
          return i3 ? "value" in i3 ? i3.value : (e3 = i3.get) === null || e3 === void 0 ? void 0 : e3.call(n3.k) : void 0;
        }(n2, e2, r2);
      var i2 = e2[r2];
      return n2.I || !t(i2) ? i2 : i2 === z(n2.t, r2) ? (E(n2), n2.o[r2] = R(n2.A.h, i2, n2)) : i2;
    }, has: function(n2, r2) {
      return r2 in p(n2);
    }, ownKeys: function(n2) {
      return Reflect.ownKeys(p(n2));
    }, set: function(n2, r2, t2) {
      var e2 = I(p(n2), r2);
      if (e2 == null ? void 0 : e2.set)
        return e2.set.call(n2.k, t2), true;
      if (!n2.P) {
        var i2 = z(p(n2), r2), o2 = i2 == null ? void 0 : i2[Q];
        if (o2 && o2.t === t2)
          return n2.o[r2] = t2, n2.D[r2] = false, true;
        if (c(t2, i2) && (t2 !== void 0 || u(n2.t, r2)))
          return true;
        E(n2), k(n2);
      }
      return n2.o[r2] === t2 && typeof t2 != "number" && (t2 !== void 0 || r2 in n2.o) || (n2.o[r2] = t2, n2.D[r2] = true, true);
    }, deleteProperty: function(n2, r2) {
      return z(n2.t, r2) !== void 0 || r2 in n2.t ? (n2.D[r2] = false, E(n2), k(n2)) : delete n2.D[r2], n2.o && delete n2.o[r2], true;
    }, getOwnPropertyDescriptor: function(n2, r2) {
      var t2 = p(n2), e2 = Reflect.getOwnPropertyDescriptor(t2, r2);
      return e2 ? { writable: true, configurable: n2.i !== 1 || r2 !== "length", enumerable: e2.enumerable, value: t2[r2] } : e2;
    }, defineProperty: function() {
      n(11);
    }, getPrototypeOf: function(n2) {
      return Object.getPrototypeOf(n2.t);
    }, setPrototypeOf: function() {
      n(12);
    } };
    on = {};
    i(en, function(n2, r2) {
      on[n2] = function() {
        return arguments[0] = arguments[0][0], r2.apply(this, arguments);
      };
    }), on.deleteProperty = function(r2, t2) {
      return isNaN(parseInt(t2)) && n(13), on.set.call(this, r2, t2, void 0);
    }, on.set = function(r2, t2, e2) {
      return t2 !== "length" && isNaN(parseInt(t2)) && n(14), en.set.call(this, r2[0], t2, e2, r2[0]);
    };
    un = function() {
      function e2(r2) {
        var e3 = this;
        this.g = B, this.F = true, this.produce = function(r3, i3, o2) {
          if (typeof r3 == "function" && typeof i3 != "function") {
            var u2 = i3;
            i3 = r3;
            var a2 = e3;
            return function(n2) {
              var r4 = this;
              n2 === void 0 && (n2 = u2);
              for (var t2 = arguments.length, e4 = Array(t2 > 1 ? t2 - 1 : 0), o3 = 1; o3 < t2; o3++)
                e4[o3 - 1] = arguments[o3];
              return a2.produce(n2, function(n3) {
                var t3;
                return (t3 = i3).call.apply(t3, [r4, n3].concat(e4));
              });
            };
          }
          var f2;
          if (typeof i3 != "function" && n(6), o2 !== void 0 && typeof o2 != "function" && n(7), t(r3)) {
            var c3 = w(e3), s2 = R(e3, r3, void 0), v3 = true;
            try {
              f2 = i3(s2), v3 = false;
            } finally {
              v3 ? O(c3) : g(c3);
            }
            return typeof Promise != "undefined" && f2 instanceof Promise ? f2.then(function(n2) {
              return j(c3, o2), P(n2, c3);
            }, function(n2) {
              throw O(c3), n2;
            }) : (j(c3, o2), P(f2, c3));
          }
          if (!r3 || typeof r3 != "object") {
            if ((f2 = i3(r3)) === void 0 && (f2 = r3), f2 === H && (f2 = void 0), e3.F && d(f2, true), o2) {
              var p2 = [], l2 = [];
              b("Patches").M(r3, f2, p2, l2), o2(p2, l2);
            }
            return f2;
          }
          n(21, r3);
        }, this.produceWithPatches = function(n2, r3) {
          if (typeof n2 == "function")
            return function(r4) {
              for (var t3 = arguments.length, i4 = Array(t3 > 1 ? t3 - 1 : 0), o3 = 1; o3 < t3; o3++)
                i4[o3 - 1] = arguments[o3];
              return e3.produceWithPatches(r4, function(r5) {
                return n2.apply(void 0, [r5].concat(i4));
              });
            };
          var t2, i3, o2 = e3.produce(n2, r3, function(n3, r4) {
            t2 = n3, i3 = r4;
          });
          return typeof Promise != "undefined" && o2 instanceof Promise ? o2.then(function(n3) {
            return [n3, t2, i3];
          }) : [o2, t2, i3];
        }, typeof (r2 == null ? void 0 : r2.useProxies) == "boolean" && this.setUseProxies(r2.useProxies), typeof (r2 == null ? void 0 : r2.autoFreeze) == "boolean" && this.setAutoFreeze(r2.autoFreeze);
      }
      var i2 = e2.prototype;
      return i2.createDraft = function(e3) {
        t(e3) || n(8), r(e3) && (e3 = D(e3));
        var i3 = w(this), o2 = R(this, e3, void 0);
        return o2[Q].C = true, g(i3), o2;
      }, i2.finishDraft = function(r2, t2) {
        var e3 = r2 && r2[Q];
        e3 && e3.C || n(9), e3.I && n(10);
        var i3 = e3.A;
        return j(i3, t2), P(void 0, i3);
      }, i2.setAutoFreeze = function(n2) {
        this.F = n2;
      }, i2.setUseProxies = function(r2) {
        r2 && !B && n(20), this.g = r2;
      }, i2.applyPatches = function(n2, t2) {
        var e3;
        for (e3 = t2.length - 1; e3 >= 0; e3--) {
          var i3 = t2[e3];
          if (i3.path.length === 0 && i3.op === "replace") {
            n2 = i3.value;
            break;
          }
        }
        e3 > -1 && (t2 = t2.slice(e3 + 1));
        var o2 = b("Patches").$;
        return r(n2) ? o2(n2, t2) : this.produce(n2, function(n3) {
          return o2(n3, t2);
        });
      }, e2;
    }();
    an = new un();
    fn = an.produce;
    cn = an.produceWithPatches.bind(an);
    sn = an.setAutoFreeze.bind(an);
    vn = an.setUseProxies.bind(an);
    pn = an.applyPatches.bind(an);
    ln = an.createDraft.bind(an);
    dn = an.finishDraft.bind(an);
  }
});

// src/State/State.ts
var State;
var init_State = __esm({
  "src/State/State.ts"() {
    init_generic();
    init_immer_esm();
    J();
    State = (initialState) => {
      let internalState = initialState;
      return (handler) => {
        if (handler) {
          internalState = isFunction(handler) ? handler(internalState) : handler;
        }
        return internalState;
      };
    };
  }
});

// src/draw.ts
var activeContext, renderContext, sendToContext, e, c2, hf, hs, drawHandlers, arcTo, beginPath, bezierCurveTo, clearRect, clip, closePath, createConicGradient, createImageData, createLinearGradient, createPattern, createRadialGradient, drawFocusIfNeeded, drawImage, ellipse, fill, fillRect, fillText, getContextAttributes, getImageData, getLineDash, getTransform, isContextLost, isPointInPath, isPointInStroke, lineTo, measureText, moveTo, putImageData, quadraticCurveTo, rect, reset, resetTransform, restore, rotate, roundRect, save, scale, setLineDash, setTransform, stroke, strokeRect, strokeText, transform, translate, direction, fillStyle, filter, font, fontKerning, fontStretch, fontVariantCaps, globalAlpha, globalCompositeOperation, imageSmoothingEnabled, imageSmoothingQuality, letterSpacing, lineCap, lineDashOffset, lineJoin, lineWidth, miterLimit, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, strokeStyle, textAlign, textBaseline, textRendering, wordSpacing;
var init_draw = __esm({
  "src/draw.ts"() {
    init_generic();
    activeContext = null;
    renderContext = (method) => {
      activeContext = [];
      method();
      let response = activeContext;
      activeContext = null;
      return response;
    };
    sendToContext = (item) => {
      if (!activeContext)
        throw new Error("Outside of context");
      activeContext.push(item);
    };
    e = createEnum("arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath", "createConicGradient", "createImageData", "createLinearGradient", "createPattern", "createRadialGradient", "drawFocusIfNeeded", "drawImage", "ellipse", "fill", "fillRect", "fillText", "getContextAttributes", "getImageData", "getLineDash", "getTransform", "isContextLost", "isPointInPath", "isPointInStroke", "lineTo", "measureText", "moveTo", "putImageData", "quadraticCurveTo", "rect", "reset", "resetTransform", "restore", "rotate", "roundRect", "save", "scale", "setLineDash", "setTransform", "stroke", "strokeRect", "strokeText", "transform", "translate", "direction", "fillStyle", "filter", "font", "fontKerning", "fontStretch", "fontVariantCaps", "globalAlpha", "globalCompositeOperation", "imageSmoothingEnabled", "imageSmoothingQuality", "letterSpacing", "lineCap", "lineDashOffset", "lineJoin", "lineWidth", "miterLimit", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "strokeStyle", "textAlign", "textBaseline", "textRendering", "wordSpacing");
    c2 = (e2) => {
      return (...args) => sendToContext([e2, args]);
    };
    hf = () => (ctx, enumber, args) => {
      ctx[e[enumber]](...args);
    };
    hs = () => (ctx, enumber, [value]) => {
      ctx[e[enumber]] = value;
    };
    drawHandlers = /* @__PURE__ */ new Map();
    arcTo = c2(e.arcTo);
    beginPath = c2(e.beginPath);
    bezierCurveTo = c2(e.bezierCurveTo);
    clearRect = c2(e.clearRect);
    clip = c2(e.clip);
    closePath = c2(e.closePath);
    createConicGradient = c2(e.createConicGradient);
    createImageData = c2(e.createImageData);
    createLinearGradient = c2(e.createLinearGradient);
    createPattern = c2(e.createPattern);
    createRadialGradient = c2(e.createRadialGradient);
    drawFocusIfNeeded = c2(e.drawFocusIfNeeded);
    drawImage = c2(e.drawImage);
    ellipse = c2(e.ellipse);
    fill = c2(e.fill);
    fillRect = c2(e.fillRect);
    fillText = c2(e.fillText);
    getContextAttributes = c2(e.getContextAttributes);
    getImageData = c2(e.getImageData);
    getLineDash = c2(e.getLineDash);
    getTransform = c2(e.getTransform);
    isContextLost = c2(e.isContextLost);
    isPointInPath = c2(e.isPointInPath);
    isPointInStroke = c2(e.isPointInStroke);
    lineTo = c2(e.lineTo);
    measureText = c2(e.measureText);
    moveTo = c2(e.moveTo);
    putImageData = c2(e.putImageData);
    quadraticCurveTo = c2(e.quadraticCurveTo);
    rect = c2(e.rect);
    reset = c2(e.reset);
    resetTransform = c2(e.resetTransform);
    restore = c2(e.restore);
    rotate = c2(e.rotate);
    roundRect = c2(e.roundRect);
    save = c2(e.save);
    scale = c2(e.scale);
    setLineDash = c2(e.setLineDash);
    setTransform = c2(e.setTransform);
    stroke = c2(e.stroke);
    strokeRect = c2(e.strokeRect);
    strokeText = c2(e.strokeText);
    transform = c2(e.transform);
    translate = c2(e.translate);
    drawHandlers.set(e.arcTo, hf());
    drawHandlers.set(e.beginPath, hf());
    drawHandlers.set(e.bezierCurveTo, hf());
    drawHandlers.set(e.clearRect, hf());
    drawHandlers.set(e.clip, hf());
    drawHandlers.set(e.closePath, hf());
    drawHandlers.set(e.createConicGradient, hf());
    drawHandlers.set(e.createImageData, hf());
    drawHandlers.set(e.createLinearGradient, hf());
    drawHandlers.set(e.createPattern, hf());
    drawHandlers.set(e.createRadialGradient, hf());
    drawHandlers.set(e.drawFocusIfNeeded, hf());
    drawHandlers.set(e.drawImage, hf());
    drawHandlers.set(e.ellipse, hf());
    drawHandlers.set(e.fill, hf());
    drawHandlers.set(e.fillRect, hf());
    drawHandlers.set(e.fillText, hf());
    drawHandlers.set(e.getContextAttributes, hf());
    drawHandlers.set(e.getImageData, hf());
    drawHandlers.set(e.getLineDash, hf());
    drawHandlers.set(e.getTransform, hf());
    drawHandlers.set(e.isContextLost, hf());
    drawHandlers.set(e.isPointInPath, hf());
    drawHandlers.set(e.isPointInStroke, hf());
    drawHandlers.set(e.lineTo, hf());
    drawHandlers.set(e.measureText, hf());
    drawHandlers.set(e.moveTo, hf());
    drawHandlers.set(e.putImageData, hf());
    drawHandlers.set(e.quadraticCurveTo, hf());
    drawHandlers.set(e.rect, hf());
    drawHandlers.set(e.reset, hf());
    drawHandlers.set(e.resetTransform, hf());
    drawHandlers.set(e.restore, hf());
    drawHandlers.set(e.rotate, hf());
    drawHandlers.set(e.roundRect, hf());
    drawHandlers.set(e.save, hf());
    drawHandlers.set(e.scale, hf());
    drawHandlers.set(e.setLineDash, hf());
    drawHandlers.set(e.setTransform, hf());
    drawHandlers.set(e.stroke, hf());
    drawHandlers.set(e.strokeRect, hf());
    drawHandlers.set(e.strokeText, hf());
    drawHandlers.set(e.transform, hf());
    drawHandlers.set(e.translate, hf());
    direction = c2(e.direction);
    fillStyle = c2(e.fillStyle);
    filter = c2(e.filter);
    font = c2(e.font);
    fontKerning = c2(e.fontKerning);
    fontStretch = c2(e.fontStretch);
    fontVariantCaps = c2(e.fontVariantCaps);
    globalAlpha = c2(e.globalAlpha);
    globalCompositeOperation = c2(e.globalCompositeOperation);
    imageSmoothingEnabled = c2(e.imageSmoothingEnabled);
    imageSmoothingQuality = c2(e.imageSmoothingQuality);
    letterSpacing = c2(e.letterSpacing);
    lineCap = c2(e.lineCap);
    lineDashOffset = c2(e.lineDashOffset);
    lineJoin = c2(e.lineJoin);
    lineWidth = c2(e.lineWidth);
    miterLimit = c2(e.miterLimit);
    shadowBlur = c2(e.shadowBlur);
    shadowColor = c2(e.shadowColor);
    shadowOffsetX = c2(e.shadowOffsetX);
    shadowOffsetY = c2(e.shadowOffsetY);
    strokeStyle = c2(e.strokeStyle);
    textAlign = c2(e.textAlign);
    textBaseline = c2(e.textBaseline);
    textRendering = c2(e.textRendering);
    wordSpacing = c2(e.wordSpacing);
    drawHandlers.set(e.direction, hs());
    drawHandlers.set(e.fillStyle, hs());
    drawHandlers.set(e.filter, hs());
    drawHandlers.set(e.font, hs());
    drawHandlers.set(e.fontKerning, hs());
    drawHandlers.set(e.fontStretch, hs());
    drawHandlers.set(e.fontVariantCaps, hs());
    drawHandlers.set(e.globalAlpha, hs());
    drawHandlers.set(e.globalCompositeOperation, hs());
    drawHandlers.set(e.imageSmoothingEnabled, hs());
    drawHandlers.set(e.imageSmoothingQuality, hs());
    drawHandlers.set(e.letterSpacing, hs());
    drawHandlers.set(e.lineCap, hs());
    drawHandlers.set(e.lineDashOffset, hs());
    drawHandlers.set(e.lineJoin, hs());
    drawHandlers.set(e.lineWidth, hs());
    drawHandlers.set(e.miterLimit, hs());
    drawHandlers.set(e.shadowBlur, hs());
    drawHandlers.set(e.shadowColor, hs());
    drawHandlers.set(e.shadowOffsetX, hs());
    drawHandlers.set(e.shadowOffsetY, hs());
    drawHandlers.set(e.strokeStyle, hs());
    drawHandlers.set(e.textAlign, hs());
    drawHandlers.set(e.textBaseline, hs());
    drawHandlers.set(e.textRendering, hs());
    drawHandlers.set(e.wordSpacing, hs());
  }
});

// src/animate.ts
var animate_exports = {};
__export(animate_exports, {
  $$initiate: () => $$initiate,
  activate: () => activate,
  final: () => final,
  fps: () => fps,
  inputs: () => inputs,
  physics: () => physics,
  preframe: () => preframe,
  prerender: () => prerender,
  removal: () => removal,
  render: () => render,
  sentTracker: () => sentTracker,
  timeDiffMS: () => timeDiffMS,
  timeDiffS: () => timeDiffS,
  timeMS: () => timeMS,
  timeS: () => timeS,
  update: () => update
});
function activate(canvasWorker2) {
  async function animate(t2) {
    attachTimes(t2);
    const stateMethods = [...$$initiate, ...inputs, ...preframe, ...physics, ...update];
    const endMethods = [...removal, ...final];
    perf.setEnabled(false).start();
    stateMethods.forEach((callback) => callback());
    perf.log("update()");
    const renderContext2 = renderContext(() => {
      const prerenderSorted = [...prerender].map((item) => isFunction(item) ? [0, item] : item).sort((a2, b2) => a2[0] - b2[0]);
      const renderSorted = [...render].map((item) => isFunction(item) ? [0, item] : item).sort((a2, b2) => a2[0] - b2[0]);
      [...prerenderSorted, ...renderSorted].forEach(([, callback]) => callback());
    });
    perf.log("render()");
    endMethods.forEach((callback) => callback());
    await canvasWorker2.newRenderer2(renderContext2);
    perf.log("canvas render complete");
    perf.end();
    frame(animate);
  }
  frame(animate);
}
var $$initiate, inputs, preframe, physics, update, removal, prerender, render, final, timeMS, timeDiffMS, timeS, timeDiffS, fps, calculateFpsFromDiff, attachTimes, frame, Perf, sentTracker, perf;
var init_animate = __esm({
  "src/animate.ts"() {
    init_CBTracker();
    init_State();
    init_draw();
    init_generic();
    $$initiate = CBTracker("$$initiate2");
    inputs = CBTracker("inputs2");
    preframe = CBTracker("preframe2");
    physics = CBTracker("physics2");
    update = CBTracker("update2");
    removal = CBTracker("removal2");
    prerender = CBTracker("prerender");
    render = CBTracker("render");
    final = CBTracker("final");
    timeMS = State(0);
    timeDiffMS = State(0);
    timeS = State(0);
    timeDiffS = State(0);
    fps = State(0);
    calculateFpsFromDiff = (timeDiff) => Math.round(1 / timeDiff);
    attachTimes = (animateTimeMs) => {
      const lastTimeMs = timeMS();
      const diffTimeMs = animateTimeMs - lastTimeMs;
      timeMS(animateTimeMs);
      timeDiffMS(diffTimeMs);
      timeS(animateTimeMs / 1e3);
      timeDiffS(diffTimeMs / 1e3);
      fps(calculateFpsFromDiff(timeDiffS()));
    };
    frame = (method) => {
      return requestAnimationFrame(method);
    };
    Perf = class {
      constructor(label, enabled = true) {
        this.running = false;
        this.label = label;
        this.enabled = enabled;
      }
      reset() {
        this.running = false;
        this.times = [];
      }
      setEnabled(enabled) {
        this.enabled = enabled;
        this.reset();
        return this;
      }
      logTime(smallLabel) {
        const currentTime = performance.now();
        const firstTime = this.times.length === 0 ? 0 : this.times[0].time;
        this.times.push({ label: smallLabel, time: currentTime });
        console.log(this.label, ":", smallLabel, currentTime - firstTime);
        return this;
      }
      start() {
        if (!this.enabled)
          return this;
        if (this.running) {
          this.reset();
          console.warn(`Perf with name "${this.label}" already found.`);
        }
        this.running = true;
        return this.logTime("start");
      }
      log(detail) {
        if (!this.enabled)
          return this;
        return this.logTime(detail);
      }
      calculateMetrics() {
        const firstTime = this.times[0];
        const lastTime = this.times[this.times.length - 1];
        const totalTime = lastTime.time - firstTime.time;
        console.log(`Results:`);
        console.log(`totalTime: ${totalTime}`);
        for (let i2 = 1; i2 < this.times.length - 1; i2++) {
          let last2 = this.times[i2 - 1];
          const current = this.times[i2];
          const delta = current.time - last2.time;
          const perfentage = (delta / totalTime * 100).toFixed(2);
          console.log(`${current.label} Delta(${delta}) Percentage (${perfentage})`);
        }
      }
      end() {
        if (!this.enabled)
          return this;
        this.logTime("end");
        this.calculateMetrics();
        this.reset();
        return this;
      }
    };
    sentTracker = /* @__PURE__ */ new WeakSet();
    perf = new Perf("Animate");
  }
});

// src/Vector.ts
function* it() {
  yield this.x;
  yield this.y;
}
var v2, zero, add, up, down, left, right;
var init_Vector = __esm({
  "src/Vector.ts"() {
    init_es();
    v2 = (x2, y2) => {
      return {
        x: x2,
        y: y2,
        [0]: x2,
        [1]: x2,
        [Symbol.iterator]: it
      };
    };
    zero = () => v2(0, 0);
    add = curry_default(([x1, y1], [x2, y2]) => {
      return v2(x1 + x2, y1 + y2);
    });
    up = (value) => v2(0, value * -1);
    down = (value) => v2(0, value);
    left = (value) => v2(value * -1, 0);
    right = (value) => v2(value, 0);
  }
});

// src/canvas.ts
var canvas_exports = {};
__export(canvas_exports, {
  Canvas: () => Canvas,
  call: () => call,
  createCanvas: () => createCanvas,
  fillRect: () => fillRect2,
  fillStyle: () => fillStyle2,
  restore: () => restore2,
  save: () => save2,
  set: () => set
});
var Canvas, call, set, save2, fillRect2, restore2, fillStyle2, createCanvas;
var init_canvas = __esm({
  "src/canvas.ts"() {
    init_animate();
    init_draw();
    init_es();
    init_Vector();
    init_State();
    Canvas = State({ width: 1920, height: 1080 });
    call = curry_default((key, args, actions) => [...actions, ["c", key, args]]);
    set = curry_default((key, value, actions) => [...actions, ["s", key, value]]);
    save2 = call("save");
    fillRect2 = call("fillRect");
    restore2 = call("restore");
    fillStyle2 = set("fillStyle");
    createCanvas = () => {
      const canvas = document.createElement("canvas");
      const { width, height } = Canvas();
      Object.assign(canvas, { width, height });
      Object.assign(canvas.style, { border: "1px solid #ccc", maxWidth: "100%" });
      document.body.appendChild(canvas);
      return canvas;
    };
    prerender.add(() => {
      const { width, height } = Canvas();
      clearRect(...zero(), width, height);
    });
  }
});

// node_modules/.pnpm/baconjs@3.0.17/node_modules/baconjs/dist/Bacon.mjs
function nop() {
}
function isObservable(x2) {
  return x2 && x2._isObservable;
}
function all(xs, f2) {
  for (var i2 = 0, x2; i2 < xs.length; i2++) {
    x2 = xs[i2];
    if (!f2(x2)) {
      return false;
    }
  }
  return true;
}
function always(x2) {
  return () => x2;
}
function any(xs, f2) {
  for (var i2 = 0, x2; i2 < xs.length; i2++) {
    x2 = xs[i2];
    if (f2(x2)) {
      return true;
    }
  }
  return false;
}
function bind3(fn2, me) {
  return function() {
    return fn2.apply(me, arguments);
  };
}
function contains3(xs, x2) {
  return indexOf(xs, x2) !== -1;
}
function each(xs, f2) {
  for (var key in xs) {
    if (Object.prototype.hasOwnProperty.call(xs, key)) {
      var value = xs[key];
      f2(key, value);
    }
  }
}
function empty(xs) {
  return xs.length === 0;
}
function filter2(f2, xs) {
  var filtered = [];
  for (var i2 = 0, x2; i2 < xs.length; i2++) {
    x2 = xs[i2];
    if (f2(x2)) {
      filtered.push(x2);
    }
  }
  return filtered;
}
function flatMap(f2, xs) {
  return fold(xs, [], function(ys, x2) {
    return ys.concat(f2(x2));
  });
}
function flip(f2) {
  return (a2, b2) => f2(b2, a2);
}
function fold(xs, seed, f2) {
  for (var i2 = 0, x2; i2 < xs.length; i2++) {
    x2 = xs[i2];
    seed = f2(seed, x2);
  }
  return seed;
}
function head(xs) {
  return xs[0];
}
function id(x2) {
  return x2;
}
function indexOfDefault(xs, x2) {
  return xs.indexOf(x2);
}
function indexOfFallback(xs, x2) {
  for (var i2 = 0, y2; i2 < xs.length; i2++) {
    y2 = xs[i2];
    if (x2 === y2) {
      return i2;
    }
  }
  return -1;
}
function indexWhere(xs, f2) {
  for (var i2 = 0, y2; i2 < xs.length; i2++) {
    y2 = xs[i2];
    if (f2(y2)) {
      return i2;
    }
  }
  return -1;
}
function isFunction2(f2) {
  return typeof f2 === "function";
}
function last(xs) {
  return xs[xs.length - 1];
}
function map3(f2, xs) {
  var result = [];
  for (var i2 = 0, x2; i2 < xs.length; i2++) {
    x2 = xs[i2];
    result.push(f2(x2));
  }
  return result;
}
function negate(f2) {
  return function(x2) {
    return !f2(x2);
  };
}
function remove(x2, xs) {
  var i2 = indexOf(xs, x2);
  if (i2 >= 0) {
    return xs.splice(i2, 1);
  }
}
function tail(xs) {
  return xs.slice(1, xs.length);
}
function toArray(xs) {
  return isArray2(xs) ? xs : [xs];
}
function toFunction(f2) {
  if (typeof f2 == "function") {
    return f2;
  }
  return (x2) => f2;
}
function toString2(obj) {
  var hasProp = {}.hasOwnProperty;
  try {
    recursionDepth++;
    if (obj == null) {
      return "undefined";
    } else if (isFunction2(obj)) {
      return "function";
    } else if (isArray2(obj)) {
      if (recursionDepth > 5) {
        return "[..]";
      }
      return "[" + map3(toString2, obj).toString() + "]";
    } else if ((obj != null ? obj.toString : void 0) != null && obj.toString !== Object.prototype.toString) {
      return obj.toString();
    } else if (typeof obj === "object") {
      if (recursionDepth > 5) {
        return "{..}";
      }
      var results = [];
      for (var key in obj) {
        if (!hasProp.call(obj, key))
          continue;
        let value = function() {
          try {
            return obj[key];
          } catch (error) {
            return error;
          }
        }();
        results.push(toString2(key) + ":" + toString2(value));
      }
      return "{" + results + "}";
    } else {
      return obj;
    }
  } finally {
    recursionDepth--;
  }
}
function without(x2, xs) {
  return filter2(function(y2) {
    return y2 !== x2;
  }, xs);
}
function assert(message, condition) {
  if (!condition) {
    throw new Error(message);
  }
}
function assertEventStream(event) {
  if (!(event != null ? event._isEventStream : void 0)) {
    throw new Error("not an EventStream : " + event);
  }
}
function assertObservable(observable) {
  if (!(observable != null ? observable._isObservable : void 0)) {
    throw new Error("not an Observable : " + observable);
  }
}
function assertFunction(f2) {
  return assert("not a function : " + f2, _2.isFunction(f2));
}
function assertNoArguments(args) {
  return assert("no arguments supported", args.length === 0);
}
function toString$1() {
  return _2.toString({ rootEvent, processingAfters, waiterObs, waiters, aftersStack, aftersStackHeight, flushed });
}
function ensureStackHeight(h2) {
  if (h2 <= aftersStackHeight)
    return;
  if (!aftersStack[h2 - 1]) {
    aftersStack[h2 - 1] = [[], 0];
  }
  aftersStackHeight = h2;
}
function isInTransaction() {
  return rootEvent !== void 0;
}
function soonButNotYet(obs, f2) {
  if (rootEvent) {
    whenDoneWith(obs, f2);
  } else {
    GlobalScheduler.scheduler.setTimeout(f2, 0);
  }
}
function afterTransaction(obs, f2) {
  if (rootEvent || processingAfters) {
    ensureStackHeight(1);
    var stackIndexForThisObs = 0;
    while (stackIndexForThisObs < aftersStackHeight - 1) {
      if (containsObs(obs, aftersStack[stackIndexForThisObs][0])) {
        break;
      }
      stackIndexForThisObs++;
    }
    var listFromStack = aftersStack[stackIndexForThisObs][0];
    listFromStack.push([obs, f2]);
    if (!rootEvent) {
      processAfters();
    }
  } else {
    return f2();
  }
}
function containsObs(obs, aftersList) {
  for (var i2 = 0; i2 < aftersList.length; i2++) {
    if (aftersList[i2][0].id == obs.id)
      return true;
  }
  return false;
}
function processAfters() {
  let stackSizeAtStart = aftersStackHeight;
  if (!stackSizeAtStart)
    return;
  let isRoot = !processingAfters;
  processingAfters = true;
  try {
    while (aftersStackHeight >= stackSizeAtStart) {
      var topOfStack = aftersStack[aftersStackHeight - 1];
      if (!topOfStack)
        throw new Error("Unexpected stack top: " + topOfStack);
      var [topAfters, index] = topOfStack;
      if (index < topAfters.length) {
        var [, after] = topAfters[index];
        topOfStack[1]++;
        ensureStackHeight(aftersStackHeight + 1);
        var callSuccess = false;
        try {
          after();
          callSuccess = true;
          while (aftersStackHeight > stackSizeAtStart && aftersStack[aftersStackHeight - 1][0].length == 0) {
            aftersStackHeight--;
          }
        } finally {
          if (!callSuccess) {
            aftersStack = [];
            aftersStackHeight = 0;
          }
        }
      } else {
        topOfStack[0] = [];
        topOfStack[1] = 0;
        break;
      }
    }
  } finally {
    if (isRoot)
      processingAfters = false;
  }
}
function whenDoneWith(obs, f2) {
  if (rootEvent) {
    var obsWaiters = waiters[obs.id];
    if (obsWaiters === void 0) {
      obsWaiters = waiters[obs.id] = [f2];
      return waiterObs.push(obs);
    } else {
      return obsWaiters.push(f2);
    }
  } else {
    return f2();
  }
}
function flush() {
  while (waiterObs.length > 0) {
    flushWaiters(0, true);
  }
  flushed = {};
}
function flushWaiters(index, deps) {
  var obs = waiterObs[index];
  var obsId = obs.id;
  var obsWaiters = waiters[obsId];
  waiterObs.splice(index, 1);
  delete waiters[obsId];
  if (deps && waiterObs.length > 0) {
    flushDepsOf(obs);
  }
  for (var i2 = 0, f2; i2 < obsWaiters.length; i2++) {
    f2 = obsWaiters[i2];
    f2();
  }
}
function flushDepsOf(obs) {
  if (flushed[obs.id])
    return;
  var deps = obs.internalDeps();
  for (var i2 = 0, dep; i2 < deps.length; i2++) {
    dep = deps[i2];
    flushDepsOf(dep);
    if (waiters[dep.id]) {
      var index = _2.indexOf(waiterObs, dep);
      flushWaiters(index, false);
    }
  }
  flushed[obs.id] = true;
}
function inTransaction(event, context, f2, args) {
  if (rootEvent) {
    return f2.apply(context, args);
  } else {
    rootEvent = event;
    try {
      var result = f2.apply(context, args);
      flush();
    } finally {
      rootEvent = void 0;
      processAfters();
    }
    return result;
  }
}
function currentEventId() {
  return rootEvent ? rootEvent.id : void 0;
}
function wrappedSubscribe(obs, subscribe, sink) {
  assertFunction(sink);
  let unsubd = false;
  let shouldUnsub = false;
  let doUnsub = () => {
    shouldUnsub = true;
  };
  let unsub = () => {
    unsubd = true;
    doUnsub();
  };
  doUnsub = subscribe(function(event) {
    afterTransaction(obs, function() {
      if (!unsubd) {
        var reply = sink(event);
        if (reply === noMore) {
          unsub();
        }
      }
    });
    return more;
  });
  if (shouldUnsub) {
    doUnsub();
  }
  return unsub;
}
function hasWaiters() {
  return waiterObs.length > 0;
}
function describe(context, method, ...args) {
  const ref = context || method;
  if (ref && ref._isDesc) {
    return context || method;
  } else {
    return new Desc(context, method, args);
  }
}
function findDeps(x2) {
  if (isArray2(x2)) {
    return _2.flatMap(findDeps, x2);
  } else if (isObservable(x2)) {
    return [x2];
  } else if (typeof x2 !== "undefined" && x2 !== null ? x2._isSource : void 0) {
    return [x2.obs];
  } else {
    return [];
  }
}
function withStateMachine(initState, f2, src) {
  return src.transform(withStateMachineT(initState, f2), new Desc(src, "withStateMachine", [initState, f2]));
}
function withStateMachineT(initState, f2) {
  let state = initState;
  return (event, sink) => {
    var fromF = f2(state, event);
    var [newState, outputs] = fromF;
    state = newState;
    var reply = more;
    for (var i2 = 0; i2 < outputs.length; i2++) {
      let output = outputs[i2];
      reply = sink(output);
      if (reply === noMore) {
        return reply;
      }
    }
    return reply;
  };
}
function none() {
  return None;
}
function toOption(v3) {
  if (v3 && (v3._isSome || v3._isNone)) {
    return v3;
  } else {
    return new Some(v3);
  }
}
function isNone(object) {
  return typeof object !== "undefined" && object !== null ? object._isNone : false;
}
function initialEvent(value) {
  return new Initial(value);
}
function nextEvent(value) {
  return new Next(value);
}
function endEvent() {
  return new End();
}
function toEvent(x2) {
  if (x2 && x2._isEvent) {
    return x2;
  } else {
    return nextEvent(x2);
  }
}
function isEvent(e2) {
  return e2 && e2._isEvent;
}
function isInitial(e2) {
  return e2 && e2._isInitial;
}
function isError(e2) {
  return e2.isError;
}
function hasValue(e2) {
  return e2.hasValue;
}
function isEnd(e2) {
  return e2.isEnd;
}
function equals(a2, b2) {
  return a2 === b2;
}
function skipDuplicates(src, isEqual = equals) {
  let desc = new Desc(src, "skipDuplicates", []);
  return withStateMachine(none(), function(prev, event) {
    if (!hasValue(event)) {
      return [prev, [event]];
    } else if (event.isInitial || isNone(prev) || !isEqual(prev.get(), event.value)) {
      return [new Some(event.value), [event]];
    } else {
      return [prev, []];
    }
  }, src).withDesc(desc);
}
function take(count2, src, desc) {
  return src.transform(takeT(count2), desc || new Desc(src, "take", [count2]));
}
function takeT(count2) {
  return (e2, sink) => {
    if (!e2.hasValue) {
      return sink(e2);
    } else {
      count2--;
      if (count2 > 0) {
        return sink(e2);
      } else {
        if (count2 === 0) {
          sink(e2);
        }
        sink(endEvent());
        return noMore;
      }
    }
  };
}
function log(args, src) {
  src.subscribe(function(event) {
    if (typeof console !== "undefined" && typeof console.log === "function") {
      console.log(...args.concat([event.log()]));
    }
    return more;
  });
}
function doLogT(args) {
  return (event, sink) => {
    if (typeof console !== "undefined" && console !== null && typeof console.log === "function") {
      console.log(...args.concat([event.log()]));
    }
    return sink(event);
  };
}
function doErrorT(f2) {
  return (event, sink) => {
    if (isError(event)) {
      f2(event.error);
    }
    return sink(event);
  };
}
function doActionT(f2) {
  return (event, sink) => {
    if (hasValue(event)) {
      f2(event.value);
    }
    return sink(event);
  };
}
function doEndT(f2) {
  return (event, sink) => {
    if (isEnd(event)) {
      f2();
    }
    return sink(event);
  };
}
function scan(src, seed, f2) {
  let resultProperty;
  let acc = seed;
  let initHandled = false;
  const subscribe = (sink) => {
    var initSent = false;
    var unsub = nop;
    var reply = more;
    const sendInit = function() {
      if (!initSent) {
        initSent = initHandled = true;
        reply = sink(new Initial(acc));
        if (reply === noMore) {
          unsub();
          unsub = nop;
        }
      }
      return reply;
    };
    unsub = src.subscribeInternal(function(event) {
      if (hasValue(event)) {
        if (initHandled && event.isInitial) {
          return more;
        } else {
          if (!event.isInitial) {
            sendInit();
          }
          initSent = initHandled = true;
          var prev = acc;
          var next = f2(prev, event.value);
          acc = next;
          return sink(event.apply(next));
        }
      } else {
        if (event.isEnd) {
          reply = sendInit();
        }
        if (reply !== noMore) {
          return sink(event);
        }
        return reply;
      }
    });
    UpdateBarrier.whenDoneWith(resultProperty, sendInit);
    return unsub;
  };
  return resultProperty = new Property(new Desc(src, "scan", [seed, f2]), subscribe);
}
function mapEndT(f2) {
  let theF = _2.toFunction(f2);
  return function(event, sink) {
    if (isEnd(event)) {
      sink(nextEvent(theF(event)));
      sink(endEvent());
      return noMore;
    } else {
      return sink(event);
    }
  };
}
function mapErrorT(f2) {
  let theF = _2.toFunction(f2);
  return function(event, sink) {
    if (isError(event)) {
      return sink(nextEvent(theF(event.error)));
    } else {
      return sink(event);
    }
  };
}
function skipErrors(src) {
  return src.transform(function(event, sink) {
    if (isError(event)) {
      return more;
    } else {
      return sink(event);
    }
  }, new Desc(src, "skipErrors", []));
}
function last$1(src) {
  var lastEvent;
  return src.transform(function(event, sink) {
    if (isEnd(event)) {
      if (lastEvent) {
        sink(lastEvent);
      }
      sink(endEvent());
      return noMore;
    } else if (hasValue(event)) {
      lastEvent = event;
      return more;
    } else {
      return sink(event);
    }
  }).withDesc(new Desc(src, "last", []));
}
function streamSubscribeToPropertySubscribe(initValue, streamSubscribe) {
  return function(sink) {
    var initSent = false;
    var subbed = false;
    var unsub = nop;
    var reply = more;
    var sendInit = function() {
      if (!initSent) {
        return initValue.forEach(function(value) {
          initSent = true;
          reply = sink(new Initial(value));
          if (reply === noMore) {
            unsub();
            unsub = nop;
            return nop;
          }
        });
      }
    };
    unsub = streamSubscribe(function(event) {
      if (event instanceof Value) {
        if (event.isInitial && !subbed) {
          initValue = new Some(event.value);
          return more;
        } else {
          if (!event.isInitial) {
            sendInit();
          }
          initSent = true;
          initValue = new Some(event.value);
          return sink(event);
        }
      } else {
        if (event.isEnd) {
          reply = sendInit();
        }
        if (reply !== noMore) {
          return sink(event);
        }
        return reply;
      }
    });
    subbed = true;
    sendInit();
    return unsub;
  };
}
function propertyFromStreamSubscribe(desc, subscribe) {
  assertFunction(subscribe);
  return new Property(desc, streamSubscribeToPropertySubscribe(none(), subscribe));
}
function once(value) {
  const s2 = new EventStream(new Desc("Bacon", "once", [value]), function(sink) {
    UpdateBarrier.soonButNotYet(s2, function() {
      sink(toEvent(value));
      sink(endEvent());
    });
    return nop;
  });
  return s2;
}
function flatMap_(spawner, src, params = {}) {
  const root = src;
  const rootDep = [root];
  const childDeps = [];
  const isProperty2 = src._isProperty;
  const ctor = isProperty2 ? propertyFromStreamSubscribe : newEventStreamAllowSync;
  let initialSpawned = false;
  const desc = params.desc || new Desc(src, "flatMap_", [spawner]);
  const result = ctor(desc, function(sink) {
    const composite = new CompositeUnsubscribe();
    const queue = [];
    function spawn(event) {
      if (isProperty2 && event.isInitial) {
        if (initialSpawned) {
          return more;
        }
        initialSpawned = true;
      }
      const child = makeObservable(spawner(event));
      childDeps.push(child);
      return composite.add(function(unsubAll, unsubMe) {
        return child.subscribeInternal(function(event2) {
          if (event2.isEnd) {
            _2.remove(child, childDeps);
            checkQueue();
            checkEnd(unsubMe);
            return noMore;
          } else {
            event2 = event2.toNext();
            const reply = sink(event2);
            if (reply === noMore) {
              unsubAll();
            }
            return reply;
          }
        });
      });
    }
    function checkQueue() {
      const event = queue.shift();
      if (event) {
        spawn(event);
      }
    }
    function checkEnd(unsub) {
      unsub();
      if (composite.empty()) {
        return sink(endEvent());
      }
      return more;
    }
    composite.add(function(__, unsubRoot) {
      return root.subscribeInternal(function(event) {
        if (event.isEnd) {
          return checkEnd(unsubRoot);
        } else if (event.isError && !params.mapError) {
          return sink(event);
        } else if (params.firstOnly && composite.count() > 1) {
          return more;
        } else {
          if (composite.unsubscribed) {
            return noMore;
          }
          if (params.limit && composite.count() > params.limit) {
            queue.push(event);
          } else {
            spawn(event);
          }
          return more;
        }
      });
    });
    return composite.unsubscribe;
  });
  result.internalDeps = function() {
    if (childDeps.length) {
      return rootDep.concat(childDeps);
    } else {
      return rootDep;
    }
  };
  return result;
}
function handleEventValueWith(f2) {
  if (typeof f2 == "function") {
    return (event) => {
      if (hasValue(event)) {
        return f2(event.value);
      }
      return event;
    };
  }
  return (event) => f2;
}
function makeObservable(x2) {
  if (isObservable(x2)) {
    return x2;
  } else {
    return once(x2);
  }
}
function flatMapEvent(src, f2) {
  return flatMap_(f2, src, {
    mapError: true,
    desc: new Desc(src, "flatMapEvent", [f2])
  });
}
function endAsValue(src) {
  return src.transform((event, sink) => {
    if (isEnd(event)) {
      sink(nextEvent({}));
      sink(endEvent());
      return noMore;
    }
    return more;
  });
}
function endOnError(src, predicate = (x2) => true) {
  return src.transform((event, sink) => {
    if (isError(event) && predicate(event.error)) {
      sink(event);
      return sink(endEvent());
    } else {
      return sink(event);
    }
  }, new Desc(src, "endOnError", []));
}
function isTrigger(s2) {
  if (s2 == null)
    return false;
  if (s2._isSource) {
    return s2.sync;
  } else {
    return s2._isEventStream;
  }
}
function fromObservable(s2) {
  if (s2 != null && s2._isSource) {
    return s2;
  } else if (s2 != null && s2._isProperty) {
    return new DefaultSource(s2, false);
  } else {
    return new ConsumingSource(s2, true);
  }
}
function never() {
  return new EventStream(describe("Bacon", "never"), (sink) => {
    sink(endEvent());
    return nop;
  });
}
function when(...patterns) {
  return when_(newEventStream, patterns);
}
function whenP(...patterns) {
  return when_(propertyFromStreamSubscribe, patterns);
}
function when_(ctor, patterns) {
  if (patterns.length === 0) {
    return never();
  }
  var [sources, ixPats] = processRawPatterns(extractRawPatterns(patterns));
  if (!sources.length) {
    return never();
  }
  var needsBarrier = any(sources, (s2) => s2.flatten) && containsDuplicateDeps(map3((s2) => s2.obs, sources));
  var desc = new Desc("Bacon", "when", Array.prototype.slice.call(patterns));
  var resultStream = ctor(desc, function(sink) {
    var triggers = [];
    var ends = false;
    function match(p2) {
      for (var i2 = 0; i2 < p2.ixs.length; i2++) {
        let ix = p2.ixs[i2];
        if (!sources[ix.index].hasAtLeast(ix.count)) {
          return false;
        }
      }
      return true;
    }
    function cannotMatch(p2) {
      for (var i2 = 0; i2 < p2.ixs.length; i2++) {
        let ix = p2.ixs[i2];
        if (!sources[ix.index].mayHave(ix.count)) {
          return true;
        }
      }
      return false;
    }
    function nonFlattened(trigger) {
      return !trigger.source.flatten;
    }
    function part(source) {
      return function(unsubAll) {
        function flushLater() {
          return UpdateBarrier.whenDoneWith(resultStream, flush2);
        }
        function flushWhileTriggers() {
          var trigger;
          if ((trigger = triggers.pop()) !== void 0) {
            var reply = more;
            for (var i2 = 0, p2; i2 < ixPats.length; i2++) {
              p2 = ixPats[i2];
              if (match(p2)) {
                const values = [];
                for (var j2 = 0; j2 < p2.ixs.length; j2++) {
                  let event = sources[p2.ixs[j2].index].consume();
                  if (!event)
                    throw new Error("Event was undefined");
                  values.push(event.value);
                }
                let applied = p2.f.apply(null, values);
                reply = sink(trigger.e.apply(applied));
                if (triggers.length) {
                  triggers = filter2(nonFlattened, triggers);
                }
                if (reply === noMore) {
                  return reply;
                } else {
                  return flushWhileTriggers();
                }
              }
            }
          }
          return more;
        }
        function flush2() {
          var reply = flushWhileTriggers();
          if (ends) {
            if (all(sources, cannotSync) || all(ixPats, cannotMatch)) {
              reply = noMore;
              sink(endEvent());
            }
          }
          if (reply === noMore) {
            unsubAll();
          }
        }
        return source.subscribe(function(e2) {
          var reply = more;
          if (e2.isEnd) {
            ends = true;
            source.markEnded();
            flushLater();
          } else if (e2.isError) {
            reply = sink(e2);
          } else {
            let valueEvent = e2;
            source.push(valueEvent);
            if (source.sync) {
              triggers.push({ source, e: valueEvent });
              if (needsBarrier || UpdateBarrier.hasWaiters()) {
                flushLater();
              } else {
                flush2();
              }
            }
          }
          if (reply === noMore) {
            unsubAll();
          }
          return reply;
        });
      };
    }
    return new CompositeUnsubscribe(map3(part, sources)).unsubscribe;
  });
  return resultStream;
}
function processRawPatterns(rawPatterns) {
  var sources = [];
  var pats = [];
  for (let i2 = 0; i2 < rawPatterns.length; i2++) {
    let [patSources, f2] = rawPatterns[i2];
    var pat = { f: f2, ixs: [] };
    var triggerFound = false;
    for (var j2 = 0, s2; j2 < patSources.length; j2++) {
      s2 = patSources[j2];
      var index = indexOf(sources, s2);
      if (!triggerFound) {
        triggerFound = isTrigger(s2);
      }
      if (index < 0) {
        sources.push(s2);
        index = sources.length - 1;
      }
      for (var k2 = 0; k2 < pat.ixs.length; k2++) {
        let ix = pat.ixs[k2];
        if (ix.index === index) {
          ix.count++;
        }
      }
      pat.ixs.push({ index, count: 1 });
    }
    if (patSources.length > 0 && !triggerFound) {
      throw new Error("At least one EventStream required, none found in " + patSources);
    }
    if (patSources.length > 0) {
      pats.push(pat);
    }
  }
  return [map3(fromObservable, sources), pats];
}
function extractLegacyPatterns(sourceArgs) {
  var i2 = 0;
  var len = sourceArgs.length;
  var rawPatterns = [];
  while (i2 < len) {
    let patSources = toArray(sourceArgs[i2++]);
    let f2 = toFunction(sourceArgs[i2++]);
    rawPatterns.push([patSources, f2]);
  }
  var usage = "when: expecting arguments in the form (Observable+,function)+";
  assert(usage, len % 2 === 0);
  return rawPatterns;
}
function isTypedOrRawPattern(pattern) {
  return pattern instanceof Array && !isObservable(pattern[pattern.length - 1]);
}
function isRawPattern(pattern) {
  return pattern[0] instanceof Array;
}
function extractRawPatterns(patterns) {
  let rawPatterns = [];
  for (let i2 = 0; i2 < patterns.length; i2++) {
    let pattern = patterns[i2];
    if (!isTypedOrRawPattern(pattern)) {
      return extractLegacyPatterns(patterns);
    }
    if (isRawPattern(pattern)) {
      rawPatterns.push([pattern[0], toFunction(pattern[1])]);
    } else {
      let sources = pattern.slice(0, pattern.length - 1);
      let f2 = toFunction(pattern[pattern.length - 1]);
      rawPatterns.push([sources, f2]);
    }
  }
  return rawPatterns;
}
function containsDuplicateDeps(observables, state = []) {
  function checkObservable(obs) {
    if (contains3(state, obs)) {
      return true;
    } else {
      var deps = obs.internalDeps();
      if (deps.length) {
        state.push(obs);
        return any(deps, checkObservable);
      } else {
        state.push(obs);
        return false;
      }
    }
  }
  return any(observables, checkObservable);
}
function cannotSync(source) {
  return !source.sync || source.ended;
}
function withLatestFromE(sampler, samplee, f2) {
  var result = when([new DefaultSource(samplee.toProperty(), false), new DefaultSource(sampler, true), flip(f2)]);
  return result.withDesc(new Desc(sampler, "withLatestFrom", [samplee, f2]));
}
function withLatestFromP(sampler, samplee, f2) {
  var result = whenP([new DefaultSource(samplee.toProperty(), false), new DefaultSource(sampler, true), flip(f2)]);
  return result.withDesc(new Desc(sampler, "withLatestFrom", [samplee, f2]));
}
function withLatestFrom(sampler, samplee, f2) {
  if (sampler instanceof Property) {
    return withLatestFromP(sampler, samplee, f2);
  } else if (sampler instanceof EventStream) {
    return withLatestFromE(sampler, samplee, f2);
  } else {
    throw new Error("Unknown observable: " + sampler);
  }
}
function map$1(src, f2) {
  if (f2 instanceof Property) {
    return withLatestFrom(src, f2, (a2, b2) => b2);
  }
  return src.transform(mapT(f2), new Desc(src, "map", [f2]));
}
function mapT(f2) {
  let theF = _2.toFunction(f2);
  return (e2, sink) => {
    return sink(e2.fmap(theF));
  };
}
function constant(x2) {
  return new Property(new Desc("Bacon", "constant", [x2]), function(sink) {
    sink(initialEvent(x2));
    sink(endEvent());
    return nop;
  });
}
function argumentsToObservables(args) {
  args = Array.prototype.slice.call(args);
  return _2.flatMap(singleToObservables, args);
}
function singleToObservables(x2) {
  if (isObservable(x2)) {
    return [x2];
  } else if (isArray2(x2)) {
    return argumentsToObservables(x2);
  } else {
    return [constant(x2)];
  }
}
function argumentsToObservablesAndFunction(args) {
  if (_2.isFunction(args[0])) {
    return [argumentsToObservables(Array.prototype.slice.call(args, 1)), args[0]];
  } else {
    return [argumentsToObservables(Array.prototype.slice.call(args, 0, args.length - 1)), _2.last(args)];
  }
}
function groupSimultaneous_(streams, options) {
  let sources = _2.map((stream) => new BufferingSource(stream), streams);
  let ctor = (desc, subscribe) => new EventStream(desc, subscribe, void 0, options);
  return when_(ctor, [sources, function(...xs) {
    return xs;
  }]).withDesc(new Desc("Bacon", "groupSimultaneous", streams));
}
function awaiting(src, other) {
  return groupSimultaneous_([src, other], allowSync).map((values) => values[1].length === 0).toProperty(false).skipDuplicates().withDesc(new Desc(src, "awaiting", [other]));
}
function combineAsArray(...streams) {
  streams = argumentsToObservables(streams);
  if (streams.length) {
    var sources = [];
    for (var i2 = 0; i2 < streams.length; i2++) {
      let stream = isObservable(streams[i2]) ? streams[i2] : constant(streams[i2]);
      sources.push(wrap2(stream));
    }
    return whenP([sources, (...xs) => xs]).withDesc(new Desc("Bacon", "combineAsArray", streams));
  } else {
    return constant([]);
  }
}
function combineTwo(left2, right2, f2) {
  return whenP([[wrap2(left2), wrap2(right2)], f2]).withDesc(new Desc(left2, "combine", [right2, f2]));
}
function wrap2(obs) {
  return new DefaultSource(obs, true);
}
function skip(src, count2) {
  return src.transform((event, sink) => {
    if (!event.hasValue) {
      return sink(event);
    } else if (count2 > 0) {
      count2--;
      return more;
    } else {
      return sink(event);
    }
  }, new Desc(src, "skip", [count2]));
}
function flatMapConcat(src, f2) {
  return flatMap_(handleEventValueWith(f2), src, {
    desc: new Desc(src, "flatMapConcat", [f2]),
    limit: 1
  });
}
function fromBinder(binder, eventTransformer = _2.id) {
  var desc = new Desc("Bacon", "fromBinder", [binder, eventTransformer]);
  return new EventStream(desc, function(sink) {
    var unbound = false;
    var shouldUnbind = false;
    var unbind = function() {
      if (!unbound) {
        if (typeof unbinder !== "undefined" && unbinder !== null) {
          unbinder();
          return unbound = true;
        } else {
          return shouldUnbind = true;
        }
      }
    };
    var unbinder = binder(function(...args) {
      var value_ = eventTransformer(...args);
      let valueArray = isArray2(value_) && isEvent(_2.last(value_)) ? value_ : [value_];
      var reply = more;
      for (var i2 = 0; i2 < valueArray.length; i2++) {
        let event = toEvent(valueArray[i2]);
        reply = sink(event);
        if (reply === noMore || event.isEnd) {
          unbind();
          return reply;
        }
      }
      return reply;
    });
    if (shouldUnbind) {
      unbind();
    }
    return unbind;
  });
}
function fromPoll(delay2, poll) {
  var desc = new Desc("Bacon", "fromPoll", [delay2, poll]);
  return fromBinder(function(handler) {
    var id2 = GlobalScheduler.scheduler.setInterval(handler, delay2);
    return function() {
      return GlobalScheduler.scheduler.clearInterval(id2);
    };
  }, poll).withDesc(desc);
}
function interval(delay2, value) {
  return fromPoll(delay2, function() {
    return nextEvent(value);
  }).withDesc(new Desc("Bacon", "interval", [delay2, value]));
}
function makeCombinator(combinator) {
  if (typeof combinator == "function") {
    return combinator;
  } else {
    return _2.id;
  }
}
function sampledBy(samplee, sampler, f2) {
  if (samplee instanceof EventStream) {
    return sampledByE(samplee, sampler, f2);
  } else {
    return sampledByP(samplee, sampler, f2);
  }
}
function sampledByP(samplee, sampler, f2) {
  let combinator = makeCombinator(f2);
  var result = withLatestFrom(sampler, samplee, flip(combinator));
  return result.withDesc(new Desc(samplee, "sampledBy", [sampler]));
}
function sampledByE(samplee, sampler, f2) {
  return sampledByP(samplee.toProperty(), sampler, f2).withDesc(new Desc(samplee, "sampledBy", [sampler]));
}
function sampleP(samplee, samplingInterval) {
  return sampledByP(samplee, interval(samplingInterval, {}), (a2, b2) => a2).withDesc(new Desc(samplee, "sample", [samplingInterval]));
}
function transformP(src, transformer, desc) {
  return new Property(new Desc(src, "transform", [transformer]), (sink) => src.subscribeInternal((e2) => transformer(e2, sink))).withDesc(desc);
}
function transformE(src, transformer, desc) {
  return new EventStream(new Desc(src, "transform", [transformer]), (sink) => src.subscribeInternal((e2) => transformer(e2, sink)), void 0, allowSync).withDesc(desc);
}
function composeT(t1, t2) {
  let finalSink;
  const sink2 = (event) => {
    return t2(event, finalSink);
  };
  return (event, sink) => {
    finalSink = sink;
    return t1(event, sink2);
  };
}
function toPredicate(f2) {
  if (typeof f2 == "boolean") {
    return _2.always(f2);
  } else if (typeof f2 != "function") {
    throw new Error("Not a function: " + f2);
  } else {
    return f2;
  }
}
function withPredicate(src, f2, predicateTransformer, desc) {
  if (f2 instanceof Property) {
    return withLatestFrom(src, f2, (p2, v3) => [p2, v3]).transform(composeT(predicateTransformer((tuple) => tuple[1]), mapT((tuple) => tuple[0])), desc);
  }
  return src.transform(predicateTransformer(toPredicate(f2)), desc);
}
function filter$1(src, f2) {
  return withPredicate(src, f2, filterT, new Desc(src, "filter", [f2]));
}
function filterT(f2) {
  return (e2, sink) => {
    if (e2.filter(f2)) {
      return sink(e2);
    } else {
      return more;
    }
  };
}
function not3(src) {
  return src.map((x2) => !x2).withDesc(new Desc(src, "not", []));
}
function and(left2, right2) {
  return left2.combine(toProperty(right2), (x2, y2) => !!(x2 && y2)).withDesc(new Desc(left2, "and", [right2]));
}
function or(left2, right2) {
  return left2.combine(toProperty(right2), (x2, y2) => x2 || y2).withDesc(new Desc(left2, "or", [right2]));
}
function toProperty(x2) {
  if (isProperty(x2)) {
    return x2;
  }
  return constant(x2);
}
function flatMapFirst(src, f2) {
  return flatMap_(handleEventValueWith(f2), src, {
    firstOnly: true,
    desc: new Desc(src, "flatMapFirst", [f2])
  });
}
function concatE(left2, right2, options) {
  return new EventStream(new Desc(left2, "concat", [right2]), function(sink) {
    var unsubRight = nop;
    var unsubLeft = left2.dispatcher.subscribe(function(e2) {
      if (e2.isEnd) {
        unsubRight = right2.toEventStream().dispatcher.subscribe(sink);
        return more;
      } else {
        return sink(e2);
      }
    });
    return function() {
      return unsubLeft(), unsubRight();
    };
  }, void 0, options);
}
function transformPropertyChanges(property, f2, desc) {
  let initValue;
  let comboSink;
  const changes = new EventStream(describe(property, "changes", []), (sink) => property.dispatcher.subscribe(function(event) {
    if (!initValue && isInitial(event)) {
      initValue = event;
      UpdateBarrier.whenDoneWith(combo, function() {
        if (!comboSink) {
          throw new Error("Init sequence fail");
        }
        comboSink(initValue);
      });
    }
    if (!event.isInitial) {
      return sink(event);
    }
    return more;
  }), void 0, allowSync);
  const transformedChanges = f2(changes);
  const combo = propertyFromStreamSubscribe(desc, (sink) => {
    comboSink = sink;
    return transformedChanges.dispatcher.subscribe(function(event) {
      sink(event);
    });
  });
  return combo;
}
function fold$1(src, seed, f2) {
  return src.scan(seed, f2).last().withDesc(new Desc(src, "fold", [seed, f2]));
}
function startWithE(src, seed) {
  return once(seed).concat(src).withDesc(new Desc(src, "startWith", [seed]));
}
function startWithP(src, seed) {
  return src.scan(seed, (prev, next) => next).withDesc(new Desc(src, "startWith", [seed]));
}
function takeUntil(src, stopper) {
  let endMapped = src.mapEnd(endMarker);
  let withEndMarker = groupSimultaneous_([endMapped, stopper.skipErrors()], allowSync);
  if (src instanceof Property)
    withEndMarker = withEndMarker.toProperty();
  return withEndMarker.transform(function(event, sink) {
    if (hasValue(event)) {
      var [data, stopper2] = event.value;
      if (stopper2.length) {
        return sink(endEvent());
      } else {
        var reply = more;
        for (var i2 = 0; i2 < data.length; i2++) {
          let value = data[i2];
          if (value === endMarker) {
            return sink(endEvent());
          } else {
            reply = sink(nextEvent(value));
          }
        }
        return reply;
      }
    } else {
      return sink(event);
    }
  }, new Desc(src, "takeUntil", [stopper]));
}
function flatMap$1(src, f2) {
  return flatMap_(handleEventValueWith(f2), src, { desc: new Desc(src, "flatMap", [f2]) });
}
function flatMapError(src, f2) {
  return flatMap_((x2) => {
    if (x2 instanceof Error$1) {
      let error = x2.error;
      return f2(error);
    } else {
      return x2;
    }
  }, src, {
    mapError: true,
    desc: new Desc(src, "flatMapError", [f2])
  });
}
function registerObs(obs) {
  if (spies.length) {
    if (!running) {
      try {
        running = true;
        spies.forEach(function(spy) {
          spy(obs);
        });
      } finally {
        running = false;
      }
    }
  }
}
function flatMapLatest(src, f_) {
  let f2 = _2.toFunction(f_);
  var stream = isProperty(src) ? src.toEventStream(allowSync) : src;
  let flatMapped = flatMap$1(stream, (value) => makeObservable(f2(value)).takeUntil(stream));
  if (isProperty(src))
    flatMapped = flatMapped.toProperty();
  return flatMapped.withDesc(new Desc(src, "flatMapLatest", [f2]));
}
function flatMapWithConcurrencyLimit(src, limit, f2) {
  return flatMap_(handleEventValueWith(f2), src, {
    desc: new Desc(src, "flatMapWithConcurrencyLimit", [limit, f2]),
    limit
  });
}
function bufferWithTime(src, delay2) {
  return bufferWithTimeOrCount(src, delay2, Number.MAX_VALUE).withDesc(new Desc(src, "bufferWithTime", [delay2]));
}
function bufferWithCount(src, count2) {
  return bufferWithTimeOrCount(src, void 0, count2).withDesc(new Desc(src, "bufferWithCount", [count2]));
}
function bufferWithTimeOrCount(src, delay2, count2) {
  const delayFunc = toDelayFunction(delay2);
  function flushOrSchedule(buffer2) {
    if (buffer2.values.length === count2) {
      return buffer2.flush();
    } else if (delayFunc !== void 0) {
      return buffer2.schedule(delayFunc);
    }
  }
  var desc = new Desc(src, "bufferWithTimeOrCount", [delay2, count2]);
  return buffer(src, flushOrSchedule, flushOrSchedule).withDesc(desc);
}
function toDelayFunction(delay2) {
  if (delay2 === void 0) {
    return void 0;
  }
  if (typeof delay2 === "number") {
    var delayMs = delay2;
    return function(f2) {
      return GlobalScheduler.scheduler.setTimeout(f2, delayMs);
    };
  }
  return delay2;
}
function buffer(src, onInput = nop, onFlush = nop) {
  var reply = more;
  var buffer2 = new Buffer2(onFlush, onInput);
  return src.transform((event, sink) => {
    buffer2.push = sink;
    if (hasValue(event)) {
      buffer2.values.push(event.value);
      onInput(buffer2);
    } else if (isError(event)) {
      reply = sink(event);
    } else if (isEnd(event)) {
      buffer2.end = event;
      if (!buffer2.scheduled) {
        buffer2.flush();
      }
    }
    return reply;
  }).withDesc(new Desc(src, "buffer", []));
}
function asyncWrapSubscribe(obs, subscribe) {
  var subscribing = false;
  return function wrappedSubscribe2(sink) {
    const inTransaction2 = UpdateBarrier.isInTransaction();
    subscribing = true;
    var asyncDeliveries;
    function deliverAsync() {
      var toDeliverNow = asyncDeliveries || [];
      asyncDeliveries = void 0;
      for (var i2 = 0; i2 < toDeliverNow.length; i2++) {
        var event = toDeliverNow[i2];
        sink(event);
      }
    }
    try {
      return subscribe(function wrappedSink(event) {
        if (subscribing || asyncDeliveries) {
          if (!asyncDeliveries) {
            asyncDeliveries = [event];
            if (inTransaction2) {
              UpdateBarrier.soonButNotYet(obs, deliverAsync);
            } else {
              GlobalScheduler.scheduler.setTimeout(deliverAsync, 0);
            }
          } else {
            asyncDeliveries.push(event);
          }
          return more;
        } else {
          return sink(event);
        }
      });
    } finally {
      subscribing = false;
    }
  };
}
function mergeAll(...streams) {
  let flattenedStreams = argumentsToObservables(streams);
  if (flattenedStreams.length) {
    return new EventStream(new Desc("Bacon", "mergeAll", flattenedStreams), function(sink) {
      var ends = 0;
      var smartSink = function(obs) {
        return function(unsubBoth) {
          return obs.subscribeInternal(function(event) {
            if (event.isEnd) {
              ends++;
              if (ends === flattenedStreams.length) {
                return sink(endEvent());
              } else {
                return more;
              }
            } else {
              event = event.toNext();
              var reply = sink(event);
              if (reply === noMore) {
                unsubBoth();
              }
              return reply;
            }
          });
        };
      };
      var sinks = map3(smartSink, flattenedStreams);
      return new CompositeUnsubscribe(sinks).unsubscribe;
    });
  } else {
    return never();
  }
}
function later(delay2, value) {
  return fromBinder(function(sink) {
    var sender = function() {
      return sink([toEvent(value), endEvent()]);
    };
    var id2 = GlobalScheduler.scheduler.setTimeout(sender, delay2);
    return function() {
      return GlobalScheduler.scheduler.clearTimeout(id2);
    };
  }).withDesc(new Desc("Bacon", "later", [delay2, value]));
}
function delay(src, delay2) {
  return src.transformChanges(new Desc(src, "delay", [delay2]), function(changes) {
    return changes.flatMap(function(value) {
      return later(delay2, value);
    });
  });
}
function debounce(src, delay2) {
  return src.transformChanges(new Desc(src, "debounce", [delay2]), function(changes) {
    return changes.flatMapLatest(function(value) {
      return later(delay2, value);
    });
  });
}
function debounceImmediate(src, delay2) {
  return src.transformChanges(new Desc(src, "debounceImmediate", [delay2]), function(changes) {
    return changes.flatMapFirst(function(value) {
      return once(value).concat(later(delay2, value).errors());
    });
  });
}
function throttle(src, delay2) {
  return src.transformChanges(new Desc(src, "throttle", [delay2]), (changes) => changes.bufferWithTime(delay2).map((values) => values[values.length - 1]));
}
function bufferingThrottle(src, minimumInterval) {
  var desc = new Desc(src, "bufferingThrottle", [minimumInterval]);
  return src.transformChanges(desc, (changes) => changes.flatMapConcat((x2) => {
    return once(x2).concat(later(minimumInterval, x2).errors());
  }));
}
function takeWhile(src, f2) {
  return withPredicate(src, f2, takeWhileT, new Desc(src, "takeWhile", [f2]));
}
function takeWhileT(f2) {
  return (event, sink) => {
    if (event.filter(f2)) {
      return sink(event);
    } else {
      sink(endEvent());
      return noMore;
    }
  };
}
function skipUntil(src, starter) {
  var started = starter.transform(composeT(takeT(1), mapT(true))).toProperty().startWith(false);
  return src.filter(started).withDesc(new Desc(src, "skipUntil", [starter]));
}
function skipWhile(src, f2) {
  return withPredicate(src, f2, skipWhileT, new Desc(src, "skipWhile", [f2]));
}
function skipWhileT(f2) {
  var started = false;
  return function(event, sink) {
    if (started || !hasValue(event) || !f2(event.value)) {
      if (event.hasValue) {
        started = true;
      }
      return sink(event);
    } else {
      return more;
    }
  };
}
function groupBy(src, keyF, limitF = _2.id) {
  var streams = {};
  return src.transform(composeT(filterT((x2) => !streams[keyF(x2)]), mapT(function(firstValue) {
    var key = keyF(firstValue);
    var similarValues = src.changes().filter((x2) => keyF(x2) === key);
    var data = once(firstValue).concat(similarValues);
    var limited = limitF(data, firstValue).toEventStream().transform((event, sink) => {
      let reply = sink(event);
      if (event.isEnd) {
        delete streams[key];
      }
      return reply;
    });
    streams[key] = limited;
    return limited;
  })));
}
function slidingWindow(src, maxValues, minValues = 0) {
  return src.scan([], function(window2, value) {
    return window2.concat([value]).slice(-maxValues);
  }).filter(function(values) {
    return values.length >= minValues;
  }).withDesc(new Desc(src, "slidingWindow", [maxValues, minValues]));
}
function diff(src, start, f2) {
  return transformP(scan(src, [start, nullMarker], (prevTuple, next) => [next, f2(prevTuple[0], next)]), composeT(filterT((tuple) => tuple[1] !== nullMarker), mapT((tuple) => tuple[1])), new Desc(src, "diff", [start, f2]));
}
function flatScan(src, seed, f2) {
  let current = seed;
  return src.flatMapConcat((next) => makeObservable(f2(current, next)).doAction((updated) => current = updated)).toProperty().startWith(seed).withDesc(new Desc(src, "flatScan", [seed, f2]));
}
function holdWhen(src, valve) {
  var onHold = false;
  var bufferedValues = [];
  var srcIsEnded = false;
  return new EventStream(new Desc(src, "holdWhen", [valve]), function(sink) {
    var composite = new CompositeUnsubscribe();
    var subscribed = false;
    var endIfBothEnded = function(unsub) {
      if (unsub) {
        unsub();
      }
      if (composite.empty() && subscribed) {
        return sink(endEvent());
      }
      return more;
    };
    composite.add(function(unsubAll, unsubMe) {
      return valve.subscribeInternal(function(event) {
        if (hasValue(event)) {
          onHold = event.value;
          var result = more;
          if (!onHold) {
            var toSend = bufferedValues;
            bufferedValues = [];
            for (var i2 = 0; i2 < toSend.length; i2++) {
              result = sink(nextEvent(toSend[i2]));
            }
            if (srcIsEnded) {
              sink(endEvent());
              unsubMe();
              result = noMore;
            }
          }
          return result;
        } else if (event.isEnd) {
          return endIfBothEnded(unsubMe);
        } else {
          return sink(event);
        }
      });
    });
    composite.add(function(unsubAll, unsubMe) {
      return src.subscribeInternal(function(event) {
        if (onHold && hasValue(event)) {
          bufferedValues.push(event.value);
          return more;
        } else if (event.isEnd && bufferedValues.length) {
          srcIsEnded = true;
          return endIfBothEnded(unsubMe);
        } else {
          return sink(event);
        }
      });
    });
    subscribed = true;
    endIfBothEnded();
    return composite.unsubscribe;
  });
}
function zipWith(f2, ...streams) {
  var [streams, f2] = argumentsToObservablesAndFunction(arguments);
  streams = _2.map((s2) => s2.toEventStream(), streams);
  return when([streams, f2]).withDesc(new Desc("Bacon", "zipWith", [f2].concat(streams)));
}
function zip(left2, right2, f2) {
  return zipWith(f2 || Array, left2, right2).withDesc(new Desc(left2, "zip", [right2]));
}
function combineTemplate(template) {
  function current(ctxStack) {
    return ctxStack[ctxStack.length - 1];
  }
  function setValue(ctxStack, key, value) {
    current(ctxStack)[key] = value;
    return value;
  }
  function applyStreamValue(key, index) {
    return function(ctxStack, values) {
      setValue(ctxStack, key, values[index]);
    };
  }
  function constantValue(key, value) {
    return function(ctxStack) {
      setValue(ctxStack, key, value);
    };
  }
  function mkContext(template2) {
    return isArray2(template2) ? [] : {};
  }
  function pushContext(key, value) {
    return function(ctxStack) {
      const newContext = mkContext(value);
      setValue(ctxStack, key, newContext);
      ctxStack.push(newContext);
    };
  }
  function containsObservables(value) {
    if (isObservable(value)) {
      return true;
    } else if (value && (value.constructor == Object || value.constructor == Array)) {
      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const child = value[key];
          if (containsObservables(child))
            return true;
        }
      }
    }
  }
  function compile(key, value) {
    if (isObservable(value)) {
      streams.push(value);
      funcs.push(applyStreamValue(key, streams.length - 1));
    } else if (containsObservables(value)) {
      const popContext = function(ctxStack) {
        ctxStack.pop();
      };
      funcs.push(pushContext(key, value));
      compileTemplate(value);
      funcs.push(popContext);
    } else {
      funcs.push(constantValue(key, value));
    }
  }
  function combinator(values) {
    const rootContext = mkContext(template);
    const ctxStack = [rootContext];
    for (var i2 = 0, f2; i2 < funcs.length; i2++) {
      f2 = funcs[i2];
      f2(ctxStack, values);
    }
    return rootContext;
  }
  function compileTemplate(template2) {
    _2.each(template2, compile);
  }
  const funcs = [];
  const streams = [];
  const resultProperty = containsObservables(template) ? (compileTemplate(template), combineAsArray(streams).map(combinator)) : constant(template);
  return resultProperty.withDesc(new Desc("Bacon", "combineTemplate", [template]));
}
function decode(src, cases) {
  return src.combine(combineTemplate(cases), (key, values) => values[key]).withDesc(new Desc(src, "decode", [cases]));
}
function firstToPromise(src, PromiseCtr) {
  const generator = (resolve, reject) => src.subscribe((event) => {
    if (hasValue(event)) {
      resolve(event.value);
    }
    if (isError(event)) {
      reject(event.error);
    }
    return noMore;
  });
  if (typeof PromiseCtr === "function") {
    return new PromiseCtr(generator);
  } else if (typeof Promise === "function") {
    return new Promise(generator);
  } else {
    throw new Error("There isn't default Promise, use shim or parameter");
  }
}
function toPromise(src, PromiseCtr) {
  return src.last().firstToPromise(PromiseCtr);
}
function isProperty(x2) {
  return !!x2._isProperty;
}
function newEventStream(description, subscribe) {
  return new EventStream(description, subscribe);
}
function newEventStreamAllowSync(description, subscribe) {
  return new EventStream(description, subscribe, void 0, allowSync);
}
function symbol(key) {
  if (typeof Symbol !== "undefined" && Symbol[key]) {
    return Symbol[key];
  } else if (typeof Symbol !== "undefined" && typeof Symbol.for === "function") {
    return Symbol[key] = Symbol.for(key);
  } else {
    return "@@" + key;
  }
}
function withMethodCallSupport(wrapped) {
  return function(f2, ...args) {
    if (typeof f2 === "object" && args.length) {
      var context = f2;
      var methodName = args[0];
      f2 = function(...args2) {
        return context[methodName](...args2);
      };
      args = args.slice(1);
    }
    return wrapped(f2, ...args);
  };
}
function partiallyApplied(f2, applied) {
  return function(...args) {
    return f2(...applied.concat(args));
  };
}
var isArray2, indexOf, _2, recursionDepth, more, noMore, defaultScheduler, GlobalScheduler, rootEvent, waiterObs, waiters, aftersStack, aftersStackHeight, flushed, processingAfters, UpdateBarrier, Desc, nullSink, nullVoidSink, Some, None, eventIdCounter, Event, Value, Next, Initial, NoValue, End, Error$1, CompositeUnsubscribe, Source, DefaultSource, ConsumingSource, BufferingSource, endMarker, spies, running, Dispatcher, PropertyDispatcher, Buffer2, nullMarker, idCounter, Observable, Property, allowSync, EventStream, ESObservable, makeFunction_, Bus;
var init_Bacon = __esm({
  "node_modules/.pnpm/baconjs@3.0.17/node_modules/baconjs/dist/Bacon.mjs"() {
    isArray2 = Array.isArray || function(xs) {
      return xs instanceof Array;
    };
    indexOf = Array.prototype.indexOf ? indexOfDefault : indexOfFallback;
    _2 = {
      indexOf,
      indexWhere,
      head,
      always,
      negate,
      empty,
      tail,
      filter: filter2,
      map: map3,
      each,
      toArray,
      contains: contains3,
      id,
      last,
      all,
      any,
      without,
      remove,
      fold,
      flatMap,
      bind: bind3,
      isFunction: isFunction2,
      toFunction,
      toString: toString2
    };
    recursionDepth = 0;
    more = void 0;
    noMore = "<no-more>";
    defaultScheduler = {
      setTimeout(f2, d2) {
        return setTimeout(f2, d2);
      },
      setInterval(f2, i2) {
        return setInterval(f2, i2);
      },
      clearInterval(id2) {
        return clearInterval(id2);
      },
      clearTimeout(id2) {
        return clearTimeout(id2);
      },
      now() {
        return new Date().getTime();
      }
    };
    GlobalScheduler = {
      scheduler: defaultScheduler
    };
    rootEvent = void 0;
    waiterObs = [];
    waiters = {};
    aftersStack = [];
    aftersStackHeight = 0;
    flushed = {};
    processingAfters = false;
    UpdateBarrier = { toString: toString$1, whenDoneWith, hasWaiters, inTransaction, currentEventId, wrappedSubscribe, afterTransaction, soonButNotYet, isInTransaction };
    Desc = class {
      constructor(context, method, args = []) {
        this._isDesc = true;
        this.context = context;
        this.method = method;
        this.args = args;
      }
      deps() {
        if (!this.cachedDeps) {
          this.cachedDeps = findDeps([this.context].concat(this.args));
        }
        return this.cachedDeps;
      }
      toString() {
        let args = _2.map(_2.toString, this.args);
        return _2.toString(this.context) + "." + _2.toString(this.method) + "(" + args + ")";
      }
    };
    nullSink = () => more;
    nullVoidSink = () => more;
    Some = class {
      constructor(value) {
        this._isSome = true;
        this.isDefined = true;
        this.value = value;
      }
      getOrElse(arg) {
        return this.value;
      }
      get() {
        return this.value;
      }
      filter(f2) {
        if (f2(this.value)) {
          return new Some(this.value);
        } else {
          return None;
        }
      }
      map(f2) {
        return new Some(f2(this.value));
      }
      forEach(f2) {
        f2(this.value);
      }
      toArray() {
        return [this.value];
      }
      inspect() {
        return "Some(" + this.value + ")";
      }
      toString() {
        return this.inspect();
      }
    };
    None = {
      _isNone: true,
      getOrElse(value) {
        return value;
      },
      get() {
        throw new Error("None.get()");
      },
      filter() {
        return None;
      },
      map() {
        return None;
      },
      forEach() {
      },
      isDefined: false,
      toArray() {
        return [];
      },
      inspect() {
        return "None";
      },
      toString() {
        return this.inspect();
      }
    };
    eventIdCounter = 0;
    Event = class {
      constructor() {
        this.id = ++eventIdCounter;
        this.isEvent = true;
        this._isEvent = true;
        this.isEnd = false;
        this.isInitial = false;
        this.isNext = false;
        this.isError = false;
        this.hasValue = false;
      }
      filter(f2) {
        return true;
      }
      inspect() {
        return this.toString();
      }
      log() {
        return this.toString();
      }
      toNext() {
        return this;
      }
    };
    Value = class extends Event {
      constructor(value) {
        super();
        this.hasValue = true;
        if (value instanceof Event) {
          throw new Error$1("Wrapping an event inside other event");
        }
        this.value = value;
      }
      fmap(f2) {
        return this.apply(f2(this.value));
      }
      filter(f2) {
        return f2(this.value);
      }
      toString() {
        return _2.toString(this.value);
      }
      log() {
        return this.value;
      }
    };
    Next = class extends Value {
      constructor(value) {
        super(value);
        this.isNext = true;
        this._isNext = true;
      }
      apply(value) {
        return new Next(value);
      }
    };
    Initial = class extends Value {
      constructor(value) {
        super(value);
        this.isInitial = true;
        this._isInitial = true;
      }
      apply(value) {
        return new Initial(value);
      }
      toNext() {
        return new Next(this.value);
      }
    };
    NoValue = class extends Event {
      constructor() {
        super(...arguments);
        this.hasValue = false;
      }
      fmap(f2) {
        return this;
      }
    };
    End = class extends NoValue {
      constructor() {
        super(...arguments);
        this.isEnd = true;
      }
      toString() {
        return "<end>";
      }
    };
    Error$1 = class extends NoValue {
      constructor(error) {
        super();
        this.isError = true;
        this.error = error;
      }
      toString() {
        return "<error> " + _2.toString(this.error);
      }
    };
    CompositeUnsubscribe = class {
      constructor(ss = []) {
        this.unsubscribed = false;
        this.unsubscribe = _2.bind(this.unsubscribe, this);
        this.unsubscribed = false;
        this.subscriptions = [];
        this.starting = [];
        for (var i2 = 0, s2; i2 < ss.length; i2++) {
          s2 = ss[i2];
          this.add(s2);
        }
      }
      add(subscription) {
        if (!this.unsubscribed) {
          var ended = false;
          var unsub = nop;
          this.starting.push(subscription);
          var unsubMe = () => {
            if (this.unsubscribed) {
              return;
            }
            ended = true;
            this.remove(unsub);
            _2.remove(subscription, this.starting);
          };
          unsub = subscription(this.unsubscribe, unsubMe);
          if (!(this.unsubscribed || ended)) {
            this.subscriptions.push(unsub);
          } else {
            unsub();
          }
          _2.remove(subscription, this.starting);
        }
      }
      remove(unsub) {
        if (this.unsubscribed) {
          return;
        }
        if (_2.remove(unsub, this.subscriptions) !== void 0) {
          return unsub();
        }
      }
      unsubscribe() {
        if (this.unsubscribed) {
          return;
        }
        this.unsubscribed = true;
        var iterable = this.subscriptions;
        for (var i2 = 0; i2 < iterable.length; i2++) {
          iterable[i2]();
        }
        this.subscriptions = [];
        this.starting = [];
      }
      count() {
        if (this.unsubscribed) {
          return 0;
        }
        return this.subscriptions.length + this.starting.length;
      }
      empty() {
        return this.count() === 0;
      }
    };
    Source = class {
      constructor(obs, sync) {
        this._isSource = true;
        this.flatten = true;
        this.ended = false;
        this.obs = obs;
        this.sync = sync;
      }
      subscribe(sink) {
        return this.obs.subscribeInternal(sink);
      }
      toString() {
        return this.obs.toString();
      }
      markEnded() {
        this.ended = true;
      }
      mayHave(count2) {
        return true;
      }
    };
    DefaultSource = class extends Source {
      consume() {
        return this.value;
      }
      push(x2) {
        this.value = x2;
      }
      hasAtLeast(c3) {
        return !!this.value;
      }
    };
    ConsumingSource = class extends Source {
      constructor(obs, sync) {
        super(obs, sync);
        this.flatten = false;
        this.queue = [];
      }
      consume() {
        return this.queue.shift();
      }
      push(x2) {
        this.queue.push(x2);
      }
      mayHave(count2) {
        return !this.ended || this.queue.length >= count2;
      }
      hasAtLeast(count2) {
        return this.queue.length >= count2;
      }
    };
    BufferingSource = class extends Source {
      constructor(obs) {
        super(obs, true);
        this.queue = [];
      }
      consume() {
        const values = this.queue;
        this.queue = [];
        return {
          value: values
        };
      }
      push(x2) {
        return this.queue.push(x2.value);
      }
      hasAtLeast(count2) {
        return true;
      }
    };
    endMarker = {};
    spies = [];
    running = false;
    Dispatcher = class {
      constructor(observable, _subscribe, _handleEvent) {
        this.pushing = false;
        this.ended = false;
        this.prevError = void 0;
        this.unsubSrc = void 0;
        this._subscribe = _subscribe;
        this._handleEvent = _handleEvent;
        this.subscribe = _2.bind(this.subscribe, this);
        this.handleEvent = _2.bind(this.handleEvent, this);
        this.subscriptions = [];
        this.observable = observable;
        this.queue = [];
      }
      hasSubscribers() {
        return this.subscriptions.length > 0;
      }
      removeSub(subscription) {
        this.subscriptions = _2.without(subscription, this.subscriptions);
        return this.subscriptions;
      }
      push(event) {
        if (event.isEnd) {
          this.ended = true;
        }
        return UpdateBarrier.inTransaction(event, this, this.pushIt, [event]);
      }
      pushToSubscriptions(event) {
        try {
          let tmp = this.subscriptions;
          const len = tmp.length;
          for (let i2 = 0; i2 < len; i2++) {
            const sub = tmp[i2];
            let reply = sub.sink(event);
            if (reply === noMore || event.isEnd) {
              this.removeSub(sub);
            }
          }
          return true;
        } catch (error) {
          this.pushing = false;
          this.queue = [];
          throw error;
        }
      }
      pushIt(event) {
        if (!this.pushing) {
          if (event === this.prevError) {
            return;
          }
          if (event.isError) {
            this.prevError = event;
          }
          this.pushing = true;
          this.pushToSubscriptions(event);
          this.pushing = false;
          while (true) {
            let e2 = this.queue.shift();
            if (e2) {
              this.push(e2);
            } else {
              break;
            }
          }
          if (this.hasSubscribers()) {
            return more;
          } else {
            this.unsubscribeFromSource();
            return noMore;
          }
        } else {
          this.queue.push(event);
          return more;
        }
      }
      handleEvent(event) {
        if (this._handleEvent) {
          return this._handleEvent(event);
        } else {
          return this.push(event);
        }
      }
      unsubscribeFromSource() {
        if (this.unsubSrc) {
          this.unsubSrc();
        }
        this.unsubSrc = void 0;
      }
      subscribe(sink) {
        if (this.ended) {
          sink(endEvent());
          return nop;
        } else {
          assertFunction(sink);
          let subscription = {
            sink
          };
          this.subscriptions.push(subscription);
          if (this.subscriptions.length === 1) {
            this.unsubSrc = this._subscribe(this.handleEvent);
            assertFunction(this.unsubSrc);
          }
          return () => {
            this.removeSub(subscription);
            if (!this.hasSubscribers()) {
              return this.unsubscribeFromSource();
            }
          };
        }
      }
      inspect() {
        return this.observable.toString();
      }
    };
    PropertyDispatcher = class extends Dispatcher {
      constructor(property, subscribe, handleEvent) {
        super(property, subscribe, handleEvent);
        this.current = none();
        this.propertyEnded = false;
        this.subscribe = _2.bind(this.subscribe, this);
      }
      push(event) {
        if (event.isEnd) {
          this.propertyEnded = true;
        }
        if (event instanceof Value) {
          this.current = new Some(event);
          this.currentValueRootId = UpdateBarrier.currentEventId();
        } else if (event.hasValue) {
          console.error("Unknown event, two Bacons loaded?", event.constructor);
        }
        return super.push(event);
      }
      maybeSubSource(sink, reply) {
        if (reply === noMore) {
          return nop;
        } else if (this.propertyEnded) {
          sink(endEvent());
          return nop;
        } else {
          return super.subscribe(sink);
        }
      }
      subscribe(sink) {
        var reply = more;
        if (this.current.isDefined && (this.hasSubscribers() || this.propertyEnded)) {
          var dispatchingId = UpdateBarrier.currentEventId();
          var valId = this.currentValueRootId;
          if (!this.propertyEnded && valId && dispatchingId && dispatchingId !== valId) {
            UpdateBarrier.whenDoneWith(this.observable, () => {
              if (this.currentValueRootId === valId) {
                return sink(initialEvent(this.current.get().value));
              }
            });
            return this.maybeSubSource(sink, reply);
          } else {
            UpdateBarrier.inTransaction(void 0, this, () => {
              reply = sink(initialEvent(this.current.get().value));
              return reply;
            }, []);
            return this.maybeSubSource(sink, reply);
          }
        } else {
          return this.maybeSubSource(sink, reply);
        }
      }
      inspect() {
        return this.observable + " current= " + this.current;
      }
    };
    Buffer2 = class {
      constructor(onFlush, onInput) {
        this.push = (e2) => more;
        this.scheduled = null;
        this.end = void 0;
        this.values = [];
        this.onFlush = onFlush;
        this.onInput = onInput;
      }
      flush() {
        if (this.scheduled) {
          GlobalScheduler.scheduler.clearTimeout(this.scheduled);
          this.scheduled = null;
        }
        if (this.values.length > 0) {
          var valuesToPush = this.values;
          this.values = [];
          var reply = this.push(nextEvent(valuesToPush));
          if (this.end != null) {
            return this.push(this.end);
          } else if (reply !== noMore) {
            return this.onFlush(this);
          }
        } else {
          if (this.end != null) {
            return this.push(this.end);
          }
        }
      }
      schedule(delay2) {
        if (!this.scheduled) {
          return this.scheduled = delay2(() => {
            return this.flush();
          });
        }
      }
    };
    nullMarker = {};
    idCounter = 0;
    Observable = class {
      constructor(desc) {
        this.id = ++idCounter;
        this._isObservable = true;
        this.desc = desc;
        this.initialDesc = desc;
      }
      awaiting(other) {
        return awaiting(this, other);
      }
      bufferingThrottle(minimumInterval) {
        return bufferingThrottle(this, minimumInterval);
      }
      combine(right2, f2) {
        return combineTwo(this, right2, f2).withDesc(new Desc(this, "combine", [right2, f2]));
      }
      debounce(minimumInterval) {
        return debounce(this, minimumInterval);
      }
      debounceImmediate(minimumInterval) {
        return debounceImmediate(this, minimumInterval);
      }
      decode(cases) {
        return decode(this, cases);
      }
      delay(delayMs) {
        return delay(this, delayMs);
      }
      deps() {
        return this.desc.deps();
      }
      diff(start, f2) {
        return diff(this, start, f2);
      }
      doAction(f2) {
        return this.transform(doActionT(f2), new Desc(this, "doAction", [f2]));
      }
      doEnd(f2) {
        return this.transform(doEndT(f2), new Desc(this, "doEnd", [f2]));
      }
      doError(f2) {
        return this.transform(doErrorT(f2), new Desc(this, "doError", [f2]));
      }
      doLog(...args) {
        return this.transform(doLogT(args), new Desc(this, "doLog", args));
      }
      endAsValue() {
        return endAsValue(this);
      }
      endOnError(predicate = (x2) => true) {
        return endOnError(this, predicate);
      }
      errors() {
        return this.filter((x2) => false).withDesc(new Desc(this, "errors"));
      }
      filter(f2) {
        return filter$1(this, f2);
      }
      first() {
        return take(1, this, new Desc(this, "first"));
      }
      firstToPromise(PromiseCtr) {
        return firstToPromise(this, PromiseCtr);
      }
      fold(seed, f2) {
        return fold$1(this, seed, f2);
      }
      forEach(f2 = nullSink) {
        return this.onValue(f2);
      }
      holdWhen(valve) {
        return holdWhen(this, valve);
      }
      inspect() {
        return this.toString();
      }
      internalDeps() {
        return this.initialDesc.deps();
      }
      last() {
        return last$1(this);
      }
      log(...args) {
        log(args, this);
        return this;
      }
      mapEnd(f2) {
        return this.transform(mapEndT(f2), new Desc(this, "mapEnd", [f2]));
      }
      mapError(f2) {
        return this.transform(mapErrorT(f2), new Desc(this, "mapError", [f2]));
      }
      name(name) {
        this._name = name;
        return this;
      }
      onEnd(f2 = nullVoidSink) {
        return this.subscribe(function(event) {
          if (event.isEnd) {
            return f2();
          }
          return more;
        });
      }
      onError(f2 = nullSink) {
        return this.subscribe(function(event) {
          if (isError(event)) {
            return f2(event.error);
          }
          return more;
        });
      }
      onValue(f2 = nullSink) {
        return this.subscribe(function(event) {
          if (hasValue(event)) {
            return f2(event.value);
          }
          return more;
        });
      }
      onValues(f2) {
        return this.onValue(function(args) {
          return f2(...args);
        });
      }
      reduce(seed, f2) {
        return fold$1(this, seed, f2);
      }
      sampledBy(sampler) {
        return sampledBy(this, sampler, arguments[1]);
      }
      scan(seed, f2) {
        return scan(this, seed, f2);
      }
      skip(count2) {
        return skip(this, count2);
      }
      skipDuplicates(isEqual) {
        return skipDuplicates(this, isEqual);
      }
      skipErrors() {
        return skipErrors(this);
      }
      skipUntil(starter) {
        return skipUntil(this, starter);
      }
      skipWhile(f2) {
        return skipWhile(this, f2);
      }
      slidingWindow(maxValues, minValues = 0) {
        return slidingWindow(this, maxValues, minValues);
      }
      subscribe(sink = nullSink) {
        return UpdateBarrier.wrappedSubscribe(this, (sink2) => this.subscribeInternal(sink2), sink);
      }
      take(count2) {
        return take(count2, this);
      }
      takeUntil(stopper) {
        return takeUntil(this, stopper);
      }
      takeWhile(f2) {
        return takeWhile(this, f2);
      }
      throttle(minimumInterval) {
        return throttle(this, minimumInterval);
      }
      toPromise(PromiseCtr) {
        return toPromise(this, PromiseCtr);
      }
      toString() {
        if (this._name) {
          return this._name;
        } else {
          return this.desc.toString();
        }
      }
      withDesc(desc) {
        if (desc)
          this.desc = desc;
        return this;
      }
      withDescription(context, method, ...args) {
        this.desc = describe(context, method, ...args);
        return this;
      }
      zip(other, f2) {
        return zip(this, other, f2);
      }
    };
    Property = class extends Observable {
      constructor(desc, subscribe, handler) {
        super(desc);
        this._isProperty = true;
        assertFunction(subscribe);
        this.dispatcher = new PropertyDispatcher(this, subscribe, handler);
        registerObs(this);
      }
      and(other) {
        return and(this, other);
      }
      changes() {
        return new EventStream(new Desc(this, "changes", []), (sink) => this.dispatcher.subscribe(function(event) {
          if (!event.isInitial) {
            return sink(event);
          }
          return more;
        }));
      }
      concat(other) {
        return this.transformChanges(describe(this, "concat", other), (changes) => changes.concat(other));
      }
      transformChanges(desc, f2) {
        return transformPropertyChanges(this, f2, desc);
      }
      flatMap(f2) {
        return flatMap$1(this, f2);
      }
      flatMapConcat(f2) {
        return flatMapConcat(this, f2);
      }
      flatMapError(f2) {
        return flatMapError(this, f2);
      }
      flatMapEvent(f2) {
        return flatMapEvent(this, f2);
      }
      flatMapFirst(f2) {
        return flatMapFirst(this, f2);
      }
      flatMapLatest(f2) {
        return flatMapLatest(this, f2);
      }
      flatMapWithConcurrencyLimit(limit, f2) {
        return flatMapWithConcurrencyLimit(this, limit, f2);
      }
      groupBy(keyF, limitF) {
        return groupBy(this, keyF, limitF);
      }
      map(f2) {
        return map$1(this, f2);
      }
      not() {
        return not3(this);
      }
      or(other) {
        return or(this, other);
      }
      sample(interval2) {
        return sampleP(this, interval2);
      }
      startWith(seed) {
        return startWithP(this, seed);
      }
      subscribeInternal(sink = nullSink) {
        return this.dispatcher.subscribe(sink);
      }
      toEventStream(options) {
        return new EventStream(new Desc(this, "toEventStream", []), (sink) => this.subscribeInternal(function(event) {
          return sink(event.toNext());
        }), void 0, options);
      }
      toProperty() {
        assertNoArguments(arguments);
        return this;
      }
      transform(transformer, desc) {
        return transformP(this, transformer, desc);
      }
      withLatestFrom(samplee, f2) {
        return withLatestFromP(this, samplee, f2);
      }
      withStateMachine(initState, f2) {
        return withStateMachine(initState, f2, this);
      }
    };
    allowSync = { forceAsync: false };
    EventStream = class extends Observable {
      constructor(desc, subscribe, handler, options) {
        super(desc);
        this._isEventStream = true;
        if (options !== allowSync) {
          subscribe = asyncWrapSubscribe(this, subscribe);
        }
        this.dispatcher = new Dispatcher(this, subscribe, handler);
        registerObs(this);
      }
      bufferWithTime(delay2) {
        return bufferWithTime(this, delay2);
      }
      bufferWithCount(count2) {
        return bufferWithCount(this, count2);
      }
      bufferWithTimeOrCount(delay2, count2) {
        return bufferWithTimeOrCount(this, delay2, count2);
      }
      changes() {
        return this;
      }
      concat(other, options) {
        return concatE(this, other, options);
      }
      transformChanges(desc, f2) {
        return f2(this).withDesc(desc);
      }
      flatMap(f2) {
        return flatMap$1(this, f2);
      }
      flatMapConcat(f2) {
        return flatMapConcat(this, f2);
      }
      flatMapError(f2) {
        return flatMapError(this, f2);
      }
      flatMapFirst(f2) {
        return flatMapFirst(this, f2);
      }
      flatMapLatest(f2) {
        return flatMapLatest(this, f2);
      }
      flatMapWithConcurrencyLimit(limit, f2) {
        return flatMapWithConcurrencyLimit(this, limit, f2);
      }
      flatMapEvent(f2) {
        return flatMapEvent(this, f2);
      }
      flatScan(seed, f2) {
        return flatScan(this, seed, f2);
      }
      groupBy(keyF, limitF) {
        return groupBy(this, keyF, limitF);
      }
      map(f2) {
        return map$1(this, f2);
      }
      merge(other) {
        assertEventStream(other);
        return mergeAll(this, other).withDesc(new Desc(this, "merge", [other]));
      }
      not() {
        return not3(this);
      }
      startWith(seed) {
        return startWithE(this, seed);
      }
      subscribeInternal(sink = nullSink) {
        return this.dispatcher.subscribe(sink);
      }
      toEventStream() {
        return this;
      }
      toProperty(initValue) {
        let usedInitValue = arguments.length ? toOption(initValue) : none();
        let disp = this.dispatcher;
        let desc = new Desc(this, "toProperty", Array.prototype.slice.apply(arguments));
        let streamSubscribe = disp.subscribe;
        return new Property(desc, streamSubscribeToPropertySubscribe(usedInitValue, streamSubscribe));
      }
      transform(transformer, desc) {
        return transformE(this, transformer, desc);
      }
      withLatestFrom(samplee, f2) {
        return withLatestFromE(this, samplee, f2);
      }
      withStateMachine(initState, f2) {
        return withStateMachine(initState, f2, this);
      }
    };
    ESObservable = class {
      constructor(observable) {
        this.observable = observable;
      }
      subscribe(observerOrOnNext, onError, onComplete) {
        const observer = typeof observerOrOnNext === "function" ? { next: observerOrOnNext, error: onError, complete: onComplete } : observerOrOnNext;
        const subscription = {
          closed: false,
          unsubscribe: function() {
            subscription.closed = true;
            cancel();
          }
        };
        const cancel = this.observable.subscribe(function(event) {
          if (hasValue(event) && observer.next) {
            observer.next(event.value);
          } else if (isError(event)) {
            if (observer.error)
              observer.error(event.error);
            subscription.unsubscribe();
          } else if (event.isEnd) {
            subscription.closed = true;
            if (observer.complete)
              observer.complete();
          }
        });
        return subscription;
      }
    };
    ESObservable.prototype[symbol("observable")] = function() {
      return this;
    };
    Observable.prototype.toESObservable = function() {
      return new ESObservable(this);
    };
    Observable.prototype[symbol("observable")] = Observable.prototype.toESObservable;
    makeFunction_ = withMethodCallSupport(function(f2, ...args) {
      if (_2.isFunction(f2)) {
        if (args.length) {
          return partiallyApplied(f2, args);
        } else {
          return f2;
        }
      } else {
        return _2.always(f2);
      }
    });
    Bus = class extends EventStream {
      constructor() {
        super(new Desc("Bacon", "Bus", []), (sink) => this.subscribeAll(sink));
        this.pushing = false;
        this.pushQueue = void 0;
        this.ended = false;
        this.subscriptions = [];
        this.unsubAll = _2.bind(this.unsubAll, this);
        this.push = _2.bind(this.push, this);
        this.subscriptions = [];
        this.ended = false;
      }
      plug(input) {
        assertObservable(input);
        if (this.ended) {
          return;
        }
        var sub = { input, unsub: void 0 };
        this.subscriptions.push(sub);
        if (typeof this.sink !== "undefined") {
          this.subscribeInput(sub);
        }
        return () => this.unsubscribeInput(input);
      }
      end() {
        this.ended = true;
        this.unsubAll();
        if (typeof this.sink === "function") {
          return this.sink(endEvent());
        }
      }
      push(value) {
        if (!this.ended && typeof this.sink === "function") {
          var rootPush = !this.pushing;
          if (!rootPush) {
            if (!this.pushQueue)
              this.pushQueue = [];
            this.pushQueue.push(value);
            return;
          }
          this.pushing = true;
          try {
            return this.sink(nextEvent(value));
          } finally {
            if (rootPush && this.pushQueue) {
              var i2 = 0;
              while (i2 < this.pushQueue.length) {
                var v3 = this.pushQueue[i2];
                this.sink(nextEvent(v3));
                i2++;
              }
              this.pushQueue = void 0;
            }
            this.pushing = false;
          }
        }
      }
      error(error) {
        if (typeof this.sink === "function") {
          return this.sink(new Error$1(error));
        }
      }
      unsubAll() {
        var iterable = this.subscriptions;
        for (var i2 = 0, sub; i2 < iterable.length; i2++) {
          sub = iterable[i2];
          if (typeof sub.unsub === "function") {
            sub.unsub();
          }
        }
      }
      subscribeAll(newSink) {
        if (this.ended) {
          newSink(endEvent());
        } else {
          this.sink = newSink;
          var iterable = this.subscriptions.slice();
          for (var i2 = 0, subscription; i2 < iterable.length; i2++) {
            subscription = iterable[i2];
            this.subscribeInput(subscription);
          }
        }
        return this.unsubAll;
      }
      guardedSink(input) {
        return (event) => {
          if (event.isEnd) {
            this.unsubscribeInput(input);
            return noMore;
          } else if (this.sink) {
            return this.sink(event);
          } else {
            return more;
          }
        };
      }
      subscribeInput(subscription) {
        subscription.unsub = subscription.input.subscribeInternal(this.guardedSink(subscription.input));
        return subscription.unsub;
      }
      unsubscribeInput(input) {
        var iterable = this.subscriptions;
        for (var i2 = 0, sub; i2 < iterable.length; i2++) {
          sub = iterable[i2];
          if (sub.input === input) {
            if (typeof sub.unsub === "function") {
              sub.unsub();
            }
            this.subscriptions.splice(i2, 1);
            return;
          }
        }
      }
    };
  }
});

// src/utilities/events.ts
var events_exports = {};
__export(events_exports, {
  windowBlurListener: () => windowBlurListener,
  windowKeyDownListener: () => windowKeyDownListener,
  windowKeyUpListener: () => windowKeyUpListener
});
var windowKeyDownListener, windowKeyUpListener, windowBlurListener;
var init_events = __esm({
  "src/utilities/events.ts"() {
    init_Bacon();
    windowKeyDownListener = new Bus();
    windowKeyUpListener = new Bus();
    windowBlurListener = new Bus();
  }
});

// src/modules/ecs/components.ts
var ComponentNameSymbol, ComponentStateManager, createComponent;
var init_components = __esm({
  "src/modules/ecs/components.ts"() {
    ComponentNameSymbol = Symbol("ECS_Component_Name");
    ComponentStateManager = (initialState) => {
      let internalState = initialState;
      return (changes) => {
        if (changes) {
          internalState = {
            ...internalState,
            ...changes
          };
        }
        return internalState;
      };
    };
    createComponent = (name, def) => ({
      [ComponentNameSymbol]: name,
      ...def
    });
  }
});

// src/utilities/counter.ts
function* Counter(starting = 0) {
  let current = starting;
  while (true) {
    yield current++;
  }
}
var init_counter = __esm({
  "src/utilities/counter.ts"() {
  }
});

// src/modules/ecs/entity.ts
function removeEntity(id2) {
  const { components } = entities.get(id2);
  entities.delete(id2);
  for (let componentName of Object.keys(components)) {
    const idmappings = componentEntityMapping.get(componentName).filter((i2) => i2 !== id2);
    componentEntityMapping.set(componentName, idmappings);
  }
}
function count(componentFilter) {
  let componentMapping = [];
  for (let componentName of componentFilter) {
    const component = componentEntityMapping.get(componentName);
    if (!component || component.length === 0) {
      return 0;
    }
    ;
    componentMapping.push(component);
  }
  const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
  return entityIds.length;
}
function* query(componentFilter, filteredUserIds) {
  let componentMapping = [];
  if (filteredUserIds) {
    componentMapping.push(filteredUserIds);
  }
  for (let componentName of componentFilter) {
    const component = componentEntityMapping.get(componentName);
    if (!component || component.length === 0) {
      return;
    }
    ;
    componentMapping.push(component);
  }
  componentMapping = componentMapping.sort((a2, b2) => a2.length - b2.length);
  const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
  for (let entityId of entityIds) {
    const entity = entities.get(entityId);
    const components = {};
    for (let componentName of componentFilter) {
      components[componentName] = entity.components[componentName];
    }
    yield components;
  }
}
var entityIdCounter, entities, componentEntityMapping, addEntity, addComponentToEntity, intersectionBetweenOrderedIntegerLists;
var init_entity = __esm({
  "src/modules/ecs/entity.ts"() {
    init_components();
    init_counter();
    entityIdCounter = Counter();
    entities = /* @__PURE__ */ new Map();
    componentEntityMapping = /* @__PURE__ */ new Map();
    addEntity = (components) => {
      const id2 = entityIdCounter.next().value;
      const entity = {
        id: id2,
        components: {}
      };
      const defaultComponents = [createComponent("EntityId", { id: id2 })];
      entities.set(entity.id, entity);
      for (let component of [...components, ...defaultComponents]) {
        addComponentToEntity(id2, component);
      }
      return entity;
    };
    addComponentToEntity = (entityId, component) => {
      const componentName = component[ComponentNameSymbol];
      const componentMapping = componentEntityMapping.get(componentName) || [];
      const entity = entities.get(entityId);
      entity.components[componentName] = ComponentStateManager(component);
      componentEntityMapping.set(componentName, [...componentMapping, entityId]);
    };
    intersectionBetweenOrderedIntegerLists = (intLists) => {
      let last2 = intLists[0];
      for (let i2 = 1; i2 < intLists.length; i2++) {
        const current = intLists[i2];
        let matches = [];
        const lastLength = last2.length;
        const currentLength = current.length;
        let currentIndexStartingPoint = 0;
        for (let lastIndex = 0; lastIndex < lastLength; lastIndex++) {
          const lastId = last2[lastIndex];
          for (let currentIndex = currentIndexStartingPoint; currentIndex < currentLength; currentIndex++) {
            const currentId = current[currentIndex];
            if (lastId === currentId) {
              currentIndexStartingPoint = currentIndex + 1;
              matches.push(lastId);
              break;
            } else if (lastId < currentId) {
              break;
            } else if (lastId > currentId) {
              currentIndexStartingPoint = currentIndex;
            }
          }
        }
        if (matches.length === 0) {
          return [];
        }
        last2 = matches;
      }
      return last2;
    };
  }
});

// src/modules/ecs/index.ts
var init_ecs = __esm({
  "src/modules/ecs/index.ts"() {
    init_components();
    init_entity();
  }
});

// src/components/DeleteQueueManager.ts
var DeleteQueueManager_exports = {};
var init_DeleteQueueManager = __esm({
  "src/components/DeleteQueueManager.ts"() {
    init_animate();
    init_ecs();
    removal.add(() => {
      for (let { DeleteQueueManager, EntityId } of query(["DeleteQueueManager", "EntityId"])) {
        const { markedForDeletion } = DeleteQueueManager();
        if (markedForDeletion) {
          removeEntity(EntityId().id);
        }
      }
    });
  }
});

// src/components/basic.ts
var basic_exports = {};
var init_basic = __esm({
  "src/components/basic.ts"() {
  }
});

// src/hitbox.ts
var hitbox_exports = {};
__export(hitbox_exports, {
  checkHitboxes: () => checkHitboxes,
  clearHitboxInteractions: () => clearHitboxInteractions,
  createHitBoxComponent: () => createHitBoxComponent,
  hittest: () => hittest,
  isLine: () => isLine,
  updateHitboxTransform: () => updateHitboxTransform
});
var createHitBoxComponent, updateHitboxTransform, isLine, hittest, checkHitboxes, clearHitboxInteractions;
var init_hitbox = __esm({
  "src/hitbox.ts"() {
    init_animate();
    init_ecs();
    createHitBoxComponent = (label, [x2, y2], [width, height]) => {
      return createComponent("Hitbox", {
        label,
        x: x2,
        y: y2,
        x2: x2 + width,
        y2: y2 + height,
        width,
        height,
        entityInteractions: []
      });
    };
    updateHitboxTransform = (Hitbox, [x2, y2], [width, height]) => {
      Hitbox({ x: x2, y: y2, x2: x2 + width, y2: y2 + height, width, height });
    };
    isLine = (hitbox) => hitbox.x === hitbox.x2 || hitbox.y === hitbox.y2;
    hittest = (hitboxA, hitboxB) => {
      if (isLine(hitboxA) || isLine(hitboxB))
        return false;
      if (hitboxB.x >= hitboxA.x2)
        return false;
      if (hitboxA.x >= hitboxB.x2)
        return false;
      if (hitboxB.y >= hitboxA.y2)
        return false;
      if (hitboxA.y >= hitboxB.y2)
        return false;
      return true;
    };
    checkHitboxes = () => {
      const ht = [...query(["EntityId", "Hitbox"])];
      for (let i2 = 0; i2 < ht.length; i2++) {
        const a2 = ht[i2];
        for (let j2 = i2 + 1; j2 < ht.length; j2++) {
          const b2 = ht[j2];
          const aHitbox = a2.Hitbox();
          const bHitbox = b2.Hitbox();
          if (hittest(aHitbox, bHitbox)) {
            const aid = a2.EntityId().id;
            const bid = b2.EntityId().id;
            a2.Hitbox({
              entityInteractions: [...aHitbox.entityInteractions, bid]
            });
            b2.Hitbox({
              entityInteractions: [...bHitbox.entityInteractions, aid]
            });
          }
        }
      }
    };
    clearHitboxInteractions = () => {
      for (let { Hitbox } of query(["Hitbox"])) {
        Hitbox({ entityInteractions: [] });
      }
    };
    removal.add(clearHitboxInteractions);
    physics.add(checkHitboxes);
  }
});

// src/keys.ts
var keys_exports = {};
__export(keys_exports, {
  isKeyDown: () => isKeyDown
});
var trackedKeys, frameSnapshotKeys, removeAllDownKeys, setKeyDown, setKeyUp, isKeyDown;
var init_keys2 = __esm({
  "src/keys.ts"() {
    init_animate();
    init_State();
    init_events();
    trackedKeys = State({});
    frameSnapshotKeys = State({});
    removeAllDownKeys = () => {
      trackedKeys({});
    };
    setKeyDown = (code) => {
      trackedKeys((keys4) => ({ ...keys4, [code]: true }));
    };
    setKeyUp = (code) => {
      trackedKeys(({ [code]: _3, ...rest }) => rest);
    };
    inputs.add(() => {
      frameSnapshotKeys(trackedKeys());
    });
    windowKeyDownListener.onValue(({ code }) => {
      setKeyDown(code);
    });
    windowKeyUpListener.onValue(({ code }) => {
      setKeyUp(code);
    });
    windowBlurListener.onValue(() => {
      removeAllDownKeys();
    });
    isKeyDown = (keyString) => Boolean(frameSnapshotKeys()[keyString]);
  }
});

// src/user.ts
var user_exports = {};
var calculateSpeedForFrame;
var init_user = __esm({
  "src/user.ts"() {
    init_canvas();
    init_animate();
    init_keys2();
    init_Vector();
    init_draw();
    init_ecs();
    $$initiate.once(() => {
      addEntity([
        createComponent("User", {
          speed: 400
        }),
        createComponent("Position", zero()),
        createComponent("Size", v2(50, 50))
      ]);
    });
    calculateSpeedForFrame = (speed) => speed * timeDiffS();
    update.add(() => {
      for (let { User, Position, Size } of query(["User", "Position", "Size"])) {
        if (isKeyDown("KeyW")) {
          Position(add(Position(), up(calculateSpeedForFrame(User().speed))));
        }
        if (isKeyDown("KeyS")) {
          Position(add(Position(), down(calculateSpeedForFrame(User().speed))));
        }
        if (isKeyDown("KeyA")) {
          Position(add(Position(), left(calculateSpeedForFrame(User().speed))));
        }
        if (isKeyDown("KeyD")) {
          Position(add(Position(), right(calculateSpeedForFrame(User().speed))));
        }
        const canvas = Canvas();
        const [width, height] = Size();
        const [x2, y2] = Position();
        Position(v2(Math.max(0, Math.min(x2, canvas.width - width)), Math.max(0, Math.min(y2, canvas.height - height))));
      }
    });
    render.add(() => {
      for (let { Position, Size } of query(["Position", "User", "Size"])) {
        save();
        beginPath();
        rect(...Position(), ...Size());
        fillStyle("black");
        fill();
        closePath();
        restore();
      }
    });
  }
});

// src/enemy.ts
var enemy_exports = {};
__export(enemy_exports, {
  createEnemy: () => createEnemy,
  damageEnemy: () => damageEnemy,
  spawnEnemies: () => spawnEnemies
});
var createEnemy, moveEnemies, enemyRemover, spawnEnemies, damageEnemy;
var init_enemy = __esm({
  "src/enemy.ts"() {
    init_animate();
    init_draw();
    init_hitbox();
    init_generic();
    init_Vector();
    init_ecs();
    $$initiate.once(() => {
      addEntity([
        createComponent("EnemyManager", {
          lastSpawnTime: 0
        })
      ]);
    });
    createEnemy = (posX) => {
      const startingPosition = v2(1800, posX);
      const startingSize = v2(100, 50);
      addEntity([
        createComponent("Enemy", {
          speed: 350,
          health: 100,
          originalHealth: 100
        }),
        createComponent("Position", startingPosition),
        createComponent("Size", startingSize),
        createComponent("DeleteQueueManager", { markedForDeletion: false }),
        createHitBoxComponent("Enemy", startingPosition, startingSize)
      ]);
    };
    moveEnemies = () => {
      for (const { Enemy, Position, Size, Hitbox } of query(["Enemy", "Position", "Size", "Hitbox"])) {
        Position(add(Position(), left(Enemy().speed * timeDiffS())));
        updateHitboxTransform(Hitbox, Position(), Size());
      }
    };
    enemyRemover = () => {
      for (const { Position, DeleteQueueManager } of query(["Position", "DeleteQueueManager"])) {
        if (Position().x < 100) {
          DeleteQueueManager({ markedForDeletion: true });
        }
      }
    };
    spawnEnemies = () => {
      for (let { EnemyManager } of query(["EnemyManager"])) {
        const { lastSpawnTime } = EnemyManager();
        if (timeMS() - lastSpawnTime < 1e3)
          continue;
        EnemyManager({ lastSpawnTime: timeMS() });
        createEnemy(random(100, 900));
      }
    };
    damageEnemy = (entityId, amount) => {
      for (let { Enemy, DeleteQueueManager } of query(["Enemy", "DeleteQueueManager"], [entityId])) {
        Enemy({ health: Math.max(0, Enemy().health - amount) });
        if (Enemy().health === 0) {
          DeleteQueueManager({ markedForDeletion: true });
        }
      }
    };
    update.add(spawnEnemies, moveEnemies, enemyRemover);
    render.add(() => {
      for (const { Enemy, Position, Size } of query(["Enemy", "Position", "Size"])) {
        const { health, originalHealth } = Enemy();
        const healthPercentage = health / originalHealth;
        const hasTouchedBullet = false;
        const pos = Position();
        const size = Size();
        save();
        beginPath();
        fillStyle("red");
        rect(...add(pos, up(50)), ...v2(size.x, 20));
        fill();
        restore();
        save();
        beginPath();
        fillStyle("green");
        rect(...add(pos, up(50)), ...v2(size.x * healthPercentage, 20));
        fill();
        restore();
        save();
        beginPath();
        fillStyle(hasTouchedBullet ? "blue" : "green");
        rect(...pos, ...size);
        fill();
        restore();
      }
    });
  }
});

// src/bullets.ts
var bullets_exports = {};
var createBullet, calculateBulletSpeedForFrame, spawnBullet, moveBullet, removeBullet, bulletEnemyManager;
var init_bullets = __esm({
  "src/bullets.ts"() {
    init_animate();
    init_hitbox();
    init_keys2();
    init_Vector();
    init_enemy();
    init_draw();
    init_ecs();
    $$initiate.once(() => {
      addEntity([
        createComponent("UserBulletManager", {
          lastBulletFiredTime: 0
        })
      ]);
    });
    createBullet = (pos) => {
      const size = v2(10, 10);
      addEntity([
        createComponent("UserBullet", {
          speed: 700,
          status: "ACTIVE"
        }),
        createComponent("Position", pos),
        createComponent("Size", size),
        createComponent("DeleteQueueManager", { markedForDeletion: false }),
        createHitBoxComponent("UserBullet", pos, size)
      ]);
    };
    calculateBulletSpeedForFrame = (speed) => speed * timeDiffS();
    spawnBullet = () => {
      for (let { UserBulletManager } of query(["UserBulletManager"])) {
        if (!isKeyDown("Space"))
          return;
        if (timeMS() - UserBulletManager().lastBulletFiredTime < 100)
          return;
        UserBulletManager({ lastBulletFiredTime: timeMS() });
        for (let { Position } of query(["User", "Position"])) {
          createBullet(Position());
        }
      }
    };
    moveBullet = () => {
      for (let { UserBullet, Position, Size, Hitbox } of query(["UserBullet", "Position", "Size", "Hitbox"])) {
        const { speed } = UserBullet();
        Position(add(Position(), right(calculateBulletSpeedForFrame(speed))));
        updateHitboxTransform(Hitbox, Position(), Size());
      }
    };
    removeBullet = () => {
      for (let { Position, DeleteQueueManager } of query(["UserBullet", "Position", "DeleteQueueManager"])) {
        if (Position().x < 1920)
          return;
        DeleteQueueManager({ markedForDeletion: true });
      }
    };
    bulletEnemyManager = () => {
      const enemies = [...query(["Enemy", "EntityId"])];
      for (const { Hitbox, DeleteQueueManager } of query(["UserBullet", "EntityId", "Hitbox", "DeleteQueueManager"])) {
        const { entityInteractions } = Hitbox();
        const firstInteractedEnemeyId = entityInteractions.find((entityId) => enemies.some(({ EntityId }) => entityId === EntityId().id));
        if (firstInteractedEnemeyId) {
          damageEnemy(firstInteractedEnemeyId, 20);
          DeleteQueueManager({ markedForDeletion: true });
        }
      }
    };
    update.add(spawnBullet, moveBullet, bulletEnemyManager, removeBullet);
    render.add(() => {
      for (let { Position, Size } of query(["UserBullet", "Position", "Size"])) {
        save();
        beginPath();
        rect(...Position(), ...Size());
        fillStyle("black");
        fill();
        restore();
      }
    });
  }
});

// src/debug.ts
var debug_exports = {};
var init_debug = __esm({
  "src/debug.ts"() {
    init_animate();
    init_Vector();
    init_draw();
    init_entity();
    render.add(() => {
      const metrics = [
        ["fps", fps()],
        ["bullets", count(["UserBullet"])],
        ["enemies", count(["Enemy"])],
        ["hitboxes", count(["Hitbox"])]
      ];
      metrics.forEach(([label, textLog], index) => {
        save();
        beginPath();
        const fontSize = 40;
        const count2 = `${label}: ${textLog}`;
        const pos = v2(10, fontSize + index * fontSize);
        font(`${fontSize}px serif`);
        fillText(count2, ...pos);
        restore();
      });
    });
    render.add([
      99999,
      () => {
        for (let { Hitbox } of query(["Hitbox"])) {
          const { x: x2, x2: x22, y: y2, y2: y22 } = Hitbox();
          save();
          beginPath();
          moveTo(x2, y2);
          lineTo(x22, y2);
          lineTo(x22, y22);
          lineTo(x2, y22);
          lineWidth(4);
          strokeStyle("blue");
          closePath();
          stroke();
          restore();
        }
      }
    ]);
  }
});

// src/app-worker.ts
var app_worker_exports = {};
__export(app_worker_exports, {
  attachCanvasWorker: () => attachCanvasWorker,
  default: () => app_worker_default,
  fireEvent: () => fireEvent,
  run: () => run
});
var canvasWorker, attachCanvasWorker, fireEvent, run, methods, app_worker_default;
var init_app_worker = __esm({
  "src/app-worker.ts"() {
    init_comlink();
    init_events();
    attachCanvasWorker = (transferredCanvasWorker) => {
      console.log("received canvas worker");
      canvasWorker = wrap(transferredCanvasWorker);
      return true;
    };
    fireEvent = (key, data) => {
      events_exports[key].push(data);
    };
    run = async () => {
      if (!canvasWorker)
        throw new Error("canvasWorker has not been setup yet");
      await Promise.resolve().then(() => (init_DeleteQueueManager(), DeleteQueueManager_exports));
      await Promise.resolve().then(() => (init_basic(), basic_exports));
      await Promise.resolve().then(() => (init_hitbox(), hitbox_exports));
      await Promise.resolve().then(() => (init_canvas(), canvas_exports));
      await Promise.resolve().then(() => (init_keys2(), keys_exports));
      await Promise.resolve().then(() => (init_user(), user_exports));
      await Promise.resolve().then(() => (init_enemy(), enemy_exports));
      await Promise.resolve().then(() => (init_bullets(), bullets_exports));
      await Promise.resolve().then(() => (init_debug(), debug_exports));
      const { activate: activate2 } = await Promise.resolve().then(() => (init_animate(), animate_exports));
      activate2(canvasWorker);
    };
    methods = {
      attachCanvasWorker,
      fireEvent,
      run
    };
    expose(methods);
    app_worker_default = methods;
  }
});

// src/loader.ts
init_comlink();
init_canvas();

// src/utilities/worker.ts
init_comlink();
var createComlinkWorker = (path, options) => {
  const worker = new Worker(path, options);
  const comlinkWorker = wrap(worker);
  return comlinkWorker;
};
var createComlinkSharedWorker = (path, options) => {
  const worker = new SharedWorker(path, options);
  worker.port.start();
  const workerComlink = wrap(worker.port);
  const base = {
    get port() {
      return worker.port;
    },
    clonePort() {
      const worker2 = new SharedWorker(path, options);
      worker2.port.start();
      return worker2.port;
    }
  };
  return new Proxy(base, {
    get(obj, key) {
      if (obj.hasOwnProperty(key)) {
        return Reflect.get(obj, key);
      }
      return Reflect.get(workerComlink, key);
    }
  });
};

// src/loader.ts
var loadApp = async ({ useWorker = false }) => {
  if (useWorker === false)
    return await Promise.resolve().then(() => (init_app_worker(), app_worker_exports));
  const appWorker = createComlinkWorker("/src/app-worker.js", { type: "module" });
  return appWorker;
};
var run2 = async () => {
  const canvas = createCanvas();
  const offscreenCanvas = canvas.transferControlToOffscreen();
  const canvasWorker2 = createComlinkSharedWorker("/src/canvas-worker.js", { type: "module" });
  canvasWorker2.setCanvas(transfer(offscreenCanvas, [offscreenCanvas]));
  const app = await loadApp({ useWorker: true });
  const clonedCanvasWorker = canvasWorker2.clonePort();
  await app.attachCanvasWorker(transfer(clonedCanvasWorker, [clonedCanvasWorker]));
  setupListeners(app);
  await app.run();
};
var setupListeners = (app) => {
  window.addEventListener("keydown", ({ code }) => app.fireEvent("windowKeyDownListener", { code }));
  window.addEventListener("keyup", ({ code }) => app.fireEvent("windowKeyUpListener", { code }));
  window.addEventListener("blur", () => app.fireEvent("windowBlurListener", {}));
};
if (document.readyState === "complete") {
  run2();
} else {
  window.addEventListener("DOMContentLoaded", run2);
}
//# sourceMappingURL=loader.js.map
