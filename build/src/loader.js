// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function _isPlaceholder(a) {
    return a != null && typeof a === 'object' && a['@@functional/placeholder'] === true;
}
function _curry1(fn) {
    return function f1(a) {
        if (arguments.length === 0 || _isPlaceholder(a)) {
            return f1;
        } else {
            return fn.apply(this, arguments);
        }
    };
}
function _curry2(fn) {
    return function f2(a, b) {
        switch(arguments.length){
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
var add = _curry2(function add(a, b) {
    return Number(a) + Number(b);
});
function _concat(set1, set2) {
    set1 = set1 || [];
    set2 = set2 || [];
    var idx;
    var len1 = set1.length;
    var len2 = set2.length;
    var result = [];
    idx = 0;
    while(idx < len1){
        result[result.length] = set1[idx];
        idx += 1;
    }
    idx = 0;
    while(idx < len2){
        result[result.length] = set2[idx];
        idx += 1;
    }
    return result;
}
function _arity(n, fn) {
    switch(n){
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
            throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
    }
}
function _curryN(length1, received, fn) {
    return function() {
        var combined = [];
        var argsIdx = 0;
        var left = length1;
        var combinedIdx = 0;
        while(combinedIdx < received.length || argsIdx < arguments.length){
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
        return left <= 0 ? fn.apply(this, combined) : _arity(left, _curryN(length1, combined, fn));
    };
}
var curryN = _curry2(function curryN(length2, fn) {
    if (length2 === 1) {
        return _curry1(fn);
    }
    return _arity(length2, _curryN(length2, [], fn));
});
_curry1(function addIndex(fn) {
    return curryN(fn.length, function() {
        var idx = 0;
        var origFn = arguments[0];
        var list = arguments[arguments.length - 1];
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = function() {
            var result = origFn.apply(this, _concat(arguments, [
                idx,
                list
            ]));
            idx += 1;
            return result;
        };
        return fn.apply(this, args);
    });
});
function _curry3(fn) {
    return function f3(a, b, c1) {
        switch(arguments.length){
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
                return _isPlaceholder(a) && _isPlaceholder(b) && _isPlaceholder(c1) ? f3 : _isPlaceholder(a) && _isPlaceholder(b) ? _curry2(function(_a, _b) {
                    return fn(_a, _b, c1);
                }) : _isPlaceholder(a) && _isPlaceholder(c1) ? _curry2(function(_a, _c) {
                    return fn(_a, b, _c);
                }) : _isPlaceholder(b) && _isPlaceholder(c1) ? _curry2(function(_b, _c) {
                    return fn(a, _b, _c);
                }) : _isPlaceholder(a) ? _curry1(function(_a) {
                    return fn(_a, b, c1);
                }) : _isPlaceholder(b) ? _curry1(function(_b) {
                    return fn(a, _b, c1);
                }) : _isPlaceholder(c1) ? _curry1(function(_c) {
                    return fn(a, b, _c);
                }) : fn(a, b, c1);
        }
    };
}
var adjust = _curry3(function adjust(idx, fn, list) {
    var len = list.length;
    if (idx >= len || idx < -len) {
        return list;
    }
    var _idx = (len + idx) % len;
    var _list = _concat(list);
    _list[_idx] = fn(list[_idx]);
    return _list;
});
const __default = Array.isArray || function _isArray(val) {
    return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
};
function _isTransformer(obj) {
    return obj != null && typeof obj['@@transducer/step'] === 'function';
}
function _dispatchable(methodNames, transducerCreator, fn) {
    return function() {
        if (arguments.length === 0) {
            return fn();
        }
        var obj = arguments[arguments.length - 1];
        if (!__default(obj)) {
            var idx = 0;
            while(idx < methodNames.length){
                if (typeof obj[methodNames[idx]] === 'function') {
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
function _reduced(x) {
    return x && x['@@transducer/reduced'] ? x : {
        '@@transducer/value': x,
        '@@transducer/reduced': true
    };
}
const __default1 = {
    init: function() {
        return this.xf['@@transducer/init']();
    },
    result: function(result) {
        return this.xf['@@transducer/result'](result);
    }
};
var XAll = function() {
    function XAll1(f, xf) {
        this.xf = xf;
        this.f = f;
        this.all = true;
    }
    XAll1.prototype['@@transducer/init'] = __default1.init;
    XAll1.prototype['@@transducer/result'] = function(result) {
        if (this.all) {
            result = this.xf['@@transducer/step'](result, true);
        }
        return this.xf['@@transducer/result'](result);
    };
    XAll1.prototype['@@transducer/step'] = function(result, input) {
        if (!this.f(input)) {
            this.all = false;
            result = _reduced(this.xf['@@transducer/step'](result, false));
        }
        return result;
    };
    return XAll1;
}();
var _xall = _curry2(function _xall(f, xf) {
    return new XAll(f, xf);
});
var all = _curry2(_dispatchable([
    'all'
], _xall, function all(fn, list) {
    var idx = 0;
    while(idx < list.length){
        if (!fn(list[idx])) {
            return false;
        }
        idx += 1;
    }
    return true;
}));
var max = _curry2(function max(a, b) {
    return b > a ? b : a;
});
function _map(fn, functor) {
    var idx = 0;
    var len = functor.length;
    var result = Array(len);
    while(idx < len){
        result[idx] = fn(functor[idx]);
        idx += 1;
    }
    return result;
}
function _isString(x) {
    return Object.prototype.toString.call(x) === '[object String]';
}
var _isArrayLike = _curry1(function isArrayLike(x) {
    if (__default(x)) {
        return true;
    }
    if (!x) {
        return false;
    }
    if (typeof x !== 'object') {
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
var XWrap = function() {
    function XWrap1(fn) {
        this.f = fn;
    }
    XWrap1.prototype['@@transducer/init'] = function() {
        throw new Error('init not implemented on XWrap');
    };
    XWrap1.prototype['@@transducer/result'] = function(acc) {
        return acc;
    };
    XWrap1.prototype['@@transducer/step'] = function(acc, x) {
        return this.f(acc, x);
    };
    return XWrap1;
}();
function _xwrap(fn) {
    return new XWrap(fn);
}
var bind = _curry2(function bind(fn, thisObj) {
    return _arity(fn.length, function() {
        return fn.apply(thisObj, arguments);
    });
});
function _arrayReduce(xf, acc, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        acc = xf['@@transducer/step'](acc, list[idx]);
        if (acc && acc['@@transducer/reduced']) {
            acc = acc['@@transducer/value'];
            break;
        }
        idx += 1;
    }
    return xf['@@transducer/result'](acc);
}
function _iterableReduce(xf, acc, iter) {
    var step = iter.next();
    while(!step.done){
        acc = xf['@@transducer/step'](acc, step.value);
        if (acc && acc['@@transducer/reduced']) {
            acc = acc['@@transducer/value'];
            break;
        }
        step = iter.next();
    }
    return xf['@@transducer/result'](acc);
}
function _methodReduce(xf, acc, obj, methodName) {
    return xf['@@transducer/result'](obj[methodName](bind(xf['@@transducer/step'], xf), acc));
}
var symIterator = typeof Symbol !== 'undefined' ? Symbol.iterator : '@@iterator';
function _reduce(fn, acc, list) {
    if (typeof fn === 'function') {
        fn = _xwrap(fn);
    }
    if (_isArrayLike(list)) {
        return _arrayReduce(fn, acc, list);
    }
    if (typeof list['fantasy-land/reduce'] === 'function') {
        return _methodReduce(fn, acc, list, 'fantasy-land/reduce');
    }
    if (list[symIterator] != null) {
        return _iterableReduce(fn, acc, list[symIterator]());
    }
    if (typeof list.next === 'function') {
        return _iterableReduce(fn, acc, list);
    }
    if (typeof list.reduce === 'function') {
        return _methodReduce(fn, acc, list, 'reduce');
    }
    throw new TypeError('reduce: list must be array or iterable');
}
var XMap = function() {
    function XMap1(f, xf) {
        this.xf = xf;
        this.f = f;
    }
    XMap1.prototype['@@transducer/init'] = __default1.init;
    XMap1.prototype['@@transducer/result'] = __default1.result;
    XMap1.prototype['@@transducer/step'] = function(result, input) {
        return this.xf['@@transducer/step'](result, this.f(input));
    };
    return XMap1;
}();
var _xmap = _curry2(function _xmap(f, xf) {
    return new XMap(f, xf);
});
function _has(prop1, obj) {
    return Object.prototype.hasOwnProperty.call(obj, prop1);
}
var toString = Object.prototype.toString;
var _isArguments = function() {
    return toString.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
        return toString.call(x) === '[object Arguments]';
    } : function _isArguments(x) {
        return _has('callee', x);
    };
}();
var hasEnumBug = !({
    toString: null
}).propertyIsEnumerable('toString');
var nonEnumerableProps = [
    'constructor',
    'valueOf',
    'isPrototypeOf',
    'toString',
    'propertyIsEnumerable',
    'hasOwnProperty',
    'toLocaleString'
];
var hasArgsEnumBug = function() {
    'use strict';
    return arguments.propertyIsEnumerable('length');
}();
var contains = function contains(list, item) {
    var idx = 0;
    while(idx < list.length){
        if (list[idx] === item) {
            return true;
        }
        idx += 1;
    }
    return false;
};
var keys = typeof Object.keys === 'function' && !hasArgsEnumBug ? _curry1(function keys(obj) {
    return Object(obj) !== obj ? [] : Object.keys(obj);
}) : _curry1(function keys(obj) {
    if (Object(obj) !== obj) {
        return [];
    }
    var prop2, nIdx;
    var ks = [];
    var checkArgsLength = hasArgsEnumBug && _isArguments(obj);
    for(prop2 in obj){
        if (_has(prop2, obj) && (!checkArgsLength || prop2 !== 'length')) {
            ks[ks.length] = prop2;
        }
    }
    if (hasEnumBug) {
        nIdx = nonEnumerableProps.length - 1;
        while(nIdx >= 0){
            prop2 = nonEnumerableProps[nIdx];
            if (_has(prop2, obj) && !contains(ks, prop2)) {
                ks[ks.length] = prop2;
            }
            nIdx -= 1;
        }
    }
    return ks;
});
var map = _curry2(_dispatchable([
    'fantasy-land/map',
    'map'
], _xmap, function map(fn, functor) {
    switch(Object.prototype.toString.call(functor)){
        case '[object Function]':
            return curryN(functor.length, function() {
                return fn.call(this, functor.apply(this, arguments));
            });
        case '[object Object]':
            return _reduce(function(acc, key) {
                acc[key] = fn(functor[key]);
                return acc;
            }, {}, keys(functor));
        default:
            return _map(fn, functor);
    }
}));
const __default2 = Number.isInteger || function _isInteger(n) {
    return n << 0 === n;
};
var nth = _curry2(function nth(offset, list) {
    var idx = offset < 0 ? list.length + offset : offset;
    return _isString(list) ? list.charAt(idx) : list[idx];
});
var prop = _curry2(function prop(p, obj) {
    if (obj == null) {
        return;
    }
    return __default2(p) ? nth(p, obj) : obj[p];
});
var pluck = _curry2(function pluck(p, list) {
    return map(prop(p), list);
});
var reduce = _curry3(_reduce);
_curry1(function allPass(preds) {
    return curryN(reduce(max, 0, pluck('length', preds)), function() {
        var idx = 0;
        var len = preds.length;
        while(idx < len){
            if (!preds[idx].apply(this, arguments)) {
                return false;
            }
            idx += 1;
        }
        return true;
    });
});
var always = _curry1(function always(val) {
    return function() {
        return val;
    };
});
var and = _curry2(function and(a, b) {
    return a && b;
});
var XAny = function() {
    function XAny1(f, xf) {
        this.xf = xf;
        this.f = f;
        this.any = false;
    }
    XAny1.prototype['@@transducer/init'] = __default1.init;
    XAny1.prototype['@@transducer/result'] = function(result) {
        if (!this.any) {
            result = this.xf['@@transducer/step'](result, false);
        }
        return this.xf['@@transducer/result'](result);
    };
    XAny1.prototype['@@transducer/step'] = function(result, input) {
        if (this.f(input)) {
            this.any = true;
            result = _reduced(this.xf['@@transducer/step'](result, true));
        }
        return result;
    };
    return XAny1;
}();
var _xany = _curry2(function _xany(f, xf) {
    return new XAny(f, xf);
});
_curry2(_dispatchable([
    'any'
], _xany, function any(fn, list) {
    var idx = 0;
    while(idx < list.length){
        if (fn(list[idx])) {
            return true;
        }
        idx += 1;
    }
    return false;
}));
_curry1(function anyPass(preds) {
    return curryN(reduce(max, 0, pluck('length', preds)), function() {
        var idx = 0;
        var len = preds.length;
        while(idx < len){
            if (preds[idx].apply(this, arguments)) {
                return true;
            }
            idx += 1;
        }
        return false;
    });
});
var ap = _curry2(function ap(applyF, applyX) {
    return typeof applyX['fantasy-land/ap'] === 'function' ? applyX['fantasy-land/ap'](applyF) : typeof applyF.ap === 'function' ? applyF.ap(applyX) : typeof applyF === 'function' ? function(x) {
        return applyF(x)(applyX(x));
    } : _reduce(function(acc, f) {
        return _concat(acc, map(f, applyX));
    }, [], applyF);
});
function _aperture(n, list) {
    var idx = 0;
    var limit = list.length - (n - 1);
    var acc = new Array(limit >= 0 ? limit : 0);
    while(idx < limit){
        acc[idx] = Array.prototype.slice.call(list, idx, idx + n);
        idx += 1;
    }
    return acc;
}
var XAperture = function() {
    function XAperture1(n, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n);
    }
    XAperture1.prototype['@@transducer/init'] = __default1.init;
    XAperture1.prototype['@@transducer/result'] = function(result) {
        this.acc = null;
        return this.xf['@@transducer/result'](result);
    };
    XAperture1.prototype['@@transducer/step'] = function(result, input) {
        this.store(input);
        return this.full ? this.xf['@@transducer/step'](result, this.getCopy()) : result;
    };
    XAperture1.prototype.store = function(input) {
        this.acc[this.pos] = input;
        this.pos += 1;
        if (this.pos === this.acc.length) {
            this.pos = 0;
            this.full = true;
        }
    };
    XAperture1.prototype.getCopy = function() {
        return _concat(Array.prototype.slice.call(this.acc, this.pos), Array.prototype.slice.call(this.acc, 0, this.pos));
    };
    return XAperture1;
}();
var _xaperture = _curry2(function _xaperture(n, xf) {
    return new XAperture(n, xf);
});
_curry2(_dispatchable([], _xaperture, _aperture));
_curry2(function append(el, list) {
    return _concat(list, [
        el
    ]);
});
var apply = _curry2(function apply(fn, args) {
    return fn.apply(this, args);
});
var values = _curry1(function values(obj) {
    var props = keys(obj);
    var len = props.length;
    var vals = [];
    var idx = 0;
    while(idx < len){
        vals[idx] = obj[props[idx]];
        idx += 1;
    }
    return vals;
});
function mapValues(fn, obj) {
    return __default(obj) ? obj.map(fn) : keys(obj).reduce(function(acc, key) {
        acc[key] = fn(obj[key]);
        return acc;
    }, {});
}
_curry1(function applySpec1(spec) {
    spec = mapValues(function(v1) {
        return typeof v1 == 'function' ? v1 : applySpec1(v1);
    }, spec);
    return curryN(reduce(max, 0, pluck('length', values(spec))), function() {
        var args = arguments;
        return mapValues(function(f) {
            return apply(f, args);
        }, spec);
    });
});
_curry2(function applyTo(x, f) {
    return f(x);
});
_curry3(function ascend(fn, a, b) {
    var aa = fn(a);
    var bb = fn(b);
    return aa < bb ? -1 : aa > bb ? 1 : 0;
});
function _assoc(prop3, val, obj) {
    if (__default2(prop3) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop3] = val;
        return arr;
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
    }
    result[prop3] = val;
    return result;
}
var isNil = _curry1(function isNil(x) {
    return x == null;
});
var assocPath = _curry3(function assocPath1(path1, val, obj) {
    if (path1.length === 0) {
        return val;
    }
    var idx = path1[0];
    if (path1.length > 1) {
        var nextObj = !isNil(obj) && _has(idx, obj) ? obj[idx] : __default2(path1[1]) ? [] : {};
        val = assocPath1(Array.prototype.slice.call(path1, 1), val, nextObj);
    }
    return _assoc(idx, val, obj);
});
var assoc = _curry3(function assoc(prop4, val, obj) {
    return assocPath([
        prop4
    ], val, obj);
});
var nAry = _curry2(function nAry(n, fn) {
    switch(n){
        case 0:
            return function() {
                return fn.call(this);
            };
        case 1:
            return function(a0) {
                return fn.call(this, a0);
            };
        case 2:
            return function(a0, a1) {
                return fn.call(this, a0, a1);
            };
        case 3:
            return function(a0, a1, a2) {
                return fn.call(this, a0, a1, a2);
            };
        case 4:
            return function(a0, a1, a2, a3) {
                return fn.call(this, a0, a1, a2, a3);
            };
        case 5:
            return function(a0, a1, a2, a3, a4) {
                return fn.call(this, a0, a1, a2, a3, a4);
            };
        case 6:
            return function(a0, a1, a2, a3, a4, a5) {
                return fn.call(this, a0, a1, a2, a3, a4, a5);
            };
        case 7:
            return function(a0, a1, a2, a3, a4, a5, a6) {
                return fn.call(this, a0, a1, a2, a3, a4, a5, a6);
            };
        case 8:
            return function(a0, a1, a2, a3, a4, a5, a6, a7) {
                return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7);
            };
        case 9:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
                return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8);
            };
        case 10:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
                return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            };
        default:
            throw new Error('First argument to nAry must be a non-negative integer no greater than ten');
    }
});
_curry1(function binary(fn) {
    return nAry(2, fn);
});
function _isFunction(x) {
    var type1 = Object.prototype.toString.call(x);
    return type1 === '[object Function]' || type1 === '[object AsyncFunction]' || type1 === '[object GeneratorFunction]' || type1 === '[object AsyncGeneratorFunction]';
}
var liftN = _curry2(function liftN(arity, fn) {
    var lifted = curryN(arity, fn);
    return curryN(arity, function() {
        return _reduce(ap, map(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
    });
});
var lift = _curry1(function lift(fn) {
    return liftN(fn.length, fn);
});
_curry2(function both(f, g) {
    return _isFunction(f) ? function _both() {
        return f.apply(this, arguments) && g.apply(this, arguments);
    } : lift(and)(f, g);
});
_curry1(function call(fn) {
    return fn.apply(this, Array.prototype.slice.call(arguments, 1));
});
function _makeFlat(recursive) {
    return function flatt(list) {
        var value, jlen, j;
        var result = [];
        var idx = 0;
        var ilen = list.length;
        while(idx < ilen){
            if (_isArrayLike(list[idx])) {
                value = recursive ? flatt(list[idx]) : list[idx];
                j = 0;
                jlen = value.length;
                while(j < jlen){
                    result[result.length] = value[j];
                    j += 1;
                }
            } else {
                result[result.length] = list[idx];
            }
            idx += 1;
        }
        return result;
    };
}
function _forceReduced(x) {
    return {
        '@@transducer/value': x,
        '@@transducer/reduced': true
    };
}
var preservingReduced = function(xf) {
    return {
        '@@transducer/init': __default1.init,
        '@@transducer/result': function(result) {
            return xf['@@transducer/result'](result);
        },
        '@@transducer/step': function(result, input) {
            var ret = xf['@@transducer/step'](result, input);
            return ret['@@transducer/reduced'] ? _forceReduced(ret) : ret;
        }
    };
};
var _flatCat = function _xcat(xf) {
    var rxf = preservingReduced(xf);
    return {
        '@@transducer/init': __default1.init,
        '@@transducer/result': function(result) {
            return rxf['@@transducer/result'](result);
        },
        '@@transducer/step': function(result, input) {
            return !_isArrayLike(input) ? _reduce(rxf, result, [
                input
            ]) : _reduce(rxf, result, input);
        }
    };
};
var _xchain = _curry2(function _xchain(f, xf) {
    return map(f, _flatCat(xf));
});
var chain = _curry2(_dispatchable([
    'fantasy-land/chain',
    'chain'
], _xchain, function chain(fn, monad) {
    if (typeof monad === 'function') {
        return function(x) {
            return fn(monad(x))(x);
        };
    }
    return _makeFlat(false)(map(fn, monad));
}));
_curry3(function clamp(min, max1, value) {
    if (min > max1) {
        throw new Error('min must not be greater than max in clamp(min, max, value)');
    }
    return value < min ? min : value > max1 ? max1 : value;
});
function _cloneRegExp(pattern) {
    return new RegExp(pattern.source, (pattern.global ? 'g' : '') + (pattern.ignoreCase ? 'i' : '') + (pattern.multiline ? 'm' : '') + (pattern.sticky ? 'y' : '') + (pattern.unicode ? 'u' : ''));
}
var type = _curry1(function type(val) {
    return val === null ? 'Null' : val === undefined ? 'Undefined' : Object.prototype.toString.call(val).slice(8, -1);
});
function _clone(value, refFrom, refTo, deep) {
    var copy = function copy(copiedValue) {
        var len = refFrom.length;
        var idx = 0;
        while(idx < len){
            if (value === refFrom[idx]) {
                return refTo[idx];
            }
            idx += 1;
        }
        refFrom[idx] = value;
        refTo[idx] = copiedValue;
        for(var key in value){
            if (value.hasOwnProperty(key)) {
                copiedValue[key] = deep ? _clone(value[key], refFrom, refTo, true) : value[key];
            }
        }
        return copiedValue;
    };
    switch(type(value)){
        case 'Object':
            return copy(Object.create(Object.getPrototypeOf(value)));
        case 'Array':
            return copy([]);
        case 'Date':
            return new Date(value.valueOf());
        case 'RegExp':
            return _cloneRegExp(value);
        case 'Int8Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
        case 'Int16Array':
        case 'Uint16Array':
        case 'Int32Array':
        case 'Uint32Array':
        case 'Float32Array':
        case 'Float64Array':
        case 'BigInt64Array':
        case 'BigUint64Array':
            return value.slice();
        default:
            return value;
    }
}
_curry1(function clone(value) {
    return value != null && typeof value.clone === 'function' ? value.clone() : _clone(value, [], [], true);
});
_curry2(function collectBy(fn, list) {
    var group = _reduce(function(o, x) {
        var tag = fn(x);
        if (o[tag] === undefined) {
            o[tag] = [];
        }
        o[tag].push(x);
        return o;
    }, {}, list);
    var newList = [];
    for(var tag1 in group){
        newList.push(group[tag1]);
    }
    return newList;
});
_curry1(function comparator(pred) {
    return function(a, b) {
        return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
    };
});
var not = _curry1(function not(a) {
    return !a;
});
var complement = lift(not);
function _pipe(f, g) {
    return function() {
        return g.call(this, f.apply(this, arguments));
    };
}
function _checkForMethod(methodname, fn) {
    return function() {
        var length3 = arguments.length;
        if (length3 === 0) {
            return fn();
        }
        var obj = arguments[length3 - 1];
        return __default(obj) || typeof obj[methodname] !== 'function' ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length3 - 1));
    };
}
var slice = _curry3(_checkForMethod('slice', function slice(fromIndex, toIndex, list) {
    return Array.prototype.slice.call(list, fromIndex, toIndex);
}));
var tail = _curry1(_checkForMethod('tail', slice(1, Infinity)));
function pipe() {
    if (arguments.length === 0) {
        throw new Error('pipe requires at least one argument');
    }
    return _arity(arguments[0].length, reduce(_pipe, arguments[0], tail(arguments)));
}
var reverse = _curry1(function reverse(list) {
    return _isString(list) ? list.split('').reverse().join('') : Array.prototype.slice.call(list, 0).reverse();
});
function compose() {
    if (arguments.length === 0) {
        throw new Error('compose requires at least one argument');
    }
    return pipe.apply(this, reverse(arguments));
}
var head = nth(0);
function _identity(x) {
    return x;
}
var identity = _curry1(_identity);
var pipeWith = _curry2(function pipeWith(xf, list) {
    if (list.length <= 0) {
        return identity;
    }
    var headList = head(list);
    var tailList = tail(list);
    return _arity(headList.length, function() {
        return _reduce(function(result, f) {
            return xf.call(this, f, result);
        }, headList.apply(this, arguments), tailList);
    });
});
_curry2(function composeWith(xf, list) {
    return pipeWith.apply(this, [
        xf,
        reverse(list)
    ]);
});
function _arrayFromIterator(iter) {
    var list = [];
    var next;
    while(!(next = iter.next()).done){
        list.push(next.value);
    }
    return list;
}
function _includesWith(pred, x, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (pred(x, list[idx])) {
            return true;
        }
        idx += 1;
    }
    return false;
}
function _functionName(f) {
    var match = String(f).match(/^function (\w*)/);
    return match == null ? '' : match[1];
}
function _objectIs(a, b) {
    if (a === b) {
        return a !== 0 || 1 / a === 1 / b;
    } else {
        return a !== a && b !== b;
    }
}
const __default3 = typeof Object.is === 'function' ? Object.is : _objectIs;
function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
    var a = _arrayFromIterator(aIterator);
    var b1 = _arrayFromIterator(bIterator);
    function eq(_a, _b) {
        return _equals(_a, _b, stackA.slice(), stackB.slice());
    }
    return !_includesWith(function(b, aItem) {
        return !_includesWith(eq, aItem, b);
    }, b1, a);
}
function _equals(a, b, stackA, stackB) {
    if (__default3(a, b)) {
        return true;
    }
    var typeA = type(a);
    if (typeA !== type(b)) {
        return false;
    }
    if (typeof a['fantasy-land/equals'] === 'function' || typeof b['fantasy-land/equals'] === 'function') {
        return typeof a['fantasy-land/equals'] === 'function' && a['fantasy-land/equals'](b) && typeof b['fantasy-land/equals'] === 'function' && b['fantasy-land/equals'](a);
    }
    if (typeof a.equals === 'function' || typeof b.equals === 'function') {
        return typeof a.equals === 'function' && a.equals(b) && typeof b.equals === 'function' && b.equals(a);
    }
    switch(typeA){
        case 'Arguments':
        case 'Array':
        case 'Object':
            if (typeof a.constructor === 'function' && _functionName(a.constructor) === 'Promise') {
                return a === b;
            }
            break;
        case 'Boolean':
        case 'Number':
        case 'String':
            if (!(typeof a === typeof b && __default3(a.valueOf(), b.valueOf()))) {
                return false;
            }
            break;
        case 'Date':
            if (!__default3(a.valueOf(), b.valueOf())) {
                return false;
            }
            break;
        case 'Error':
            return a.name === b.name && a.message === b.message;
        case 'RegExp':
            if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
                return false;
            }
            break;
    }
    var idx = stackA.length - 1;
    while(idx >= 0){
        if (stackA[idx] === a) {
            return stackB[idx] === b;
        }
        idx -= 1;
    }
    switch(typeA){
        case 'Map':
            if (a.size !== b.size) {
                return false;
            }
            return _uniqContentEquals(a.entries(), b.entries(), stackA.concat([
                a
            ]), stackB.concat([
                b
            ]));
        case 'Set':
            if (a.size !== b.size) {
                return false;
            }
            return _uniqContentEquals(a.values(), b.values(), stackA.concat([
                a
            ]), stackB.concat([
                b
            ]));
        case 'Arguments':
        case 'Array':
        case 'Object':
        case 'Boolean':
        case 'Number':
        case 'String':
        case 'Date':
        case 'Error':
        case 'RegExp':
        case 'Int8Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
        case 'Int16Array':
        case 'Uint16Array':
        case 'Int32Array':
        case 'Uint32Array':
        case 'Float32Array':
        case 'Float64Array':
        case 'ArrayBuffer':
            break;
        default:
            return false;
    }
    var keysA = keys(a);
    if (keysA.length !== keys(b).length) {
        return false;
    }
    var extendedStackA = stackA.concat([
        a
    ]);
    var extendedStackB = stackB.concat([
        b
    ]);
    idx = keysA.length - 1;
    while(idx >= 0){
        var key = keysA[idx];
        if (!(_has(key, b) && _equals(b[key], a[key], extendedStackA, extendedStackB))) {
            return false;
        }
        idx -= 1;
    }
    return true;
}
var equals = _curry2(function equals(a, b) {
    return _equals(a, b, [], []);
});
function _indexOf(list, a, idx) {
    var inf, item;
    if (typeof list.indexOf === 'function') {
        switch(typeof a){
            case 'number':
                if (a === 0) {
                    inf = 1 / a;
                    while(idx < list.length){
                        item = list[idx];
                        if (item === 0 && 1 / item === inf) {
                            return idx;
                        }
                        idx += 1;
                    }
                    return -1;
                } else if (a !== a) {
                    while(idx < list.length){
                        item = list[idx];
                        if (typeof item === 'number' && item !== item) {
                            return idx;
                        }
                        idx += 1;
                    }
                    return -1;
                }
                return list.indexOf(a, idx);
            case 'string':
            case 'boolean':
            case 'function':
            case 'undefined':
                return list.indexOf(a, idx);
            case 'object':
                if (a === null) {
                    return list.indexOf(a, idx);
                }
        }
    }
    while(idx < list.length){
        if (equals(list[idx], a)) {
            return idx;
        }
        idx += 1;
    }
    return -1;
}
function _includes(a, list) {
    return _indexOf(list, a, 0) >= 0;
}
function _quote(s) {
    var escaped = s.replace(/\\/g, '\\\\').replace(/[\b]/g, '\\b').replace(/\f/g, '\\f').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\v/g, '\\v').replace(/\0/g, '\\0');
    return '"' + escaped.replace(/"/g, '\\"') + '"';
}
var pad = function pad(n) {
    return (n < 10 ? '0' : '') + n;
};
var _toISOString = typeof Date.prototype.toISOString === 'function' ? function _toISOString(d) {
    return d.toISOString();
} : function _toISOString(d) {
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + '.' + (d.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
};
function _complement(f) {
    return function() {
        return !f.apply(this, arguments);
    };
}
function _filter(fn, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    while(idx < len){
        if (fn(list[idx])) {
            result[result.length] = list[idx];
        }
        idx += 1;
    }
    return result;
}
function _isObject(x) {
    return Object.prototype.toString.call(x) === '[object Object]';
}
var XFilter = function() {
    function XFilter1(f, xf) {
        this.xf = xf;
        this.f = f;
    }
    XFilter1.prototype['@@transducer/init'] = __default1.init;
    XFilter1.prototype['@@transducer/result'] = __default1.result;
    XFilter1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
    };
    return XFilter1;
}();
var _xfilter = _curry2(function _xfilter(f, xf) {
    return new XFilter(f, xf);
});
var filter = _curry2(_dispatchable([
    'fantasy-land/filter',
    'filter'
], _xfilter, function(pred, filterable) {
    return _isObject(filterable) ? _reduce(function(acc, key) {
        if (pred(filterable[key])) {
            acc[key] = filterable[key];
        }
        return acc;
    }, {}, keys(filterable)) : _filter(pred, filterable);
}));
var reject = _curry2(function reject(pred, filterable) {
    return filter(_complement(pred), filterable);
});
function _toString(x, seen) {
    var recur = function recur(y) {
        var xs = seen.concat([
            x
        ]);
        return _includes(y, xs) ? '<Circular>' : _toString(y, xs);
    };
    var mapPairs = function(obj, keys1) {
        return _map(function(k) {
            return _quote(k) + ': ' + recur(obj[k]);
        }, keys1.slice().sort());
    };
    switch(Object.prototype.toString.call(x)){
        case '[object Arguments]':
            return '(function() { return arguments; }(' + _map(recur, x).join(', ') + '))';
        case '[object Array]':
            return '[' + _map(recur, x).concat(mapPairs(x, reject(function(k) {
                return /^\d+$/.test(k);
            }, keys(x)))).join(', ') + ']';
        case '[object Boolean]':
            return typeof x === 'object' ? 'new Boolean(' + recur(x.valueOf()) + ')' : x.toString();
        case '[object Date]':
            return 'new Date(' + (isNaN(x.valueOf()) ? recur(NaN) : _quote(_toISOString(x))) + ')';
        case '[object Null]':
            return 'null';
        case '[object Number]':
            return typeof x === 'object' ? 'new Number(' + recur(x.valueOf()) + ')' : 1 / x === -Infinity ? '-0' : x.toString(10);
        case '[object String]':
            return typeof x === 'object' ? 'new String(' + recur(x.valueOf()) + ')' : _quote(x);
        case '[object Undefined]':
            return 'undefined';
        default:
            if (typeof x.toString === 'function') {
                var repr = x.toString();
                if (repr !== '[object Object]') {
                    return repr;
                }
            }
            return '{' + mapPairs(x, keys(x)).join(', ') + '}';
    }
}
var toString1 = _curry1(function toString(val) {
    return _toString(val, []);
});
var concat = _curry2(function concat(a, b) {
    if (__default(a)) {
        if (__default(b)) {
            return a.concat(b);
        }
        throw new TypeError(toString1(b) + ' is not an array');
    }
    if (_isString(a)) {
        if (_isString(b)) {
            return a + b;
        }
        throw new TypeError(toString1(b) + ' is not a string');
    }
    if (a != null && _isFunction(a['fantasy-land/concat'])) {
        return a['fantasy-land/concat'](b);
    }
    if (a != null && _isFunction(a.concat)) {
        return a.concat(b);
    }
    throw new TypeError(toString1(a) + ' does not have a method named "concat" or "fantasy-land/concat"');
});
_curry1(function cond(pairs) {
    var arity = reduce(max, 0, map(function(pair) {
        return pair[0].length;
    }, pairs));
    return _arity(arity, function() {
        var idx = 0;
        while(idx < pairs.length){
            if (pairs[idx][0].apply(this, arguments)) {
                return pairs[idx][1].apply(this, arguments);
            }
            idx += 1;
        }
    });
});
var curry = _curry1(function curry(fn) {
    return curryN(fn.length, fn);
});
var constructN = _curry2(function constructN(n, Fn) {
    if (n > 10) {
        throw new Error('Constructor with greater than ten arguments');
    }
    if (n === 0) {
        return function() {
            return new Fn();
        };
    }
    return curry(nAry(n, function($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) {
        switch(arguments.length){
            case 1:
                return new Fn($0);
            case 2:
                return new Fn($0, $1);
            case 3:
                return new Fn($0, $1, $2);
            case 4:
                return new Fn($0, $1, $2, $3);
            case 5:
                return new Fn($0, $1, $2, $3, $4);
            case 6:
                return new Fn($0, $1, $2, $3, $4, $5);
            case 7:
                return new Fn($0, $1, $2, $3, $4, $5, $6);
            case 8:
                return new Fn($0, $1, $2, $3, $4, $5, $6, $7);
            case 9:
                return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8);
            case 10:
                return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8, $9);
        }
    }));
});
_curry1(function construct(Fn) {
    return constructN(Fn.length, Fn);
});
var converge = _curry2(function converge(after, fns) {
    return curryN(reduce(max, 0, pluck('length', fns)), function() {
        var args = arguments;
        var context = this;
        return after.apply(context, _map(function(fn) {
            return fn.apply(context, args);
        }, fns));
    });
});
curry(function(pred, list) {
    return _reduce(function(a, e1) {
        return pred(e1) ? a + 1 : a;
    }, 0, list);
});
var XReduceBy = function() {
    function XReduceBy1(valueFn, valueAcc, keyFn, xf) {
        this.valueFn = valueFn;
        this.valueAcc = valueAcc;
        this.keyFn = keyFn;
        this.xf = xf;
        this.inputs = {};
    }
    XReduceBy1.prototype['@@transducer/init'] = __default1.init;
    XReduceBy1.prototype['@@transducer/result'] = function(result) {
        var key;
        for(key in this.inputs){
            if (_has(key, this.inputs)) {
                result = this.xf['@@transducer/step'](result, this.inputs[key]);
                if (result['@@transducer/reduced']) {
                    result = result['@@transducer/value'];
                    break;
                }
            }
        }
        this.inputs = null;
        return this.xf['@@transducer/result'](result);
    };
    XReduceBy1.prototype['@@transducer/step'] = function(result, input) {
        var key = this.keyFn(input);
        this.inputs[key] = this.inputs[key] || [
            key,
            this.valueAcc
        ];
        this.inputs[key][1] = this.valueFn(this.inputs[key][1], input);
        return result;
    };
    return XReduceBy1;
}();
var _xreduceBy = _curryN(4, [], function _xreduceBy(valueFn, valueAcc, keyFn, xf) {
    return new XReduceBy(valueFn, valueAcc, keyFn, xf);
});
var reduceBy = _curryN(4, [], _dispatchable([], _xreduceBy, function reduceBy(valueFn, valueAcc, keyFn, list) {
    return _reduce(function(acc, elt) {
        var key = keyFn(elt);
        var value = valueFn(_has(key, acc) ? acc[key] : _clone(valueAcc, [], [], false), elt);
        if (value && value['@@transducer/reduced']) {
            return _reduced(acc);
        }
        acc[key] = value;
        return acc;
    }, {}, list);
}));
reduceBy(function(acc, elem) {
    return acc + 1;
}, 0);
add(-1);
var defaultTo = _curry2(function defaultTo(d, v2) {
    return v2 == null || v2 !== v2 ? d : v2;
});
_curry3(function descend(fn, a, b) {
    var aa = fn(a);
    var bb = fn(b);
    return aa > bb ? -1 : aa < bb ? 1 : 0;
});
var _Set = function() {
    function _Set1() {
        this._nativeSet = typeof Set === 'function' ? new Set() : null;
        this._items = {};
    }
    _Set1.prototype.add = function(item) {
        return !hasOrAdd(item, true, this);
    };
    _Set1.prototype.has = function(item) {
        return hasOrAdd(item, false, this);
    };
    return _Set1;
}();
function hasOrAdd(item, shouldAdd, set) {
    var type2 = typeof item;
    var prevSize, newSize;
    switch(type2){
        case 'string':
        case 'number':
            if (item === 0 && 1 / item === -Infinity) {
                if (set._items['-0']) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items['-0'] = true;
                    }
                    return false;
                }
            }
            if (set._nativeSet !== null) {
                if (shouldAdd) {
                    prevSize = set._nativeSet.size;
                    set._nativeSet.add(item);
                    newSize = set._nativeSet.size;
                    return newSize === prevSize;
                } else {
                    return set._nativeSet.has(item);
                }
            } else {
                if (!(type2 in set._items)) {
                    if (shouldAdd) {
                        set._items[type2] = {};
                        set._items[type2][item] = true;
                    }
                    return false;
                } else if (item in set._items[type2]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items[type2][item] = true;
                    }
                    return false;
                }
            }
        case 'boolean':
            if (type2 in set._items) {
                var bIdx = item ? 1 : 0;
                if (set._items[type2][bIdx]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items[type2][bIdx] = true;
                    }
                    return false;
                }
            } else {
                if (shouldAdd) {
                    set._items[type2] = item ? [
                        false,
                        true
                    ] : [
                        true,
                        false
                    ];
                }
                return false;
            }
        case 'function':
            if (set._nativeSet !== null) {
                if (shouldAdd) {
                    prevSize = set._nativeSet.size;
                    set._nativeSet.add(item);
                    newSize = set._nativeSet.size;
                    return newSize === prevSize;
                } else {
                    return set._nativeSet.has(item);
                }
            } else {
                if (!(type2 in set._items)) {
                    if (shouldAdd) {
                        set._items[type2] = [
                            item
                        ];
                    }
                    return false;
                }
                if (!_includes(item, set._items[type2])) {
                    if (shouldAdd) {
                        set._items[type2].push(item);
                    }
                    return false;
                }
                return true;
            }
        case 'undefined':
            if (set._items[type2]) {
                return true;
            } else {
                if (shouldAdd) {
                    set._items[type2] = true;
                }
                return false;
            }
        case 'object':
            if (item === null) {
                if (!set._items['null']) {
                    if (shouldAdd) {
                        set._items['null'] = true;
                    }
                    return false;
                }
                return true;
            }
        default:
            type2 = Object.prototype.toString.call(item);
            if (!(type2 in set._items)) {
                if (shouldAdd) {
                    set._items[type2] = [
                        item
                    ];
                }
                return false;
            }
            if (!_includes(item, set._items[type2])) {
                if (shouldAdd) {
                    set._items[type2].push(item);
                }
                return false;
            }
            return true;
    }
}
var difference = _curry2(function difference(first, second) {
    var out = [];
    var idx = 0;
    var firstLen = first.length;
    var secondLen = second.length;
    var toFilterOut = new _Set();
    for(var i = 0; i < secondLen; i += 1){
        toFilterOut.add(second[i]);
    }
    while(idx < firstLen){
        if (toFilterOut.add(first[idx])) {
            out[out.length] = first[idx];
        }
        idx += 1;
    }
    return out;
});
var differenceWith = _curry3(function differenceWith(pred, first, second) {
    var out = [];
    var idx = 0;
    var firstLen = first.length;
    while(idx < firstLen){
        if (!_includesWith(pred, first[idx], second) && !_includesWith(pred, first[idx], out)) {
            out.push(first[idx]);
        }
        idx += 1;
    }
    return out;
});
var remove = _curry3(function remove(start, count, list) {
    var result = Array.prototype.slice.call(list, 0);
    result.splice(start, count);
    return result;
});
function _dissoc(prop5, obj) {
    if (obj == null) {
        return obj;
    }
    if (__default2(prop5) && __default(obj)) {
        return remove(prop5, 1, obj);
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
    }
    delete result[prop5];
    return result;
}
function _shallowCloneObject(prop6, obj) {
    if (__default2(prop6) && __default(obj)) {
        return [].concat(obj);
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
    }
    return result;
}
var dissocPath = _curry2(function dissocPath1(path2, obj) {
    if (obj == null) {
        return obj;
    }
    switch(path2.length){
        case 0:
            return obj;
        case 1:
            return _dissoc(path2[0], obj);
        default:
            var head1 = path2[0];
            var tail1 = Array.prototype.slice.call(path2, 1);
            if (obj[head1] == null) {
                return _shallowCloneObject(head1, obj);
            } else {
                return assoc(head1, dissocPath1(tail1, obj[head1]), obj);
            }
    }
});
_curry2(function dissoc(prop7, obj) {
    return dissocPath([
        prop7
    ], obj);
});
_curry2(function divide(a, b) {
    return a / b;
});
var XDrop = function() {
    function XDrop1(n, xf) {
        this.xf = xf;
        this.n = n;
    }
    XDrop1.prototype['@@transducer/init'] = __default1.init;
    XDrop1.prototype['@@transducer/result'] = __default1.result;
    XDrop1.prototype['@@transducer/step'] = function(result, input) {
        if (this.n > 0) {
            this.n -= 1;
            return result;
        }
        return this.xf['@@transducer/step'](result, input);
    };
    return XDrop1;
}();
var _xdrop = _curry2(function _xdrop(n, xf) {
    return new XDrop(n, xf);
});
var drop = _curry2(_dispatchable([
    'drop'
], _xdrop, function drop(n, xs) {
    return slice(Math.max(0, n), Infinity, xs);
}));
var XTake = function() {
    function XTake1(n, xf) {
        this.xf = xf;
        this.n = n;
        this.i = 0;
    }
    XTake1.prototype['@@transducer/init'] = __default1.init;
    XTake1.prototype['@@transducer/result'] = __default1.result;
    XTake1.prototype['@@transducer/step'] = function(result, input) {
        this.i += 1;
        var ret = this.n === 0 ? result : this.xf['@@transducer/step'](result, input);
        return this.n >= 0 && this.i >= this.n ? _reduced(ret) : ret;
    };
    return XTake1;
}();
var _xtake = _curry2(function _xtake(n, xf) {
    return new XTake(n, xf);
});
var take = _curry2(_dispatchable([
    'take'
], _xtake, function take(n, xs) {
    return slice(0, n < 0 ? Infinity : n, xs);
}));
function dropLast(n, xs) {
    return take(n < xs.length ? xs.length - n : 0, xs);
}
var XDropLast = function() {
    function XDropLast1(n, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n);
    }
    XDropLast1.prototype['@@transducer/init'] = __default1.init;
    XDropLast1.prototype['@@transducer/result'] = function(result) {
        this.acc = null;
        return this.xf['@@transducer/result'](result);
    };
    XDropLast1.prototype['@@transducer/step'] = function(result, input) {
        if (this.full) {
            result = this.xf['@@transducer/step'](result, this.acc[this.pos]);
        }
        this.store(input);
        return result;
    };
    XDropLast1.prototype.store = function(input) {
        this.acc[this.pos] = input;
        this.pos += 1;
        if (this.pos === this.acc.length) {
            this.pos = 0;
            this.full = true;
        }
    };
    return XDropLast1;
}();
var _xdropLast = _curry2(function _xdropLast(n, xf) {
    return new XDropLast(n, xf);
});
_curry2(_dispatchable([], _xdropLast, dropLast));
function dropLastWhile(pred, xs) {
    var idx = xs.length - 1;
    while(idx >= 0 && pred(xs[idx])){
        idx -= 1;
    }
    return slice(0, idx + 1, xs);
}
var XDropLastWhile = function() {
    function XDropLastWhile1(fn, xf) {
        this.f = fn;
        this.retained = [];
        this.xf = xf;
    }
    XDropLastWhile1.prototype['@@transducer/init'] = __default1.init;
    XDropLastWhile1.prototype['@@transducer/result'] = function(result) {
        this.retained = null;
        return this.xf['@@transducer/result'](result);
    };
    XDropLastWhile1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.retain(result, input) : this.flush(result, input);
    };
    XDropLastWhile1.prototype.flush = function(result, input) {
        result = _reduce(this.xf['@@transducer/step'], result, this.retained);
        this.retained = [];
        return this.xf['@@transducer/step'](result, input);
    };
    XDropLastWhile1.prototype.retain = function(result, input) {
        this.retained.push(input);
        return result;
    };
    return XDropLastWhile1;
}();
var _xdropLastWhile = _curry2(function _xdropLastWhile(fn, xf) {
    return new XDropLastWhile(fn, xf);
});
_curry2(_dispatchable([], _xdropLastWhile, dropLastWhile));
var XDropRepeatsWith = function() {
    function XDropRepeatsWith1(pred, xf) {
        this.xf = xf;
        this.pred = pred;
        this.lastValue = undefined;
        this.seenFirstValue = false;
    }
    XDropRepeatsWith1.prototype['@@transducer/init'] = __default1.init;
    XDropRepeatsWith1.prototype['@@transducer/result'] = __default1.result;
    XDropRepeatsWith1.prototype['@@transducer/step'] = function(result, input) {
        var sameAsLast = false;
        if (!this.seenFirstValue) {
            this.seenFirstValue = true;
        } else if (this.pred(this.lastValue, input)) {
            sameAsLast = true;
        }
        this.lastValue = input;
        return sameAsLast ? result : this.xf['@@transducer/step'](result, input);
    };
    return XDropRepeatsWith1;
}();
var _xdropRepeatsWith = _curry2(function _xdropRepeatsWith(pred, xf) {
    return new XDropRepeatsWith(pred, xf);
});
var last = nth(-1);
var dropRepeatsWith = _curry2(_dispatchable([], _xdropRepeatsWith, function dropRepeatsWith(pred, list) {
    var result = [];
    var idx = 1;
    var len = list.length;
    if (len !== 0) {
        result[0] = list[0];
        while(idx < len){
            if (!pred(last(result), list[idx])) {
                result[result.length] = list[idx];
            }
            idx += 1;
        }
    }
    return result;
}));
_curry1(_dispatchable([], _xdropRepeatsWith(equals), dropRepeatsWith(equals)));
var XDropWhile = function() {
    function XDropWhile1(f, xf) {
        this.xf = xf;
        this.f = f;
    }
    XDropWhile1.prototype['@@transducer/init'] = __default1.init;
    XDropWhile1.prototype['@@transducer/result'] = __default1.result;
    XDropWhile1.prototype['@@transducer/step'] = function(result, input) {
        if (this.f) {
            if (this.f(input)) {
                return result;
            }
            this.f = null;
        }
        return this.xf['@@transducer/step'](result, input);
    };
    return XDropWhile1;
}();
var _xdropWhile = _curry2(function _xdropWhile(f, xf) {
    return new XDropWhile(f, xf);
});
_curry2(_dispatchable([
    'dropWhile'
], _xdropWhile, function dropWhile(pred, xs) {
    var idx = 0;
    var len = xs.length;
    while(idx < len && pred(xs[idx])){
        idx += 1;
    }
    return slice(idx, Infinity, xs);
}));
var or = _curry2(function or(a, b) {
    return a || b;
});
_curry2(function either(f, g) {
    return _isFunction(f) ? function _either() {
        return f.apply(this, arguments) || g.apply(this, arguments);
    } : lift(or)(f, g);
});
function _isTypedArray(val) {
    var type3 = Object.prototype.toString.call(val);
    return type3 === '[object Uint8ClampedArray]' || type3 === '[object Int8Array]' || type3 === '[object Uint8Array]' || type3 === '[object Int16Array]' || type3 === '[object Uint16Array]' || type3 === '[object Int32Array]' || type3 === '[object Uint32Array]' || type3 === '[object Float32Array]' || type3 === '[object Float64Array]' || type3 === '[object BigInt64Array]' || type3 === '[object BigUint64Array]';
}
var empty = _curry1(function empty(x) {
    return x != null && typeof x['fantasy-land/empty'] === 'function' ? x['fantasy-land/empty']() : x != null && x.constructor != null && typeof x.constructor['fantasy-land/empty'] === 'function' ? x.constructor['fantasy-land/empty']() : x != null && typeof x.empty === 'function' ? x.empty() : x != null && x.constructor != null && typeof x.constructor.empty === 'function' ? x.constructor.empty() : __default(x) ? [] : _isString(x) ? '' : _isObject(x) ? {} : _isArguments(x) ? function() {
        return arguments;
    }() : _isTypedArray(x) ? x.constructor.from('') : void 0;
});
var takeLast = _curry2(function takeLast(n, xs) {
    return drop(n >= 0 ? xs.length - n : 0, xs);
});
_curry2(function(suffix, list) {
    return equals(takeLast(suffix.length, list), suffix);
});
_curry3(function eqBy(f, x, y) {
    return equals(f(x), f(y));
});
_curry3(function eqProps(prop8, obj1, obj2) {
    return equals(obj1[prop8], obj2[prop8]);
});
_curry2(function evolve1(transformations, object) {
    if (!_isObject(object) && !__default(object)) {
        return object;
    }
    var result = object instanceof Array ? [] : {};
    var transformation, key, type4;
    for(key in object){
        transformation = transformations[key];
        type4 = typeof transformation;
        result[key] = type4 === 'function' ? transformation(object[key]) : transformation && type4 === 'object' ? evolve1(transformation, object[key]) : object[key];
    }
    return result;
});
var XFind = function() {
    function XFind1(f, xf) {
        this.xf = xf;
        this.f = f;
        this.found = false;
    }
    XFind1.prototype['@@transducer/init'] = __default1.init;
    XFind1.prototype['@@transducer/result'] = function(result) {
        if (!this.found) {
            result = this.xf['@@transducer/step'](result, void 0);
        }
        return this.xf['@@transducer/result'](result);
    };
    XFind1.prototype['@@transducer/step'] = function(result, input) {
        if (this.f(input)) {
            this.found = true;
            result = _reduced(this.xf['@@transducer/step'](result, input));
        }
        return result;
    };
    return XFind1;
}();
var _xfind = _curry2(function _xfind(f, xf) {
    return new XFind(f, xf);
});
_curry2(_dispatchable([
    'find'
], _xfind, function find(fn, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (fn(list[idx])) {
            return list[idx];
        }
        idx += 1;
    }
}));
var XFindIndex = function() {
    function XFindIndex1(f, xf) {
        this.xf = xf;
        this.f = f;
        this.idx = -1;
        this.found = false;
    }
    XFindIndex1.prototype['@@transducer/init'] = __default1.init;
    XFindIndex1.prototype['@@transducer/result'] = function(result) {
        if (!this.found) {
            result = this.xf['@@transducer/step'](result, -1);
        }
        return this.xf['@@transducer/result'](result);
    };
    XFindIndex1.prototype['@@transducer/step'] = function(result, input) {
        this.idx += 1;
        if (this.f(input)) {
            this.found = true;
            result = _reduced(this.xf['@@transducer/step'](result, this.idx));
        }
        return result;
    };
    return XFindIndex1;
}();
var _xfindIndex = _curry2(function _xfindIndex(f, xf) {
    return new XFindIndex(f, xf);
});
_curry2(_dispatchable([], _xfindIndex, function findIndex(fn, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (fn(list[idx])) {
            return idx;
        }
        idx += 1;
    }
    return -1;
}));
var XFindLast = function() {
    function XFindLast1(f, xf) {
        this.xf = xf;
        this.f = f;
    }
    XFindLast1.prototype['@@transducer/init'] = __default1.init;
    XFindLast1.prototype['@@transducer/result'] = function(result) {
        return this.xf['@@transducer/result'](this.xf['@@transducer/step'](result, this.last));
    };
    XFindLast1.prototype['@@transducer/step'] = function(result, input) {
        if (this.f(input)) {
            this.last = input;
        }
        return result;
    };
    return XFindLast1;
}();
var _xfindLast = _curry2(function _xfindLast(f, xf) {
    return new XFindLast(f, xf);
});
_curry2(_dispatchable([], _xfindLast, function findLast(fn, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        if (fn(list[idx])) {
            return list[idx];
        }
        idx -= 1;
    }
}));
var XFindLastIndex = function() {
    function XFindLastIndex1(f, xf) {
        this.xf = xf;
        this.f = f;
        this.idx = -1;
        this.lastIdx = -1;
    }
    XFindLastIndex1.prototype['@@transducer/init'] = __default1.init;
    XFindLastIndex1.prototype['@@transducer/result'] = function(result) {
        return this.xf['@@transducer/result'](this.xf['@@transducer/step'](result, this.lastIdx));
    };
    XFindLastIndex1.prototype['@@transducer/step'] = function(result, input) {
        this.idx += 1;
        if (this.f(input)) {
            this.lastIdx = this.idx;
        }
        return result;
    };
    return XFindLastIndex1;
}();
var _xfindLastIndex = _curry2(function _xfindLastIndex(f, xf) {
    return new XFindLastIndex(f, xf);
});
_curry2(_dispatchable([], _xfindLastIndex, function findLastIndex(fn, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        if (fn(list[idx])) {
            return idx;
        }
        idx -= 1;
    }
    return -1;
}));
_curry1(_makeFlat(true));
var flip = _curry1(function flip(fn) {
    return curryN(fn.length, function(a, b) {
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = b;
        args[1] = a;
        return fn.apply(this, args);
    });
});
_curry2(_checkForMethod('forEach', function forEach(fn, list) {
    var len = list.length;
    var idx = 0;
    while(idx < len){
        fn(list[idx]);
        idx += 1;
    }
    return list;
}));
_curry2(function forEachObjIndexed(fn, obj) {
    var keyList = keys(obj);
    var idx = 0;
    while(idx < keyList.length){
        var key = keyList[idx];
        fn(obj[key], key, obj);
        idx += 1;
    }
    return obj;
});
_curry1(function fromPairs(pairs) {
    var result = {};
    var idx = 0;
    while(idx < pairs.length){
        result[pairs[idx][0]] = pairs[idx][1];
        idx += 1;
    }
    return result;
});
_curry2(_checkForMethod('groupBy', reduceBy(function(acc, item) {
    acc.push(item);
    return acc;
}, [])));
_curry2(function(fn, list) {
    var res = [];
    var idx = 0;
    var len = list.length;
    while(idx < len){
        var nextidx = idx + 1;
        while(nextidx < len && fn(list[nextidx - 1], list[nextidx])){
            nextidx += 1;
        }
        res.push(list.slice(idx, nextidx));
        idx = nextidx;
    }
    return res;
});
_curry2(function gt(a, b) {
    return a > b;
});
_curry2(function gte(a, b) {
    return a >= b;
});
var hasPath = _curry2(function hasPath(_path, obj) {
    if (_path.length === 0 || isNil(obj)) {
        return false;
    }
    var val = obj;
    var idx = 0;
    while(idx < _path.length){
        if (!isNil(val) && _has(_path[idx], val)) {
            val = val[_path[idx]];
            idx += 1;
        } else {
            return false;
        }
    }
    return true;
});
_curry2(function has(prop9, obj) {
    return hasPath([
        prop9
    ], obj);
});
_curry2(function hasIn(prop10, obj) {
    if (isNil(obj)) {
        return false;
    }
    return prop10 in obj;
});
_curry2(__default3);
_curry3(function ifElse(condition, onTrue, onFalse) {
    return curryN(Math.max(condition.length, onTrue.length, onFalse.length), function _ifElse() {
        return condition.apply(this, arguments) ? onTrue.apply(this, arguments) : onFalse.apply(this, arguments);
    });
});
add(1);
_curry2(_includes);
reduceBy(function(acc, elem) {
    return elem;
}, null);
_curry2(function indexOf(target, xs) {
    return typeof xs.indexOf === 'function' && !__default(xs) ? xs.indexOf(target) : _indexOf(xs, target, 0);
});
slice(0, -1);
_curry3(function innerJoin(pred, xs, ys) {
    return _filter(function(x) {
        return _includesWith(pred, x, ys);
    }, xs);
});
_curry3(function insert(idx, elt, list) {
    idx = idx < list.length && idx >= 0 ? idx : list.length;
    var result = Array.prototype.slice.call(list, 0);
    result.splice(idx, 0, elt);
    return result;
});
_curry3(function insertAll(idx, elts, list) {
    idx = idx < list.length && idx >= 0 ? idx : list.length;
    return [].concat(Array.prototype.slice.call(list, 0, idx), elts, Array.prototype.slice.call(list, idx));
});
var XUniqBy = function() {
    function XUniqBy1(f, xf) {
        this.xf = xf;
        this.f = f;
        this.set = new _Set();
    }
    XUniqBy1.prototype['@@transducer/init'] = __default1.init;
    XUniqBy1.prototype['@@transducer/result'] = __default1.result;
    XUniqBy1.prototype['@@transducer/step'] = function(result, input) {
        return this.set.add(this.f(input)) ? this.xf['@@transducer/step'](result, input) : result;
    };
    return XUniqBy1;
}();
var _xuniqBy = _curry2(function _xuniqBy(f, xf) {
    return new XUniqBy(f, xf);
});
var uniqBy = _curry2(_dispatchable([], _xuniqBy, function(fn, list) {
    var set = new _Set();
    var result = [];
    var idx = 0;
    var appliedItem, item;
    while(idx < list.length){
        item = list[idx];
        appliedItem = fn(item);
        if (set.add(appliedItem)) {
            result.push(item);
        }
        idx += 1;
    }
    return result;
}));
var uniq = uniqBy(identity);
_curry2(function intersection(list1, list2) {
    var lookupList, filteredList;
    if (list1.length > list2.length) {
        lookupList = list1;
        filteredList = list2;
    } else {
        lookupList = list2;
        filteredList = list1;
    }
    return uniq(_filter(flip(_includes)(lookupList), filteredList));
});
_curry2(_checkForMethod('intersperse', function intersperse(separator, list) {
    var out = [];
    var idx = 0;
    var length4 = list.length;
    while(idx < length4){
        if (idx === length4 - 1) {
            out.push(list[idx]);
        } else {
            out.push(list[idx], separator);
        }
        idx += 1;
    }
    return out;
}));
function _objectAssign(target) {
    if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
    }
    var output = Object(target);
    var idx = 1;
    var length5 = arguments.length;
    while(idx < length5){
        var source = arguments[idx];
        if (source != null) {
            for(var nextKey in source){
                if (_has(nextKey, source)) {
                    output[nextKey] = source[nextKey];
                }
            }
        }
        idx += 1;
    }
    return output;
}
const __default4 = typeof Object.assign === 'function' ? Object.assign : _objectAssign;
var objOf = _curry2(function objOf(key, val) {
    var obj = {};
    obj[key] = val;
    return obj;
});
var _stepCatArray = {
    '@@transducer/init': Array,
    '@@transducer/step': function(xs, x) {
        xs.push(x);
        return xs;
    },
    '@@transducer/result': _identity
};
var _stepCatString = {
    '@@transducer/init': String,
    '@@transducer/step': function(a, b) {
        return a + b;
    },
    '@@transducer/result': _identity
};
var _stepCatObject = {
    '@@transducer/init': Object,
    '@@transducer/step': function(result, input) {
        return __default4(result, _isArrayLike(input) ? objOf(input[0], input[1]) : input);
    },
    '@@transducer/result': _identity
};
function _stepCat(obj) {
    if (_isTransformer(obj)) {
        return obj;
    }
    if (_isArrayLike(obj)) {
        return _stepCatArray;
    }
    if (typeof obj === 'string') {
        return _stepCatString;
    }
    if (typeof obj === 'object') {
        return _stepCatObject;
    }
    throw new Error('Cannot create transformer for ' + obj);
}
_curry3(function into(acc, xf, list) {
    return _isTransformer(acc) ? _reduce(xf(acc), acc['@@transducer/init'](), list) : _reduce(xf(_stepCat(acc)), _clone(acc, [], [], false), list);
});
_curry1(function invert(obj) {
    var props = keys(obj);
    var len = props.length;
    var idx = 0;
    var out = {};
    while(idx < len){
        var key = props[idx];
        var val = obj[key];
        var list = _has(val, out) ? out[val] : out[val] = [];
        list[list.length] = key;
        idx += 1;
    }
    return out;
});
_curry1(function invertObj(obj) {
    var props = keys(obj);
    var len = props.length;
    var idx = 0;
    var out = {};
    while(idx < len){
        var key = props[idx];
        out[obj[key]] = key;
        idx += 1;
    }
    return out;
});
var invoker = _curry2(function invoker(arity, method) {
    return curryN(arity + 1, function() {
        var target = arguments[arity];
        if (target != null && _isFunction(target[method])) {
            return target[method].apply(target, Array.prototype.slice.call(arguments, 0, arity));
        }
        throw new TypeError(toString1(target) + ' does not have a method named "' + method + '"');
    });
});
var is = _curry2(function is(Ctor, val) {
    return val instanceof Ctor || val != null && (val.constructor === Ctor || Ctor.name === 'Object' && typeof val === 'object');
});
_curry1(function isEmpty(x) {
    return x != null && equals(x, empty(x));
});
invoker(1, 'join');
var juxt = _curry1(function juxt(fns) {
    return converge(function() {
        return Array.prototype.slice.call(arguments, 0);
    }, fns);
});
_curry1(function keysIn(obj) {
    var prop11;
    var ks = [];
    for(prop11 in obj){
        ks[ks.length] = prop11;
    }
    return ks;
});
_curry2(function lastIndexOf(target, xs) {
    if (typeof xs.lastIndexOf === 'function' && !__default(xs)) {
        return xs.lastIndexOf(target);
    } else {
        var idx = xs.length - 1;
        while(idx >= 0){
            if (equals(xs[idx], target)) {
                return idx;
            }
            idx -= 1;
        }
        return -1;
    }
});
function _isNumber(x) {
    return Object.prototype.toString.call(x) === '[object Number]';
}
var length = _curry1(function length(list) {
    return list != null && _isNumber(list.length) ? list.length : NaN;
});
var lens = _curry2(function lens(getter, setter) {
    return function(toFunctorFn) {
        return function(target) {
            return map(function(focus) {
                return setter(focus, target);
            }, toFunctorFn(getter(target)));
        };
    };
});
var update = _curry3(function update(idx, x, list) {
    return adjust(idx, always(x), list);
});
_curry1(function lensIndex(n) {
    return lens(nth(n), update(n));
});
var paths = _curry2(function paths1(pathsArray, obj) {
    return pathsArray.map(function(paths2) {
        var val = obj;
        var idx = 0;
        var p;
        while(idx < paths2.length){
            if (val == null) {
                return;
            }
            p = paths2[idx];
            val = __default2(p) ? nth(p, val) : val[p];
            idx += 1;
        }
        return val;
    });
});
var path = _curry2(function path(pathAr, obj) {
    return paths([
        pathAr
    ], obj)[0];
});
_curry1(function lensPath(p) {
    return lens(path(p), assocPath(p));
});
_curry1(function lensProp(k) {
    return lens(prop(k), assoc(k));
});
_curry2(function lt(a, b) {
    return a < b;
});
_curry2(function lte(a, b) {
    return a <= b;
});
_curry3(function mapAccum(fn, acc, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    var tuple = [
        acc
    ];
    while(idx < len){
        tuple = fn(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx += 1;
    }
    return [
        tuple[0],
        result
    ];
});
_curry3(function mapAccumRight(fn, acc, list) {
    var idx = list.length - 1;
    var result = [];
    var tuple = [
        acc
    ];
    while(idx >= 0){
        tuple = fn(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx -= 1;
    }
    return [
        tuple[0],
        result
    ];
});
_curry2(function mapObjIndexed(fn, obj) {
    return _reduce(function(acc, key) {
        acc[key] = fn(obj[key], key, obj);
        return acc;
    }, {}, keys(obj));
});
_curry2(function match(rx, str) {
    return str.match(rx) || [];
});
_curry2(function mathMod(m, p) {
    if (!__default2(m)) {
        return NaN;
    }
    if (!__default2(p) || p < 1) {
        return NaN;
    }
    return (m % p + p) % p;
});
_curry3(function maxBy(f, a, b) {
    return f(b) > f(a) ? b : a;
});
var sum = reduce(add, 0);
var mean = _curry1(function mean(list) {
    return sum(list) / list.length;
});
_curry1(function median(list) {
    var len = list.length;
    if (len === 0) {
        return NaN;
    }
    var width = 2 - len % 2;
    var idx = (len - width) / 2;
    return mean(Array.prototype.slice.call(list, 0).sort(function(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    }).slice(idx, idx + width));
});
_curry2(function memoizeWith(mFn, fn) {
    var cache = {};
    return _arity(fn.length, function() {
        var key = mFn.apply(this, arguments);
        if (!_has(key, cache)) {
            cache[key] = fn.apply(this, arguments);
        }
        return cache[key];
    });
});
_curry1(function mergeAll(list) {
    return __default4.apply(null, [
        {}
    ].concat(list));
});
var mergeWithKey = _curry3(function mergeWithKey(fn, l, r) {
    var result = {};
    var k;
    for(k in l){
        if (_has(k, l)) {
            result[k] = _has(k, r) ? fn(k, l[k], r[k]) : l[k];
        }
    }
    for(k in r){
        if (_has(k, r) && !_has(k, result)) {
            result[k] = r[k];
        }
    }
    return result;
});
var mergeDeepWithKey = _curry3(function mergeDeepWithKey1(fn, lObj, rObj) {
    return mergeWithKey(function(k, lVal, rVal) {
        if (_isObject(lVal) && _isObject(rVal)) {
            return mergeDeepWithKey1(fn, lVal, rVal);
        } else {
            return fn(k, lVal, rVal);
        }
    }, lObj, rObj);
});
_curry2(function mergeDeepLeft(lObj, rObj) {
    return mergeDeepWithKey(function(k, lVal, rVal) {
        return lVal;
    }, lObj, rObj);
});
var mergeDeepRight = _curry2(function mergeDeepRight(lObj, rObj) {
    return mergeDeepWithKey(function(k, lVal, rVal) {
        return rVal;
    }, lObj, rObj);
});
_curry3(function mergeDeepWith(fn, lObj, rObj) {
    return mergeDeepWithKey(function(k, lVal, rVal) {
        return fn(lVal, rVal);
    }, lObj, rObj);
});
_curry2(function mergeLeft(l, r) {
    return __default4({}, r, l);
});
_curry2(function mergeRight(l, r) {
    return __default4({}, l, r);
});
_curry3(function mergeWith(fn, l, r) {
    return mergeWithKey(function(_, _l, _r) {
        return fn(_l, _r);
    }, l, r);
});
_curry2(function min(a, b) {
    return b < a ? b : a;
});
_curry3(function minBy(f, a, b) {
    return f(b) < f(a) ? b : a;
});
function _modify(prop12, fn, obj) {
    if (__default2(prop12) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop12] = fn(arr[prop12]);
        return arr;
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
    }
    result[prop12] = fn(result[prop12]);
    return result;
}
var modifyPath = _curry3(function modifyPath1(path3, fn, object) {
    if (!_isObject(object) && !__default(object) || path3.length === 0) {
        return object;
    }
    var idx = path3[0];
    if (!_has(idx, object)) {
        return object;
    }
    if (path3.length === 1) {
        return _modify(idx, fn, object);
    }
    var val = modifyPath1(Array.prototype.slice.call(path3, 1), fn, object[idx]);
    if (val === object[idx]) {
        return object;
    }
    return _assoc(idx, val, object);
});
_curry3(function modify(prop13, fn, object) {
    return modifyPath([
        prop13
    ], fn, object);
});
_curry2(function modulo(a, b) {
    return a % b;
});
_curry3(function(from, to, list) {
    var length6 = list.length;
    var result = list.slice();
    var positiveFrom = from < 0 ? length6 + from : from;
    var positiveTo = to < 0 ? length6 + to : to;
    var item = result.splice(positiveFrom, 1);
    return positiveFrom < 0 || positiveFrom >= list.length || positiveTo < 0 || positiveTo >= list.length ? list : [].concat(result.slice(0, positiveTo)).concat(item).concat(result.slice(positiveTo, list.length));
});
var multiply = _curry2(function multiply(a, b) {
    return a * b;
});
_curry2((f, o)=>(props)=>f.call(this, mergeDeepRight(o, props))
);
_curry1(function negate(n) {
    return -n;
});
_curry2(function none(fn, input) {
    return all(_complement(fn), input);
});
_curry1(function nthArg(n) {
    var arity = n < 0 ? 1 : n + 1;
    return curryN(arity, function() {
        return nth(n, arguments);
    });
});
_curry3(function o(f, g, x) {
    return f(g(x));
});
function _of(x) {
    return [
        x
    ];
}
_curry1(_of);
_curry2(function omit(names, obj) {
    var result = {};
    var index = {};
    var idx = 0;
    var len = names.length;
    while(idx < len){
        index[names[idx]] = 1;
        idx += 1;
    }
    for(var prop14 in obj){
        if (!index.hasOwnProperty(prop14)) {
            result[prop14] = obj[prop14];
        }
    }
    return result;
});
_curryN(4, [], function on(f, g, a, b) {
    return f(g(a), g(b));
});
_curry1(function once(fn) {
    var called = false;
    var result;
    return _arity(fn.length, function() {
        if (called) {
            return result;
        }
        called = true;
        result = fn.apply(this, arguments);
        return result;
    });
});
function _assertPromise(name, p) {
    if (p == null || !_isFunction(p.then)) {
        throw new TypeError('`' + name + '` expected a Promise, received ' + _toString(p, []));
    }
}
_curry2(function otherwise(f, p) {
    _assertPromise('otherwise', p);
    return p.then(null, f);
});
var Identity = function(x) {
    return {
        value: x,
        map: function(f) {
            return Identity(f(x));
        }
    };
};
var over = _curry3(function over(lens1, f, x) {
    return lens1(function(y) {
        return Identity(f(y));
    })(x).value;
});
_curry2(function pair(fst, snd) {
    return [
        fst,
        snd
    ];
});
function _createPartialApplicator(concat1) {
    return _curry2(function(fn, args) {
        return _arity(Math.max(0, fn.length - args.length), function() {
            return fn.apply(this, concat1(args, arguments));
        });
    });
}
_createPartialApplicator(_concat);
_createPartialApplicator(flip(_concat));
juxt([
    filter,
    reject
]);
_curry3(function pathEq(_path, val, obj) {
    return equals(path(_path, obj), val);
});
_curry3(function pathOr(d, p, obj) {
    return defaultTo(d, path(p, obj));
});
_curry3(function pathSatisfies(pred, propPath, obj) {
    return pred(path(propPath, obj));
});
_curry2(function pick(names, obj) {
    var result = {};
    var idx = 0;
    while(idx < names.length){
        if (names[idx] in obj) {
            result[names[idx]] = obj[names[idx]];
        }
        idx += 1;
    }
    return result;
});
var pickAll = _curry2(function pickAll(names, obj) {
    var result = {};
    var idx = 0;
    var len = names.length;
    while(idx < len){
        var name = names[idx];
        result[name] = obj[name];
        idx += 1;
    }
    return result;
});
_curry2(function pickBy(test, obj) {
    var result = {};
    for(var prop15 in obj){
        if (test(obj[prop15], prop15, obj)) {
            result[prop15] = obj[prop15];
        }
    }
    return result;
});
var prepend = _curry2(function prepend(el, list) {
    return _concat([
        el
    ], list);
});
reduce(multiply, 1);
var useWith = _curry2(function useWith(fn, transformers) {
    return curryN(transformers.length, function() {
        var args = [];
        var idx = 0;
        while(idx < transformers.length){
            args.push(transformers[idx].call(this, arguments[idx]));
            idx += 1;
        }
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, transformers.length)));
    });
});
useWith(_map, [
    pickAll,
    identity
]);
function _promap(f, g, profunctor) {
    return function(x) {
        return g(profunctor(f(x)));
    };
}
var XPromap = function() {
    function XPromap1(f, g, xf) {
        this.xf = xf;
        this.f = f;
        this.g = g;
    }
    XPromap1.prototype['@@transducer/init'] = __default1.init;
    XPromap1.prototype['@@transducer/result'] = __default1.result;
    XPromap1.prototype['@@transducer/step'] = function(result, input) {
        return this.xf['@@transducer/step'](result, _promap(this.f, this.g, input));
    };
    return XPromap1;
}();
var _xpromap = _curry3(function _xpromap(f, g, xf) {
    return new XPromap(f, g, xf);
});
_curry3(_dispatchable([
    'fantasy-land/promap',
    'promap'
], _xpromap, _promap));
_curry3(function propEq(name, val, obj) {
    return equals(val, prop(name, obj));
});
_curry3(function propIs(type5, name, obj) {
    return is(type5, prop(name, obj));
});
_curry3(function propOr(val, p, obj) {
    return defaultTo(val, prop(p, obj));
});
_curry3(function propSatisfies(pred, name, obj) {
    return pred(prop(name, obj));
});
_curry2(function props(ps, obj) {
    return ps.map(function(p) {
        return path([
            p
        ], obj);
    });
});
_curry2(function range(from, to) {
    if (!(_isNumber(from) && _isNumber(to))) {
        throw new TypeError('Both arguments to range must be numbers');
    }
    var result = [];
    var n = from;
    while(n < to){
        result.push(n);
        n += 1;
    }
    return result;
});
var reduceRight = _curry3(function reduceRight(fn, acc, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        acc = fn(list[idx], acc);
        if (acc && acc['@@transducer/reduced']) {
            acc = acc['@@transducer/value'];
            break;
        }
        idx -= 1;
    }
    return acc;
});
_curryN(4, [], function _reduceWhile(pred, fn, a, list) {
    return _reduce(function(acc, x) {
        return pred(acc, x) ? fn(acc, x) : _reduced(acc);
    }, a, list);
});
_curry1(_reduced);
var times = _curry2(function times(fn, n) {
    var len = Number(n);
    var idx = 0;
    var list;
    if (len < 0 || isNaN(len)) {
        throw new RangeError('n must be a non-negative number');
    }
    list = new Array(len);
    while(idx < len){
        list[idx] = fn(idx);
        idx += 1;
    }
    return list;
});
_curry2(function repeat(value, n) {
    return times(always(value), n);
});
_curry3(function replace(regex, replacement, str) {
    return str.replace(regex, replacement);
});
_curry3(function scan(fn, acc, list) {
    var idx = 0;
    var len = list.length;
    var result = [
        acc
    ];
    while(idx < len){
        acc = fn(acc, list[idx]);
        result[idx + 1] = acc;
        idx += 1;
    }
    return result;
});
var sequence = _curry2(function sequence(of, traversable) {
    return typeof traversable.sequence === 'function' ? traversable.sequence(of) : reduceRight(function(x, acc) {
        return ap(map(prepend, x), acc);
    }, of([]), traversable);
});
_curry3(function set(lens2, v3, x) {
    return over(lens2, always(v3), x);
});
_curry2(function sort(comparator, list) {
    return Array.prototype.slice.call(list, 0).sort(comparator);
});
_curry2(function sortBy(fn, list) {
    return Array.prototype.slice.call(list, 0).sort(function(a, b) {
        var aa = fn(a);
        var bb = fn(b);
        return aa < bb ? -1 : aa > bb ? 1 : 0;
    });
});
_curry2(function sortWith(fns, list) {
    return Array.prototype.slice.call(list, 0).sort(function(a, b) {
        var result = 0;
        var i = 0;
        while(result === 0 && i < fns.length){
            result = fns[i](a, b);
            i += 1;
        }
        return result;
    });
});
invoker(1, 'split');
_curry2(function splitAt(index, array) {
    return [
        slice(0, index, array),
        slice(index, length(array), array)
    ];
});
_curry2(function splitEvery(n, list) {
    if (n <= 0) {
        throw new Error('First argument to splitEvery must be a positive integer');
    }
    var result = [];
    var idx = 0;
    while(idx < list.length){
        result.push(slice(idx, idx += n, list));
    }
    return result;
});
_curry2(function splitWhen(pred, list) {
    var idx = 0;
    var len = list.length;
    var prefix = [];
    while(idx < len && !pred(list[idx])){
        prefix.push(list[idx]);
        idx += 1;
    }
    return [
        prefix,
        Array.prototype.slice.call(list, idx)
    ];
});
_curryN(2, [], function splitWhenever(pred, list) {
    var acc = [];
    var curr = [];
    for(var i = 0; i < list.length; i = i + 1){
        if (!pred(list[i])) {
            curr.push(list[i]);
        }
        if ((i < list.length - 1 && pred(list[i + 1]) || i === list.length - 1) && curr.length > 0) {
            acc.push(curr);
            curr = [];
        }
    }
    return acc;
});
_curry2(function(prefix, list) {
    return equals(take(prefix.length, list), prefix);
});
_curry2(function subtract(a, b) {
    return Number(a) - Number(b);
});
_curry2(function symmetricDifference(list1, list2) {
    return concat(difference(list1, list2), difference(list2, list1));
});
_curry3(function symmetricDifferenceWith(pred, list1, list2) {
    return concat(differenceWith(pred, list1, list2), differenceWith(pred, list2, list1));
});
_curry2(function takeLastWhile(fn, xs) {
    var idx = xs.length - 1;
    while(idx >= 0 && fn(xs[idx])){
        idx -= 1;
    }
    return slice(idx + 1, Infinity, xs);
});
var XTakeWhile = function() {
    function XTakeWhile1(f, xf) {
        this.xf = xf;
        this.f = f;
    }
    XTakeWhile1.prototype['@@transducer/init'] = __default1.init;
    XTakeWhile1.prototype['@@transducer/result'] = __default1.result;
    XTakeWhile1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : _reduced(result);
    };
    return XTakeWhile1;
}();
var _xtakeWhile = _curry2(function _xtakeWhile(f, xf) {
    return new XTakeWhile(f, xf);
});
_curry2(_dispatchable([
    'takeWhile'
], _xtakeWhile, function takeWhile(fn, xs) {
    var idx = 0;
    var len = xs.length;
    while(idx < len && fn(xs[idx])){
        idx += 1;
    }
    return slice(0, idx, xs);
}));
var XTap = function() {
    function XTap1(f, xf) {
        this.xf = xf;
        this.f = f;
    }
    XTap1.prototype['@@transducer/init'] = __default1.init;
    XTap1.prototype['@@transducer/result'] = __default1.result;
    XTap1.prototype['@@transducer/step'] = function(result, input) {
        this.f(input);
        return this.xf['@@transducer/step'](result, input);
    };
    return XTap1;
}();
var _xtap = _curry2(function _xtap(f, xf) {
    return new XTap(f, xf);
});
_curry2(_dispatchable([], _xtap, function tap(fn, x) {
    fn(x);
    return x;
}));
function _isRegExp(x) {
    return Object.prototype.toString.call(x) === '[object RegExp]';
}
_curry2(function test(pattern, str) {
    if (!_isRegExp(pattern)) {
        throw new TypeError('‘test’ requires a value of type RegExp as its first argument; received ' + toString1(pattern));
    }
    return _cloneRegExp(pattern).test(str);
});
_curry2(function andThen(f, p) {
    _assertPromise('andThen', p);
    return p.then(f);
});
invoker(0, 'toLowerCase');
_curry1(function toPairs(obj) {
    var pairs = [];
    for(var prop16 in obj){
        if (_has(prop16, obj)) {
            pairs[pairs.length] = [
                prop16,
                obj[prop16]
            ];
        }
    }
    return pairs;
});
_curry1(function toPairsIn(obj) {
    var pairs = [];
    for(var prop17 in obj){
        pairs[pairs.length] = [
            prop17,
            obj[prop17]
        ];
    }
    return pairs;
});
invoker(0, 'toUpperCase');
curryN(4, function transduce(xf, fn, acc, list) {
    return _reduce(xf(typeof fn === 'function' ? _xwrap(fn) : fn), acc, list);
});
_curry1(function transpose(outerlist) {
    var i = 0;
    var result = [];
    while(i < outerlist.length){
        var innerlist = outerlist[i];
        var j = 0;
        while(j < innerlist.length){
            if (typeof result[j] === 'undefined') {
                result[j] = [];
            }
            result[j].push(innerlist[j]);
            j += 1;
        }
        i += 1;
    }
    return result;
});
_curry3(function traverse(of, f, traversable) {
    return typeof traversable['fantasy-land/traverse'] === 'function' ? traversable['fantasy-land/traverse'](f, of) : typeof traversable.traverse === 'function' ? traversable.traverse(f, of) : sequence(of, map(f, traversable));
});
var ws = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003' + '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028' + '\u2029\uFEFF';
var zeroWidth = '\u200b';
var hasProtoTrim = typeof String.prototype.trim === 'function';
!hasProtoTrim || ws.trim() || !zeroWidth.trim() ? _curry1(function trim(str) {
    var beginRx = new RegExp('^[' + ws + '][' + ws + ']*');
    var endRx = new RegExp('[' + ws + '][' + ws + ']*$');
    return str.replace(beginRx, '').replace(endRx, '');
}) : _curry1(function trim(str) {
    return str.trim();
});
_curry2(function _tryCatch(tryer, catcher) {
    return _arity(tryer.length, function() {
        try {
            return tryer.apply(this, arguments);
        } catch (e2) {
            return catcher.apply(this, _concat([
                e2
            ], arguments));
        }
    });
});
_curry1(function unapply(fn) {
    return function() {
        return fn(Array.prototype.slice.call(arguments, 0));
    };
});
_curry1(function unary(fn) {
    return nAry(1, fn);
});
_curry2(function uncurryN(depth, fn) {
    return curryN(depth, function() {
        var currentDepth = 1;
        var value = fn;
        var idx = 0;
        var endIdx;
        while(currentDepth <= depth && typeof value === 'function'){
            endIdx = currentDepth === depth ? arguments.length : idx + value.length;
            value = value.apply(this, Array.prototype.slice.call(arguments, idx, endIdx));
            currentDepth += 1;
            idx = endIdx;
        }
        return value;
    });
});
_curry2(function unfold(fn, seed) {
    var pair = fn(seed);
    var result = [];
    while(pair && pair.length){
        result[result.length] = pair[0];
        pair = fn(pair[1]);
    }
    return result;
});
_curry2(compose(uniq, _concat));
var XUniqWith = function() {
    function XUniqWith1(pred, xf) {
        this.xf = xf;
        this.pred = pred;
        this.items = [];
    }
    XUniqWith1.prototype['@@transducer/init'] = __default1.init;
    XUniqWith1.prototype['@@transducer/result'] = __default1.result;
    XUniqWith1.prototype['@@transducer/step'] = function(result, input) {
        if (_includesWith(this.pred, input, this.items)) {
            return result;
        } else {
            this.items.push(input);
            return this.xf['@@transducer/step'](result, input);
        }
    };
    return XUniqWith1;
}();
var _xuniqWith = _curry2(function _xuniqWith(pred, xf) {
    return new XUniqWith(pred, xf);
});
var uniqWith = _curry2(_dispatchable([], _xuniqWith, function(pred, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    var item;
    while(idx < len){
        item = list[idx];
        if (!_includesWith(pred, item, result)) {
            result[result.length] = item;
        }
        idx += 1;
    }
    return result;
}));
_curry3(function unionWith(pred, list1, list2) {
    return uniqWith(pred, _concat(list1, list2));
});
_curry3(function unless(pred, whenFalseFn, x) {
    return pred(x) ? x : whenFalseFn(x);
});
chain(_identity);
_curry3(function until(pred, fn, init) {
    var val = init;
    while(!pred(val)){
        val = fn(val);
    }
    return val;
});
_curry2(function(key, object) {
    if (!(key in object && __default(object[key]))) {
        return [
            object
        ];
    }
    return _map(function(item) {
        return _assoc(key, item, object);
    }, object[key]);
});
_curry1(function valuesIn(obj) {
    var prop18;
    var vs = [];
    for(prop18 in obj){
        vs[vs.length] = obj[prop18];
    }
    return vs;
});
var Const = function(x) {
    return {
        value: x,
        'fantasy-land/map': function() {
            return this;
        }
    };
};
_curry2(function view(lens3, x) {
    return lens3(Const)(x).value;
});
_curry3(function when(pred, whenTrueFn, x) {
    return pred(x) ? whenTrueFn(x) : x;
});
var where = _curry2(function where(spec, testObj) {
    for(var prop19 in spec){
        if (_has(prop19, spec) && !spec[prop19](testObj[prop19])) {
            return false;
        }
    }
    return true;
});
_curry2(function whereAny(spec, testObj) {
    for(var prop20 in spec){
        if (_has(prop20, spec) && spec[prop20](testObj[prop20])) {
            return true;
        }
    }
    return false;
});
_curry2(function whereEq(spec, testObj) {
    return where(map(equals, spec), testObj);
});
_curry2(function(xs, list) {
    return reject(flip(_includes)(xs), list);
});
_curry2(function xor(a, b) {
    return Boolean(!a ^ !b);
});
_curry2(function xprod(a, b) {
    var idx = 0;
    var ilen = a.length;
    var j;
    var jlen = b.length;
    var result = [];
    while(idx < ilen){
        j = 0;
        while(j < jlen){
            result[result.length] = [
                a[idx],
                b[j]
            ];
            j += 1;
        }
        idx += 1;
    }
    return result;
});
_curry2(function zip(a, b) {
    var rv = [];
    var idx = 0;
    var len = Math.min(a.length, b.length);
    while(idx < len){
        rv[idx] = [
            a[idx],
            b[idx]
        ];
        idx += 1;
    }
    return rv;
});
_curry2(function zipObj(keys2, values1) {
    var idx = 0;
    var len = Math.min(keys2.length, values1.length);
    var out = {};
    while(idx < len){
        out[keys2[idx]] = values1[idx];
        idx += 1;
    }
    return out;
});
_curry3(function zipWith(fn, a, b) {
    var rv = [];
    var idx = 0;
    var len = Math.min(a.length, b.length);
    while(idx < len){
        rv[idx] = fn(a[idx], b[idx]);
        idx += 1;
    }
    return rv;
});
_curry1(function thunkify(fn) {
    return curryN(fn.length, function createThunk() {
        var fnArgs = arguments;
        return function invokeThunk() {
            return fn.apply(this, fnArgs);
        };
    });
});
const isFunction = (item)=>typeof item === 'function'
;
complement(isNil);
const createEnum = (...args)=>{
    return Object.fromEntries(args.map((enumName, index)=>[
            [
                enumName,
                index
            ],
            [
                index,
                enumName
            ], 
        ]
    ).flat());
};
const State = (initialState)=>{
    let internalState = initialState;
    return (handler)=>{
        if (handler) {
            internalState = isFunction(handler) ? handler(internalState) : handler;
        }
        return internalState;
    };
};
State(0);
State(0);
State(0);
State(0);
State(0);
const cns = Symbol('__Component_Symbol__');
const Component = ()=>{
    const returnMethod = (data)=>{
        return {
            [cns]: returnMethod,
            ...data
        };
    };
    return returnMethod;
};
const ComponentStateManager = (initialState)=>{
    let internalState = initialState;
    return (changes)=>{
        if (changes) {
            internalState = {
                ...internalState,
                ...changes
            };
        }
        return internalState;
    };
};
class ComponentEntityManager extends Map {
    get(component) {
        const list = super.get(component);
        if (list) {
            return list;
        }
        const newList = [];
        super.set(component, newList);
        return newList;
    }
    appendItem(component, item) {
        this.get(component).push(item);
    }
    removeItem(component, item) {
        const list = this.get(component);
        this.set(component, list.filter((i)=>i !== item
        ));
    }
}
const Counter = ()=>{
    let number = 0;
    return ()=>number++
    ;
};
const EntityId = Component();
const EntityList = ()=>{
    const entityIdCounter = Counter();
    const entities = new Map();
    const componentEntityMapping = new ComponentEntityManager();
    const addEntity1 = (components)=>{
        const id = entityIdCounter();
        const entity = {
            id,
            components: new Map()
        };
        entities.set(entity.id, entity);
        addComponentToEntity1(id, EntityId({
            id
        }));
        for (const component of components){
            addComponentToEntity1(id, component);
        }
        return entity;
    };
    const addComponentToEntity1 = (entityId, component)=>{
        const componentName = component[cns];
        const entity = entities.get(entityId);
        if (!entity) return;
        entity.components.set(componentName, ComponentStateManager(component));
        componentEntityMapping.appendItem(componentName, entityId);
    };
    function removeEntity1(id) {
        const entity = entities.get(id);
        if (!entity) return;
        const { components  } = entity;
        entities.delete(id);
        for (const [componentName] of components){
            componentEntityMapping.removeItem(componentName, id);
        }
    }
    function count1(componentFilter) {
        const componentMapping = [];
        for (const componentName of componentFilter){
            const component = componentEntityMapping.get(componentName);
            if (component.length === 0) {
                return 0;
            }
            componentMapping.push(component);
        }
        const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
        return entityIds.length;
    }
    function* query1(componentFilter, filteredUserIds) {
        let componentMapping = [];
        if (filteredUserIds) {
            componentMapping.push(filteredUserIds);
        }
        for (const [, componentName] of Object.entries(componentFilter)){
            const component = componentEntityMapping.get(componentName) || [];
            if (!component || component.length === 0) {
                return;
            }
            componentMapping.push(component);
        }
        componentMapping = componentMapping.sort((a, b)=>a.length - b.length
        );
        const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
        for (const entityId of entityIds){
            const entity = entities.get(entityId);
            if (!entity) {
                continue;
            }
            const components = {};
            for (const [remappedName, componentName] of Object.entries(componentFilter)){
                components[remappedName] = entity.components.get(componentName);
            }
            yield components;
        }
    }
    return {
        addEntity: addEntity1,
        removeEntity: removeEntity1,
        addComponentToEntity: addComponentToEntity1,
        count: count1,
        query: query1
    };
};
const globalEntityList = EntityList();
globalEntityList.addEntity;
globalEntityList.removeEntity;
globalEntityList.addComponentToEntity;
globalEntityList.count;
globalEntityList.query;
const intersectionBetweenOrderedIntegerLists = (intLists)=>{
    let last1 = intLists[0];
    for(let i = 1; i < intLists.length; i++){
        const current = intLists[i];
        const matches = [];
        const lastLength = last1.length;
        const currentLength = current.length;
        let currentIndexStartingPoint = 0;
        for(let lastIndex = 0; lastIndex < lastLength; lastIndex++){
            const lastId = last1[lastIndex];
            for(let currentIndex = currentIndexStartingPoint; currentIndex < currentLength; currentIndex++){
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
        last1 = matches;
    }
    return last1;
};
Component();
function* it() {
    yield this.x;
    yield this.y;
}
const v = (x, y)=>{
    return {
        x,
        y,
        [0]: x,
        [1]: x,
        [Symbol.iterator]: it
    };
};
curry(([x1, y1], [x2, y2])=>{
    return v(x1 + x2, y1 + y2);
});
Component();
Component();
Component();
const immutable = (t)=>{
    const obj = Object.freeze(t);
    if (Array.isArray(obj)) {
        obj.forEach((item)=>immutable(item)
        );
    } else if (typeof obj === 'object' && obj !== null) {
        for (let value of Object.values(obj)){
            immutable(value);
        }
    }
    return obj;
};
class EMap extends Map {
    creator;
    constructor(creator){
        super();
        this.creator = creator;
    }
    get(key) {
        const value = super.get(key);
        if (value) return value;
        const created = this.creator();
        super.set(key, created);
        return created;
    }
    has() {
        return true;
    }
}
const NativeKeyCodes = immutable({
    AltLeft: 'AltLeft',
    AltRight: 'AltRight',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    ArrowUp: 'ArrowUp',
    Backquote: 'Backquote',
    Backslash: 'Backslash',
    Backspace: 'Backspace',
    BracketLeft: 'BracketLeft',
    BracketRight: 'BracketRight',
    CapsLock: 'CapsLock',
    Comma: 'Comma',
    ControlLeft: 'ControlLeft',
    Digit0: 'Digit0',
    Digit1: 'Digit1',
    Digit2: 'Digit2',
    Digit3: 'Digit3',
    Digit4: 'Digit4',
    Digit5: 'Digit5',
    Digit6: 'Digit6',
    Digit7: 'Digit7',
    Digit8: 'Digit8',
    Digit9: 'Digit9',
    Enter: 'Enter',
    Equal: 'Equal',
    Escape: 'Escape',
    KeyA: 'KeyA',
    KeyB: 'KeyB',
    KeyC: 'KeyC',
    KeyD: 'KeyD',
    KeyE: 'KeyE',
    KeyF: 'KeyF',
    KeyG: 'KeyG',
    KeyH: 'KeyH',
    KeyI: 'KeyI',
    KeyJ: 'KeyJ',
    KeyK: 'KeyK',
    KeyL: 'KeyL',
    KeyM: 'KeyM',
    KeyN: 'KeyN',
    KeyO: 'KeyO',
    KeyP: 'KeyP',
    KeyQ: 'KeyQ',
    KeyR: 'KeyR',
    KeyS: 'KeyS',
    KeyT: 'KeyT',
    KeyU: 'KeyU',
    KeyV: 'KeyV',
    KeyW: 'KeyW',
    KeyX: 'KeyX',
    KeyY: 'KeyY',
    KeyZ: 'KeyZ',
    MetaLeft: 'MetaLeft',
    MetaRight: 'MetaRight',
    Minus: 'Minus',
    Period: 'Period',
    Quote: 'Quote',
    Semicolon: 'Semicolon',
    ShiftLeft: 'ShiftLeft',
    ShiftRight: 'ShiftRight',
    Slash: 'Slash',
    Space: 'Space',
    Tab: 'Tab'
});
const AliasKeyCodes = immutable({
    'Shift': [
        'ShiftLeft',
        'ShiftRight'
    ],
    'Meta': [
        'MetaLeft',
        'MetaRight'
    ],
    'Alt': [
        'AltLeft',
        'AltRight'
    ]
});
immutable({
    ...NativeKeyCodes,
    ...AliasKeyCodes
});
const isWorkerContext = ()=>{
    if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
        return true;
    } else {
        return false;
    }
};
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const throwMarker = Symbol("Comlink.thrown");
const isObject = (val)=>typeof val === "object" && val !== null || typeof val === "function"
;
const proxyTransferHandler = {
    canHandle: (val)=>isObject(val) && val[proxyMarker]
    ,
    serialize (obj) {
        const { port1 , port2  } = new MessageChannel();
        expose(obj, port1);
        return [
            port2,
            [
                port2
            ]
        ];
    },
    deserialize (port) {
        port.start();
        return wrap(port);
    }
};
const throwTransferHandler = {
    canHandle: (value)=>isObject(value) && throwMarker in value
    ,
    serialize ({ value  }) {
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
            serialized = {
                isError: false,
                value
            };
        }
        return [
            serialized,
            []
        ];
    },
    deserialize (serialized) {
        if (serialized.isError) {
            throw Object.assign(new Error(serialized.value.message), serialized.value);
        }
        throw serialized.value;
    }
};
const transferHandlers = new Map([
    [
        "proxy",
        proxyTransferHandler
    ],
    [
        "throw",
        throwTransferHandler
    ], 
]);
function expose(obj1, ep = self) {
    ep.addEventListener("message", function callback(ev) {
        if (!ev || !ev.data) {
            return;
        }
        const { id , type: type6 , path: path4  } = Object.assign({
            path: []
        }, ev.data);
        const argumentList = (ev.data.argumentList || []).map(fromWireValue);
        let returnValue1;
        try {
            const parent = path4.slice(0, -1).reduce((obj, prop21)=>obj[prop21]
            , obj1);
            const rawValue = path4.reduce((obj, prop22)=>obj[prop22]
            , obj1);
            switch(type6){
                case "GET":
                    {
                        returnValue1 = rawValue;
                    }
                    break;
                case "SET":
                    {
                        parent[path4.slice(-1)[0]] = fromWireValue(ev.data.value);
                        returnValue1 = true;
                    }
                    break;
                case "APPLY":
                    {
                        returnValue1 = rawValue.apply(parent, argumentList);
                    }
                    break;
                case "CONSTRUCT":
                    {
                        const value = new rawValue(...argumentList);
                        returnValue1 = proxy(value);
                    }
                    break;
                case "ENDPOINT":
                    {
                        const { port1 , port2  } = new MessageChannel();
                        expose(obj1, port2);
                        returnValue1 = transfer(port1, [
                            port1
                        ]);
                    }
                    break;
                case "RELEASE":
                    {
                        returnValue1 = undefined;
                    }
                    break;
                default:
                    return;
            }
        } catch (value1) {
            returnValue1 = {
                value: value1,
                [throwMarker]: 0
            };
        }
        Promise.resolve(returnValue1).catch((value)=>{
            return {
                value,
                [throwMarker]: 0
            };
        }).then((returnValue)=>{
            const [wireValue, transferables] = toWireValue(returnValue);
            ep.postMessage(Object.assign(Object.assign({}, wireValue), {
                id
            }), transferables);
            if (type6 === "RELEASE") {
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
    if (isMessagePort(endpoint)) endpoint.close();
}
function wrap(ep, target) {
    return createProxy(ep, [], target);
}
function throwIfProxyReleased(isReleased) {
    if (isReleased) {
        throw new Error("Proxy has been released and is not useable");
    }
}
function createProxy(ep, path5 = [], target = function() {}) {
    let isProxyReleased = false;
    const proxy1 = new Proxy(target, {
        get (_target, prop23) {
            throwIfProxyReleased(isProxyReleased);
            if (prop23 === releaseProxy) {
                return ()=>{
                    return requestResponseMessage(ep, {
                        type: "RELEASE",
                        path: path5.map((p)=>p.toString()
                        )
                    }).then(()=>{
                        closeEndPoint(ep);
                        isProxyReleased = true;
                    });
                };
            }
            if (prop23 === "then") {
                if (path5.length === 0) {
                    return {
                        then: ()=>proxy1
                    };
                }
                const r = requestResponseMessage(ep, {
                    type: "GET",
                    path: path5.map((p)=>p.toString()
                    )
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, [
                ...path5,
                prop23
            ]);
        },
        set (_target, prop24, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, {
                type: "SET",
                path: [
                    ...path5,
                    prop24
                ].map((p)=>p.toString()
                ),
                value
            }, transferables).then(fromWireValue);
        },
        apply (_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last2 = path5[path5.length - 1];
            if (last2 === createEndpoint) {
                return requestResponseMessage(ep, {
                    type: "ENDPOINT"
                }).then(fromWireValue);
            }
            if (last2 === "bind") {
                return createProxy(ep, path5.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "APPLY",
                path: path5.map((p)=>p.toString()
                ),
                argumentList
            }, transferables).then(fromWireValue);
        },
        construct (_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "CONSTRUCT",
                path: path5.map((p)=>p.toString()
                ),
                argumentList
            }, transferables).then(fromWireValue);
        }
    });
    return proxy1;
}
function myFlat(arr) {
    return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
    const processed = argumentList.map(toWireValue);
    return [
        processed.map((v4)=>v4[0]
        ),
        myFlat(processed.map((v5)=>v5[1]
        ))
    ];
}
const transferCache = new WeakMap();
function transfer(obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
}
function proxy(obj) {
    return Object.assign(obj, {
        [proxyMarker]: true
    });
}
function toWireValue(value) {
    for (const [name, handler] of transferHandlers){
        if (handler.canHandle(value)) {
            const [serializedValue, transferables] = handler.serialize(value);
            return [
                {
                    type: "HANDLER",
                    name,
                    value: serializedValue
                },
                transferables, 
            ];
        }
    }
    return [
        {
            type: "RAW",
            value
        },
        transferCache.get(value) || [], 
    ];
}
function fromWireValue(value) {
    switch(value.type){
        case "HANDLER":
            return transferHandlers.get(value.name).deserialize(value.value);
        case "RAW":
            return value.value;
    }
}
function requestResponseMessage(ep, msg, transfers) {
    return new Promise((resolve)=>{
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
        ep.postMessage(Object.assign({
            id
        }, msg), transfers);
    });
}
function generateUUID() {
    return new Array(4).fill(0).map(()=>Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
    ).join("-");
}
const wrap1 = (...args)=>{
    return wrap(...args);
};
const transfer1 = (...args)=>{
    return transfer(...args);
};
new Map();
const createComlinkWorker = (path6, options)=>{
    const worker = new Worker(path6, options);
    console.log('worker', worker);
    const comlinkWorker = wrap1(worker);
    return comlinkWorker;
};
const createComlinkSharedWorker = (path7, options)=>{
    const worker1 = new SharedWorker(path7, options);
    worker1.port.start();
    const workerComlink = wrap1(worker1.port);
    const base = {
        get port () {
            return worker1.port;
        },
        clonePort () {
            const worker = new SharedWorker(path7, options);
            worker.port.start();
            return worker.port;
        }
    };
    return new Proxy(base, {
        get (obj, key) {
            if (obj.hasOwnProperty(key)) {
                return Reflect.get(obj, key);
            }
            return Reflect.get(workerComlink, key);
        }
    });
};
const activeKeys = new Set();
const justActivated = new Set();
let activeKeysSnapshot = new Set();
let justActivatedSnapshot = new Set();
const justPressed = (codes)=>{
    if (Array.isArray(codes)) {
        return codes.some((code)=>justPressed(code)
        );
    }
    return justActivatedSnapshot.has(codes);
};
const triggerKeyDown = (keyCode)=>{
    const alreadyDown = activeKeys.has(keyCode);
    activeKeys.add(keyCode);
    if (!alreadyDown) {
        justActivated.add(keyCode);
    }
};
const triggerKeyUp = (keyCode)=>{
    activeKeys.delete(keyCode);
};
const clearKeys = ()=>{
    activeKeys.clear();
    activeKeysSnapshot.clear();
    justActivated.clear();
    justActivatedSnapshot.clear();
};
const attachListeners = (worker)=>{
    if (!isWorkerContext()) {
        const keydownEvent = worker ? (event)=>worker['module:Keyboard:event:window:keydown'](event.code)
         : triggerKeyDown;
        const keyUpEvent = worker ? (event)=>worker['module:Keyboard:event:window:keyup'](event.code)
         : triggerKeyUp;
        const blurEvent = worker ? ()=>worker['module:Keyboard:event:window:blur']()
         : triggerKeyUp;
        window.addEventListener('keydown', keydownEvent);
        window.addEventListener('keyup', keyUpEvent);
        window.addEventListener('blur', blurEvent);
    }
    return {
        'module:Keyboard:event:window:keydown': triggerKeyDown,
        'module:Keyboard:event:window:keyup': triggerKeyUp,
        'module:Keyboard:event:window:blur': clearKeys
    };
};
new Map();
Component();
const Canvas = State({
    width: 1920,
    height: 1080
});
let activeContext = null;
Component();
Component();
Component();
const createCanvas = ()=>{
    const canvas = document.createElement('canvas');
    const { width , height  } = Canvas();
    Object.assign(canvas, {
        width,
        height
    });
    Object.assign(canvas.style, {
        border: '1px solid #ccc',
        maxWidth: '100%'
    });
    document.body.appendChild(canvas);
    return canvas;
};
const sendToContext = (item)=>{
    if (!activeContext) throw new Error('Outside of context');
    activeContext.push(item);
};
const e = createEnum('markStart', 'markEnd', 'arcTo', 'beginPath', 'bezierCurveTo', 'clearRect', 'clip', 'closePath', 'createConicGradient', 'createImageData', 'createLinearGradient', 'createPattern', 'createRadialGradient', 'drawFocusIfNeeded', 'drawImage', 'ellipse', 'fill', 'fillRect', 'fillText', 'getContextAttributes', 'getImageData', 'getLineDash', 'getTransform', 'isContextLost', 'isPointInPath', 'isPointInStroke', 'lineTo', 'measureText', 'moveTo', 'putImageData', 'quadraticCurveTo', 'rect', 'reset', 'resetTransform', 'restore', 'rotate', 'roundRect', 'save', 'scale', 'setLineDash', 'setTransform', 'stroke', 'strokeRect', 'strokeText', 'transform', 'translate', 'direction', 'fillStyle', 'filter', 'font', 'fontKerning', 'fontStretch', 'fontVariantCaps', 'globalAlpha', 'globalCompositeOperation', 'imageSmoothingEnabled', 'imageSmoothingQuality', 'letterSpacing', 'lineCap', 'lineDashOffset', 'lineJoin', 'lineWidth', 'miterLimit', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'strokeStyle', 'textAlign', 'textBaseline', 'textRendering', 'wordSpacing');
const c = (e1)=>{
    return (...args)=>sendToContext([
            e1,
            args
        ])
    ;
};
const hf = ()=>(ctx, enumber, args)=>{
        ctx[e[enumber]](...args);
    }
;
const hs = ()=>(ctx, enumber, [value])=>{
        ctx[e[enumber]] = value;
    }
;
const drawHandlers = new Map();
c(e.markStart);
c(e.markEnd);
c(e.arcTo);
c(e.beginPath);
c(e.bezierCurveTo);
c(e.clearRect);
new Map();
const markStart = (label)=>{
    performance.mark(label, {
        detail: [
            'debug',
            'start'
        ]
    });
};
const markEnd = (label)=>{
    performance.mark(label, {
        detail: [
            'debug',
            'end'
        ]
    });
};
c(e.clip);
c(e.closePath);
c(e.createConicGradient);
c(e.createImageData);
c(e.createLinearGradient);
c(e.createPattern);
c(e.createRadialGradient);
c(e.drawFocusIfNeeded);
c(e.drawImage);
c(e.ellipse);
c(e.fill);
c(e.fillRect);
c(e.fillText);
c(e.getContextAttributes);
c(e.getImageData);
c(e.getLineDash);
c(e.getTransform);
c(e.isContextLost);
c(e.isPointInPath);
c(e.isPointInStroke);
c(e.lineTo);
c(e.measureText);
c(e.moveTo);
c(e.putImageData);
c(e.quadraticCurveTo);
c(e.rect);
c(e.reset);
c(e.resetTransform);
c(e.restore);
c(e.rotate);
c(e.roundRect);
c(e.save);
c(e.scale);
c(e.setLineDash);
c(e.setTransform);
c(e.stroke);
c(e.strokeRect);
c(e.strokeText);
c(e.transform);
c(e.translate);
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
c(e.direction);
c(e.fillStyle);
c(e.filter);
c(e.font);
c(e.fontKerning);
c(e.fontStretch);
c(e.fontVariantCaps);
c(e.globalAlpha);
c(e.globalCompositeOperation);
c(e.imageSmoothingEnabled);
c(e.imageSmoothingQuality);
c(e.letterSpacing);
c(e.lineCap);
c(e.lineDashOffset);
c(e.lineJoin);
c(e.lineWidth);
c(e.miterLimit);
c(e.shadowBlur);
c(e.shadowColor);
c(e.shadowOffsetX);
c(e.shadowOffsetY);
c(e.strokeStyle);
c(e.textAlign);
c(e.textBaseline);
c(e.textRendering);
c(e.wordSpacing);
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
drawHandlers.set(e.markStart, (ctx, en, args)=>{
    markStart(...args);
});
drawHandlers.set(e.markEnd, (ctx, en, args)=>{
    markEnd(...args);
});
new Map();
new EMap(()=>[]
);
Component();
Component();
const loadApp = async ({ useWorker =false  })=>{
    if (useWorker === false) return await import('./app-worker.ts');
    const appWorker = createComlinkWorker('/src/app-worker.js', {
        type: 'module'
    });
    return appWorker;
};
const run = async ()=>{
    const canvas = createCanvas();
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const canvasWorker = createComlinkSharedWorker('/src/canvas-worker.js', {
        type: 'module'
    });
    canvasWorker.setCanvas(transfer1(offscreenCanvas, [
        offscreenCanvas
    ]));
    const app = await loadApp({
        useWorker: true
    });
    console.log('hello!');
    await app.attachCanvasWorker(transfer1(canvasWorker.port, [
        canvasWorker.port
    ]));
    attachListeners(app);
    await app.run();
};
if (document.readyState === "complete") {
    run();
} else {
    window.addEventListener('DOMContentLoaded', run);
}
