// node_modules/.pnpm/comlink@4.3.1/node_modules/comlink/dist/esm/comlink.mjs
var proxyMarker = Symbol("Comlink.proxy");
var createEndpoint = Symbol("Comlink.endpoint");
var releaseProxy = Symbol("Comlink.releaseProxy");
var throwMarker = Symbol("Comlink.thrown");
var isObject = (val) => typeof val === "object" && val !== null || typeof val === "function";
var proxyTransferHandler = {
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
var throwTransferHandler = {
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
var transferHandlers = /* @__PURE__ */ new Map([
  ["proxy", proxyTransferHandler],
  ["throw", throwTransferHandler]
]);
function expose(obj, ep = self) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }
    const { id, type, path } = Object.assign({ path: [] }, ev.data);
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
      ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
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
            path: path.map((p) => p.toString())
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
        const r = requestResponseMessage(ep, {
          type: "GET",
          path: path.map((p) => p.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(ep, [...path, prop]);
    },
    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased);
      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, {
        type: "SET",
        path: [...path, prop].map((p) => p.toString()),
        value
      }, transferables).then(fromWireValue);
    },
    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];
      if (last === createEndpoint) {
        return requestResponseMessage(ep, {
          type: "ENDPOINT"
        }).then(fromWireValue);
      }
      if (last === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: "APPLY",
        path: path.map((p) => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },
    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: "CONSTRUCT",
        path: path.map((p) => p.toString()),
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
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
var transferCache = /* @__PURE__ */ new WeakMap();
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
    const id = generateUUID();
    ep.addEventListener("message", function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }
      ep.removeEventListener("message", l);
      resolve(ev.data);
    });
    if (ep.start) {
      ep.start();
    }
    ep.postMessage(Object.assign({ id }, msg), transfers);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isPlaceholder.js
function _isPlaceholder(a) {
  return a != null && typeof a === "object" && a["@@functional/placeholder"] === true;
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry1.js
function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || _isPlaceholder(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry2.js
function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        return f2;
      case 1:
        return _isPlaceholder(a) ? f2 : _curry1(function(_b) {
          return fn(a, _b);
        });
      default:
        return _isPlaceholder(a) && _isPlaceholder(b) ? f2 : _isPlaceholder(a) ? _curry1(function(_a) {
          return fn(_a, b);
        }) : _isPlaceholder(b) ? _curry1(function(_b) {
          return fn(a, _b);
        }) : fn(a, b);
    }
  };
}

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

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_arity.js
function _arity(n, fn) {
  switch (n) {
    case 0:
      return function() {
        return fn.apply(this, arguments);
      };
    case 1:
      return function(a0) {
        return fn.apply(this, arguments);
      };
    case 2:
      return function(a0, a1) {
        return fn.apply(this, arguments);
      };
    case 3:
      return function(a0, a1, a2) {
        return fn.apply(this, arguments);
      };
    case 4:
      return function(a0, a1, a2, a3) {
        return fn.apply(this, arguments);
      };
    case 5:
      return function(a0, a1, a2, a3, a4) {
        return fn.apply(this, arguments);
      };
    case 6:
      return function(a0, a1, a2, a3, a4, a5) {
        return fn.apply(this, arguments);
      };
    case 7:
      return function(a0, a1, a2, a3, a4, a5, a6) {
        return fn.apply(this, arguments);
      };
    case 8:
      return function(a0, a1, a2, a3, a4, a5, a6, a7) {
        return fn.apply(this, arguments);
      };
    case 9:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
        return fn.apply(this, arguments);
      };
    case 10:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
        return fn.apply(this, arguments);
      };
    default:
      throw new Error("First argument to _arity must be a non-negative integer no greater than ten");
  }
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curryN.js
function _curryN(length, received, fn) {
  return function() {
    var combined = [];
    var argsIdx = 0;
    var left = length;
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
        left -= 1;
      }
      combinedIdx += 1;
    }
    return left <= 0 ? fn.apply(this, combined) : _arity(left, _curryN(length, combined, fn));
  };
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/curryN.js
var curryN = /* @__PURE__ */ _curry2(function curryN2(length, fn) {
  if (length === 1) {
    return _curry1(fn);
  }
  return _arity(length, _curryN(length, [], fn));
});
var curryN_default = curryN;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArray.js
var isArray_default = Array.isArray || function _isArray(val) {
  return val != null && val.length >= 0 && Object.prototype.toString.call(val) === "[object Array]";
};

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isTransformer.js
function _isTransformer(obj) {
  return obj != null && typeof obj["@@transducer/step"] === "function";
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_dispatchable.js
function _dispatchable(methodNames, transducerCreator, fn) {
  return function() {
    if (arguments.length === 0) {
      return fn();
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
    return fn.apply(this, arguments);
  };
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xfBase.js
var xfBase_default = {
  init: function() {
    return this.xf["@@transducer/init"]();
  },
  result: function(result) {
    return this.xf["@@transducer/result"](result);
  }
};

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_map.js
function _map(fn, functor) {
  var idx = 0;
  var len = functor.length;
  var result = Array(len);
  while (idx < len) {
    result[idx] = fn(functor[idx]);
    idx += 1;
  }
  return result;
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isString.js
function _isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArrayLike.js
var _isArrayLike = /* @__PURE__ */ _curry1(function isArrayLike(x) {
  if (isArray_default(x)) {
    return true;
  }
  if (!x) {
    return false;
  }
  if (typeof x !== "object") {
    return false;
  }
  if (_isString(x)) {
    return false;
  }
  if (x.length === 0) {
    return true;
  }
  if (x.length > 0) {
    return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
  }
  return false;
});
var isArrayLike_default = _isArrayLike;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xwrap.js
var XWrap = /* @__PURE__ */ function() {
  function XWrap2(fn) {
    this.f = fn;
  }
  XWrap2.prototype["@@transducer/init"] = function() {
    throw new Error("init not implemented on XWrap");
  };
  XWrap2.prototype["@@transducer/result"] = function(acc) {
    return acc;
  };
  XWrap2.prototype["@@transducer/step"] = function(acc, x) {
    return this.f(acc, x);
  };
  return XWrap2;
}();
function _xwrap(fn) {
  return new XWrap(fn);
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/bind.js
var bind = /* @__PURE__ */ _curry2(function bind2(fn, thisObj) {
  return _arity(fn.length, function() {
    return fn.apply(thisObj, arguments);
  });
});
var bind_default = bind;

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
var symIterator = typeof Symbol !== "undefined" ? Symbol.iterator : "@@iterator";
function _reduce(fn, acc, list) {
  if (typeof fn === "function") {
    fn = _xwrap(fn);
  }
  if (isArrayLike_default(list)) {
    return _arrayReduce(fn, acc, list);
  }
  if (typeof list["fantasy-land/reduce"] === "function") {
    return _methodReduce(fn, acc, list, "fantasy-land/reduce");
  }
  if (list[symIterator] != null) {
    return _iterableReduce(fn, acc, list[symIterator]());
  }
  if (typeof list.next === "function") {
    return _iterableReduce(fn, acc, list);
  }
  if (typeof list.reduce === "function") {
    return _methodReduce(fn, acc, list, "reduce");
  }
  throw new TypeError("reduce: list must be array or iterable");
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_xmap.js
var XMap = /* @__PURE__ */ function() {
  function XMap2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XMap2.prototype["@@transducer/init"] = xfBase_default.init;
  XMap2.prototype["@@transducer/result"] = xfBase_default.result;
  XMap2.prototype["@@transducer/step"] = function(result, input) {
    return this.xf["@@transducer/step"](result, this.f(input));
  };
  return XMap2;
}();
var _xmap = /* @__PURE__ */ _curry2(function _xmap2(f, xf) {
  return new XMap(f, xf);
});
var xmap_default = _xmap;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_has.js
function _has(prop, obj) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArguments.js
var toString = Object.prototype.toString;
var _isArguments = /* @__PURE__ */ function() {
  return toString.call(arguments) === "[object Arguments]" ? function _isArguments2(x) {
    return toString.call(x) === "[object Arguments]";
  } : function _isArguments2(x) {
    return _has("callee", x);
  };
}();
var isArguments_default = _isArguments;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/keys.js
var hasEnumBug = !/* @__PURE__ */ {
  toString: null
}.propertyIsEnumerable("toString");
var nonEnumerableProps = ["constructor", "valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"];
var hasArgsEnumBug = /* @__PURE__ */ function() {
  "use strict";
  return arguments.propertyIsEnumerable("length");
}();
var contains = function contains2(list, item) {
  var idx = 0;
  while (idx < list.length) {
    if (list[idx] === item) {
      return true;
    }
    idx += 1;
  }
  return false;
};
var keys = typeof Object.keys === "function" && !hasArgsEnumBug ? /* @__PURE__ */ _curry1(function keys2(obj) {
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
var keys_default = keys;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/map.js
var map = /* @__PURE__ */ _curry2(/* @__PURE__ */ _dispatchable(["fantasy-land/map", "map"], xmap_default, function map2(fn, functor) {
  switch (Object.prototype.toString.call(functor)) {
    case "[object Function]":
      return curryN_default(functor.length, function() {
        return fn.call(this, functor.apply(this, arguments));
      });
    case "[object Object]":
      return _reduce(function(acc, key) {
        acc[key] = fn(functor[key]);
        return acc;
      }, {}, keys_default(functor));
    default:
      return _map(fn, functor);
  }
}));
var map_default = map;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isInteger.js
var isInteger_default = Number.isInteger || function _isInteger(n) {
  return n << 0 === n;
};

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ap.js
var ap = /* @__PURE__ */ _curry2(function ap2(applyF, applyX) {
  return typeof applyX["fantasy-land/ap"] === "function" ? applyX["fantasy-land/ap"](applyF) : typeof applyF.ap === "function" ? applyF.ap(applyX) : typeof applyF === "function" ? function(x) {
    return applyF(x)(applyX(x));
  } : _reduce(function(acc, f) {
    return _concat(acc, map_default(f, applyX));
  }, [], applyF);
});
var ap_default = ap;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/isNil.js
var isNil = /* @__PURE__ */ _curry1(function isNil2(x) {
  return x == null;
});
var isNil_default = isNil;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/liftN.js
var liftN = /* @__PURE__ */ _curry2(function liftN2(arity, fn) {
  var lifted = curryN_default(arity, fn);
  return curryN_default(arity, function() {
    return _reduce(ap_default, map_default(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
  });
});
var liftN_default = liftN;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/lift.js
var lift = /* @__PURE__ */ _curry1(function lift2(fn) {
  return liftN_default(fn.length, fn);
});
var lift_default = lift;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/not.js
var not = /* @__PURE__ */ _curry1(function not2(a) {
  return !a;
});
var not_default = not;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/complement.js
var complement = /* @__PURE__ */ lift_default(not_default);
var complement_default = complement;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_toISOString.js
var pad = function pad2(n) {
  return (n < 10 ? "0" : "") + n;
};
var _toISOString = typeof Date.prototype.toISOString === "function" ? function _toISOString2(d) {
  return d.toISOString();
} : function _toISOString3(d) {
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "." + (d.getUTCMilliseconds() / 1e3).toFixed(3).slice(2, 5) + "Z";
};

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/trim.js
var hasProtoTrim = typeof String.prototype.trim === "function";

// src/utilities/generic.ts
var isNotNil = complement_default(isNil_default);
var createEnum = (...args) => {
  return Object.fromEntries(args.map((enumName, index) => [
    [enumName, index],
    [index, enumName]
  ]).flat());
};

// src/draw.ts
var activeContext = null;
var sendToContext = (item) => {
  if (!activeContext)
    throw new Error("Outside of context");
  activeContext.push(item);
};
var e = createEnum("arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath", "createConicGradient", "createImageData", "createLinearGradient", "createPattern", "createRadialGradient", "drawFocusIfNeeded", "drawImage", "ellipse", "fill", "fillRect", "fillText", "getContextAttributes", "getImageData", "getLineDash", "getTransform", "isContextLost", "isPointInPath", "isPointInStroke", "lineTo", "measureText", "moveTo", "putImageData", "quadraticCurveTo", "rect", "reset", "resetTransform", "restore", "rotate", "roundRect", "save", "scale", "setLineDash", "setTransform", "stroke", "strokeRect", "strokeText", "transform", "translate", "direction", "fillStyle", "filter", "font", "fontKerning", "fontStretch", "fontVariantCaps", "globalAlpha", "globalCompositeOperation", "imageSmoothingEnabled", "imageSmoothingQuality", "letterSpacing", "lineCap", "lineDashOffset", "lineJoin", "lineWidth", "miterLimit", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "strokeStyle", "textAlign", "textBaseline", "textRendering", "wordSpacing");
var c = (e2) => {
  return (...args) => sendToContext([e2, args]);
};
var hf = () => (ctx2, enumber, args) => {
  ctx2[e[enumber]](...args);
};
var hs = () => (ctx2, enumber, [value]) => {
  ctx2[e[enumber]] = value;
};
var drawHandlers = /* @__PURE__ */ new Map();
var arcTo = c(e.arcTo);
var beginPath = c(e.beginPath);
var bezierCurveTo = c(e.bezierCurveTo);
var clearRect = c(e.clearRect);
var clip = c(e.clip);
var closePath = c(e.closePath);
var createConicGradient = c(e.createConicGradient);
var createImageData = c(e.createImageData);
var createLinearGradient = c(e.createLinearGradient);
var createPattern = c(e.createPattern);
var createRadialGradient = c(e.createRadialGradient);
var drawFocusIfNeeded = c(e.drawFocusIfNeeded);
var drawImage = c(e.drawImage);
var ellipse = c(e.ellipse);
var fill = c(e.fill);
var fillRect = c(e.fillRect);
var fillText = c(e.fillText);
var getContextAttributes = c(e.getContextAttributes);
var getImageData = c(e.getImageData);
var getLineDash = c(e.getLineDash);
var getTransform = c(e.getTransform);
var isContextLost = c(e.isContextLost);
var isPointInPath = c(e.isPointInPath);
var isPointInStroke = c(e.isPointInStroke);
var lineTo = c(e.lineTo);
var measureText = c(e.measureText);
var moveTo = c(e.moveTo);
var putImageData = c(e.putImageData);
var quadraticCurveTo = c(e.quadraticCurveTo);
var rect = c(e.rect);
var reset = c(e.reset);
var resetTransform = c(e.resetTransform);
var restore = c(e.restore);
var rotate = c(e.rotate);
var roundRect = c(e.roundRect);
var save = c(e.save);
var scale = c(e.scale);
var setLineDash = c(e.setLineDash);
var setTransform = c(e.setTransform);
var stroke = c(e.stroke);
var strokeRect = c(e.strokeRect);
var strokeText = c(e.strokeText);
var transform = c(e.transform);
var translate = c(e.translate);
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
var direction = c(e.direction);
var fillStyle = c(e.fillStyle);
var filter = c(e.filter);
var font = c(e.font);
var fontKerning = c(e.fontKerning);
var fontStretch = c(e.fontStretch);
var fontVariantCaps = c(e.fontVariantCaps);
var globalAlpha = c(e.globalAlpha);
var globalCompositeOperation = c(e.globalCompositeOperation);
var imageSmoothingEnabled = c(e.imageSmoothingEnabled);
var imageSmoothingQuality = c(e.imageSmoothingQuality);
var letterSpacing = c(e.letterSpacing);
var lineCap = c(e.lineCap);
var lineDashOffset = c(e.lineDashOffset);
var lineJoin = c(e.lineJoin);
var lineWidth = c(e.lineWidth);
var miterLimit = c(e.miterLimit);
var shadowBlur = c(e.shadowBlur);
var shadowColor = c(e.shadowColor);
var shadowOffsetX = c(e.shadowOffsetX);
var shadowOffsetY = c(e.shadowOffsetY);
var strokeStyle = c(e.strokeStyle);
var textAlign = c(e.textAlign);
var textBaseline = c(e.textBaseline);
var textRendering = c(e.textRendering);
var wordSpacing = c(e.wordSpacing);
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
var executeOnCanvas = (ctx2, [enumber, args]) => {
  drawHandlers.get(enumber)(ctx2, enumber, args);
};

// src/canvas-worker.ts
var canvas;
var ctx;
var setCanvas = (offscreenCanvas) => {
  canvas = offscreenCanvas;
  ctx = canvas.getContext("2d");
};
var newRenderer2 = (handlers) => {
  for (let handler of handlers) {
    executeOnCanvas(ctx, handler);
  }
};
var comlinkObj = { setCanvas, newRenderer2 };
self.onconnect = (event) => {
  console.log("connected");
  const port = event.ports[0];
  expose(comlinkObj, port);
};
//# sourceMappingURL=canvas-worker.js.map
