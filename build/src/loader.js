// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

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
        const { id , type: type1 , path: path1  } = Object.assign({
            path: []
        }, ev.data);
        const argumentList = (ev.data.argumentList || []).map(fromWireValue);
        let returnValue1;
        try {
            const parent = path1.slice(0, -1).reduce((obj, prop1)=>obj[prop1]
            , obj1);
            const rawValue = path1.reduce((obj, prop2)=>obj[prop2]
            , obj1);
            switch(type1){
                case "GET":
                    {
                        returnValue1 = rawValue;
                    }
                    break;
                case "SET":
                    {
                        parent[path1.slice(-1)[0]] = fromWireValue(ev.data.value);
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
            if (type1 === "RELEASE") {
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
function createProxy(ep, path2 = [], target = function() {}) {
    let isProxyReleased = false;
    const proxy1 = new Proxy(target, {
        get (_target, prop3) {
            throwIfProxyReleased(isProxyReleased);
            if (prop3 === releaseProxy) {
                return ()=>{
                    return requestResponseMessage(ep, {
                        type: "RELEASE",
                        path: path2.map((p1)=>p1.toString()
                        )
                    }).then(()=>{
                        closeEndPoint(ep);
                        isProxyReleased = true;
                    });
                };
            }
            if (prop3 === "then") {
                if (path2.length === 0) {
                    return {
                        then: ()=>proxy1
                    };
                }
                const r1 = requestResponseMessage(ep, {
                    type: "GET",
                    path: path2.map((p2)=>p2.toString()
                    )
                }).then(fromWireValue);
                return r1.then.bind(r1);
            }
            return createProxy(ep, [
                ...path2,
                prop3
            ]);
        },
        set (_target, prop4, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, {
                type: "SET",
                path: [
                    ...path2,
                    prop4
                ].map((p3)=>p3.toString()
                ),
                value
            }, transferables).then(fromWireValue);
        },
        apply (_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last1 = path2[path2.length - 1];
            if (last1 === createEndpoint) {
                return requestResponseMessage(ep, {
                    type: "ENDPOINT"
                }).then(fromWireValue);
            }
            if (last1 === "bind") {
                return createProxy(ep, path2.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "APPLY",
                path: path2.map((p4)=>p4.toString()
                ),
                argumentList
            }, transferables).then(fromWireValue);
        },
        construct (_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "CONSTRUCT",
                path: path2.map((p5)=>p5.toString()
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
        processed.map((v2)=>v2[0]
        ),
        myFlat(processed.map((v3)=>v3[1]
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
        ep.addEventListener("message", function l1(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id) {
                return;
            }
            ep.removeEventListener("message", l1);
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
const CBTracker = (labelName)=>{
    const events = new Set();
    const once = (...callbacks)=>{
        callbacks.forEach((callback)=>events.add([
                'once',
                callback
            ])
        );
    };
    const add1 = (...callbacks)=>{
        callbacks.forEach((callback)=>events.add([
                'always',
                callback
            ])
        );
    };
    return {
        once,
        add: add1,
        *[Symbol.iterator] () {
            for (const ev of events){
                const [type2, callback] = ev;
                if (type2 === 'once') {
                    events.delete(ev);
                }
                yield callback;
            }
        }
    };
};
function _isPlaceholder(a1) {
    return a1 != null && typeof a1 === 'object' && a1['@@functional/placeholder'] === true;
}
function _curry1(fn1) {
    return function f1(a2) {
        if (arguments.length === 0 || _isPlaceholder(a2)) {
            return f1;
        } else {
            return fn1.apply(this, arguments);
        }
    };
}
function _curry2(fn2) {
    return function f2(a3, b1) {
        switch(arguments.length){
            case 0:
                return f2;
            case 1:
                return _isPlaceholder(a3) ? f2 : _curry1(function(_b) {
                    return fn2(a3, _b);
                });
            default:
                return _isPlaceholder(a3) && _isPlaceholder(b1) ? f2 : _isPlaceholder(a3) ? _curry1(function(_a) {
                    return fn2(_a, b1);
                }) : _isPlaceholder(b1) ? _curry1(function(_b) {
                    return fn2(a3, _b);
                }) : fn2(a3, b1);
        }
    };
}
var add = _curry2(function add(a4, b2) {
    return Number(a4) + Number(b2);
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
function _arity(n1, fn3) {
    switch(n1){
        case 0:
            return function() {
                return fn3.apply(this, arguments);
            };
        case 1:
            return function(a0) {
                return fn3.apply(this, arguments);
            };
        case 2:
            return function(a0, a1) {
                return fn3.apply(this, arguments);
            };
        case 3:
            return function(a0, a1, a2) {
                return fn3.apply(this, arguments);
            };
        case 4:
            return function(a0, a1, a2, a3) {
                return fn3.apply(this, arguments);
            };
        case 5:
            return function(a0, a1, a2, a3, a4) {
                return fn3.apply(this, arguments);
            };
        case 6:
            return function(a0, a1, a2, a3, a4, a5) {
                return fn3.apply(this, arguments);
            };
        case 7:
            return function(a0, a1, a2, a3, a4, a5, a6) {
                return fn3.apply(this, arguments);
            };
        case 8:
            return function(a0, a1, a2, a3, a4, a5, a6, a7) {
                return fn3.apply(this, arguments);
            };
        case 9:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
                return fn3.apply(this, arguments);
            };
        case 10:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
                return fn3.apply(this, arguments);
            };
        default:
            throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
    }
}
function _curryN(length1, received, fn4) {
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
        return left <= 0 ? fn4.apply(this, combined) : _arity(left, _curryN(length1, combined, fn4));
    };
}
var curryN = _curry2(function curryN(length2, fn5) {
    if (length2 === 1) {
        return _curry1(fn5);
    }
    return _arity(length2, _curryN(length2, [], fn5));
});
_curry1(function addIndex(fn6) {
    return curryN(fn6.length, function() {
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
        return fn6.apply(this, args);
    });
});
function _curry3(fn7) {
    return function f3(a10, b3, c2) {
        switch(arguments.length){
            case 0:
                return f3;
            case 1:
                return _isPlaceholder(a10) ? f3 : _curry2(function(_b, _c) {
                    return fn7(a10, _b, _c);
                });
            case 2:
                return _isPlaceholder(a10) && _isPlaceholder(b3) ? f3 : _isPlaceholder(a10) ? _curry2(function(_a, _c) {
                    return fn7(_a, b3, _c);
                }) : _isPlaceholder(b3) ? _curry2(function(_b, _c) {
                    return fn7(a10, _b, _c);
                }) : _curry1(function(_c) {
                    return fn7(a10, b3, _c);
                });
            default:
                return _isPlaceholder(a10) && _isPlaceholder(b3) && _isPlaceholder(c2) ? f3 : _isPlaceholder(a10) && _isPlaceholder(b3) ? _curry2(function(_a, _b) {
                    return fn7(_a, _b, c2);
                }) : _isPlaceholder(a10) && _isPlaceholder(c2) ? _curry2(function(_a, _c) {
                    return fn7(_a, b3, _c);
                }) : _isPlaceholder(b3) && _isPlaceholder(c2) ? _curry2(function(_b, _c) {
                    return fn7(a10, _b, _c);
                }) : _isPlaceholder(a10) ? _curry1(function(_a) {
                    return fn7(_a, b3, c2);
                }) : _isPlaceholder(b3) ? _curry1(function(_b) {
                    return fn7(a10, _b, c2);
                }) : _isPlaceholder(c2) ? _curry1(function(_c) {
                    return fn7(a10, b3, _c);
                }) : fn7(a10, b3, c2);
        }
    };
}
var adjust = _curry3(function adjust(idx, fn8, list) {
    var len = list.length;
    if (idx >= len || idx < -len) {
        return list;
    }
    var _idx = (len + idx) % len;
    var _list = _concat(list);
    _list[_idx] = fn8(list[_idx]);
    return _list;
});
const __default = Array.isArray || function _isArray(val) {
    return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
};
function _isTransformer(obj) {
    return obj != null && typeof obj['@@transducer/step'] === 'function';
}
function _dispatchable(methodNames, transducerCreator, fn9) {
    return function() {
        if (arguments.length === 0) {
            return fn9();
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
        return fn9.apply(this, arguments);
    };
}
function _reduced(x1) {
    return x1 && x1['@@transducer/reduced'] ? x1 : {
        '@@transducer/value': x1,
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
    function XAll1(f4, xf) {
        this.xf = xf;
        this.f = f4;
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
var _xall = _curry2(function _xall(f5, xf) {
    return new XAll(f5, xf);
});
var all = _curry2(_dispatchable([
    'all'
], _xall, function all(fn10, list) {
    var idx = 0;
    while(idx < list.length){
        if (!fn10(list[idx])) {
            return false;
        }
        idx += 1;
    }
    return true;
}));
var max = _curry2(function max(a11, b4) {
    return b4 > a11 ? b4 : a11;
});
function _map(fn11, functor) {
    var idx = 0;
    var len = functor.length;
    var result = Array(len);
    while(idx < len){
        result[idx] = fn11(functor[idx]);
        idx += 1;
    }
    return result;
}
function _isString(x2) {
    return Object.prototype.toString.call(x2) === '[object String]';
}
var _isArrayLike = _curry1(function isArrayLike(x3) {
    if (__default(x3)) {
        return true;
    }
    if (!x3) {
        return false;
    }
    if (typeof x3 !== 'object') {
        return false;
    }
    if (_isString(x3)) {
        return false;
    }
    if (x3.length === 0) {
        return true;
    }
    if (x3.length > 0) {
        return x3.hasOwnProperty(0) && x3.hasOwnProperty(x3.length - 1);
    }
    return false;
});
var XWrap = function() {
    function XWrap1(fn12) {
        this.f = fn12;
    }
    XWrap1.prototype['@@transducer/init'] = function() {
        throw new Error('init not implemented on XWrap');
    };
    XWrap1.prototype['@@transducer/result'] = function(acc) {
        return acc;
    };
    XWrap1.prototype['@@transducer/step'] = function(acc, x4) {
        return this.f(acc, x4);
    };
    return XWrap1;
}();
function _xwrap(fn13) {
    return new XWrap(fn13);
}
var bind = _curry2(function bind(fn14, thisObj) {
    return _arity(fn14.length, function() {
        return fn14.apply(thisObj, arguments);
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
function _reduce(fn15, acc, list) {
    if (typeof fn15 === 'function') {
        fn15 = _xwrap(fn15);
    }
    if (_isArrayLike(list)) {
        return _arrayReduce(fn15, acc, list);
    }
    if (typeof list['fantasy-land/reduce'] === 'function') {
        return _methodReduce(fn15, acc, list, 'fantasy-land/reduce');
    }
    if (list[symIterator] != null) {
        return _iterableReduce(fn15, acc, list[symIterator]());
    }
    if (typeof list.next === 'function') {
        return _iterableReduce(fn15, acc, list);
    }
    if (typeof list.reduce === 'function') {
        return _methodReduce(fn15, acc, list, 'reduce');
    }
    throw new TypeError('reduce: list must be array or iterable');
}
var XMap = function() {
    function XMap1(f6, xf) {
        this.xf = xf;
        this.f = f6;
    }
    XMap1.prototype['@@transducer/init'] = __default1.init;
    XMap1.prototype['@@transducer/result'] = __default1.result;
    XMap1.prototype['@@transducer/step'] = function(result, input) {
        return this.xf['@@transducer/step'](result, this.f(input));
    };
    return XMap1;
}();
var _xmap = _curry2(function _xmap(f7, xf) {
    return new XMap(f7, xf);
});
function _has(prop5, obj) {
    return Object.prototype.hasOwnProperty.call(obj, prop5);
}
var toString = Object.prototype.toString;
var _isArguments = function() {
    return toString.call(arguments) === '[object Arguments]' ? function _isArguments(x5) {
        return toString.call(x5) === '[object Arguments]';
    } : function _isArguments(x6) {
        return _has('callee', x6);
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
    var prop6, nIdx;
    var ks = [];
    var checkArgsLength = hasArgsEnumBug && _isArguments(obj);
    for(prop6 in obj){
        if (_has(prop6, obj) && (!checkArgsLength || prop6 !== 'length')) {
            ks[ks.length] = prop6;
        }
    }
    if (hasEnumBug) {
        nIdx = nonEnumerableProps.length - 1;
        while(nIdx >= 0){
            prop6 = nonEnumerableProps[nIdx];
            if (_has(prop6, obj) && !contains(ks, prop6)) {
                ks[ks.length] = prop6;
            }
            nIdx -= 1;
        }
    }
    return ks;
});
var map = _curry2(_dispatchable([
    'fantasy-land/map',
    'map'
], _xmap, function map(fn16, functor) {
    switch(Object.prototype.toString.call(functor)){
        case '[object Function]':
            return curryN(functor.length, function() {
                return fn16.call(this, functor.apply(this, arguments));
            });
        case '[object Object]':
            return _reduce(function(acc, key) {
                acc[key] = fn16(functor[key]);
                return acc;
            }, {}, keys(functor));
        default:
            return _map(fn16, functor);
    }
}));
const __default2 = Number.isInteger || function _isInteger(n2) {
    return n2 << 0 === n2;
};
var nth = _curry2(function nth(offset, list) {
    var idx = offset < 0 ? list.length + offset : offset;
    return _isString(list) ? list.charAt(idx) : list[idx];
});
var prop = _curry2(function prop(p6, obj) {
    if (obj == null) {
        return;
    }
    return __default2(p6) ? nth(p6, obj) : obj[p6];
});
var pluck = _curry2(function pluck(p7, list) {
    return map(prop(p7), list);
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
var and = _curry2(function and(a12, b5) {
    return a12 && b5;
});
var XAny = function() {
    function XAny1(f8, xf) {
        this.xf = xf;
        this.f = f8;
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
var _xany = _curry2(function _xany(f9, xf) {
    return new XAny(f9, xf);
});
_curry2(_dispatchable([
    'any'
], _xany, function any(fn17, list) {
    var idx = 0;
    while(idx < list.length){
        if (fn17(list[idx])) {
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
    return typeof applyX['fantasy-land/ap'] === 'function' ? applyX['fantasy-land/ap'](applyF) : typeof applyF.ap === 'function' ? applyF.ap(applyX) : typeof applyF === 'function' ? function(x7) {
        return applyF(x7)(applyX(x7));
    } : _reduce(function(acc, f10) {
        return _concat(acc, map(f10, applyX));
    }, [], applyF);
});
function _aperture(n3, list) {
    var idx = 0;
    var limit = list.length - (n3 - 1);
    var acc = new Array(limit >= 0 ? limit : 0);
    while(idx < limit){
        acc[idx] = Array.prototype.slice.call(list, idx, idx + n3);
        idx += 1;
    }
    return acc;
}
var XAperture = function() {
    function XAperture1(n4, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n4);
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
var _xaperture = _curry2(function _xaperture(n5, xf) {
    return new XAperture(n5, xf);
});
_curry2(_dispatchable([], _xaperture, _aperture));
_curry2(function append(el, list) {
    return _concat(list, [
        el
    ]);
});
var apply = _curry2(function apply(fn18, args) {
    return fn18.apply(this, args);
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
function mapValues(fn19, obj) {
    return __default(obj) ? obj.map(fn19) : keys(obj).reduce(function(acc, key) {
        acc[key] = fn19(obj[key]);
        return acc;
    }, {});
}
_curry1(function applySpec1(spec) {
    spec = mapValues(function(v4) {
        return typeof v4 == 'function' ? v4 : applySpec1(v4);
    }, spec);
    return curryN(reduce(max, 0, pluck('length', values(spec))), function() {
        var args = arguments;
        return mapValues(function(f11) {
            return apply(f11, args);
        }, spec);
    });
});
_curry2(function applyTo(x8, f12) {
    return f12(x8);
});
_curry3(function ascend(fn20, a13, b6) {
    var aa = fn20(a13);
    var bb = fn20(b6);
    return aa < bb ? -1 : aa > bb ? 1 : 0;
});
function _assoc(prop7, val, obj) {
    if (__default2(prop7) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop7] = val;
        return arr;
    }
    var result = {};
    for(var p8 in obj){
        result[p8] = obj[p8];
    }
    result[prop7] = val;
    return result;
}
var isNil = _curry1(function isNil(x9) {
    return x9 == null;
});
var assocPath = _curry3(function assocPath1(path3, val, obj) {
    if (path3.length === 0) {
        return val;
    }
    var idx = path3[0];
    if (path3.length > 1) {
        var nextObj = !isNil(obj) && _has(idx, obj) ? obj[idx] : __default2(path3[1]) ? [] : {};
        val = assocPath1(Array.prototype.slice.call(path3, 1), val, nextObj);
    }
    return _assoc(idx, val, obj);
});
var assoc = _curry3(function assoc(prop8, val, obj) {
    return assocPath([
        prop8
    ], val, obj);
});
var nAry = _curry2(function nAry(n6, fn21) {
    switch(n6){
        case 0:
            return function() {
                return fn21.call(this);
            };
        case 1:
            return function(a0) {
                return fn21.call(this, a0);
            };
        case 2:
            return function(a0, a1) {
                return fn21.call(this, a0, a1);
            };
        case 3:
            return function(a0, a1, a2) {
                return fn21.call(this, a0, a1, a2);
            };
        case 4:
            return function(a0, a1, a2, a3) {
                return fn21.call(this, a0, a1, a2, a3);
            };
        case 5:
            return function(a0, a1, a2, a3, a4) {
                return fn21.call(this, a0, a1, a2, a3, a4);
            };
        case 6:
            return function(a0, a1, a2, a3, a4, a5) {
                return fn21.call(this, a0, a1, a2, a3, a4, a5);
            };
        case 7:
            return function(a0, a1, a2, a3, a4, a5, a6) {
                return fn21.call(this, a0, a1, a2, a3, a4, a5, a6);
            };
        case 8:
            return function(a0, a1, a2, a3, a4, a5, a6, a7) {
                return fn21.call(this, a0, a1, a2, a3, a4, a5, a6, a7);
            };
        case 9:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
                return fn21.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8);
            };
        case 10:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
                return fn21.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            };
        default:
            throw new Error('First argument to nAry must be a non-negative integer no greater than ten');
    }
});
_curry1(function binary(fn22) {
    return nAry(2, fn22);
});
function _isFunction(x10) {
    var type3 = Object.prototype.toString.call(x10);
    return type3 === '[object Function]' || type3 === '[object AsyncFunction]' || type3 === '[object GeneratorFunction]' || type3 === '[object AsyncGeneratorFunction]';
}
var liftN = _curry2(function liftN(arity, fn23) {
    var lifted = curryN(arity, fn23);
    return curryN(arity, function() {
        return _reduce(ap, map(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
    });
});
var lift = _curry1(function lift(fn24) {
    return liftN(fn24.length, fn24);
});
_curry2(function both(f13, g1) {
    return _isFunction(f13) ? function _both() {
        return f13.apply(this, arguments) && g1.apply(this, arguments);
    } : lift(and)(f13, g1);
});
_curry1(function call(fn25) {
    return fn25.apply(this, Array.prototype.slice.call(arguments, 1));
});
function _makeFlat(recursive) {
    return function flatt(list) {
        var value, jlen, j1;
        var result = [];
        var idx = 0;
        var ilen = list.length;
        while(idx < ilen){
            if (_isArrayLike(list[idx])) {
                value = recursive ? flatt(list[idx]) : list[idx];
                j1 = 0;
                jlen = value.length;
                while(j1 < jlen){
                    result[result.length] = value[j1];
                    j1 += 1;
                }
            } else {
                result[result.length] = list[idx];
            }
            idx += 1;
        }
        return result;
    };
}
function _forceReduced(x11) {
    return {
        '@@transducer/value': x11,
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
var _xchain = _curry2(function _xchain(f14, xf) {
    return map(f14, _flatCat(xf));
});
var chain = _curry2(_dispatchable([
    'fantasy-land/chain',
    'chain'
], _xchain, function chain(fn26, monad) {
    if (typeof monad === 'function') {
        return function(x12) {
            return fn26(monad(x12))(x12);
        };
    }
    return _makeFlat(false)(map(fn26, monad));
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
_curry2(function collectBy(fn27, list) {
    var group = _reduce(function(o1, x13) {
        var tag = fn27(x13);
        if (o1[tag] === undefined) {
            o1[tag] = [];
        }
        o1[tag].push(x13);
        return o1;
    }, {}, list);
    var newList = [];
    for(var tag1 in group){
        newList.push(group[tag1]);
    }
    return newList;
});
_curry1(function comparator(pred) {
    return function(a14, b7) {
        return pred(a14, b7) ? -1 : pred(b7, a14) ? 1 : 0;
    };
});
var not = _curry1(function not(a15) {
    return !a15;
});
var complement = lift(not);
function _pipe(f15, g2) {
    return function() {
        return g2.call(this, f15.apply(this, arguments));
    };
}
function _checkForMethod(methodname, fn28) {
    return function() {
        var length3 = arguments.length;
        if (length3 === 0) {
            return fn28();
        }
        var obj = arguments[length3 - 1];
        return __default(obj) || typeof obj[methodname] !== 'function' ? fn28.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length3 - 1));
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
function _identity(x14) {
    return x14;
}
var identity = _curry1(_identity);
var pipeWith = _curry2(function pipeWith(xf, list) {
    if (list.length <= 0) {
        return identity;
    }
    var headList = head(list);
    var tailList = tail(list);
    return _arity(headList.length, function() {
        return _reduce(function(result, f16) {
            return xf.call(this, f16, result);
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
function _includesWith(pred, x15, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (pred(x15, list[idx])) {
            return true;
        }
        idx += 1;
    }
    return false;
}
function _functionName(f17) {
    var match = String(f17).match(/^function (\w*)/);
    return match == null ? '' : match[1];
}
function _objectIs(a16, b8) {
    if (a16 === b8) {
        return a16 !== 0 || 1 / a16 === 1 / b8;
    } else {
        return a16 !== a16 && b8 !== b8;
    }
}
const __default3 = typeof Object.is === 'function' ? Object.is : _objectIs;
function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
    var a17 = _arrayFromIterator(aIterator);
    var b1 = _arrayFromIterator(bIterator);
    function eq(_a, _b) {
        return _equals(_a, _b, stackA.slice(), stackB.slice());
    }
    return !_includesWith(function(b9, aItem) {
        return !_includesWith(eq, aItem, b9);
    }, b1, a17);
}
function _equals(a18, b10, stackA, stackB) {
    if (__default3(a18, b10)) {
        return true;
    }
    var typeA = type(a18);
    if (typeA !== type(b10)) {
        return false;
    }
    if (typeof a18['fantasy-land/equals'] === 'function' || typeof b10['fantasy-land/equals'] === 'function') {
        return typeof a18['fantasy-land/equals'] === 'function' && a18['fantasy-land/equals'](b10) && typeof b10['fantasy-land/equals'] === 'function' && b10['fantasy-land/equals'](a18);
    }
    if (typeof a18.equals === 'function' || typeof b10.equals === 'function') {
        return typeof a18.equals === 'function' && a18.equals(b10) && typeof b10.equals === 'function' && b10.equals(a18);
    }
    switch(typeA){
        case 'Arguments':
        case 'Array':
        case 'Object':
            if (typeof a18.constructor === 'function' && _functionName(a18.constructor) === 'Promise') {
                return a18 === b10;
            }
            break;
        case 'Boolean':
        case 'Number':
        case 'String':
            if (!(typeof a18 === typeof b10 && __default3(a18.valueOf(), b10.valueOf()))) {
                return false;
            }
            break;
        case 'Date':
            if (!__default3(a18.valueOf(), b10.valueOf())) {
                return false;
            }
            break;
        case 'Error':
            return a18.name === b10.name && a18.message === b10.message;
        case 'RegExp':
            if (!(a18.source === b10.source && a18.global === b10.global && a18.ignoreCase === b10.ignoreCase && a18.multiline === b10.multiline && a18.sticky === b10.sticky && a18.unicode === b10.unicode)) {
                return false;
            }
            break;
    }
    var idx = stackA.length - 1;
    while(idx >= 0){
        if (stackA[idx] === a18) {
            return stackB[idx] === b10;
        }
        idx -= 1;
    }
    switch(typeA){
        case 'Map':
            if (a18.size !== b10.size) {
                return false;
            }
            return _uniqContentEquals(a18.entries(), b10.entries(), stackA.concat([
                a18
            ]), stackB.concat([
                b10
            ]));
        case 'Set':
            if (a18.size !== b10.size) {
                return false;
            }
            return _uniqContentEquals(a18.values(), b10.values(), stackA.concat([
                a18
            ]), stackB.concat([
                b10
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
    var keysA = keys(a18);
    if (keysA.length !== keys(b10).length) {
        return false;
    }
    var extendedStackA = stackA.concat([
        a18
    ]);
    var extendedStackB = stackB.concat([
        b10
    ]);
    idx = keysA.length - 1;
    while(idx >= 0){
        var key = keysA[idx];
        if (!(_has(key, b10) && _equals(b10[key], a18[key], extendedStackA, extendedStackB))) {
            return false;
        }
        idx -= 1;
    }
    return true;
}
var equals = _curry2(function equals(a19, b11) {
    return _equals(a19, b11, [], []);
});
function _indexOf(list, a20, idx) {
    var inf, item;
    if (typeof list.indexOf === 'function') {
        switch(typeof a20){
            case 'number':
                if (a20 === 0) {
                    inf = 1 / a20;
                    while(idx < list.length){
                        item = list[idx];
                        if (item === 0 && 1 / item === inf) {
                            return idx;
                        }
                        idx += 1;
                    }
                    return -1;
                } else if (a20 !== a20) {
                    while(idx < list.length){
                        item = list[idx];
                        if (typeof item === 'number' && item !== item) {
                            return idx;
                        }
                        idx += 1;
                    }
                    return -1;
                }
                return list.indexOf(a20, idx);
            case 'string':
            case 'boolean':
            case 'function':
            case 'undefined':
                return list.indexOf(a20, idx);
            case 'object':
                if (a20 === null) {
                    return list.indexOf(a20, idx);
                }
        }
    }
    while(idx < list.length){
        if (equals(list[idx], a20)) {
            return idx;
        }
        idx += 1;
    }
    return -1;
}
function _includes(a21, list) {
    return _indexOf(list, a21, 0) >= 0;
}
function _quote(s1) {
    var escaped = s1.replace(/\\/g, '\\\\').replace(/[\b]/g, '\\b').replace(/\f/g, '\\f').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\v/g, '\\v').replace(/\0/g, '\\0');
    return '"' + escaped.replace(/"/g, '\\"') + '"';
}
var pad = function pad(n7) {
    return (n7 < 10 ? '0' : '') + n7;
};
var _toISOString = typeof Date.prototype.toISOString === 'function' ? function _toISOString(d1) {
    return d1.toISOString();
} : function _toISOString(d2) {
    return d2.getUTCFullYear() + '-' + pad(d2.getUTCMonth() + 1) + '-' + pad(d2.getUTCDate()) + 'T' + pad(d2.getUTCHours()) + ':' + pad(d2.getUTCMinutes()) + ':' + pad(d2.getUTCSeconds()) + '.' + (d2.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
};
function _complement(f18) {
    return function() {
        return !f18.apply(this, arguments);
    };
}
function _filter(fn29, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    while(idx < len){
        if (fn29(list[idx])) {
            result[result.length] = list[idx];
        }
        idx += 1;
    }
    return result;
}
function _isObject(x16) {
    return Object.prototype.toString.call(x16) === '[object Object]';
}
var XFilter = function() {
    function XFilter1(f19, xf) {
        this.xf = xf;
        this.f = f19;
    }
    XFilter1.prototype['@@transducer/init'] = __default1.init;
    XFilter1.prototype['@@transducer/result'] = __default1.result;
    XFilter1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
    };
    return XFilter1;
}();
var _xfilter = _curry2(function _xfilter(f20, xf) {
    return new XFilter(f20, xf);
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
function _toString(x17, seen) {
    var recur = function recur(y1) {
        var xs = seen.concat([
            x17
        ]);
        return _includes(y1, xs) ? '<Circular>' : _toString(y1, xs);
    };
    var mapPairs = function(obj, keys1) {
        return _map(function(k1) {
            return _quote(k1) + ': ' + recur(obj[k1]);
        }, keys1.slice().sort());
    };
    switch(Object.prototype.toString.call(x17)){
        case '[object Arguments]':
            return '(function() { return arguments; }(' + _map(recur, x17).join(', ') + '))';
        case '[object Array]':
            return '[' + _map(recur, x17).concat(mapPairs(x17, reject(function(k2) {
                return /^\d+$/.test(k2);
            }, keys(x17)))).join(', ') + ']';
        case '[object Boolean]':
            return typeof x17 === 'object' ? 'new Boolean(' + recur(x17.valueOf()) + ')' : x17.toString();
        case '[object Date]':
            return 'new Date(' + (isNaN(x17.valueOf()) ? recur(NaN) : _quote(_toISOString(x17))) + ')';
        case '[object Null]':
            return 'null';
        case '[object Number]':
            return typeof x17 === 'object' ? 'new Number(' + recur(x17.valueOf()) + ')' : 1 / x17 === -Infinity ? '-0' : x17.toString(10);
        case '[object String]':
            return typeof x17 === 'object' ? 'new String(' + recur(x17.valueOf()) + ')' : _quote(x17);
        case '[object Undefined]':
            return 'undefined';
        default:
            if (typeof x17.toString === 'function') {
                var repr = x17.toString();
                if (repr !== '[object Object]') {
                    return repr;
                }
            }
            return '{' + mapPairs(x17, keys(x17)).join(', ') + '}';
    }
}
var toString1 = _curry1(function toString(val) {
    return _toString(val, []);
});
var concat = _curry2(function concat(a22, b12) {
    if (__default(a22)) {
        if (__default(b12)) {
            return a22.concat(b12);
        }
        throw new TypeError(toString1(b12) + ' is not an array');
    }
    if (_isString(a22)) {
        if (_isString(b12)) {
            return a22 + b12;
        }
        throw new TypeError(toString1(b12) + ' is not a string');
    }
    if (a22 != null && _isFunction(a22['fantasy-land/concat'])) {
        return a22['fantasy-land/concat'](b12);
    }
    if (a22 != null && _isFunction(a22.concat)) {
        return a22.concat(b12);
    }
    throw new TypeError(toString1(a22) + ' does not have a method named "concat" or "fantasy-land/concat"');
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
var curry = _curry1(function curry(fn30) {
    return curryN(fn30.length, fn30);
});
var constructN = _curry2(function constructN(n8, Fn) {
    if (n8 > 10) {
        throw new Error('Constructor with greater than ten arguments');
    }
    if (n8 === 0) {
        return function() {
            return new Fn();
        };
    }
    return curry(nAry(n8, function($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) {
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
        return after.apply(context, _map(function(fn31) {
            return fn31.apply(context, args);
        }, fns));
    });
});
curry(function(pred, list) {
    return _reduce(function(a23, e1) {
        return pred(e1) ? a23 + 1 : a23;
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
var defaultTo = _curry2(function defaultTo(d3, v5) {
    return v5 == null || v5 !== v5 ? d3 : v5;
});
_curry3(function descend(fn32, a24, b13) {
    var aa = fn32(a24);
    var bb = fn32(b13);
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
function hasOrAdd(item, shouldAdd, set3) {
    var type4 = typeof item;
    var prevSize, newSize;
    switch(type4){
        case 'string':
        case 'number':
            if (item === 0 && 1 / item === -Infinity) {
                if (set3._items['-0']) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set3._items['-0'] = true;
                    }
                    return false;
                }
            }
            if (set3._nativeSet !== null) {
                if (shouldAdd) {
                    prevSize = set3._nativeSet.size;
                    set3._nativeSet.add(item);
                    newSize = set3._nativeSet.size;
                    return newSize === prevSize;
                } else {
                    return set3._nativeSet.has(item);
                }
            } else {
                if (!(type4 in set3._items)) {
                    if (shouldAdd) {
                        set3._items[type4] = {};
                        set3._items[type4][item] = true;
                    }
                    return false;
                } else if (item in set3._items[type4]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set3._items[type4][item] = true;
                    }
                    return false;
                }
            }
        case 'boolean':
            if (type4 in set3._items) {
                var bIdx = item ? 1 : 0;
                if (set3._items[type4][bIdx]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set3._items[type4][bIdx] = true;
                    }
                    return false;
                }
            } else {
                if (shouldAdd) {
                    set3._items[type4] = item ? [
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
            if (set3._nativeSet !== null) {
                if (shouldAdd) {
                    prevSize = set3._nativeSet.size;
                    set3._nativeSet.add(item);
                    newSize = set3._nativeSet.size;
                    return newSize === prevSize;
                } else {
                    return set3._nativeSet.has(item);
                }
            } else {
                if (!(type4 in set3._items)) {
                    if (shouldAdd) {
                        set3._items[type4] = [
                            item
                        ];
                    }
                    return false;
                }
                if (!_includes(item, set3._items[type4])) {
                    if (shouldAdd) {
                        set3._items[type4].push(item);
                    }
                    return false;
                }
                return true;
            }
        case 'undefined':
            if (set3._items[type4]) {
                return true;
            } else {
                if (shouldAdd) {
                    set3._items[type4] = true;
                }
                return false;
            }
        case 'object':
            if (item === null) {
                if (!set3._items['null']) {
                    if (shouldAdd) {
                        set3._items['null'] = true;
                    }
                    return false;
                }
                return true;
            }
        default:
            type4 = Object.prototype.toString.call(item);
            if (!(type4 in set3._items)) {
                if (shouldAdd) {
                    set3._items[type4] = [
                        item
                    ];
                }
                return false;
            }
            if (!_includes(item, set3._items[type4])) {
                if (shouldAdd) {
                    set3._items[type4].push(item);
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
    for(var i1 = 0; i1 < secondLen; i1 += 1){
        toFilterOut.add(second[i1]);
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
function _dissoc(prop9, obj) {
    if (obj == null) {
        return obj;
    }
    if (__default2(prop9) && __default(obj)) {
        return remove(prop9, 1, obj);
    }
    var result = {};
    for(var p9 in obj){
        result[p9] = obj[p9];
    }
    delete result[prop9];
    return result;
}
function _shallowCloneObject(prop10, obj) {
    if (__default2(prop10) && __default(obj)) {
        return [].concat(obj);
    }
    var result = {};
    for(var p10 in obj){
        result[p10] = obj[p10];
    }
    return result;
}
var dissocPath = _curry2(function dissocPath1(path4, obj) {
    if (obj == null) {
        return obj;
    }
    switch(path4.length){
        case 0:
            return obj;
        case 1:
            return _dissoc(path4[0], obj);
        default:
            var head1 = path4[0];
            var tail1 = Array.prototype.slice.call(path4, 1);
            if (obj[head1] == null) {
                return _shallowCloneObject(head1, obj);
            } else {
                return assoc(head1, dissocPath1(tail1, obj[head1]), obj);
            }
    }
});
_curry2(function dissoc(prop11, obj) {
    return dissocPath([
        prop11
    ], obj);
});
_curry2(function divide(a25, b14) {
    return a25 / b14;
});
var XDrop = function() {
    function XDrop1(n9, xf) {
        this.xf = xf;
        this.n = n9;
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
var _xdrop = _curry2(function _xdrop(n10, xf) {
    return new XDrop(n10, xf);
});
var drop = _curry2(_dispatchable([
    'drop'
], _xdrop, function drop(n11, xs) {
    return slice(Math.max(0, n11), Infinity, xs);
}));
var XTake = function() {
    function XTake1(n12, xf) {
        this.xf = xf;
        this.n = n12;
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
var _xtake = _curry2(function _xtake(n13, xf) {
    return new XTake(n13, xf);
});
var take = _curry2(_dispatchable([
    'take'
], _xtake, function take(n14, xs) {
    return slice(0, n14 < 0 ? Infinity : n14, xs);
}));
function dropLast(n15, xs) {
    return take(n15 < xs.length ? xs.length - n15 : 0, xs);
}
var XDropLast = function() {
    function XDropLast1(n16, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n16);
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
var _xdropLast = _curry2(function _xdropLast(n17, xf) {
    return new XDropLast(n17, xf);
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
    function XDropLastWhile1(fn33, xf) {
        this.f = fn33;
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
var _xdropLastWhile = _curry2(function _xdropLastWhile(fn34, xf) {
    return new XDropLastWhile(fn34, xf);
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
    function XDropWhile1(f21, xf) {
        this.xf = xf;
        this.f = f21;
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
var _xdropWhile = _curry2(function _xdropWhile(f22, xf) {
    return new XDropWhile(f22, xf);
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
var or = _curry2(function or(a26, b15) {
    return a26 || b15;
});
_curry2(function either(f23, g3) {
    return _isFunction(f23) ? function _either() {
        return f23.apply(this, arguments) || g3.apply(this, arguments);
    } : lift(or)(f23, g3);
});
function _isTypedArray(val) {
    var type5 = Object.prototype.toString.call(val);
    return type5 === '[object Uint8ClampedArray]' || type5 === '[object Int8Array]' || type5 === '[object Uint8Array]' || type5 === '[object Int16Array]' || type5 === '[object Uint16Array]' || type5 === '[object Int32Array]' || type5 === '[object Uint32Array]' || type5 === '[object Float32Array]' || type5 === '[object Float64Array]' || type5 === '[object BigInt64Array]' || type5 === '[object BigUint64Array]';
}
var empty = _curry1(function empty(x18) {
    return x18 != null && typeof x18['fantasy-land/empty'] === 'function' ? x18['fantasy-land/empty']() : x18 != null && x18.constructor != null && typeof x18.constructor['fantasy-land/empty'] === 'function' ? x18.constructor['fantasy-land/empty']() : x18 != null && typeof x18.empty === 'function' ? x18.empty() : x18 != null && x18.constructor != null && typeof x18.constructor.empty === 'function' ? x18.constructor.empty() : __default(x18) ? [] : _isString(x18) ? '' : _isObject(x18) ? {} : _isArguments(x18) ? function() {
        return arguments;
    }() : _isTypedArray(x18) ? x18.constructor.from('') : void 0;
});
var takeLast = _curry2(function takeLast(n18, xs) {
    return drop(n18 >= 0 ? xs.length - n18 : 0, xs);
});
_curry2(function(suffix, list) {
    return equals(takeLast(suffix.length, list), suffix);
});
_curry3(function eqBy(f24, x19, y2) {
    return equals(f24(x19), f24(y2));
});
_curry3(function eqProps(prop12, obj1, obj2) {
    return equals(obj1[prop12], obj2[prop12]);
});
_curry2(function evolve1(transformations, object) {
    if (!_isObject(object) && !__default(object)) {
        return object;
    }
    var result = object instanceof Array ? [] : {};
    var transformation, key, type6;
    for(key in object){
        transformation = transformations[key];
        type6 = typeof transformation;
        result[key] = type6 === 'function' ? transformation(object[key]) : transformation && type6 === 'object' ? evolve1(transformation, object[key]) : object[key];
    }
    return result;
});
var XFind = function() {
    function XFind1(f25, xf) {
        this.xf = xf;
        this.f = f25;
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
var _xfind = _curry2(function _xfind(f26, xf) {
    return new XFind(f26, xf);
});
_curry2(_dispatchable([
    'find'
], _xfind, function find(fn35, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (fn35(list[idx])) {
            return list[idx];
        }
        idx += 1;
    }
}));
var XFindIndex = function() {
    function XFindIndex1(f27, xf) {
        this.xf = xf;
        this.f = f27;
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
var _xfindIndex = _curry2(function _xfindIndex(f28, xf) {
    return new XFindIndex(f28, xf);
});
_curry2(_dispatchable([], _xfindIndex, function findIndex(fn36, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (fn36(list[idx])) {
            return idx;
        }
        idx += 1;
    }
    return -1;
}));
var XFindLast = function() {
    function XFindLast1(f29, xf) {
        this.xf = xf;
        this.f = f29;
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
var _xfindLast = _curry2(function _xfindLast(f30, xf) {
    return new XFindLast(f30, xf);
});
_curry2(_dispatchable([], _xfindLast, function findLast(fn37, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        if (fn37(list[idx])) {
            return list[idx];
        }
        idx -= 1;
    }
}));
var XFindLastIndex = function() {
    function XFindLastIndex1(f31, xf) {
        this.xf = xf;
        this.f = f31;
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
var _xfindLastIndex = _curry2(function _xfindLastIndex(f32, xf) {
    return new XFindLastIndex(f32, xf);
});
_curry2(_dispatchable([], _xfindLastIndex, function findLastIndex(fn38, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        if (fn38(list[idx])) {
            return idx;
        }
        idx -= 1;
    }
    return -1;
}));
_curry1(_makeFlat(true));
var flip = _curry1(function flip(fn39) {
    return curryN(fn39.length, function(a27, b16) {
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = b16;
        args[1] = a27;
        return fn39.apply(this, args);
    });
});
_curry2(_checkForMethod('forEach', function forEach(fn40, list) {
    var len = list.length;
    var idx = 0;
    while(idx < len){
        fn40(list[idx]);
        idx += 1;
    }
    return list;
}));
_curry2(function forEachObjIndexed(fn41, obj) {
    var keyList = keys(obj);
    var idx = 0;
    while(idx < keyList.length){
        var key = keyList[idx];
        fn41(obj[key], key, obj);
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
_curry2(function(fn42, list) {
    var res = [];
    var idx = 0;
    var len = list.length;
    while(idx < len){
        var nextidx = idx + 1;
        while(nextidx < len && fn42(list[nextidx - 1], list[nextidx])){
            nextidx += 1;
        }
        res.push(list.slice(idx, nextidx));
        idx = nextidx;
    }
    return res;
});
_curry2(function gt(a28, b17) {
    return a28 > b17;
});
_curry2(function gte(a29, b18) {
    return a29 >= b18;
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
_curry2(function has(prop13, obj) {
    return hasPath([
        prop13
    ], obj);
});
_curry2(function hasIn(prop14, obj) {
    if (isNil(obj)) {
        return false;
    }
    return prop14 in obj;
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
    return _filter(function(x20) {
        return _includesWith(pred, x20, ys);
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
    function XUniqBy1(f33, xf) {
        this.xf = xf;
        this.f = f33;
        this.set = new _Set();
    }
    XUniqBy1.prototype['@@transducer/init'] = __default1.init;
    XUniqBy1.prototype['@@transducer/result'] = __default1.result;
    XUniqBy1.prototype['@@transducer/step'] = function(result, input) {
        return this.set.add(this.f(input)) ? this.xf['@@transducer/step'](result, input) : result;
    };
    return XUniqBy1;
}();
var _xuniqBy = _curry2(function _xuniqBy(f34, xf) {
    return new XUniqBy(f34, xf);
});
var uniqBy = _curry2(_dispatchable([], _xuniqBy, function(fn43, list) {
    var set4 = new _Set();
    var result = [];
    var idx = 0;
    var appliedItem, item;
    while(idx < list.length){
        item = list[idx];
        appliedItem = fn43(item);
        if (set4.add(appliedItem)) {
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
    '@@transducer/step': function(xs, x21) {
        xs.push(x21);
        return xs;
    },
    '@@transducer/result': _identity
};
var _stepCatString = {
    '@@transducer/init': String,
    '@@transducer/step': function(a30, b19) {
        return a30 + b19;
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
_curry1(function isEmpty(x22) {
    return x22 != null && equals(x22, empty(x22));
});
invoker(1, 'join');
var juxt = _curry1(function juxt(fns) {
    return converge(function() {
        return Array.prototype.slice.call(arguments, 0);
    }, fns);
});
_curry1(function keysIn(obj) {
    var prop15;
    var ks = [];
    for(prop15 in obj){
        ks[ks.length] = prop15;
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
function _isNumber(x23) {
    return Object.prototype.toString.call(x23) === '[object Number]';
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
var update = _curry3(function update(idx, x24, list) {
    return adjust(idx, always(x24), list);
});
_curry1(function lensIndex(n19) {
    return lens(nth(n19), update(n19));
});
var paths = _curry2(function paths1(pathsArray, obj) {
    return pathsArray.map(function(paths2) {
        var val = obj;
        var idx = 0;
        var p11;
        while(idx < paths2.length){
            if (val == null) {
                return;
            }
            p11 = paths2[idx];
            val = __default2(p11) ? nth(p11, val) : val[p11];
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
_curry1(function lensPath(p12) {
    return lens(path(p12), assocPath(p12));
});
_curry1(function lensProp(k3) {
    return lens(prop(k3), assoc(k3));
});
_curry2(function lt(a31, b20) {
    return a31 < b20;
});
_curry2(function lte(a32, b21) {
    return a32 <= b21;
});
_curry3(function mapAccum(fn44, acc, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    var tuple = [
        acc
    ];
    while(idx < len){
        tuple = fn44(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx += 1;
    }
    return [
        tuple[0],
        result
    ];
});
_curry3(function mapAccumRight(fn45, acc, list) {
    var idx = list.length - 1;
    var result = [];
    var tuple = [
        acc
    ];
    while(idx >= 0){
        tuple = fn45(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx -= 1;
    }
    return [
        tuple[0],
        result
    ];
});
_curry2(function mapObjIndexed(fn46, obj) {
    return _reduce(function(acc, key) {
        acc[key] = fn46(obj[key], key, obj);
        return acc;
    }, {}, keys(obj));
});
_curry2(function match(rx, str) {
    return str.match(rx) || [];
});
_curry2(function mathMod(m1, p13) {
    if (!__default2(m1)) {
        return NaN;
    }
    if (!__default2(p13) || p13 < 1) {
        return NaN;
    }
    return (m1 % p13 + p13) % p13;
});
_curry3(function maxBy(f35, a33, b22) {
    return f35(b22) > f35(a33) ? b22 : a33;
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
    return mean(Array.prototype.slice.call(list, 0).sort(function(a34, b23) {
        return a34 < b23 ? -1 : a34 > b23 ? 1 : 0;
    }).slice(idx, idx + width));
});
_curry2(function memoizeWith(mFn, fn47) {
    var cache = {};
    return _arity(fn47.length, function() {
        var key = mFn.apply(this, arguments);
        if (!_has(key, cache)) {
            cache[key] = fn47.apply(this, arguments);
        }
        return cache[key];
    });
});
_curry1(function mergeAll(list) {
    return __default4.apply(null, [
        {}
    ].concat(list));
});
var mergeWithKey = _curry3(function mergeWithKey(fn48, l2, r2) {
    var result = {};
    var k4;
    for(k4 in l2){
        if (_has(k4, l2)) {
            result[k4] = _has(k4, r2) ? fn48(k4, l2[k4], r2[k4]) : l2[k4];
        }
    }
    for(k4 in r2){
        if (_has(k4, r2) && !_has(k4, result)) {
            result[k4] = r2[k4];
        }
    }
    return result;
});
var mergeDeepWithKey = _curry3(function mergeDeepWithKey1(fn49, lObj, rObj) {
    return mergeWithKey(function(k5, lVal, rVal) {
        if (_isObject(lVal) && _isObject(rVal)) {
            return mergeDeepWithKey1(fn49, lVal, rVal);
        } else {
            return fn49(k5, lVal, rVal);
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
_curry3(function mergeDeepWith(fn50, lObj, rObj) {
    return mergeDeepWithKey(function(k, lVal, rVal) {
        return fn50(lVal, rVal);
    }, lObj, rObj);
});
_curry2(function mergeLeft(l3, r3) {
    return __default4({}, r3, l3);
});
_curry2(function mergeRight(l4, r4) {
    return __default4({}, l4, r4);
});
_curry3(function mergeWith(fn51, l5, r5) {
    return mergeWithKey(function(_, _l, _r) {
        return fn51(_l, _r);
    }, l5, r5);
});
_curry2(function min(a35, b24) {
    return b24 < a35 ? b24 : a35;
});
_curry3(function minBy(f36, a36, b25) {
    return f36(b25) < f36(a36) ? b25 : a36;
});
function _modify(prop16, fn52, obj) {
    if (__default2(prop16) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop16] = fn52(arr[prop16]);
        return arr;
    }
    var result = {};
    for(var p14 in obj){
        result[p14] = obj[p14];
    }
    result[prop16] = fn52(result[prop16]);
    return result;
}
var modifyPath = _curry3(function modifyPath1(path5, fn53, object) {
    if (!_isObject(object) && !__default(object) || path5.length === 0) {
        return object;
    }
    var idx = path5[0];
    if (!_has(idx, object)) {
        return object;
    }
    if (path5.length === 1) {
        return _modify(idx, fn53, object);
    }
    var val = modifyPath1(Array.prototype.slice.call(path5, 1), fn53, object[idx]);
    if (val === object[idx]) {
        return object;
    }
    return _assoc(idx, val, object);
});
_curry3(function modify(prop17, fn54, object) {
    return modifyPath([
        prop17
    ], fn54, object);
});
_curry2(function modulo(a37, b26) {
    return a37 % b26;
});
_curry3(function(from, to, list) {
    var length6 = list.length;
    var result = list.slice();
    var positiveFrom = from < 0 ? length6 + from : from;
    var positiveTo = to < 0 ? length6 + to : to;
    var item = result.splice(positiveFrom, 1);
    return positiveFrom < 0 || positiveFrom >= list.length || positiveTo < 0 || positiveTo >= list.length ? list : [].concat(result.slice(0, positiveTo)).concat(item).concat(result.slice(positiveTo, list.length));
});
var multiply = _curry2(function multiply(a38, b27) {
    return a38 * b27;
});
_curry2((f37, o2)=>(props)=>f37.call(this, mergeDeepRight(o2, props))
);
_curry1(function negate(n20) {
    return -n20;
});
_curry2(function none(fn55, input) {
    return all(_complement(fn55), input);
});
_curry1(function nthArg(n21) {
    var arity = n21 < 0 ? 1 : n21 + 1;
    return curryN(arity, function() {
        return nth(n21, arguments);
    });
});
_curry3(function o(f38, g4, x25) {
    return f38(g4(x25));
});
function _of(x26) {
    return [
        x26
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
    for(var prop18 in obj){
        if (!index.hasOwnProperty(prop18)) {
            result[prop18] = obj[prop18];
        }
    }
    return result;
});
_curryN(4, [], function on(f39, g5, a39, b28) {
    return f39(g5(a39), g5(b28));
});
_curry1(function once(fn56) {
    var called = false;
    var result;
    return _arity(fn56.length, function() {
        if (called) {
            return result;
        }
        called = true;
        result = fn56.apply(this, arguments);
        return result;
    });
});
function _assertPromise(name, p15) {
    if (p15 == null || !_isFunction(p15.then)) {
        throw new TypeError('`' + name + '` expected a Promise, received ' + _toString(p15, []));
    }
}
_curry2(function otherwise(f40, p16) {
    _assertPromise('otherwise', p16);
    return p16.then(null, f40);
});
var Identity = function(x27) {
    return {
        value: x27,
        map: function(f41) {
            return Identity(f41(x27));
        }
    };
};
var over = _curry3(function over(lens1, f42, x28) {
    return lens1(function(y3) {
        return Identity(f42(y3));
    })(x28).value;
});
_curry2(function pair(fst, snd) {
    return [
        fst,
        snd
    ];
});
function _createPartialApplicator(concat1) {
    return _curry2(function(fn57, args) {
        return _arity(Math.max(0, fn57.length - args.length), function() {
            return fn57.apply(this, concat1(args, arguments));
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
_curry3(function pathOr(d4, p17, obj) {
    return defaultTo(d4, path(p17, obj));
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
    for(var prop19 in obj){
        if (test(obj[prop19], prop19, obj)) {
            result[prop19] = obj[prop19];
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
var useWith = _curry2(function useWith(fn58, transformers) {
    return curryN(transformers.length, function() {
        var args = [];
        var idx = 0;
        while(idx < transformers.length){
            args.push(transformers[idx].call(this, arguments[idx]));
            idx += 1;
        }
        return fn58.apply(this, args.concat(Array.prototype.slice.call(arguments, transformers.length)));
    });
});
useWith(_map, [
    pickAll,
    identity
]);
function _promap(f43, g6, profunctor) {
    return function(x29) {
        return g6(profunctor(f43(x29)));
    };
}
var XPromap = function() {
    function XPromap1(f44, g7, xf) {
        this.xf = xf;
        this.f = f44;
        this.g = g7;
    }
    XPromap1.prototype['@@transducer/init'] = __default1.init;
    XPromap1.prototype['@@transducer/result'] = __default1.result;
    XPromap1.prototype['@@transducer/step'] = function(result, input) {
        return this.xf['@@transducer/step'](result, _promap(this.f, this.g, input));
    };
    return XPromap1;
}();
var _xpromap = _curry3(function _xpromap(f45, g8, xf) {
    return new XPromap(f45, g8, xf);
});
_curry3(_dispatchable([
    'fantasy-land/promap',
    'promap'
], _xpromap, _promap));
_curry3(function propEq(name, val, obj) {
    return equals(val, prop(name, obj));
});
_curry3(function propIs(type7, name, obj) {
    return is(type7, prop(name, obj));
});
_curry3(function propOr(val, p18, obj) {
    return defaultTo(val, prop(p18, obj));
});
_curry3(function propSatisfies(pred, name, obj) {
    return pred(prop(name, obj));
});
_curry2(function props(ps, obj) {
    return ps.map(function(p19) {
        return path([
            p19
        ], obj);
    });
});
_curry2(function range(from, to) {
    if (!(_isNumber(from) && _isNumber(to))) {
        throw new TypeError('Both arguments to range must be numbers');
    }
    var result = [];
    var n22 = from;
    while(n22 < to){
        result.push(n22);
        n22 += 1;
    }
    return result;
});
var reduceRight = _curry3(function reduceRight(fn59, acc, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        acc = fn59(list[idx], acc);
        if (acc && acc['@@transducer/reduced']) {
            acc = acc['@@transducer/value'];
            break;
        }
        idx -= 1;
    }
    return acc;
});
_curryN(4, [], function _reduceWhile(pred, fn60, a40, list) {
    return _reduce(function(acc, x30) {
        return pred(acc, x30) ? fn60(acc, x30) : _reduced(acc);
    }, a40, list);
});
_curry1(_reduced);
var times = _curry2(function times(fn61, n23) {
    var len = Number(n23);
    var idx = 0;
    var list;
    if (len < 0 || isNaN(len)) {
        throw new RangeError('n must be a non-negative number');
    }
    list = new Array(len);
    while(idx < len){
        list[idx] = fn61(idx);
        idx += 1;
    }
    return list;
});
_curry2(function repeat(value, n24) {
    return times(always(value), n24);
});
_curry3(function replace(regex, replacement, str) {
    return str.replace(regex, replacement);
});
_curry3(function scan(fn62, acc, list) {
    var idx = 0;
    var len = list.length;
    var result = [
        acc
    ];
    while(idx < len){
        acc = fn62(acc, list[idx]);
        result[idx + 1] = acc;
        idx += 1;
    }
    return result;
});
var sequence = _curry2(function sequence(of, traversable) {
    return typeof traversable.sequence === 'function' ? traversable.sequence(of) : reduceRight(function(x31, acc) {
        return ap(map(prepend, x31), acc);
    }, of([]), traversable);
});
_curry3(function set(lens2, v6, x32) {
    return over(lens2, always(v6), x32);
});
_curry2(function sort(comparator, list) {
    return Array.prototype.slice.call(list, 0).sort(comparator);
});
_curry2(function sortBy(fn63, list) {
    return Array.prototype.slice.call(list, 0).sort(function(a41, b29) {
        var aa = fn63(a41);
        var bb = fn63(b29);
        return aa < bb ? -1 : aa > bb ? 1 : 0;
    });
});
_curry2(function sortWith(fns, list) {
    return Array.prototype.slice.call(list, 0).sort(function(a42, b30) {
        var result = 0;
        var i2 = 0;
        while(result === 0 && i2 < fns.length){
            result = fns[i2](a42, b30);
            i2 += 1;
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
_curry2(function splitEvery(n25, list) {
    if (n25 <= 0) {
        throw new Error('First argument to splitEvery must be a positive integer');
    }
    var result = [];
    var idx = 0;
    while(idx < list.length){
        result.push(slice(idx, idx += n25, list));
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
    for(var i3 = 0; i3 < list.length; i3 = i3 + 1){
        if (!pred(list[i3])) {
            curr.push(list[i3]);
        }
        if ((i3 < list.length - 1 && pred(list[i3 + 1]) || i3 === list.length - 1) && curr.length > 0) {
            acc.push(curr);
            curr = [];
        }
    }
    return acc;
});
_curry2(function(prefix, list) {
    return equals(take(prefix.length, list), prefix);
});
_curry2(function subtract(a43, b31) {
    return Number(a43) - Number(b31);
});
_curry2(function symmetricDifference(list1, list2) {
    return concat(difference(list1, list2), difference(list2, list1));
});
_curry3(function symmetricDifferenceWith(pred, list1, list2) {
    return concat(differenceWith(pred, list1, list2), differenceWith(pred, list2, list1));
});
_curry2(function takeLastWhile(fn64, xs) {
    var idx = xs.length - 1;
    while(idx >= 0 && fn64(xs[idx])){
        idx -= 1;
    }
    return slice(idx + 1, Infinity, xs);
});
var XTakeWhile = function() {
    function XTakeWhile1(f46, xf) {
        this.xf = xf;
        this.f = f46;
    }
    XTakeWhile1.prototype['@@transducer/init'] = __default1.init;
    XTakeWhile1.prototype['@@transducer/result'] = __default1.result;
    XTakeWhile1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : _reduced(result);
    };
    return XTakeWhile1;
}();
var _xtakeWhile = _curry2(function _xtakeWhile(f47, xf) {
    return new XTakeWhile(f47, xf);
});
_curry2(_dispatchable([
    'takeWhile'
], _xtakeWhile, function takeWhile(fn65, xs) {
    var idx = 0;
    var len = xs.length;
    while(idx < len && fn65(xs[idx])){
        idx += 1;
    }
    return slice(0, idx, xs);
}));
var XTap = function() {
    function XTap1(f48, xf) {
        this.xf = xf;
        this.f = f48;
    }
    XTap1.prototype['@@transducer/init'] = __default1.init;
    XTap1.prototype['@@transducer/result'] = __default1.result;
    XTap1.prototype['@@transducer/step'] = function(result, input) {
        this.f(input);
        return this.xf['@@transducer/step'](result, input);
    };
    return XTap1;
}();
var _xtap = _curry2(function _xtap(f49, xf) {
    return new XTap(f49, xf);
});
_curry2(_dispatchable([], _xtap, function tap(fn66, x33) {
    fn66(x33);
    return x33;
}));
function _isRegExp(x34) {
    return Object.prototype.toString.call(x34) === '[object RegExp]';
}
_curry2(function test(pattern, str) {
    if (!_isRegExp(pattern)) {
        throw new TypeError('‘test’ requires a value of type RegExp as its first argument; received ' + toString1(pattern));
    }
    return _cloneRegExp(pattern).test(str);
});
_curry2(function andThen(f50, p20) {
    _assertPromise('andThen', p20);
    return p20.then(f50);
});
invoker(0, 'toLowerCase');
_curry1(function toPairs(obj) {
    var pairs = [];
    for(var prop20 in obj){
        if (_has(prop20, obj)) {
            pairs[pairs.length] = [
                prop20,
                obj[prop20]
            ];
        }
    }
    return pairs;
});
_curry1(function toPairsIn(obj) {
    var pairs = [];
    for(var prop21 in obj){
        pairs[pairs.length] = [
            prop21,
            obj[prop21]
        ];
    }
    return pairs;
});
invoker(0, 'toUpperCase');
curryN(4, function transduce(xf, fn67, acc, list) {
    return _reduce(xf(typeof fn67 === 'function' ? _xwrap(fn67) : fn67), acc, list);
});
_curry1(function transpose(outerlist) {
    var i4 = 0;
    var result = [];
    while(i4 < outerlist.length){
        var innerlist = outerlist[i4];
        var j2 = 0;
        while(j2 < innerlist.length){
            if (typeof result[j2] === 'undefined') {
                result[j2] = [];
            }
            result[j2].push(innerlist[j2]);
            j2 += 1;
        }
        i4 += 1;
    }
    return result;
});
_curry3(function traverse(of, f51, traversable) {
    return typeof traversable['fantasy-land/traverse'] === 'function' ? traversable['fantasy-land/traverse'](f51, of) : typeof traversable.traverse === 'function' ? traversable.traverse(f51, of) : sequence(of, map(f51, traversable));
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
_curry1(function unapply(fn68) {
    return function() {
        return fn68(Array.prototype.slice.call(arguments, 0));
    };
});
_curry1(function unary(fn69) {
    return nAry(1, fn69);
});
_curry2(function uncurryN(depth, fn70) {
    return curryN(depth, function() {
        var currentDepth = 1;
        var value = fn70;
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
_curry2(function unfold(fn71, seed) {
    var pair = fn71(seed);
    var result = [];
    while(pair && pair.length){
        result[result.length] = pair[0];
        pair = fn71(pair[1]);
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
_curry3(function unless(pred, whenFalseFn, x35) {
    return pred(x35) ? x35 : whenFalseFn(x35);
});
chain(_identity);
_curry3(function until(pred, fn72, init) {
    var val = init;
    while(!pred(val)){
        val = fn72(val);
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
    var prop22;
    var vs = [];
    for(prop22 in obj){
        vs[vs.length] = obj[prop22];
    }
    return vs;
});
var Const = function(x36) {
    return {
        value: x36,
        'fantasy-land/map': function() {
            return this;
        }
    };
};
_curry2(function view(lens3, x37) {
    return lens3(Const)(x37).value;
});
_curry3(function when(pred, whenTrueFn, x38) {
    return pred(x38) ? whenTrueFn(x38) : x38;
});
var where = _curry2(function where(spec, testObj) {
    for(var prop23 in spec){
        if (_has(prop23, spec) && !spec[prop23](testObj[prop23])) {
            return false;
        }
    }
    return true;
});
_curry2(function whereAny(spec, testObj) {
    for(var prop24 in spec){
        if (_has(prop24, spec) && spec[prop24](testObj[prop24])) {
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
_curry2(function xor(a44, b32) {
    return Boolean(!a44 ^ !b32);
});
_curry2(function xprod(a45, b33) {
    var idx = 0;
    var ilen = a45.length;
    var j3;
    var jlen = b33.length;
    var result = [];
    while(idx < ilen){
        j3 = 0;
        while(j3 < jlen){
            result[result.length] = [
                a45[idx],
                b33[j3]
            ];
            j3 += 1;
        }
        idx += 1;
    }
    return result;
});
_curry2(function zip(a46, b34) {
    var rv = [];
    var idx = 0;
    var len = Math.min(a46.length, b34.length);
    while(idx < len){
        rv[idx] = [
            a46[idx],
            b34[idx]
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
_curry3(function zipWith(fn73, a47, b35) {
    var rv = [];
    var idx = 0;
    var len = Math.min(a47.length, b35.length);
    while(idx < len){
        rv[idx] = fn73(a47[idx], b35[idx]);
        idx += 1;
    }
    return rv;
});
_curry1(function thunkify(fn74) {
    return curryN(fn74.length, function createThunk() {
        var fnArgs = arguments;
        return function invokeThunk() {
            return fn74.apply(this, fnArgs);
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
function n(n1) {
    for(var r1 = arguments.length, t1 = Array(r1 > 1 ? r1 - 1 : 0), e1 = 1; e1 < r1; e1++)t1[e1 - 1] = arguments[e1];
    if ("production" !== process.env.NODE_ENV) {
        var i1 = Y[n1], o1 = i1 ? "function" == typeof i1 ? i1.apply(null, t1) : i1 : "unknown error nr: " + n1;
        throw Error("[Immer] " + o1);
    }
    throw Error("[Immer] minified error nr: " + n1 + (t1.length ? " " + t1.map(function(n2) {
        return "'" + n2 + "'";
    }).join(",") : "") + ". Find the full error at: https://bit.ly/3cXEKWf");
}
function r(n3) {
    return !!n3 && !!n3[Q];
}
function t(n4) {
    return !!n4 && (function(n5) {
        if (!n5 || "object" != typeof n5) return !1;
        var r2 = Object.getPrototypeOf(n5);
        if (null === r2) return !0;
        var t2 = Object.hasOwnProperty.call(r2, "constructor") && r2.constructor;
        return t2 === Object || "function" == typeof t2 && Function.toString.call(t2) === Z;
    }(n4) || Array.isArray(n4) || !!n4[L] || !!n4.constructor[L] || s(n4) || v(n4));
}
function i(n6, r3, t4) {
    void 0 === t4 && (t4 = !1), 0 === o(n6) ? (t4 ? Object.keys : nn)(n6).forEach(function(e2) {
        t4 && "symbol" == typeof e2 || r3(e2, n6[e2], n6);
    }) : n6.forEach(function(t5, e3) {
        return r3(e3, t5, n6);
    });
}
function o(n7) {
    var r4 = n7[Q];
    return r4 ? r4.i > 3 ? r4.i - 4 : r4.i : Array.isArray(n7) ? 1 : s(n7) ? 2 : v(n7) ? 3 : 0;
}
function u(n8, r5) {
    return 2 === o(n8) ? n8.has(r5) : Object.prototype.hasOwnProperty.call(n8, r5);
}
function a(n9, r6) {
    return 2 === o(n9) ? n9.get(r6) : n9[r6];
}
function f(n10, r7, t6) {
    var e4 = o(n10);
    2 === e4 ? n10.set(r7, t6) : 3 === e4 ? (n10.delete(r7), n10.add(t6)) : n10[r7] = t6;
}
function c(n11, r8) {
    return n11 === r8 ? 0 !== n11 || 1 / n11 == 1 / r8 : n11 != n11 && r8 != r8;
}
function s(n12) {
    return X && n12 instanceof Map;
}
function v(n13) {
    return q && n13 instanceof Set;
}
function p(n14) {
    return n14.o || n14.t;
}
function l(n15) {
    if (Array.isArray(n15)) return Array.prototype.slice.call(n15);
    var r9 = rn(n15);
    delete r9[Q];
    for(var t7 = nn(r9), e5 = 0; e5 < t7.length; e5++){
        var i2 = t7[e5], o2 = r9[i2];
        !1 === o2.writable && (o2.writable = !0, o2.configurable = !0), (o2.get || o2.set) && (r9[i2] = {
            configurable: !0,
            writable: !0,
            enumerable: o2.enumerable,
            value: n15[i2]
        });
    }
    return Object.create(Object.getPrototypeOf(n15), r9);
}
function d(n16, e6) {
    return void 0 === e6 && (e6 = !1), y(n16) || r(n16) || !t(n16) ? n16 : (o(n16) > 1 && (n16.set = n16.add = n16.clear = n16.delete = h), Object.freeze(n16), e6 && i(n16, function(n, r10) {
        return d(r10, !0);
    }, !0), n16);
}
function h() {
    n(2);
}
function y(n17) {
    return null == n17 || "object" != typeof n17 || Object.isFrozen(n17);
}
function b(r11) {
    var t8 = tn[r11];
    return t8 || n(18, r11), t8;
}
function m(n18, r12) {
    tn[n18] || (tn[n18] = r12);
}
function _() {
    return "production" === process.env.NODE_ENV || U || n(0), U;
}
function j(n19, r13) {
    r13 && (b("Patches"), n19.u = [], n19.s = [], n19.v = r13);
}
function O(n20) {
    g(n20), n20.p.forEach(S), n20.p = null;
}
function g(n21) {
    n21 === U && (U = n21.l);
}
function w(n22) {
    return U = {
        p: [],
        l: U,
        h: n22,
        m: !0,
        _: 0
    };
}
function S(n23) {
    var r14 = n23[Q];
    0 === r14.i || 1 === r14.i ? r14.j() : r14.O = !0;
}
function P(r15, e7) {
    e7._ = e7.p.length;
    var i3 = e7.p[0], o3 = void 0 !== r15 && r15 !== i3;
    return e7.h.g || b("ES5").S(e7, r15, o3), o3 ? (i3[Q].P && (O(e7), n(4)), t(r15) && (r15 = M(e7, r15), e7.l || x(e7, r15)), e7.u && b("Patches").M(i3[Q].t, r15, e7.u, e7.s)) : r15 = M(e7, i3, []), O(e7), e7.u && e7.v(e7.u, e7.s), r15 !== H ? r15 : void 0;
}
function M(n24, r16, t9) {
    if (y(r16)) return r16;
    var e8 = r16[Q];
    if (!e8) return i(r16, function(i4, o5) {
        return A(n24, e8, r16, i4, o5, t9);
    }, !0), r16;
    if (e8.A !== n24) return r16;
    if (!e8.P) return x(n24, e8.t, !0), e8.t;
    if (!e8.I) {
        e8.I = !0, e8.A._--;
        var o4 = 4 === e8.i || 5 === e8.i ? e8.o = l(e8.k) : e8.o;
        i(3 === e8.i ? new Set(o4) : o4, function(r17, i5) {
            return A(n24, e8, o4, r17, i5, t9);
        }), x(n24, o4, !1), t9 && n24.u && b("Patches").R(e8, t9, n24.u, n24.s);
    }
    return e8.o;
}
function A(e9, i6, o6, a1, c1, s1) {
    if ("production" !== process.env.NODE_ENV && c1 === o6 && n(5), r(c1)) {
        var v1 = M(e9, c1, s1 && i6 && 3 !== i6.i && !u(i6.D, a1) ? s1.concat(a1) : void 0);
        if (f(o6, a1, v1), !r(v1)) return;
        e9.m = !1;
    }
    if (t(c1) && !y(c1)) {
        if (!e9.h.F && e9._ < 1) return;
        M(e9, c1), i6 && i6.A.l || x(e9, c1);
    }
}
function x(n25, r18, t10) {
    void 0 === t10 && (t10 = !1), n25.h.F && n25.m && d(r18, t10);
}
function z(n26, r19) {
    var t11 = n26[Q];
    return (t11 ? p(t11) : n26)[r19];
}
function I(n27, r20) {
    if (r20 in n27) for(var t12 = Object.getPrototypeOf(n27); t12;){
        var e10 = Object.getOwnPropertyDescriptor(t12, r20);
        if (e10) return e10;
        t12 = Object.getPrototypeOf(t12);
    }
}
function k(n28) {
    n28.P || (n28.P = !0, n28.l && k(n28.l));
}
function E(n29) {
    n29.o || (n29.o = l(n29.t));
}
function R(n30, r21, t13) {
    var e11 = s(r21) ? b("MapSet").N(r21, t13) : v(r21) ? b("MapSet").T(r21, t13) : n30.g ? function(n31, r22) {
        var t14 = Array.isArray(n31), e12 = {
            i: t14 ? 1 : 0,
            A: r22 ? r22.A : _(),
            P: !1,
            I: !1,
            D: {},
            l: r22,
            t: n31,
            k: null,
            o: null,
            j: null,
            C: !1
        }, i7 = e12, o7 = en;
        t14 && (i7 = [
            e12
        ], o7 = on);
        var u1 = Proxy.revocable(i7, o7), a2 = u1.revoke, f1 = u1.proxy;
        return e12.k = f1, e12.j = a2, f1;
    }(r21, t13) : b("ES5").J(r21, t13);
    return (t13 ? t13.A : _()).p.push(e11), e11;
}
function D(e13) {
    return r(e13) || n(22, e13), function n32(r23) {
        if (!t(r23)) return r23;
        var e14, u2 = r23[Q], c2 = o(r23);
        if (u2) {
            if (!u2.P && (u2.i < 4 || !b("ES5").K(u2))) return u2.t;
            u2.I = !0, e14 = F(r23, c2), u2.I = !1;
        } else e14 = F(r23, c2);
        return i(e14, function(r24, t15) {
            u2 && a(u2.t, r24) === t15 || f(e14, r24, n32(t15));
        }), 3 === c2 ? new Set(e14) : e14;
    }(e13);
}
function F(n33, r25) {
    switch(r25){
        case 2:
            return new Map(n33);
        case 3:
            return Array.from(n33);
    }
    return l(n33);
}
function N() {
    function t16(n34, r26) {
        var t17 = s2[n34];
        return t17 ? t17.enumerable = r26 : s2[n34] = t17 = {
            configurable: !0,
            enumerable: r26,
            get: function() {
                var r27 = this[Q];
                return "production" !== process.env.NODE_ENV && f2(r27), en.get(r27, n34);
            },
            set: function(r28) {
                var t18 = this[Q];
                "production" !== process.env.NODE_ENV && f2(t18), en.set(t18, n34, r28);
            }
        }, t17;
    }
    function e15(n35) {
        for(var r29 = n35.length - 1; r29 >= 0; r29--){
            var t19 = n35[r29][Q];
            if (!t19.P) switch(t19.i){
                case 5:
                    a3(t19) && k(t19);
                    break;
                case 4:
                    o8(t19) && k(t19);
            }
        }
    }
    function o8(n36) {
        for(var r30 = n36.t, t20 = n36.k, e16 = nn(t20), i8 = e16.length - 1; i8 >= 0; i8--){
            var o9 = e16[i8];
            if (o9 !== Q) {
                var a4 = r30[o9];
                if (void 0 === a4 && !u(r30, o9)) return !0;
                var f3 = t20[o9], s3 = f3 && f3[Q];
                if (s3 ? s3.t !== a4 : !c(f3, a4)) return !0;
            }
        }
        var v2 = !!r30[Q];
        return e16.length !== nn(r30).length + (v2 ? 0 : 1);
    }
    function a3(n37) {
        var r31 = n37.k;
        if (r31.length !== n37.t.length) return !0;
        var t21 = Object.getOwnPropertyDescriptor(r31, r31.length - 1);
        if (t21 && !t21.get) return !0;
        for(var e17 = 0; e17 < r31.length; e17++)if (!r31.hasOwnProperty(e17)) return !0;
        return !1;
    }
    function f2(r32) {
        r32.O && n(3, JSON.stringify(p(r32)));
    }
    var s2 = {};
    m("ES5", {
        J: function(n38, r33) {
            var e18 = Array.isArray(n38), i9 = function(n39, r34) {
                if (n39) {
                    for(var e19 = Array(r34.length), i10 = 0; i10 < r34.length; i10++)Object.defineProperty(e19, "" + i10, t16(i10, !0));
                    return e19;
                }
                var o11 = rn(r34);
                delete o11[Q];
                for(var u3 = nn(o11), a5 = 0; a5 < u3.length; a5++){
                    var f4 = u3[a5];
                    o11[f4] = t16(f4, n39 || !!o11[f4].enumerable);
                }
                return Object.create(Object.getPrototypeOf(r34), o11);
            }(e18, n38), o10 = {
                i: e18 ? 5 : 4,
                A: r33 ? r33.A : _(),
                P: !1,
                I: !1,
                D: {},
                l: r33,
                t: n38,
                k: i9,
                o: null,
                O: !1,
                C: !1
            };
            return Object.defineProperty(i9, Q, {
                value: o10,
                writable: !0
            }), i9;
        },
        S: function(n40, t22, o12) {
            o12 ? r(t22) && t22[Q].A === n40 && e15(n40.p) : (n40.u && function n41(r35) {
                if (r35 && "object" == typeof r35) {
                    var t23 = r35[Q];
                    if (t23) {
                        var e20 = t23.t, o13 = t23.k, f5 = t23.D, c3 = t23.i;
                        if (4 === c3) i(o13, function(r36) {
                            r36 !== Q && (void 0 !== e20[r36] || u(e20, r36) ? f5[r36] || n41(o13[r36]) : (f5[r36] = !0, k(t23)));
                        }), i(e20, function(n42) {
                            void 0 !== o13[n42] || u(o13, n42) || (f5[n42] = !1, k(t23));
                        });
                        else if (5 === c3) {
                            if (a3(t23) && (k(t23), f5.length = !0), o13.length < e20.length) for(var s4 = o13.length; s4 < e20.length; s4++)f5[s4] = !1;
                            else for(var v3 = e20.length; v3 < o13.length; v3++)f5[v3] = !0;
                            for(var p1 = Math.min(o13.length, e20.length), l1 = 0; l1 < p1; l1++)o13.hasOwnProperty(l1) || (f5[l1] = !0), void 0 === f5[l1] && n41(o13[l1]);
                        }
                    }
                }
            }(n40.p[0]), e15(n40.p));
        },
        K: function(n43) {
            return 4 === n43.i ? o8(n43) : a3(n43);
        }
    });
}
function T() {
    function e21(n44) {
        if (!t(n44)) return n44;
        if (Array.isArray(n44)) return n44.map(e21);
        if (s(n44)) return new Map(Array.from(n44.entries()).map(function(n45) {
            return [
                n45[0],
                e21(n45[1])
            ];
        }));
        if (v(n44)) return new Set(Array.from(n44).map(e21));
        var r37 = Object.create(Object.getPrototypeOf(n44));
        for(var i11 in n44)r37[i11] = e21(n44[i11]);
        return u(n44, L) && (r37[L] = n44[L]), r37;
    }
    function f6(n46) {
        return r(n46) ? e21(n46) : n46;
    }
    var c4 = "add";
    m("Patches", {
        $: function(r38, t24) {
            return t24.forEach(function(t25) {
                for(var i12 = t25.path, u4 = t25.op, f7 = r38, s5 = 0; s5 < i12.length - 1; s5++){
                    var v4 = o(f7), p2 = "" + i12[s5];
                    0 !== v4 && 1 !== v4 || "__proto__" !== p2 && "constructor" !== p2 || n(24), "function" == typeof f7 && "prototype" === p2 && n(24), "object" != typeof (f7 = a(f7, p2)) && n(15, i12.join("/"));
                }
                var l2 = o(f7), d1 = e21(t25.value), h1 = i12[i12.length - 1];
                switch(u4){
                    case "replace":
                        switch(l2){
                            case 2:
                                return f7.set(h1, d1);
                            case 3:
                                n(16);
                            default:
                                return f7[h1] = d1;
                        }
                    case c4:
                        switch(l2){
                            case 1:
                                return "-" === h1 ? f7.push(d1) : f7.splice(h1, 0, d1);
                            case 2:
                                return f7.set(h1, d1);
                            case 3:
                                return f7.add(d1);
                            default:
                                return f7[h1] = d1;
                        }
                    case "remove":
                        switch(l2){
                            case 1:
                                return f7.splice(h1, 1);
                            case 2:
                                return f7.delete(h1);
                            case 3:
                                return f7.delete(t25.value);
                            default:
                                return delete f7[h1];
                        }
                    default:
                        n(17, u4);
                }
            }), r38;
        },
        R: function(n47, r39, t26, e22) {
            switch(n47.i){
                case 0:
                case 4:
                case 2:
                    return function(n48, r40, t27, e23) {
                        var o14 = n48.t, s6 = n48.o;
                        i(n48.D, function(n49, i13) {
                            var v5 = a(o14, n49), p3 = a(s6, n49), l3 = i13 ? u(o14, n49) ? "replace" : c4 : "remove";
                            if (v5 !== p3 || "replace" !== l3) {
                                var d2 = r40.concat(n49);
                                t27.push("remove" === l3 ? {
                                    op: l3,
                                    path: d2
                                } : {
                                    op: l3,
                                    path: d2,
                                    value: p3
                                }), e23.push(l3 === c4 ? {
                                    op: "remove",
                                    path: d2
                                } : "remove" === l3 ? {
                                    op: c4,
                                    path: d2,
                                    value: f6(v5)
                                } : {
                                    op: "replace",
                                    path: d2,
                                    value: f6(v5)
                                });
                            }
                        });
                    }(n47, r39, t26, e22);
                case 5:
                case 1:
                    return function(n50, r41, t28, e24) {
                        var i14 = n50.t, o15 = n50.D, u5 = n50.o;
                        if (u5.length < i14.length) {
                            var a6 = [
                                u5,
                                i14
                            ];
                            i14 = a6[0], u5 = a6[1];
                            var s7 = [
                                e24,
                                t28
                            ];
                            t28 = s7[0], e24 = s7[1];
                        }
                        for(var v6 = 0; v6 < i14.length; v6++)if (o15[v6] && u5[v6] !== i14[v6]) {
                            var p4 = r41.concat([
                                v6
                            ]);
                            t28.push({
                                op: "replace",
                                path: p4,
                                value: f6(u5[v6])
                            }), e24.push({
                                op: "replace",
                                path: p4,
                                value: f6(i14[v6])
                            });
                        }
                        for(var l4 = i14.length; l4 < u5.length; l4++){
                            var d3 = r41.concat([
                                l4
                            ]);
                            t28.push({
                                op: c4,
                                path: d3,
                                value: f6(u5[l4])
                            });
                        }
                        i14.length < u5.length && e24.push({
                            op: "replace",
                            path: r41.concat([
                                "length"
                            ]),
                            value: i14.length
                        });
                    }(n47, r39, t26, e22);
                case 3:
                    return function(n51, r42, t29, e25) {
                        var i15 = n51.t, o16 = n51.o, u6 = 0;
                        i15.forEach(function(n52) {
                            if (!o16.has(n52)) {
                                var i16 = r42.concat([
                                    u6
                                ]);
                                t29.push({
                                    op: "remove",
                                    path: i16,
                                    value: n52
                                }), e25.unshift({
                                    op: c4,
                                    path: i16,
                                    value: n52
                                });
                            }
                            u6++;
                        }), u6 = 0, o16.forEach(function(n53) {
                            if (!i15.has(n53)) {
                                var o17 = r42.concat([
                                    u6
                                ]);
                                t29.push({
                                    op: c4,
                                    path: o17,
                                    value: n53
                                }), e25.unshift({
                                    op: "remove",
                                    path: o17,
                                    value: n53
                                });
                            }
                            u6++;
                        });
                    }(n47, r39, t26, e22);
            }
        },
        M: function(n54, r43, t30, e26) {
            t30.push({
                op: "replace",
                path: [],
                value: r43 === H ? void 0 : r43
            }), e26.push({
                op: "replace",
                path: [],
                value: n54
            });
        }
    });
}
function C() {
    function r44(n55, r45) {
        function t31() {
            this.constructor = n55;
        }
        a7(n55, r45), n55.prototype = (t31.prototype = r45.prototype, new t31);
    }
    function e27(n56) {
        n56.o || (n56.D = new Map, n56.o = new Map(n56.t));
    }
    function o18(n57) {
        n57.o || (n57.o = new Set, n57.t.forEach(function(r46) {
            if (t(r46)) {
                var e28 = R(n57.A.h, r46, n57);
                n57.p.set(r46, e28), n57.o.add(e28);
            } else n57.o.add(r46);
        }));
    }
    function u7(r47) {
        r47.O && n(3, JSON.stringify(p(r47)));
    }
    var a7 = function(n58, r48) {
        return (a7 = Object.setPrototypeOf || ({
            __proto__: []
        }) instanceof Array && function(n59, r49) {
            n59.__proto__ = r49;
        } || function(n60, r50) {
            for(var t32 in r50)r50.hasOwnProperty(t32) && (n60[t32] = r50[t32]);
        })(n58, r48);
    }, f8 = function() {
        function n61(n62, r51) {
            return this[Q] = {
                i: 2,
                l: r51,
                A: r51 ? r51.A : _(),
                P: !1,
                I: !1,
                o: void 0,
                D: void 0,
                t: n62,
                k: this,
                C: !1,
                O: !1
            }, this;
        }
        r44(n61, Map);
        var o19 = n61.prototype;
        return Object.defineProperty(o19, "size", {
            get: function() {
                return p(this[Q]).size;
            }
        }), o19.has = function(n63) {
            return p(this[Q]).has(n63);
        }, o19.set = function(n64, r52) {
            var t33 = this[Q];
            return u7(t33), p(t33).has(n64) && p(t33).get(n64) === r52 || (e27(t33), k(t33), t33.D.set(n64, !0), t33.o.set(n64, r52), t33.D.set(n64, !0)), this;
        }, o19.delete = function(n65) {
            if (!this.has(n65)) return !1;
            var r53 = this[Q];
            return u7(r53), e27(r53), k(r53), r53.t.has(n65) ? r53.D.set(n65, !1) : r53.D.delete(n65), r53.o.delete(n65), !0;
        }, o19.clear = function() {
            var n66 = this[Q];
            u7(n66), p(n66).size && (e27(n66), k(n66), n66.D = new Map, i(n66.t, function(r54) {
                n66.D.set(r54, !1);
            }), n66.o.clear());
        }, o19.forEach = function(n67, r55) {
            var t34 = this;
            p(this[Q]).forEach(function(e, i17) {
                n67.call(r55, t34.get(i17), i17, t34);
            });
        }, o19.get = function(n68) {
            var r56 = this[Q];
            u7(r56);
            var i18 = p(r56).get(n68);
            if (r56.I || !t(i18)) return i18;
            if (i18 !== r56.t.get(n68)) return i18;
            var o20 = R(r56.A.h, i18, r56);
            return e27(r56), r56.o.set(n68, o20), o20;
        }, o19.keys = function() {
            return p(this[Q]).keys();
        }, o19.values = function() {
            var n69, r57 = this, t35 = this.keys();
            return (n69 = {})[V] = function() {
                return r57.values();
            }, n69.next = function() {
                var n70 = t35.next();
                return n70.done ? n70 : {
                    done: !1,
                    value: r57.get(n70.value)
                };
            }, n69;
        }, o19.entries = function() {
            var n71, r58 = this, t36 = this.keys();
            return (n71 = {})[V] = function() {
                return r58.entries();
            }, n71.next = function() {
                var n72 = t36.next();
                if (n72.done) return n72;
                var e29 = r58.get(n72.value);
                return {
                    done: !1,
                    value: [
                        n72.value,
                        e29
                    ]
                };
            }, n71;
        }, o19[V] = function() {
            return this.entries();
        }, n61;
    }(), c5 = function() {
        function n73(n74, r59) {
            return this[Q] = {
                i: 3,
                l: r59,
                A: r59 ? r59.A : _(),
                P: !1,
                I: !1,
                o: void 0,
                t: n74,
                k: this,
                p: new Map,
                O: !1,
                C: !1
            }, this;
        }
        r44(n73, Set);
        var t37 = n73.prototype;
        return Object.defineProperty(t37, "size", {
            get: function() {
                return p(this[Q]).size;
            }
        }), t37.has = function(n75) {
            var r60 = this[Q];
            return u7(r60), r60.o ? !!r60.o.has(n75) || !(!r60.p.has(n75) || !r60.o.has(r60.p.get(n75))) : r60.t.has(n75);
        }, t37.add = function(n76) {
            var r61 = this[Q];
            return u7(r61), this.has(n76) || (o18(r61), k(r61), r61.o.add(n76)), this;
        }, t37.delete = function(n77) {
            if (!this.has(n77)) return !1;
            var r62 = this[Q];
            return u7(r62), o18(r62), k(r62), r62.o.delete(n77) || !!r62.p.has(n77) && r62.o.delete(r62.p.get(n77));
        }, t37.clear = function() {
            var n78 = this[Q];
            u7(n78), p(n78).size && (o18(n78), k(n78), n78.o.clear());
        }, t37.values = function() {
            var n79 = this[Q];
            return u7(n79), o18(n79), n79.o.values();
        }, t37.entries = function() {
            var n80 = this[Q];
            return u7(n80), o18(n80), n80.o.entries();
        }, t37.keys = function() {
            return this.values();
        }, t37[V] = function() {
            return this.values();
        }, t37.forEach = function(n81, r63) {
            for(var t38 = this.values(), e30 = t38.next(); !e30.done;)n81.call(r63, e30.value, e30.value, this), e30 = t38.next();
        }, n73;
    }();
    m("MapSet", {
        N: function(n82, r64) {
            return new f8(n82, r64);
        },
        T: function(n83, r65) {
            return new c5(n83, r65);
        }
    });
}
function J() {
    N(), C(), T();
}
var G, U, W = "undefined" != typeof Symbol && "symbol" == typeof Symbol("x"), X = "undefined" != typeof Map, q = "undefined" != typeof Set, B = "undefined" != typeof Proxy && void 0 !== Proxy.revocable && "undefined" != typeof Reflect, H = W ? Symbol.for("immer-nothing") : ((G = {})["immer-nothing"] = !0, G), L = W ? Symbol.for("immer-draftable") : "__$immer_draftable", Q = W ? Symbol.for("immer-state") : "__$immer_state", V = "undefined" != typeof Symbol && Symbol.iterator || "@@iterator", Y = {
    0: "Illegal state",
    1: "Immer drafts cannot have computed properties",
    2: "This object has been frozen and should not be mutated",
    3: function(n86) {
        return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + n86;
    },
    4: "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
    5: "Immer forbids circular references",
    6: "The first or second argument to `produce` must be a function",
    7: "The third argument to `produce` must be a function or undefined",
    8: "First argument to `createDraft` must be a plain object, an array, or an immerable object",
    9: "First argument to `finishDraft` must be a draft returned by `createDraft`",
    10: "The given draft is already finalized",
    11: "Object.defineProperty() cannot be used on an Immer draft",
    12: "Object.setPrototypeOf() cannot be used on an Immer draft",
    13: "Immer only supports deleting array indices",
    14: "Immer only supports setting array indices and the 'length' property",
    15: function(n87) {
        return "Cannot apply patch, path doesn't resolve: " + n87;
    },
    16: 'Sets cannot have "replace" patches.',
    17: function(n88) {
        return "Unsupported patch operation: " + n88;
    },
    18: function(n89) {
        return "The plugin for '" + n89 + "' has not been loaded into Immer. To enable the plugin, import and call `enable" + n89 + "()` when initializing your application.";
    },
    20: "Cannot use proxies if Proxy, Proxy.revocable or Reflect are not available",
    21: function(n90) {
        return "produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '" + n90 + "'";
    },
    22: function(n91) {
        return "'current' expects a draft, got: " + n91;
    },
    23: function(n92) {
        return "'original' expects a draft, got: " + n92;
    },
    24: "Patching reserved attributes like __proto__, prototype and constructor is not allowed"
}, Z = "" + Object.prototype.constructor, nn = "undefined" != typeof Reflect && Reflect.ownKeys ? Reflect.ownKeys : void 0 !== Object.getOwnPropertySymbols ? function(n93) {
    return Object.getOwnPropertyNames(n93).concat(Object.getOwnPropertySymbols(n93));
} : Object.getOwnPropertyNames, rn = Object.getOwnPropertyDescriptors || function(n94) {
    var r66 = {};
    return nn(n94).forEach(function(t39) {
        r66[t39] = Object.getOwnPropertyDescriptor(n94, t39);
    }), r66;
}, tn = {}, en = {
    get: function(n95, r67) {
        if (r67 === Q) return n95;
        var e31 = p(n95);
        if (!u(e31, r67)) return function(n96, r68, t40) {
            var e32, i20 = I(r68, t40);
            return i20 ? "value" in i20 ? i20.value : null === (e32 = i20.get) || void 0 === e32 ? void 0 : e32.call(n96.k) : void 0;
        }(n95, e31, r67);
        var i19 = e31[r67];
        return n95.I || !t(i19) ? i19 : i19 === z(n95.t, r67) ? (E(n95), n95.o[r67] = R(n95.A.h, i19, n95)) : i19;
    },
    has: function(n97, r69) {
        return r69 in p(n97);
    },
    ownKeys: function(n98) {
        return Reflect.ownKeys(p(n98));
    },
    set: function(n99, r70, t41) {
        var e33 = I(p(n99), r70);
        if (null == e33 ? void 0 : e33.set) return e33.set.call(n99.k, t41), !0;
        if (!n99.P) {
            var i21 = z(p(n99), r70), o21 = null == i21 ? void 0 : i21[Q];
            if (o21 && o21.t === t41) return n99.o[r70] = t41, n99.D[r70] = !1, !0;
            if (c(t41, i21) && (void 0 !== t41 || u(n99.t, r70))) return !0;
            E(n99), k(n99);
        }
        return n99.o[r70] === t41 && "number" != typeof t41 && (void 0 !== t41 || r70 in n99.o) || (n99.o[r70] = t41, n99.D[r70] = !0, !0);
    },
    deleteProperty: function(n100, r71) {
        return void 0 !== z(n100.t, r71) || r71 in n100.t ? (n100.D[r71] = !1, E(n100), k(n100)) : delete n100.D[r71], n100.o && delete n100.o[r71], !0;
    },
    getOwnPropertyDescriptor: function(n101, r72) {
        var t42 = p(n101), e34 = Reflect.getOwnPropertyDescriptor(t42, r72);
        return e34 ? {
            writable: !0,
            configurable: 1 !== n101.i || "length" !== r72,
            enumerable: e34.enumerable,
            value: t42[r72]
        } : e34;
    },
    defineProperty: function() {
        n(11);
    },
    getPrototypeOf: function(n102) {
        return Object.getPrototypeOf(n102.t);
    },
    setPrototypeOf: function() {
        n(12);
    }
}, on = {};
i(en, function(n103, r73) {
    on[n103] = function() {
        return arguments[0] = arguments[0][0], r73.apply(this, arguments);
    };
}), on.deleteProperty = function(r74, t43) {
    return "production" !== process.env.NODE_ENV && isNaN(parseInt(t43)) && n(13), on.set.call(this, r74, t43, void 0);
}, on.set = function(r75, t44, e35) {
    return "production" !== process.env.NODE_ENV && "length" !== t44 && isNaN(parseInt(t44)) && n(14), en.set.call(this, r75[0], t44, e35, r75[0]);
};
var un = function() {
    function e36(r76) {
        var e37 = this;
        this.g = B, this.F = !0, this.produce = function(r77, i23, o22) {
            if ("function" == typeof r77 && "function" != typeof i23) {
                var u8 = i23;
                i23 = r77;
                var a8 = e37;
                return function(n104) {
                    var r78 = this;
                    void 0 === n104 && (n104 = u8);
                    for(var t45 = arguments.length, e38 = Array(t45 > 1 ? t45 - 1 : 0), o23 = 1; o23 < t45; o23++)e38[o23 - 1] = arguments[o23];
                    return a8.produce(n104, function(n105) {
                        var t46;
                        return (t46 = i23).call.apply(t46, [
                            r78,
                            n105
                        ].concat(e38));
                    });
                };
            }
            var f9;
            if ("function" != typeof i23 && n(6), void 0 !== o22 && "function" != typeof o22 && n(7), t(r77)) {
                var c6 = w(e37), s8 = R(e37, r77, void 0), v7 = !0;
                try {
                    f9 = i23(s8), v7 = !1;
                } finally{
                    v7 ? O(c6) : g(c6);
                }
                return "undefined" != typeof Promise && f9 instanceof Promise ? f9.then(function(n106) {
                    return j(c6, o22), P(n106, c6);
                }, function(n107) {
                    throw O(c6), n107;
                }) : (j(c6, o22), P(f9, c6));
            }
            if (!r77 || "object" != typeof r77) {
                if (void 0 === (f9 = i23(r77)) && (f9 = r77), f9 === H && (f9 = void 0), e37.F && d(f9, !0), o22) {
                    var p5 = [], l5 = [];
                    b("Patches").M(r77, f9, p5, l5), o22(p5, l5);
                }
                return f9;
            }
            n(21, r77);
        }, this.produceWithPatches = function(n108, r79) {
            if ("function" == typeof n108) return function(r80) {
                for(var t48 = arguments.length, i25 = Array(t48 > 1 ? t48 - 1 : 0), o25 = 1; o25 < t48; o25++)i25[o25 - 1] = arguments[o25];
                return e37.produceWithPatches(r80, function(r81) {
                    return n108.apply(void 0, [
                        r81
                    ].concat(i25));
                });
            };
            var t47, i24, o24 = e37.produce(n108, r79, function(n109, r82) {
                t47 = n109, i24 = r82;
            });
            return "undefined" != typeof Promise && o24 instanceof Promise ? o24.then(function(n110) {
                return [
                    n110,
                    t47,
                    i24
                ];
            }) : [
                o24,
                t47,
                i24
            ];
        }, "boolean" == typeof (null == r76 ? void 0 : r76.useProxies) && this.setUseProxies(r76.useProxies), "boolean" == typeof (null == r76 ? void 0 : r76.autoFreeze) && this.setAutoFreeze(r76.autoFreeze);
    }
    var i22 = e36.prototype;
    return i22.createDraft = function(e39) {
        t(e39) || n(8), r(e39) && (e39 = D(e39));
        var i26 = w(this), o26 = R(this, e39, void 0);
        return o26[Q].C = !0, g(i26), o26;
    }, i22.finishDraft = function(r83, t49) {
        var e40 = r83 && r83[Q];
        "production" !== process.env.NODE_ENV && (e40 && e40.C || n(9), e40.I && n(10));
        var i27 = e40.A;
        return j(i27, t49), P(void 0, i27);
    }, i22.setAutoFreeze = function(n111) {
        this.F = n111;
    }, i22.setUseProxies = function(r84) {
        r84 && !B && n(20), this.g = r84;
    }, i22.applyPatches = function(n112, t50) {
        var e41;
        for(e41 = t50.length - 1; e41 >= 0; e41--){
            var i28 = t50[e41];
            if (0 === i28.path.length && "replace" === i28.op) {
                n112 = i28.value;
                break;
            }
        }
        e41 > -1 && (t50 = t50.slice(e41 + 1));
        var o27 = b("Patches").$;
        return r(n112) ? o27(n112, t50) : this.produce(n112, function(n113) {
            return o27(n113, t50);
        });
    }, e36;
}(), an = new un, fn = an.produce, cn = an.produceWithPatches.bind(an), sn = an.setAutoFreeze.bind(an), vn = an.setUseProxies.bind(an), pn = an.applyPatches.bind(an), ln = an.createDraft.bind(an), dn = an.finishDraft.bind(an);
J();
const State = (initialState)=>{
    let internalState = initialState;
    return (handler)=>{
        if (handler) {
            internalState = isFunction(handler) ? handler(internalState) : handler;
        }
        return internalState;
    };
};
let activeContext = null;
const sendToContext = (item)=>{
    if (!activeContext) throw new Error('Outside of context');
    activeContext.push(item);
};
const e = createEnum('arcTo', 'beginPath', 'bezierCurveTo', 'clearRect', 'clip', 'closePath', 'createConicGradient', 'createImageData', 'createLinearGradient', 'createPattern', 'createRadialGradient', 'drawFocusIfNeeded', 'drawImage', 'ellipse', 'fill', 'fillRect', 'fillText', 'getContextAttributes', 'getImageData', 'getLineDash', 'getTransform', 'isContextLost', 'isPointInPath', 'isPointInStroke', 'lineTo', 'measureText', 'moveTo', 'putImageData', 'quadraticCurveTo', 'rect', 'reset', 'resetTransform', 'restore', 'rotate', 'roundRect', 'save', 'scale', 'setLineDash', 'setTransform', 'stroke', 'strokeRect', 'strokeText', 'transform', 'translate', 'direction', 'fillStyle', 'filter', 'font', 'fontKerning', 'fontStretch', 'fontVariantCaps', 'globalAlpha', 'globalCompositeOperation', 'imageSmoothingEnabled', 'imageSmoothingQuality', 'letterSpacing', 'lineCap', 'lineDashOffset', 'lineJoin', 'lineWidth', 'miterLimit', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'strokeStyle', 'textAlign', 'textBaseline', 'textRendering', 'wordSpacing');
const c1 = (e1)=>{
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
c1(e.arcTo);
c1(e.beginPath);
c1(e.bezierCurveTo);
const clearRect = c1(e.clearRect);
c1(e.clip);
c1(e.closePath);
c1(e.createConicGradient);
c1(e.createImageData);
c1(e.createLinearGradient);
c1(e.createPattern);
c1(e.createRadialGradient);
c1(e.drawFocusIfNeeded);
c1(e.drawImage);
c1(e.ellipse);
c1(e.fill);
c1(e.fillRect);
c1(e.fillText);
c1(e.getContextAttributes);
c1(e.getImageData);
c1(e.getLineDash);
c1(e.getTransform);
c1(e.isContextLost);
c1(e.isPointInPath);
c1(e.isPointInStroke);
c1(e.lineTo);
c1(e.measureText);
c1(e.moveTo);
c1(e.putImageData);
c1(e.quadraticCurveTo);
c1(e.rect);
c1(e.reset);
c1(e.resetTransform);
c1(e.restore);
c1(e.rotate);
c1(e.roundRect);
c1(e.save);
c1(e.scale);
c1(e.setLineDash);
c1(e.setTransform);
c1(e.stroke);
c1(e.strokeRect);
c1(e.strokeText);
c1(e.transform);
c1(e.translate);
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
c1(e.direction);
c1(e.fillStyle);
c1(e.filter);
c1(e.font);
c1(e.fontKerning);
c1(e.fontStretch);
c1(e.fontVariantCaps);
c1(e.globalAlpha);
c1(e.globalCompositeOperation);
c1(e.imageSmoothingEnabled);
c1(e.imageSmoothingQuality);
c1(e.letterSpacing);
c1(e.lineCap);
c1(e.lineDashOffset);
c1(e.lineJoin);
c1(e.lineWidth);
c1(e.miterLimit);
c1(e.shadowBlur);
c1(e.shadowColor);
c1(e.shadowOffsetX);
c1(e.shadowOffsetY);
c1(e.strokeStyle);
c1(e.textAlign);
c1(e.textBaseline);
c1(e.textRendering);
c1(e.wordSpacing);
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
new Map();
CBTracker('$$initiate2');
CBTracker('inputs2');
CBTracker('preframe2');
CBTracker('physics2');
CBTracker('update2');
CBTracker('removal2');
const prerender = CBTracker('prerender');
CBTracker('render');
CBTracker('final');
State(0);
State(0);
State(0);
State(0);
State(0);
new WeakSet();
function* it() {
    yield this.x;
    yield this.y;
}
const v1 = (x39, y4)=>{
    return {
        x: x39,
        y: y4,
        [0]: x39,
        [1]: x39,
        [Symbol.iterator]: it
    };
};
const zero = ()=>v1(0, 0)
;
curry(([x1, y1], [x2, y2])=>{
    return v1(x1 + x2, y1 + y2);
});
const Canvas = State({
    width: 1920,
    height: 1080
});
const call = curry((key, args, actions)=>[
        ...actions,
        [
            'c',
            key,
            args
        ]
    ]
);
const set = curry((key, value, actions)=>[
        ...actions,
        [
            's',
            key,
            value
        ]
    ]
);
call('save');
call('fillRect');
call('restore');
set('fillStyle');
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
prerender.add(()=>{
    const { width , height  } = Canvas();
    clearRect(...zero(), width, height);
});
const createComlinkWorker = (path6, options)=>{
    const worker = new Worker(path6, options);
    const comlinkWorker = wrap(worker);
    return comlinkWorker;
};
const createComlinkSharedWorker = (path7, options)=>{
    const worker1 = new SharedWorker(path7, options);
    worker1.port.start();
    const workerComlink = wrap(worker1.port);
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
const resources = {
    USER_IMAGE: 'https://kybernetik.com.au/animancer/docs/manual/tools/modify-sprites/mage-sprite-big.png'
};
new Map();
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
    canvasWorker.setCanvas(transfer(offscreenCanvas, [
        offscreenCanvas
    ]));
    const app = await loadApp({
        useWorker: true
    });
    const clonedCanvasWorker = canvasWorker.clonePort();
    await app.attachCanvasWorker(transfer(clonedCanvasWorker, [
        clonedCanvasWorker
    ]));
    const resourceUrls = Array.from(Object.values(resources));
    await canvasWorker.loadResources(resourceUrls);
    setupListeners(app);
    await app.run();
};
const setupListeners = (app)=>{
    window.addEventListener('keydown', ({ code  })=>app.fireEvent('windowKeyDownListener', {
            code
        })
    );
    window.addEventListener('keyup', ({ code  })=>app.fireEvent('windowKeyUpListener', {
            code
        })
    );
    window.addEventListener('blur', ()=>app.fireEvent('windowBlurListener', {})
    );
};
if (document.readyState === "complete") {
    run();
} else {
    window.addEventListener('DOMContentLoaded', run);
}
