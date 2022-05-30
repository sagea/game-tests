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

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_curry3.js
function _curry3(fn) {
  return function f3(a, b, c2) {
    switch (arguments.length) {
      case 0:
        return f3;
      case 1:
        return _isPlaceholder(a) ? f3 : _curry2(function(_b, _c) {
          return fn(a, _b, _c);
        });
      case 2:
        return _isPlaceholder(a) && _isPlaceholder(b) ? f3 : _isPlaceholder(a) ? _curry2(function(_a, _c) {
          return fn(_a, b, _c);
        }) : _isPlaceholder(b) ? _curry2(function(_b, _c) {
          return fn(a, _b, _c);
        }) : _curry1(function(_c) {
          return fn(a, b, _c);
        });
      default:
        return _isPlaceholder(a) && _isPlaceholder(b) && _isPlaceholder(c2) ? f3 : _isPlaceholder(a) && _isPlaceholder(b) ? _curry2(function(_a, _b) {
          return fn(_a, _b, c2);
        }) : _isPlaceholder(a) && _isPlaceholder(c2) ? _curry2(function(_a, _c) {
          return fn(_a, b, _c);
        }) : _isPlaceholder(b) && _isPlaceholder(c2) ? _curry2(function(_b, _c) {
          return fn(a, _b, _c);
        }) : _isPlaceholder(a) ? _curry1(function(_a) {
          return fn(_a, b, c2);
        }) : _isPlaceholder(b) ? _curry1(function(_b) {
          return fn(a, _b, c2);
        }) : _isPlaceholder(c2) ? _curry1(function(_c) {
          return fn(a, b, _c);
        }) : fn(a, b, c2);
    }
  };
}

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
function _isString(x2) {
  return Object.prototype.toString.call(x2) === "[object String]";
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_isArrayLike.js
var _isArrayLike = /* @__PURE__ */ _curry1(function isArrayLike(x2) {
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
  XWrap2.prototype["@@transducer/step"] = function(acc, x2) {
    return this.f(acc, x2);
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
  return toString.call(arguments) === "[object Arguments]" ? function _isArguments2(x2) {
    return toString.call(x2) === "[object Arguments]";
  } : function _isArguments2(x2) {
    return _has("callee", x2);
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

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/reduce.js
var reduce = /* @__PURE__ */ _curry3(_reduce);
var reduce_default = reduce;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/ap.js
var ap = /* @__PURE__ */ _curry2(function ap2(applyF, applyX) {
  return typeof applyX["fantasy-land/ap"] === "function" ? applyX["fantasy-land/ap"](applyF) : typeof applyF.ap === "function" ? applyF.ap(applyX) : typeof applyF === "function" ? function(x2) {
    return applyF(x2)(applyX(x2));
  } : _reduce(function(acc, f) {
    return _concat(acc, map_default(f, applyX));
  }, [], applyF);
});
var ap_default = ap;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/isNil.js
var isNil = /* @__PURE__ */ _curry1(function isNil2(x2) {
  return x2 == null;
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

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_pipe.js
function _pipe(f, g) {
  return function() {
    return g.call(this, f.apply(this, arguments));
  };
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_checkForMethod.js
function _checkForMethod(methodname, fn) {
  return function() {
    var length = arguments.length;
    if (length === 0) {
      return fn();
    }
    var obj = arguments[length - 1];
    return isArray_default(obj) || typeof obj[methodname] !== "function" ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length - 1));
  };
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/slice.js
var slice = /* @__PURE__ */ _curry3(/* @__PURE__ */ _checkForMethod("slice", function slice2(fromIndex, toIndex, list) {
  return Array.prototype.slice.call(list, fromIndex, toIndex);
}));
var slice_default = slice;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/tail.js
var tail = /* @__PURE__ */ _curry1(/* @__PURE__ */ _checkForMethod("tail", /* @__PURE__ */ slice_default(1, Infinity)));
var tail_default = tail;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/pipe.js
function pipe() {
  if (arguments.length === 0) {
    throw new Error("pipe requires at least one argument");
  }
  return _arity(arguments[0].length, reduce_default(_pipe, arguments[0], tail_default(arguments)));
}

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_toISOString.js
var pad = function pad2(n) {
  return (n < 10 ? "0" : "") + n;
};
var _toISOString = typeof Date.prototype.toISOString === "function" ? function _toISOString2(d) {
  return d.toISOString();
} : function _toISOString3(d) {
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "." + (d.getUTCMilliseconds() / 1e3).toFixed(3).slice(2, 5) + "Z";
};

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/curry.js
var curry = /* @__PURE__ */ _curry1(function curry2(fn) {
  return curryN_default(fn.length, fn);
});
var curry_default = curry;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/forEach.js
var forEach = /* @__PURE__ */ _curry2(/* @__PURE__ */ _checkForMethod("forEach", function forEach2(fn, list) {
  var len = list.length;
  var idx = 0;
  while (idx < len) {
    fn(list[idx]);
    idx += 1;
  }
  return list;
}));
var forEach_default = forEach;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/internal/_objectAssign.js
function _objectAssign(target) {
  if (target == null) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  var output = Object(target);
  var idx = 1;
  var length = arguments.length;
  while (idx < length) {
    var source = arguments[idx];
    if (source != null) {
      for (var nextKey in source) {
        if (_has(nextKey, source)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
    idx += 1;
  }
  return output;
}
var objectAssign_default = typeof Object.assign === "function" ? Object.assign : _objectAssign;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/mergeLeft.js
var mergeLeft = /* @__PURE__ */ _curry2(function mergeLeft2(l, r) {
  return objectAssign_default({}, r, l);
});
var mergeLeft_default = mergeLeft;

// node_modules/.pnpm/ramda@0.28.0/node_modules/ramda/es/trim.js
var hasProtoTrim = typeof String.prototype.trim === "function";

// src/Vector.ts
var getX = ([x2]) => x2;
var setX = ([_x, _y], value) => [value, _y];
var getY = ([_2, y2]) => y2;
var setY = ([_x], value) => [_x, value];
var from = (x2 = 0, y2 = x2) => {
  if (Array.isArray(x2))
    return from(x2[0], x2[1]);
  return [x2, y2];
};
var x = (...args) => {
  if (args.length === 0)
    throw new Error("X requires a method");
  if (args.length === 1)
    return getX(...args);
  if (args.length === 2)
    return setX(...args);
};
var y = (...args) => {
  if (args.length === 0)
    throw new Error("X requires a method");
  if (args.length === 1)
    return getY(...args);
  if (args.length === 2)
    return setY(...args);
};
var add = curry_default((_1, _2) => {
  const [x1, y1] = from(_1);
  const [x2, y2] = from(_2);
  return [x1 + x2, y1 + y2];
});

// src/draw.ts
var createHandler = (type, creator) => (...args) => ({ type, ...creator(...args) });
var createStyleMethod = (key) => curry_default((value, renderState2) => mergeLeft_default(renderState2, { [key]: value }));
var fillStyle = createStyleMethod("fillStyle");
var font = createStyleMethod("font");
var lineWidth = createStyleMethod("lineWidth");
var strokeStyle = createStyleMethod("strokeStyle");
var attachStyles = (styles) => {
  if (styles.length === 0)
    return {};
  return pipe(...styles)({});
};
var rect = createHandler("fillRect", (pos, size, ...styles) => ({ args: [...pos, ...size], styles: attachStyles(styles) }));
var text = createHandler("fillText", (text2, pos, ...styles) => ({ args: [text2, ...pos], styles: attachStyles(styles) }));
var path = createHandler("__path__", (paths, ...styles) => ({ paths, styles: attachStyles(styles) }));
var clearRect = createHandler("clearRect", (pos, size) => ({ args: [...pos, ...size] }));
var addStyleKey = curry_default((key, state) => mergeLeft_default(state, {
  [key]: (ctx, value) => Object.assign(ctx, { [key]: value })
}));
var styleHandlers = pipe(addStyleKey("strokeStyle"), addStyleKey("lineWidth"), addStyleKey("fillStyle"), addStyleKey("font"))({});
var renderState = (ctx, state) => {
  state.forEach(({ type, args, paths, styles = {} }) => {
    ctx.save();
    Object.entries(styles).forEach(([key, value]) => styleHandlers[key](ctx, value));
    if (type === "__path__") {
      const first = paths[0];
      ctx.beginPath();
      ctx.moveTo(x(first), y(first));
      forEach_default((path2) => ctx.lineTo(x(path2), y(path2)), paths.slice(1));
      ctx.stroke();
      ctx.closePath();
    } else {
      ctx[type](...args);
    }
    ctx.restore();
  });
};

// node_modules/.pnpm/baconjs@3.0.17/node_modules/baconjs/dist/Bacon.mjs
function nop() {
}
var isArray = Array.isArray || function(xs) {
  return xs instanceof Array;
};
function isObservable(x2) {
  return x2 && x2._isObservable;
}
function all(xs, f) {
  for (var i = 0, x2; i < xs.length; i++) {
    x2 = xs[i];
    if (!f(x2)) {
      return false;
    }
  }
  return true;
}
function always(x2) {
  return () => x2;
}
function any(xs, f) {
  for (var i = 0, x2; i < xs.length; i++) {
    x2 = xs[i];
    if (f(x2)) {
      return true;
    }
  }
  return false;
}
function bind3(fn, me) {
  return function() {
    return fn.apply(me, arguments);
  };
}
function contains3(xs, x2) {
  return indexOf(xs, x2) !== -1;
}
function each(xs, f) {
  for (var key in xs) {
    if (Object.prototype.hasOwnProperty.call(xs, key)) {
      var value = xs[key];
      f(key, value);
    }
  }
}
function empty(xs) {
  return xs.length === 0;
}
function filter(f, xs) {
  var filtered = [];
  for (var i = 0, x2; i < xs.length; i++) {
    x2 = xs[i];
    if (f(x2)) {
      filtered.push(x2);
    }
  }
  return filtered;
}
function flatMap(f, xs) {
  return fold(xs, [], function(ys, x2) {
    return ys.concat(f(x2));
  });
}
function flip(f) {
  return (a, b) => f(b, a);
}
function fold(xs, seed, f) {
  for (var i = 0, x2; i < xs.length; i++) {
    x2 = xs[i];
    seed = f(seed, x2);
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
  for (var i = 0, y2; i < xs.length; i++) {
    y2 = xs[i];
    if (x2 === y2) {
      return i;
    }
  }
  return -1;
}
var indexOf = Array.prototype.indexOf ? indexOfDefault : indexOfFallback;
function indexWhere(xs, f) {
  for (var i = 0, y2; i < xs.length; i++) {
    y2 = xs[i];
    if (f(y2)) {
      return i;
    }
  }
  return -1;
}
function isFunction(f) {
  return typeof f === "function";
}
function last(xs) {
  return xs[xs.length - 1];
}
function map3(f, xs) {
  var result = [];
  for (var i = 0, x2; i < xs.length; i++) {
    x2 = xs[i];
    result.push(f(x2));
  }
  return result;
}
function negate(f) {
  return function(x2) {
    return !f(x2);
  };
}
function remove(x2, xs) {
  var i = indexOf(xs, x2);
  if (i >= 0) {
    return xs.splice(i, 1);
  }
}
function tail2(xs) {
  return xs.slice(1, xs.length);
}
function toArray(xs) {
  return isArray(xs) ? xs : [xs];
}
function toFunction(f) {
  if (typeof f == "function") {
    return f;
  }
  return (x2) => f;
}
function toString2(obj) {
  var hasProp = {}.hasOwnProperty;
  try {
    recursionDepth++;
    if (obj == null) {
      return "undefined";
    } else if (isFunction(obj)) {
      return "function";
    } else if (isArray(obj)) {
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
  return filter(function(y2) {
    return y2 !== x2;
  }, xs);
}
var _ = {
  indexOf,
  indexWhere,
  head,
  always,
  negate,
  empty,
  tail: tail2,
  filter,
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
  isFunction,
  toFunction,
  toString: toString2
};
var recursionDepth = 0;
var more = void 0;
var noMore = "<no-more>";
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
function assertFunction(f) {
  return assert("not a function : " + f, _.isFunction(f));
}
function assertNoArguments(args) {
  return assert("no arguments supported", args.length === 0);
}
var defaultScheduler = {
  setTimeout(f, d) {
    return setTimeout(f, d);
  },
  setInterval(f, i) {
    return setInterval(f, i);
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
var GlobalScheduler = {
  scheduler: defaultScheduler
};
var rootEvent = void 0;
var waiterObs = [];
var waiters = {};
var aftersStack = [];
var aftersStackHeight = 0;
var flushed = {};
var processingAfters = false;
function toString$1() {
  return _.toString({ rootEvent, processingAfters, waiterObs, waiters, aftersStack, aftersStackHeight, flushed });
}
function ensureStackHeight(h) {
  if (h <= aftersStackHeight)
    return;
  if (!aftersStack[h - 1]) {
    aftersStack[h - 1] = [[], 0];
  }
  aftersStackHeight = h;
}
function isInTransaction() {
  return rootEvent !== void 0;
}
function soonButNotYet(obs, f) {
  if (rootEvent) {
    whenDoneWith(obs, f);
  } else {
    GlobalScheduler.scheduler.setTimeout(f, 0);
  }
}
function afterTransaction(obs, f) {
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
    listFromStack.push([obs, f]);
    if (!rootEvent) {
      processAfters();
    }
  } else {
    return f();
  }
}
function containsObs(obs, aftersList) {
  for (var i = 0; i < aftersList.length; i++) {
    if (aftersList[i][0].id == obs.id)
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
function whenDoneWith(obs, f) {
  if (rootEvent) {
    var obsWaiters = waiters[obs.id];
    if (obsWaiters === void 0) {
      obsWaiters = waiters[obs.id] = [f];
      return waiterObs.push(obs);
    } else {
      return obsWaiters.push(f);
    }
  } else {
    return f();
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
  for (var i = 0, f; i < obsWaiters.length; i++) {
    f = obsWaiters[i];
    f();
  }
}
function flushDepsOf(obs) {
  if (flushed[obs.id])
    return;
  var deps = obs.internalDeps();
  for (var i = 0, dep; i < deps.length; i++) {
    dep = deps[i];
    flushDepsOf(dep);
    if (waiters[dep.id]) {
      var index = _.indexOf(waiterObs, dep);
      flushWaiters(index, false);
    }
  }
  flushed[obs.id] = true;
}
function inTransaction(event, context, f, args) {
  if (rootEvent) {
    return f.apply(context, args);
  } else {
    rootEvent = event;
    try {
      var result = f.apply(context, args);
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
var UpdateBarrier = { toString: toString$1, whenDoneWith, hasWaiters, inTransaction, currentEventId, wrappedSubscribe, afterTransaction, soonButNotYet, isInTransaction };
var Desc = class {
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
    let args = _.map(_.toString, this.args);
    return _.toString(this.context) + "." + _.toString(this.method) + "(" + args + ")";
  }
};
function describe(context, method, ...args) {
  const ref = context || method;
  if (ref && ref._isDesc) {
    return context || method;
  } else {
    return new Desc(context, method, args);
  }
}
function findDeps(x2) {
  if (isArray(x2)) {
    return _.flatMap(findDeps, x2);
  } else if (isObservable(x2)) {
    return [x2];
  } else if (typeof x2 !== "undefined" && x2 !== null ? x2._isSource : void 0) {
    return [x2.obs];
  } else {
    return [];
  }
}
var nullSink = () => more;
var nullVoidSink = () => more;
function withStateMachine(initState, f, src) {
  return src.transform(withStateMachineT(initState, f), new Desc(src, "withStateMachine", [initState, f]));
}
function withStateMachineT(initState, f) {
  let state = initState;
  return (event, sink) => {
    var fromF = f(state, event);
    var [newState, outputs] = fromF;
    state = newState;
    var reply = more;
    for (var i = 0; i < outputs.length; i++) {
      let output = outputs[i];
      reply = sink(output);
      if (reply === noMore) {
        return reply;
      }
    }
    return reply;
  };
}
var Some = class {
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
  filter(f) {
    if (f(this.value)) {
      return new Some(this.value);
    } else {
      return None;
    }
  }
  map(f) {
    return new Some(f(this.value));
  }
  forEach(f) {
    f(this.value);
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
var None = {
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
function none() {
  return None;
}
function toOption(v) {
  if (v && (v._isSome || v._isNone)) {
    return v;
  } else {
    return new Some(v);
  }
}
function isNone(object) {
  return typeof object !== "undefined" && object !== null ? object._isNone : false;
}
var eventIdCounter = 0;
var Event = class {
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
  filter(f) {
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
var Value = class extends Event {
  constructor(value) {
    super();
    this.hasValue = true;
    if (value instanceof Event) {
      throw new Error$1("Wrapping an event inside other event");
    }
    this.value = value;
  }
  fmap(f) {
    return this.apply(f(this.value));
  }
  filter(f) {
    return f(this.value);
  }
  toString() {
    return _.toString(this.value);
  }
  log() {
    return this.value;
  }
};
var Next = class extends Value {
  constructor(value) {
    super(value);
    this.isNext = true;
    this._isNext = true;
  }
  apply(value) {
    return new Next(value);
  }
};
var Initial = class extends Value {
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
var NoValue = class extends Event {
  constructor() {
    super(...arguments);
    this.hasValue = false;
  }
  fmap(f) {
    return this;
  }
};
var End = class extends NoValue {
  constructor() {
    super(...arguments);
    this.isEnd = true;
  }
  toString() {
    return "<end>";
  }
};
var Error$1 = class extends NoValue {
  constructor(error) {
    super();
    this.isError = true;
    this.error = error;
  }
  toString() {
    return "<error> " + _.toString(this.error);
  }
};
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
function equals(a, b) {
  return a === b;
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
function take(count, src, desc) {
  return src.transform(takeT(count), desc || new Desc(src, "take", [count]));
}
function takeT(count) {
  return (e2, sink) => {
    if (!e2.hasValue) {
      return sink(e2);
    } else {
      count--;
      if (count > 0) {
        return sink(e2);
      } else {
        if (count === 0) {
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
function doErrorT(f) {
  return (event, sink) => {
    if (isError(event)) {
      f(event.error);
    }
    return sink(event);
  };
}
function doActionT(f) {
  return (event, sink) => {
    if (hasValue(event)) {
      f(event.value);
    }
    return sink(event);
  };
}
function doEndT(f) {
  return (event, sink) => {
    if (isEnd(event)) {
      f();
    }
    return sink(event);
  };
}
function scan(src, seed, f) {
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
          var next = f(prev, event.value);
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
  return resultProperty = new Property(new Desc(src, "scan", [seed, f]), subscribe);
}
function mapEndT(f) {
  let theF = _.toFunction(f);
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
function mapErrorT(f) {
  let theF = _.toFunction(f);
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
var CompositeUnsubscribe = class {
  constructor(ss = []) {
    this.unsubscribed = false;
    this.unsubscribe = _.bind(this.unsubscribe, this);
    this.unsubscribed = false;
    this.subscriptions = [];
    this.starting = [];
    for (var i = 0, s; i < ss.length; i++) {
      s = ss[i];
      this.add(s);
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
        _.remove(subscription, this.starting);
      };
      unsub = subscription(this.unsubscribe, unsubMe);
      if (!(this.unsubscribed || ended)) {
        this.subscriptions.push(unsub);
      } else {
        unsub();
      }
      _.remove(subscription, this.starting);
    }
  }
  remove(unsub) {
    if (this.unsubscribed) {
      return;
    }
    if (_.remove(unsub, this.subscriptions) !== void 0) {
      return unsub();
    }
  }
  unsubscribe() {
    if (this.unsubscribed) {
      return;
    }
    this.unsubscribed = true;
    var iterable = this.subscriptions;
    for (var i = 0; i < iterable.length; i++) {
      iterable[i]();
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
  const s = new EventStream(new Desc("Bacon", "once", [value]), function(sink) {
    UpdateBarrier.soonButNotYet(s, function() {
      sink(toEvent(value));
      sink(endEvent());
    });
    return nop;
  });
  return s;
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
            _.remove(child, childDeps);
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
function handleEventValueWith(f) {
  if (typeof f == "function") {
    return (event) => {
      if (hasValue(event)) {
        return f(event.value);
      }
      return event;
    };
  }
  return (event) => f;
}
function makeObservable(x2) {
  if (isObservable(x2)) {
    return x2;
  } else {
    return once(x2);
  }
}
function flatMapEvent(src, f) {
  return flatMap_(f, src, {
    mapError: true,
    desc: new Desc(src, "flatMapEvent", [f])
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
var Source = class {
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
  mayHave(count) {
    return true;
  }
};
var DefaultSource = class extends Source {
  consume() {
    return this.value;
  }
  push(x2) {
    this.value = x2;
  }
  hasAtLeast(c2) {
    return !!this.value;
  }
};
var ConsumingSource = class extends Source {
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
  mayHave(count) {
    return !this.ended || this.queue.length >= count;
  }
  hasAtLeast(count) {
    return this.queue.length >= count;
  }
};
var BufferingSource = class extends Source {
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
  hasAtLeast(count) {
    return true;
  }
};
function isTrigger(s) {
  if (s == null)
    return false;
  if (s._isSource) {
    return s.sync;
  } else {
    return s._isEventStream;
  }
}
function fromObservable(s) {
  if (s != null && s._isSource) {
    return s;
  } else if (s != null && s._isProperty) {
    return new DefaultSource(s, false);
  } else {
    return new ConsumingSource(s, true);
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
  var needsBarrier = any(sources, (s) => s.flatten) && containsDuplicateDeps(map3((s) => s.obs, sources));
  var desc = new Desc("Bacon", "when", Array.prototype.slice.call(patterns));
  var resultStream = ctor(desc, function(sink) {
    var triggers = [];
    var ends = false;
    function match(p) {
      for (var i = 0; i < p.ixs.length; i++) {
        let ix = p.ixs[i];
        if (!sources[ix.index].hasAtLeast(ix.count)) {
          return false;
        }
      }
      return true;
    }
    function cannotMatch(p) {
      for (var i = 0; i < p.ixs.length; i++) {
        let ix = p.ixs[i];
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
            for (var i = 0, p; i < ixPats.length; i++) {
              p = ixPats[i];
              if (match(p)) {
                const values = [];
                for (var j = 0; j < p.ixs.length; j++) {
                  let event = sources[p.ixs[j].index].consume();
                  if (!event)
                    throw new Error("Event was undefined");
                  values.push(event.value);
                }
                let applied = p.f.apply(null, values);
                reply = sink(trigger.e.apply(applied));
                if (triggers.length) {
                  triggers = filter(nonFlattened, triggers);
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
  for (let i = 0; i < rawPatterns.length; i++) {
    let [patSources, f] = rawPatterns[i];
    var pat = { f, ixs: [] };
    var triggerFound = false;
    for (var j = 0, s; j < patSources.length; j++) {
      s = patSources[j];
      var index = indexOf(sources, s);
      if (!triggerFound) {
        triggerFound = isTrigger(s);
      }
      if (index < 0) {
        sources.push(s);
        index = sources.length - 1;
      }
      for (var k = 0; k < pat.ixs.length; k++) {
        let ix = pat.ixs[k];
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
  var i = 0;
  var len = sourceArgs.length;
  var rawPatterns = [];
  while (i < len) {
    let patSources = toArray(sourceArgs[i++]);
    let f = toFunction(sourceArgs[i++]);
    rawPatterns.push([patSources, f]);
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
  for (let i = 0; i < patterns.length; i++) {
    let pattern = patterns[i];
    if (!isTypedOrRawPattern(pattern)) {
      return extractLegacyPatterns(patterns);
    }
    if (isRawPattern(pattern)) {
      rawPatterns.push([pattern[0], toFunction(pattern[1])]);
    } else {
      let sources = pattern.slice(0, pattern.length - 1);
      let f = toFunction(pattern[pattern.length - 1]);
      rawPatterns.push([sources, f]);
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
function withLatestFromE(sampler, samplee, f) {
  var result = when([new DefaultSource(samplee.toProperty(), false), new DefaultSource(sampler, true), flip(f)]);
  return result.withDesc(new Desc(sampler, "withLatestFrom", [samplee, f]));
}
function withLatestFromP(sampler, samplee, f) {
  var result = whenP([new DefaultSource(samplee.toProperty(), false), new DefaultSource(sampler, true), flip(f)]);
  return result.withDesc(new Desc(sampler, "withLatestFrom", [samplee, f]));
}
function withLatestFrom(sampler, samplee, f) {
  if (sampler instanceof Property) {
    return withLatestFromP(sampler, samplee, f);
  } else if (sampler instanceof EventStream) {
    return withLatestFromE(sampler, samplee, f);
  } else {
    throw new Error("Unknown observable: " + sampler);
  }
}
function map$1(src, f) {
  if (f instanceof Property) {
    return withLatestFrom(src, f, (a, b) => b);
  }
  return src.transform(mapT(f), new Desc(src, "map", [f]));
}
function mapT(f) {
  let theF = _.toFunction(f);
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
  return _.flatMap(singleToObservables, args);
}
function singleToObservables(x2) {
  if (isObservable(x2)) {
    return [x2];
  } else if (isArray(x2)) {
    return argumentsToObservables(x2);
  } else {
    return [constant(x2)];
  }
}
function argumentsToObservablesAndFunction(args) {
  if (_.isFunction(args[0])) {
    return [argumentsToObservables(Array.prototype.slice.call(args, 1)), args[0]];
  } else {
    return [argumentsToObservables(Array.prototype.slice.call(args, 0, args.length - 1)), _.last(args)];
  }
}
function groupSimultaneous_(streams, options) {
  let sources = _.map((stream) => new BufferingSource(stream), streams);
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
    for (var i = 0; i < streams.length; i++) {
      let stream = isObservable(streams[i]) ? streams[i] : constant(streams[i]);
      sources.push(wrap(stream));
    }
    return whenP([sources, (...xs) => xs]).withDesc(new Desc("Bacon", "combineAsArray", streams));
  } else {
    return constant([]);
  }
}
function combineTwo(left, right, f) {
  return whenP([[wrap(left), wrap(right)], f]).withDesc(new Desc(left, "combine", [right, f]));
}
function wrap(obs) {
  return new DefaultSource(obs, true);
}
function skip(src, count) {
  return src.transform((event, sink) => {
    if (!event.hasValue) {
      return sink(event);
    } else if (count > 0) {
      count--;
      return more;
    } else {
      return sink(event);
    }
  }, new Desc(src, "skip", [count]));
}
function flatMapConcat(src, f) {
  return flatMap_(handleEventValueWith(f), src, {
    desc: new Desc(src, "flatMapConcat", [f]),
    limit: 1
  });
}
function fromBinder(binder, eventTransformer = _.id) {
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
      let valueArray = isArray(value_) && isEvent(_.last(value_)) ? value_ : [value_];
      var reply = more;
      for (var i = 0; i < valueArray.length; i++) {
        let event = toEvent(valueArray[i]);
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
    return _.id;
  }
}
function sampledBy(samplee, sampler, f) {
  if (samplee instanceof EventStream) {
    return sampledByE(samplee, sampler, f);
  } else {
    return sampledByP(samplee, sampler, f);
  }
}
function sampledByP(samplee, sampler, f) {
  let combinator = makeCombinator(f);
  var result = withLatestFrom(sampler, samplee, flip(combinator));
  return result.withDesc(new Desc(samplee, "sampledBy", [sampler]));
}
function sampledByE(samplee, sampler, f) {
  return sampledByP(samplee.toProperty(), sampler, f).withDesc(new Desc(samplee, "sampledBy", [sampler]));
}
function sampleP(samplee, samplingInterval) {
  return sampledByP(samplee, interval(samplingInterval, {}), (a, b) => a).withDesc(new Desc(samplee, "sample", [samplingInterval]));
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
function toPredicate(f) {
  if (typeof f == "boolean") {
    return _.always(f);
  } else if (typeof f != "function") {
    throw new Error("Not a function: " + f);
  } else {
    return f;
  }
}
function withPredicate(src, f, predicateTransformer, desc) {
  if (f instanceof Property) {
    return withLatestFrom(src, f, (p, v) => [p, v]).transform(composeT(predicateTransformer((tuple) => tuple[1]), mapT((tuple) => tuple[0])), desc);
  }
  return src.transform(predicateTransformer(toPredicate(f)), desc);
}
function filter$1(src, f) {
  return withPredicate(src, f, filterT, new Desc(src, "filter", [f]));
}
function filterT(f) {
  return (e2, sink) => {
    if (e2.filter(f)) {
      return sink(e2);
    } else {
      return more;
    }
  };
}
function not3(src) {
  return src.map((x2) => !x2).withDesc(new Desc(src, "not", []));
}
function and(left, right) {
  return left.combine(toProperty(right), (x2, y2) => !!(x2 && y2)).withDesc(new Desc(left, "and", [right]));
}
function or(left, right) {
  return left.combine(toProperty(right), (x2, y2) => x2 || y2).withDesc(new Desc(left, "or", [right]));
}
function toProperty(x2) {
  if (isProperty(x2)) {
    return x2;
  }
  return constant(x2);
}
function flatMapFirst(src, f) {
  return flatMap_(handleEventValueWith(f), src, {
    firstOnly: true,
    desc: new Desc(src, "flatMapFirst", [f])
  });
}
function concatE(left, right, options) {
  return new EventStream(new Desc(left, "concat", [right]), function(sink) {
    var unsubRight = nop;
    var unsubLeft = left.dispatcher.subscribe(function(e2) {
      if (e2.isEnd) {
        unsubRight = right.toEventStream().dispatcher.subscribe(sink);
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
function transformPropertyChanges(property, f, desc) {
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
  const transformedChanges = f(changes);
  const combo = propertyFromStreamSubscribe(desc, (sink) => {
    comboSink = sink;
    return transformedChanges.dispatcher.subscribe(function(event) {
      sink(event);
    });
  });
  return combo;
}
function fold$1(src, seed, f) {
  return src.scan(seed, f).last().withDesc(new Desc(src, "fold", [seed, f]));
}
function startWithE(src, seed) {
  return once(seed).concat(src).withDesc(new Desc(src, "startWith", [seed]));
}
function startWithP(src, seed) {
  return src.scan(seed, (prev, next) => next).withDesc(new Desc(src, "startWith", [seed]));
}
var endMarker = {};
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
        for (var i = 0; i < data.length; i++) {
          let value = data[i];
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
function flatMap$1(src, f) {
  return flatMap_(handleEventValueWith(f), src, { desc: new Desc(src, "flatMap", [f]) });
}
function flatMapError(src, f) {
  return flatMap_((x2) => {
    if (x2 instanceof Error$1) {
      let error = x2.error;
      return f(error);
    } else {
      return x2;
    }
  }, src, {
    mapError: true,
    desc: new Desc(src, "flatMapError", [f])
  });
}
var spies = [];
var running = false;
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
  let f = _.toFunction(f_);
  var stream = isProperty(src) ? src.toEventStream(allowSync) : src;
  let flatMapped = flatMap$1(stream, (value) => makeObservable(f(value)).takeUntil(stream));
  if (isProperty(src))
    flatMapped = flatMapped.toProperty();
  return flatMapped.withDesc(new Desc(src, "flatMapLatest", [f]));
}
var Dispatcher = class {
  constructor(observable, _subscribe, _handleEvent) {
    this.pushing = false;
    this.ended = false;
    this.prevError = void 0;
    this.unsubSrc = void 0;
    this._subscribe = _subscribe;
    this._handleEvent = _handleEvent;
    this.subscribe = _.bind(this.subscribe, this);
    this.handleEvent = _.bind(this.handleEvent, this);
    this.subscriptions = [];
    this.observable = observable;
    this.queue = [];
  }
  hasSubscribers() {
    return this.subscriptions.length > 0;
  }
  removeSub(subscription) {
    this.subscriptions = _.without(subscription, this.subscriptions);
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
      for (let i = 0; i < len; i++) {
        const sub = tmp[i];
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
var PropertyDispatcher = class extends Dispatcher {
  constructor(property, subscribe, handleEvent) {
    super(property, subscribe, handleEvent);
    this.current = none();
    this.propertyEnded = false;
    this.subscribe = _.bind(this.subscribe, this);
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
function flatMapWithConcurrencyLimit(src, limit, f) {
  return flatMap_(handleEventValueWith(f), src, {
    desc: new Desc(src, "flatMapWithConcurrencyLimit", [limit, f]),
    limit
  });
}
function bufferWithTime(src, delay2) {
  return bufferWithTimeOrCount(src, delay2, Number.MAX_VALUE).withDesc(new Desc(src, "bufferWithTime", [delay2]));
}
function bufferWithCount(src, count) {
  return bufferWithTimeOrCount(src, void 0, count).withDesc(new Desc(src, "bufferWithCount", [count]));
}
function bufferWithTimeOrCount(src, delay2, count) {
  const delayFunc = toDelayFunction(delay2);
  function flushOrSchedule(buffer2) {
    if (buffer2.values.length === count) {
      return buffer2.flush();
    } else if (delayFunc !== void 0) {
      return buffer2.schedule(delayFunc);
    }
  }
  var desc = new Desc(src, "bufferWithTimeOrCount", [delay2, count]);
  return buffer(src, flushOrSchedule, flushOrSchedule).withDesc(desc);
}
var Buffer = class {
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
function toDelayFunction(delay2) {
  if (delay2 === void 0) {
    return void 0;
  }
  if (typeof delay2 === "number") {
    var delayMs = delay2;
    return function(f) {
      return GlobalScheduler.scheduler.setTimeout(f, delayMs);
    };
  }
  return delay2;
}
function buffer(src, onInput = nop, onFlush = nop) {
  var reply = more;
  var buffer2 = new Buffer(onFlush, onInput);
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
      for (var i = 0; i < toDeliverNow.length; i++) {
        var event = toDeliverNow[i];
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
function takeWhile(src, f) {
  return withPredicate(src, f, takeWhileT, new Desc(src, "takeWhile", [f]));
}
function takeWhileT(f) {
  return (event, sink) => {
    if (event.filter(f)) {
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
function skipWhile(src, f) {
  return withPredicate(src, f, skipWhileT, new Desc(src, "skipWhile", [f]));
}
function skipWhileT(f) {
  var started = false;
  return function(event, sink) {
    if (started || !hasValue(event) || !f(event.value)) {
      if (event.hasValue) {
        started = true;
      }
      return sink(event);
    } else {
      return more;
    }
  };
}
function groupBy(src, keyF, limitF = _.id) {
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
var nullMarker = {};
function diff(src, start, f) {
  return transformP(scan(src, [start, nullMarker], (prevTuple, next) => [next, f(prevTuple[0], next)]), composeT(filterT((tuple) => tuple[1] !== nullMarker), mapT((tuple) => tuple[1])), new Desc(src, "diff", [start, f]));
}
function flatScan(src, seed, f) {
  let current = seed;
  return src.flatMapConcat((next) => makeObservable(f(current, next)).doAction((updated) => current = updated)).toProperty().startWith(seed).withDesc(new Desc(src, "flatScan", [seed, f]));
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
            for (var i = 0; i < toSend.length; i++) {
              result = sink(nextEvent(toSend[i]));
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
function zipWith(f, ...streams) {
  var [streams, f] = argumentsToObservablesAndFunction(arguments);
  streams = _.map((s) => s.toEventStream(), streams);
  return when([streams, f]).withDesc(new Desc("Bacon", "zipWith", [f].concat(streams)));
}
function zip(left, right, f) {
  return zipWith(f || Array, left, right).withDesc(new Desc(left, "zip", [right]));
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
    return isArray(template2) ? [] : {};
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
    for (var i = 0, f; i < funcs.length; i++) {
      f = funcs[i];
      f(ctxStack, values);
    }
    return rootContext;
  }
  function compileTemplate(template2) {
    _.each(template2, compile);
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
var idCounter = 0;
var Observable = class {
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
  combine(right, f) {
    return combineTwo(this, right, f).withDesc(new Desc(this, "combine", [right, f]));
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
  diff(start, f) {
    return diff(this, start, f);
  }
  doAction(f) {
    return this.transform(doActionT(f), new Desc(this, "doAction", [f]));
  }
  doEnd(f) {
    return this.transform(doEndT(f), new Desc(this, "doEnd", [f]));
  }
  doError(f) {
    return this.transform(doErrorT(f), new Desc(this, "doError", [f]));
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
  filter(f) {
    return filter$1(this, f);
  }
  first() {
    return take(1, this, new Desc(this, "first"));
  }
  firstToPromise(PromiseCtr) {
    return firstToPromise(this, PromiseCtr);
  }
  fold(seed, f) {
    return fold$1(this, seed, f);
  }
  forEach(f = nullSink) {
    return this.onValue(f);
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
  mapEnd(f) {
    return this.transform(mapEndT(f), new Desc(this, "mapEnd", [f]));
  }
  mapError(f) {
    return this.transform(mapErrorT(f), new Desc(this, "mapError", [f]));
  }
  name(name) {
    this._name = name;
    return this;
  }
  onEnd(f = nullVoidSink) {
    return this.subscribe(function(event) {
      if (event.isEnd) {
        return f();
      }
      return more;
    });
  }
  onError(f = nullSink) {
    return this.subscribe(function(event) {
      if (isError(event)) {
        return f(event.error);
      }
      return more;
    });
  }
  onValue(f = nullSink) {
    return this.subscribe(function(event) {
      if (hasValue(event)) {
        return f(event.value);
      }
      return more;
    });
  }
  onValues(f) {
    return this.onValue(function(args) {
      return f(...args);
    });
  }
  reduce(seed, f) {
    return fold$1(this, seed, f);
  }
  sampledBy(sampler) {
    return sampledBy(this, sampler, arguments[1]);
  }
  scan(seed, f) {
    return scan(this, seed, f);
  }
  skip(count) {
    return skip(this, count);
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
  skipWhile(f) {
    return skipWhile(this, f);
  }
  slidingWindow(maxValues, minValues = 0) {
    return slidingWindow(this, maxValues, minValues);
  }
  subscribe(sink = nullSink) {
    return UpdateBarrier.wrappedSubscribe(this, (sink2) => this.subscribeInternal(sink2), sink);
  }
  take(count) {
    return take(count, this);
  }
  takeUntil(stopper) {
    return takeUntil(this, stopper);
  }
  takeWhile(f) {
    return takeWhile(this, f);
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
  zip(other, f) {
    return zip(this, other, f);
  }
};
var Property = class extends Observable {
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
  transformChanges(desc, f) {
    return transformPropertyChanges(this, f, desc);
  }
  flatMap(f) {
    return flatMap$1(this, f);
  }
  flatMapConcat(f) {
    return flatMapConcat(this, f);
  }
  flatMapError(f) {
    return flatMapError(this, f);
  }
  flatMapEvent(f) {
    return flatMapEvent(this, f);
  }
  flatMapFirst(f) {
    return flatMapFirst(this, f);
  }
  flatMapLatest(f) {
    return flatMapLatest(this, f);
  }
  flatMapWithConcurrencyLimit(limit, f) {
    return flatMapWithConcurrencyLimit(this, limit, f);
  }
  groupBy(keyF, limitF) {
    return groupBy(this, keyF, limitF);
  }
  map(f) {
    return map$1(this, f);
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
  withLatestFrom(samplee, f) {
    return withLatestFromP(this, samplee, f);
  }
  withStateMachine(initState, f) {
    return withStateMachine(initState, f, this);
  }
};
function isProperty(x2) {
  return !!x2._isProperty;
}
var allowSync = { forceAsync: false };
var EventStream = class extends Observable {
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
  bufferWithCount(count) {
    return bufferWithCount(this, count);
  }
  bufferWithTimeOrCount(delay2, count) {
    return bufferWithTimeOrCount(this, delay2, count);
  }
  changes() {
    return this;
  }
  concat(other, options) {
    return concatE(this, other, options);
  }
  transformChanges(desc, f) {
    return f(this).withDesc(desc);
  }
  flatMap(f) {
    return flatMap$1(this, f);
  }
  flatMapConcat(f) {
    return flatMapConcat(this, f);
  }
  flatMapError(f) {
    return flatMapError(this, f);
  }
  flatMapFirst(f) {
    return flatMapFirst(this, f);
  }
  flatMapLatest(f) {
    return flatMapLatest(this, f);
  }
  flatMapWithConcurrencyLimit(limit, f) {
    return flatMapWithConcurrencyLimit(this, limit, f);
  }
  flatMapEvent(f) {
    return flatMapEvent(this, f);
  }
  flatScan(seed, f) {
    return flatScan(this, seed, f);
  }
  groupBy(keyF, limitF) {
    return groupBy(this, keyF, limitF);
  }
  map(f) {
    return map$1(this, f);
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
  withLatestFrom(samplee, f) {
    return withLatestFromE(this, samplee, f);
  }
  withStateMachine(initState, f) {
    return withStateMachine(initState, f, this);
  }
};
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
var ESObservable = class {
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
function isEventSourceFn(x2) {
  return _.isFunction(x2);
}
var eventMethods = [
  ["addEventListener", "removeEventListener"],
  ["addListener", "removeListener"],
  ["on", "off"],
  ["bind", "unbind"]
];
var findHandlerMethods = function(target) {
  var pair;
  for (var i = 0; i < eventMethods.length; i++) {
    pair = eventMethods[i];
    var methodPair = [target[pair[0]], target[pair[1]]];
    if (methodPair[0] && methodPair[1]) {
      return methodPair;
    }
  }
  for (var j = 0; j < eventMethods.length; j++) {
    pair = eventMethods[j];
    var addListener = target[pair[0]];
    if (addListener) {
      return [addListener, function() {
      }];
    }
  }
  throw new Error("No suitable event methods in " + target);
};
function fromEvent(target, eventSource, eventTransformer) {
  var [sub, unsub] = findHandlerMethods(target);
  var desc = new Desc("Bacon", "fromEvent", [target, eventSource]);
  return fromBinder(function(handler) {
    if (isEventSourceFn(eventSource)) {
      eventSource(sub.bind(target), handler);
      return function() {
        return eventSource(unsub.bind(target), handler);
      };
    } else {
      sub.call(target, eventSource, handler);
      return function() {
        return unsub.call(target, eventSource, handler);
      };
    }
  }, eventTransformer).withDesc(desc);
}
function withMethodCallSupport(wrapped) {
  return function(f, ...args) {
    if (typeof f === "object" && args.length) {
      var context = f;
      var methodName = args[0];
      f = function(...args2) {
        return context[methodName](...args2);
      };
      args = args.slice(1);
    }
    return wrapped(f, ...args);
  };
}
function partiallyApplied(f, applied) {
  return function(...args) {
    return f(...applied.concat(args));
  };
}
var makeFunction_ = withMethodCallSupport(function(f, ...args) {
  if (_.isFunction(f)) {
    if (args.length) {
      return partiallyApplied(f, args);
    } else {
      return f;
    }
  } else {
    return _.always(f);
  }
});

// src/State/GlobalState.ts
var GameStateSymbol = Symbol("GameState");

// src/util.ts
var isNotNil = complement_default(isNil_default);
var timeDifference = curry_default((timeSince, lastTime) => {
  return Date.now() - lastTime >= timeSince;
});
var createEnum = (...args) => {
  return Object.fromEntries(args.map((enumName, index) => [
    [enumName, index],
    [index, enumName]
  ]).flat());
};

// src/draw2.ts
var activeContext = null;
var sendToContext = (item) => {
  if (!activeContext)
    throw new Error("Outside of context");
  activeContext.push(item);
};
var e = createEnum("arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath", "createConicGradient", "createImageData", "createLinearGradient", "createPattern", "createRadialGradient", "drawFocusIfNeeded", "drawImage", "ellipse", "fill", "fillRect", "fillText", "getContextAttributes", "getImageData", "getLineDash", "getTransform", "isContextLost", "isPointInPath", "isPointInStroke", "lineTo", "measureText", "moveTo", "putImageData", "quadraticCurveTo", "rect", "reset", "resetTransform", "restore", "rotate", "roundRect", "save", "scale", "setLineDash", "setTransform", "stroke", "strokeRect", "strokeText", "transform", "translate", "direction", "fillStyle", "filter", "font", "fontKerning", "fontStretch", "fontVariantCaps", "globalAlpha", "globalCompositeOperation", "imageSmoothingEnabled", "imageSmoothingQuality", "letterSpacing", "lineCap", "lineDashOffset", "lineJoin", "lineWidth", "miterLimit", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY", "strokeStyle", "textAlign", "textBaseline", "textRendering", "wordSpacing");
console.log(e);
var c = (e2) => {
  return (...args) => sendToContext([e2, args]);
};
var hf = () => (ctx, enumber, args) => {
  ctx[e[enumber]](...args);
};
var hs = () => (ctx, enumber, [value]) => {
  ctx[e[enumber]] = value;
};
var drawHandlers = /* @__PURE__ */ new Map();
var arcTo = c(e.arcTo);
var beginPath = c(e.beginPath);
var bezierCurveTo = c(e.bezierCurveTo);
var clearRect2 = c(e.clearRect);
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
var rect2 = c(e.rect);
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
var fillStyle2 = c(e.fillStyle);
var filter2 = c(e.filter);
var font2 = c(e.font);
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
var lineWidth2 = c(e.lineWidth);
var miterLimit = c(e.miterLimit);
var shadowBlur = c(e.shadowBlur);
var shadowColor = c(e.shadowColor);
var shadowOffsetX = c(e.shadowOffsetX);
var shadowOffsetY = c(e.shadowOffsetY);
var strokeStyle2 = c(e.strokeStyle);
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
var executeOnCanvas = (ctx, [enumber, args]) => {
  drawHandlers.get(enumber)(ctx, enumber, args);
};

// src/canvas-worker.ts
var messageEvent = fromEvent(self, "message");
var onGameMessage = messageEvent.map((e2) => e2?.data).filter(Boolean);
var onCanvasMessage = onGameMessage.filter((e2) => e2.type === "canvas").map(({ canvas }) => canvas.getContext("2d"));
var onNewRenderMessage = onGameMessage.filter((e2) => e2.type === "NewRenderer");
var onNewRenderMessage2 = onGameMessage.filter((e2) => e2.type === "NewRenderer2");
onCanvasMessage.flatMap((ctx) => onNewRenderMessage.map((message) => [ctx, message])).onValue(([ctx, { handlers }]) => {
  renderState(ctx, handlers);
});
onCanvasMessage.flatMap((ctx) => onNewRenderMessage2.map((message) => [ctx, message])).onValue(([ctx, { handlers }]) => {
  for (let handler of handlers) {
    executeOnCanvas(ctx, handler);
  }
});
//# sourceMappingURL=canvas-worker.js.map
