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
        const { id: id1 , type: type1 , path: path1  } = Object.assign({
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
                id: id1
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
            const last2 = path2[path2.length - 1];
            if (last2 === createEndpoint) {
                return requestResponseMessage(ep, {
                    type: "ENDPOINT"
                }).then(fromWireValue);
            }
            if (last2 === "bind") {
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
        const id2 = generateUUID();
        ep.addEventListener("message", function l1(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id2) {
                return;
            }
            ep.removeEventListener("message", l1);
            resolve(ev.data);
        });
        if (ep.start) {
            ep.start();
        }
        ep.postMessage(Object.assign({
            id: id2
        }, msg), transfers);
    });
}
function generateUUID() {
    return new Array(4).fill(0).map(()=>Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
    ).join("-");
}
function nop() {}
const isArray = Array.isArray || function(xs) {
    return xs instanceof Array;
};
function isObservable(x1) {
    return x1 && x1._isObservable;
}
function all(xs, f1) {
    for(var i1 = 0, x2; i1 < xs.length; i1++){
        x2 = xs[i1];
        if (!f1(x2)) {
            return false;
        }
    }
    return true;
}
function always(x3) {
    return ()=>x3
    ;
}
function any(xs, f2) {
    for(var i2 = 0, x4; i2 < xs.length; i2++){
        x4 = xs[i2];
        if (f2(x4)) {
            return true;
        }
    }
    return false;
}
function bind(fn1, me) {
    return function() {
        return fn1.apply(me, arguments);
    };
}
function contains(xs, x5) {
    return indexOf(xs, x5) !== -1;
}
function each(xs, f3) {
    for(var key in xs){
        if (Object.prototype.hasOwnProperty.call(xs, key)) {
            var value = xs[key];
            f3(key, value);
        }
    }
}
function empty(xs) {
    return xs.length === 0;
}
function filter(f4, xs) {
    var filtered = [];
    for(var i3 = 0, x6; i3 < xs.length; i3++){
        x6 = xs[i3];
        if (f4(x6)) {
            filtered.push(x6);
        }
    }
    return filtered;
}
function flatMap(f5, xs) {
    return fold(xs, [], function(ys, x7) {
        return ys.concat(f5(x7));
    });
}
function flip(f6) {
    return (a1, b1)=>f6(b1, a1)
    ;
}
function fold(xs, seed, f7) {
    for(var i4 = 0, x8; i4 < xs.length; i4++){
        x8 = xs[i4];
        seed = f7(seed, x8);
    }
    return seed;
}
function head(xs) {
    return xs[0];
}
function id(x9) {
    return x9;
}
function indexOfDefault(xs, x10) {
    return xs.indexOf(x10);
}
function indexOfFallback(xs, x11) {
    for(var i5 = 0, y1; i5 < xs.length; i5++){
        y1 = xs[i5];
        if (x11 === y1) {
            return i5;
        }
    }
    return -1;
}
const indexOf = Array.prototype.indexOf ? indexOfDefault : indexOfFallback;
function indexWhere(xs, f8) {
    for(var i6 = 0, y2; i6 < xs.length; i6++){
        y2 = xs[i6];
        if (f8(y2)) {
            return i6;
        }
    }
    return -1;
}
function isFunction(f9) {
    return typeof f9 === "function";
}
function last(xs) {
    return xs[xs.length - 1];
}
function map(f10, xs) {
    var result = [];
    for(var i7 = 0, x12; i7 < xs.length; i7++){
        x12 = xs[i7];
        result.push(f10(x12));
    }
    return result;
}
function negate(f11) {
    return function(x13) {
        return !f11(x13);
    };
}
function remove(x14, xs) {
    var i8 = indexOf(xs, x14);
    if (i8 >= 0) {
        return xs.splice(i8, 1);
    }
}
function tail(xs) {
    return xs.slice(1, xs.length);
}
function toArray(xs) {
    return isArray(xs) ? xs : [
        xs
    ];
}
function toFunction(f12) {
    if (typeof f12 == "function") {
        return f12;
    }
    return (x)=>f12
    ;
}
function toString(obj) {
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
            return "[" + map(toString, obj).toString() + "]";
        } else if ((obj != null ? obj.toString : void 0) != null && obj.toString !== Object.prototype.toString) {
            return obj.toString();
        } else if (typeof obj === "object") {
            if (recursionDepth > 5) {
                return "{..}";
            }
            var results = [];
            for(var key in obj){
                if (!hasProp.call(obj, key)) continue;
                let value = function() {
                    try {
                        return obj[key];
                    } catch (error) {
                        return error;
                    }
                }();
                results.push(toString(key) + ":" + toString(value));
            }
            return "{" + results + "}";
        } else {
            return obj;
        }
    } finally{
        recursionDepth--;
    }
}
function without(x15, xs) {
    return filter(function(y3) {
        return y3 !== x15;
    }, xs);
}
var _ = {
    indexOf,
    indexWhere,
    head,
    always,
    negate,
    empty,
    tail,
    filter,
    map,
    each,
    toArray,
    contains,
    id,
    last,
    all,
    any,
    without,
    remove,
    fold,
    flatMap,
    bind,
    isFunction,
    toFunction,
    toString
};
var recursionDepth = 0;
const more = undefined;
const noMore = "<no-more>";
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
function assertFunction(f13) {
    return assert("not a function : " + f13, _.isFunction(f13));
}
function assertNoArguments(args) {
    return assert("no arguments supported", args.length === 0);
}
const defaultScheduler = {
    setTimeout (f14, d1) {
        return setTimeout(f14, d1);
    },
    setInterval (f15, i9) {
        return setInterval(f15, i9);
    },
    clearInterval (id1) {
        return clearInterval(id1);
    },
    clearTimeout (id2) {
        return clearTimeout(id2);
    },
    now () {
        return new Date().getTime();
    }
};
const GlobalScheduler = {
    scheduler: defaultScheduler
};
var rootEvent = undefined;
var waiterObs = [];
var waiters = {};
var aftersStack = [];
var aftersStackHeight = 0;
var flushed = {};
var processingAfters = false;
function toString$1() {
    return _.toString({
        rootEvent,
        processingAfters,
        waiterObs,
        waiters,
        aftersStack,
        aftersStackHeight,
        flushed
    });
}
function ensureStackHeight(h1) {
    if (h1 <= aftersStackHeight) return;
    if (!aftersStack[h1 - 1]) {
        aftersStack[h1 - 1] = [
            [],
            0
        ];
    }
    aftersStackHeight = h1;
}
function isInTransaction() {
    return rootEvent !== undefined;
}
function soonButNotYet(obs, f16) {
    if (rootEvent) {
        whenDoneWith(obs, f16);
    } else {
        GlobalScheduler.scheduler.setTimeout(f16, 0);
    }
}
function afterTransaction(obs, f17) {
    if (rootEvent || processingAfters) {
        ensureStackHeight(1);
        var stackIndexForThisObs = 0;
        while(stackIndexForThisObs < aftersStackHeight - 1){
            if (containsObs(obs, aftersStack[stackIndexForThisObs][0])) {
                break;
            }
            stackIndexForThisObs++;
        }
        var listFromStack = aftersStack[stackIndexForThisObs][0];
        listFromStack.push([
            obs,
            f17
        ]);
        if (!rootEvent) {
            processAfters();
        }
    } else {
        return f17();
    }
}
function containsObs(obs, aftersList) {
    for(var i10 = 0; i10 < aftersList.length; i10++){
        if (aftersList[i10][0].id == obs.id) return true;
    }
    return false;
}
function processAfters() {
    let stackSizeAtStart = aftersStackHeight;
    if (!stackSizeAtStart) return;
    let isRoot = !processingAfters;
    processingAfters = true;
    try {
        while(aftersStackHeight >= stackSizeAtStart){
            var topOfStack = aftersStack[aftersStackHeight - 1];
            if (!topOfStack) throw new Error("Unexpected stack top: " + topOfStack);
            var [topAfters, index] = topOfStack;
            if (index < topAfters.length) {
                var [, after] = topAfters[index];
                topOfStack[1]++;
                ensureStackHeight(aftersStackHeight + 1);
                var callSuccess = false;
                try {
                    after();
                    callSuccess = true;
                    while(aftersStackHeight > stackSizeAtStart && aftersStack[aftersStackHeight - 1][0].length == 0){
                        aftersStackHeight--;
                    }
                } finally{
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
    } finally{
        if (isRoot) processingAfters = false;
    }
}
function whenDoneWith(obs, f18) {
    if (rootEvent) {
        var obsWaiters = waiters[obs.id];
        if (obsWaiters === undefined) {
            obsWaiters = waiters[obs.id] = [
                f18
            ];
            return waiterObs.push(obs);
        } else {
            return obsWaiters.push(f18);
        }
    } else {
        return f18();
    }
}
function flush() {
    while(waiterObs.length > 0){
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
    for(var i11 = 0, f19; i11 < obsWaiters.length; i11++){
        f19 = obsWaiters[i11];
        f19();
    }
}
function flushDepsOf(obs) {
    if (flushed[obs.id]) return;
    var deps = obs.internalDeps();
    for(var i12 = 0, dep; i12 < deps.length; i12++){
        dep = deps[i12];
        flushDepsOf(dep);
        if (waiters[dep.id]) {
            var index = _.indexOf(waiterObs, dep);
            flushWaiters(index, false);
        }
    }
    flushed[obs.id] = true;
}
function inTransaction(event, context, f20, args) {
    if (rootEvent) {
        return f20.apply(context, args);
    } else {
        rootEvent = event;
        try {
            var result = f20.apply(context, args);
            flush();
        } finally{
            rootEvent = undefined;
            processAfters();
        }
        return result;
    }
}
function currentEventId() {
    return rootEvent ? rootEvent.id : undefined;
}
function wrappedSubscribe(obs, subscribe, sink) {
    assertFunction(sink);
    let unsubd = false;
    let shouldUnsub = false;
    let doUnsub = ()=>{
        shouldUnsub = true;
    };
    let unsub = ()=>{
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
var UpdateBarrier = {
    toString: toString$1,
    whenDoneWith,
    hasWaiters,
    inTransaction,
    currentEventId,
    wrappedSubscribe,
    afterTransaction,
    soonButNotYet,
    isInTransaction
};
class Desc {
    constructor(context, method, args = []){
        this._isDesc = true;
        this.context = context;
        this.method = method;
        this.args = args;
    }
    deps() {
        if (!this.cachedDeps) {
            this.cachedDeps = findDeps([
                this.context
            ].concat(this.args));
        }
        return this.cachedDeps;
    }
    toString() {
        let args = _.map(_.toString, this.args);
        return _.toString(this.context) + "." + _.toString(this.method) + "(" + args + ")";
    }
}
function describe(context, method, ...args) {
    const ref = context || method;
    if (ref && ref._isDesc) {
        return context || method;
    } else {
        return new Desc(context, method, args);
    }
}
function findDeps(x16) {
    if (isArray(x16)) {
        return _.flatMap(findDeps, x16);
    } else if (isObservable(x16)) {
        return [
            x16
        ];
    } else if (typeof x16 !== "undefined" && x16 !== null ? x16._isSource : undefined) {
        return [
            x16.obs
        ];
    } else {
        return [];
    }
}
const nullSink = ()=>more
;
const nullVoidSink = ()=>more
;
function withStateMachine(initState, f21, src) {
    return src.transform(withStateMachineT(initState, f21), new Desc(src, "withStateMachine", [
        initState,
        f21
    ]));
}
function withStateMachineT(initState, f22) {
    let state = initState;
    return (event, sink)=>{
        var fromF = f22(state, event);
        var [newState, outputs] = fromF;
        state = newState;
        var reply = more;
        for(var i13 = 0; i13 < outputs.length; i13++){
            let output = outputs[i13];
            reply = sink(output);
            if (reply === noMore) {
                return reply;
            }
        }
        return reply;
    };
}
class Some {
    constructor(value){
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
    filter(f23) {
        if (f23(this.value)) {
            return new Some(this.value);
        } else {
            return None;
        }
    }
    map(f24) {
        return new Some(f24(this.value));
    }
    forEach(f25) {
        f25(this.value);
    }
    toArray() {
        return [
            this.value
        ];
    }
    inspect() {
        return "Some(" + this.value + ")";
    }
    toString() {
        return this.inspect();
    }
}
const None = {
    _isNone: true,
    getOrElse (value) {
        return value;
    },
    get () {
        throw new Error("None.get()");
    },
    filter () {
        return None;
    },
    map () {
        return None;
    },
    forEach () {},
    isDefined: false,
    toArray () {
        return [];
    },
    inspect () {
        return "None";
    },
    toString () {
        return this.inspect();
    }
};
function none() {
    return None;
}
function toOption(v4) {
    if (v4 && (v4._isSome || v4._isNone)) {
        return v4;
    } else {
        return new Some(v4);
    }
}
function isNone(object) {
    return typeof object !== "undefined" && object !== null ? object._isNone : false;
}
var eventIdCounter = 0;
class Event {
    constructor(){
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
}
class Value extends Event {
    constructor(value){
        super();
        this.hasValue = true;
        if (value instanceof Event) {
            throw new Error$1("Wrapping an event inside other event");
        }
        this.value = value;
    }
    fmap(f26) {
        return this.apply(f26(this.value));
    }
    filter(f27) {
        return f27(this.value);
    }
    toString() {
        return _.toString(this.value);
    }
    log() {
        return this.value;
    }
}
class Next extends Value {
    constructor(value){
        super(value);
        this.isNext = true;
        this._isNext = true;
    }
    apply(value) {
        return new Next(value);
    }
}
class Initial extends Value {
    constructor(value){
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
}
class NoValue extends Event {
    constructor(){
        super(...arguments);
        this.hasValue = false;
    }
    fmap(f) {
        return this;
    }
}
class End extends NoValue {
    constructor(){
        super(...arguments);
        this.isEnd = true;
    }
    toString() {
        return "<end>";
    }
}
class Error$1 extends NoValue {
    constructor(error){
        super();
        this.isError = true;
        this.error = error;
    }
    toString() {
        return "<error> " + _.toString(this.error);
    }
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
function toEvent(x17) {
    if (x17 && x17._isEvent) {
        return x17;
    } else {
        return nextEvent(x17);
    }
}
function isEvent(e1) {
    return e1 && e1._isEvent;
}
function isInitial(e2) {
    return e2 && e2._isInitial;
}
function isError(e3) {
    return e3.isError;
}
function hasValue(e4) {
    return e4.hasValue;
}
function isEnd(e5) {
    return e5.isEnd;
}
function equals(a2, b2) {
    return a2 === b2;
}
function skipDuplicates(src, isEqual = equals) {
    let desc = new Desc(src, "skipDuplicates", []);
    return withStateMachine(none(), function(prev, event) {
        if (!hasValue(event)) {
            return [
                prev,
                [
                    event
                ]
            ];
        } else if (event.isInitial || isNone(prev) || !isEqual(prev.get(), event.value)) {
            return [
                new Some(event.value),
                [
                    event
                ]
            ];
        } else {
            return [
                prev,
                []
            ];
        }
    }, src).withDesc(desc);
}
function take(count1, src, desc) {
    return src.transform(takeT(count1), desc || new Desc(src, "take", [
        count1
    ]));
}
function takeT(count2) {
    return (e6, sink)=>{
        if (!e6.hasValue) {
            return sink(e6);
        } else {
            count2--;
            if (count2 > 0) {
                return sink(e6);
            } else {
                if (count2 === 0) {
                    sink(e6);
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
            console.log(...args.concat([
                event.log()
            ]));
        }
        return more;
    });
}
function doLogT(args) {
    return (event, sink)=>{
        if (typeof console !== "undefined" && console !== null && typeof console.log === "function") {
            console.log(...args.concat([
                event.log()
            ]));
        }
        return sink(event);
    };
}
function doErrorT(f28) {
    return (event, sink)=>{
        if (isError(event)) {
            f28(event.error);
        }
        return sink(event);
    };
}
function doActionT(f29) {
    return (event, sink)=>{
        if (hasValue(event)) {
            f29(event.value);
        }
        return sink(event);
    };
}
function doEndT(f30) {
    return (event, sink)=>{
        if (isEnd(event)) {
            f30();
        }
        return sink(event);
    };
}
function scan(src, seed, f31) {
    let resultProperty;
    let acc = seed;
    let initHandled = false;
    const subscribe = (sink)=>{
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
                    var next = f31(prev, event.value);
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
    return resultProperty = new Property(new Desc(src, "scan", [
        seed,
        f31
    ]), subscribe);
}
function mapEndT(f32) {
    let theF = _.toFunction(f32);
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
function mapErrorT(f33) {
    let theF = _.toFunction(f33);
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
class CompositeUnsubscribe {
    constructor(ss = []){
        this.unsubscribed = false;
        this.unsubscribe = _.bind(this.unsubscribe, this);
        this.unsubscribed = false;
        this.subscriptions = [];
        this.starting = [];
        for(var i14 = 0, s1; i14 < ss.length; i14++){
            s1 = ss[i14];
            this.add(s1);
        }
    }
    add(subscription) {
        if (!this.unsubscribed) {
            var ended = false;
            var unsub = nop;
            this.starting.push(subscription);
            var unsubMe = ()=>{
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
        if (_.remove(unsub, this.subscriptions) !== undefined) {
            return unsub();
        }
    }
    unsubscribe() {
        if (this.unsubscribed) {
            return;
        }
        this.unsubscribed = true;
        var iterable = this.subscriptions;
        for(var i15 = 0; i15 < iterable.length; i15++){
            iterable[i15]();
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
    const s2 = new EventStream(new Desc("Bacon", "once", [
        value
    ]), function(sink) {
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
    const rootDep = [
        root
    ];
    const childDeps = [];
    const isProperty1 = src._isProperty;
    const ctor = isProperty1 ? propertyFromStreamSubscribe : newEventStreamAllowSync;
    let initialSpawned = false;
    const desc = params.desc || new Desc(src, "flatMap_", [
        spawner
    ]);
    const result = ctor(desc, function(sink) {
        const composite = new CompositeUnsubscribe();
        const queue = [];
        function spawn(event1) {
            if (isProperty1 && event1.isInitial) {
                if (initialSpawned) {
                    return more;
                }
                initialSpawned = true;
            }
            const child = makeObservable(spawner(event1));
            childDeps.push(child);
            return composite.add(function(unsubAll, unsubMe) {
                return child.subscribeInternal(function(event) {
                    if (event.isEnd) {
                        _.remove(child, childDeps);
                        checkQueue();
                        checkEnd(unsubMe);
                        return noMore;
                    } else {
                        event = event.toNext();
                        const reply = sink(event);
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
function handleEventValueWith(f34) {
    if (typeof f34 == "function") {
        return (event)=>{
            if (hasValue(event)) {
                return f34(event.value);
            }
            return event;
        };
    }
    return (event)=>f34
    ;
}
function makeObservable(x18) {
    if (isObservable(x18)) {
        return x18;
    } else {
        return once(x18);
    }
}
function flatMapEvent(src, f35) {
    return flatMap_(f35, src, {
        mapError: true,
        desc: new Desc(src, "flatMapEvent", [
            f35
        ])
    });
}
function endAsValue(src) {
    return src.transform((event, sink)=>{
        if (isEnd(event)) {
            sink(nextEvent({}));
            sink(endEvent());
            return noMore;
        }
        return more;
    });
}
function endOnError(src, predicate = (x)=>true
) {
    return src.transform((event, sink)=>{
        if (isError(event) && predicate(event.error)) {
            sink(event);
            return sink(endEvent());
        } else {
            return sink(event);
        }
    }, new Desc(src, "endOnError", []));
}
class Source {
    constructor(obs, sync){
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
}
class DefaultSource extends Source {
    consume() {
        return this.value;
    }
    push(x19) {
        this.value = x19;
    }
    hasAtLeast(c) {
        return !!this.value;
    }
}
class ConsumingSource extends Source {
    constructor(obs, sync){
        super(obs, sync);
        this.flatten = false;
        this.queue = [];
    }
    consume() {
        return this.queue.shift();
    }
    push(x20) {
        this.queue.push(x20);
    }
    mayHave(count3) {
        return !this.ended || this.queue.length >= count3;
    }
    hasAtLeast(count4) {
        return this.queue.length >= count4;
    }
}
class BufferingSource extends Source {
    constructor(obs){
        super(obs, true);
        this.queue = [];
    }
    consume() {
        const values1 = this.queue;
        this.queue = [];
        return {
            value: values1
        };
    }
    push(x21) {
        return this.queue.push(x21.value);
    }
    hasAtLeast(count) {
        return true;
    }
}
function isTrigger(s3) {
    if (s3 == null) return false;
    if (s3._isSource) {
        return s3.sync;
    } else {
        return s3._isEventStream;
    }
}
function fromObservable(s4) {
    if (s4 != null && s4._isSource) {
        return s4;
    } else if (s4 != null && s4._isProperty) {
        return new DefaultSource(s4, false);
    } else {
        return new ConsumingSource(s4, true);
    }
}
function never() {
    return new EventStream(describe("Bacon", "never"), (sink)=>{
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
    var needsBarrier = any(sources, (s5)=>s5.flatten
    ) && containsDuplicateDeps(map((s6)=>s6.obs
    , sources));
    var desc = new Desc("Bacon", "when", Array.prototype.slice.call(patterns));
    var resultStream = ctor(desc, function(sink) {
        var triggers = [];
        var ends = false;
        function match(p6) {
            for(var i16 = 0; i16 < p6.ixs.length; i16++){
                let ix = p6.ixs[i16];
                if (!sources[ix.index].hasAtLeast(ix.count)) {
                    return false;
                }
            }
            return true;
        }
        function cannotMatch(p7) {
            for(var i17 = 0; i17 < p7.ixs.length; i17++){
                let ix = p7.ixs[i17];
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
                    return UpdateBarrier.whenDoneWith(resultStream, flush1);
                }
                function flushWhileTriggers() {
                    var trigger;
                    if ((trigger = triggers.pop()) !== undefined) {
                        var reply = more;
                        for(var i18 = 0, p8; i18 < ixPats.length; i18++){
                            p8 = ixPats[i18];
                            if (match(p8)) {
                                const values2 = [];
                                for(var j1 = 0; j1 < p8.ixs.length; j1++){
                                    let event = sources[p8.ixs[j1].index].consume();
                                    if (!event) throw new Error("Event was undefined");
                                    values2.push(event.value);
                                }
                                let applied = p8.f.apply(null, values2);
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
                function flush1() {
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
                return source.subscribe(function(e7) {
                    var reply = more;
                    if (e7.isEnd) {
                        ends = true;
                        source.markEnded();
                        flushLater();
                    } else if (e7.isError) {
                        reply = sink(e7);
                    } else {
                        let valueEvent = e7;
                        source.push(valueEvent);
                        if (source.sync) {
                            triggers.push({
                                source: source,
                                e: valueEvent
                            });
                            if (needsBarrier || UpdateBarrier.hasWaiters()) {
                                flushLater();
                            } else {
                                flush1();
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
        return new CompositeUnsubscribe(map(part, sources)).unsubscribe;
    });
    return resultStream;
}
function processRawPatterns(rawPatterns) {
    var sources = [];
    var pats = [];
    for(let i19 = 0; i19 < rawPatterns.length; i19++){
        let [patSources, f36] = rawPatterns[i19];
        var pat = {
            f: f36,
            ixs: []
        };
        var triggerFound = false;
        for(var j2 = 0, s7; j2 < patSources.length; j2++){
            s7 = patSources[j2];
            var index = indexOf(sources, s7);
            if (!triggerFound) {
                triggerFound = isTrigger(s7);
            }
            if (index < 0) {
                sources.push(s7);
                index = sources.length - 1;
            }
            for(var k1 = 0; k1 < pat.ixs.length; k1++){
                let ix = pat.ixs[k1];
                if (ix.index === index) {
                    ix.count++;
                }
            }
            pat.ixs.push({
                index: index,
                count: 1
            });
        }
        if (patSources.length > 0 && !triggerFound) {
            throw new Error("At least one EventStream required, none found in " + patSources);
        }
        if (patSources.length > 0) {
            pats.push(pat);
        }
    }
    return [
        map(fromObservable, sources),
        pats
    ];
}
function extractLegacyPatterns(sourceArgs) {
    var i20 = 0;
    var len = sourceArgs.length;
    var rawPatterns = [];
    while(i20 < len){
        let patSources = toArray(sourceArgs[i20++]);
        let f37 = toFunction(sourceArgs[i20++]);
        rawPatterns.push([
            patSources,
            f37
        ]);
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
    for(let i21 = 0; i21 < patterns.length; i21++){
        let pattern = patterns[i21];
        if (!isTypedOrRawPattern(pattern)) {
            return extractLegacyPatterns(patterns);
        }
        if (isRawPattern(pattern)) {
            rawPatterns.push([
                pattern[0],
                toFunction(pattern[1])
            ]);
        } else {
            let sources = pattern.slice(0, pattern.length - 1);
            let f38 = toFunction(pattern[pattern.length - 1]);
            rawPatterns.push([
                sources,
                f38
            ]);
        }
    }
    return rawPatterns;
}
function containsDuplicateDeps(observables, state = []) {
    function checkObservable(obs) {
        if (contains(state, obs)) {
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
function withLatestFromE(sampler, samplee, f39) {
    var result = when([
        new DefaultSource(samplee.toProperty(), false),
        new DefaultSource(sampler, true),
        flip(f39)
    ]);
    return result.withDesc(new Desc(sampler, "withLatestFrom", [
        samplee,
        f39
    ]));
}
function withLatestFromP(sampler, samplee, f40) {
    var result = whenP([
        new DefaultSource(samplee.toProperty(), false),
        new DefaultSource(sampler, true),
        flip(f40)
    ]);
    return result.withDesc(new Desc(sampler, "withLatestFrom", [
        samplee,
        f40
    ]));
}
function withLatestFrom(sampler, samplee, f41) {
    if (sampler instanceof Property) {
        return withLatestFromP(sampler, samplee, f41);
    } else if (sampler instanceof EventStream) {
        return withLatestFromE(sampler, samplee, f41);
    } else {
        throw new Error("Unknown observable: " + sampler);
    }
}
function map$1(src, f42) {
    if (f42 instanceof Property) {
        return withLatestFrom(src, f42, (a, b3)=>b3
        );
    }
    return src.transform(mapT(f42), new Desc(src, "map", [
        f42
    ]));
}
function mapT(f43) {
    let theF = _.toFunction(f43);
    return (e8, sink)=>{
        return sink(e8.fmap(theF));
    };
}
function constant(x22) {
    return new Property(new Desc("Bacon", "constant", [
        x22
    ]), function(sink) {
        sink(initialEvent(x22));
        sink(endEvent());
        return nop;
    });
}
function argumentsToObservables(args) {
    args = Array.prototype.slice.call(args);
    return _.flatMap(singleToObservables, args);
}
function singleToObservables(x23) {
    if (isObservable(x23)) {
        return [
            x23
        ];
    } else if (isArray(x23)) {
        return argumentsToObservables(x23);
    } else {
        return [
            constant(x23)
        ];
    }
}
function argumentsToObservablesAndFunction(args) {
    if (_.isFunction(args[0])) {
        return [
            argumentsToObservables(Array.prototype.slice.call(args, 1)),
            args[0]
        ];
    } else {
        return [
            argumentsToObservables(Array.prototype.slice.call(args, 0, args.length - 1)),
            _.last(args)
        ];
    }
}
function groupSimultaneous_(streams, options) {
    let sources = _.map((stream)=>new BufferingSource(stream)
    , streams);
    let ctor = (desc, subscribe)=>new EventStream(desc, subscribe, undefined, options)
    ;
    return when_(ctor, [
        sources,
        function(...xs) {
            return xs;
        }
    ]).withDesc(new Desc("Bacon", "groupSimultaneous", streams));
}
function awaiting(src, other) {
    return groupSimultaneous_([
        src,
        other
    ], allowSync).map((values3)=>values3[1].length === 0
    ).toProperty(false).skipDuplicates().withDesc(new Desc(src, "awaiting", [
        other
    ]));
}
function combineAsArray(...streams) {
    streams = argumentsToObservables(streams);
    if (streams.length) {
        var sources = [];
        for(var i22 = 0; i22 < streams.length; i22++){
            let stream = isObservable(streams[i22]) ? streams[i22] : constant(streams[i22]);
            sources.push(wrap1(stream));
        }
        return whenP([
            sources,
            (...xs)=>xs
        ]).withDesc(new Desc("Bacon", "combineAsArray", streams));
    } else {
        return constant([]);
    }
}
function combineTwo(left1, right1, f44) {
    return whenP([
        [
            wrap1(left1),
            wrap1(right1)
        ],
        f44
    ]).withDesc(new Desc(left1, "combine", [
        right1,
        f44
    ]));
}
function wrap1(obs) {
    return new DefaultSource(obs, true);
}
function skip(src, count5) {
    return src.transform((event, sink)=>{
        if (!event.hasValue) {
            return sink(event);
        } else if (count5 > 0) {
            count5--;
            return more;
        } else {
            return sink(event);
        }
    }, new Desc(src, "skip", [
        count5
    ]));
}
function flatMapConcat(src, f45) {
    return flatMap_(handleEventValueWith(f45), src, {
        desc: new Desc(src, "flatMapConcat", [
            f45
        ]),
        limit: 1
    });
}
function fromBinder(binder, eventTransformer = _.id) {
    var desc = new Desc("Bacon", "fromBinder", [
        binder,
        eventTransformer
    ]);
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
            let valueArray = isArray(value_) && isEvent(_.last(value_)) ? value_ : [
                value_
            ];
            var reply = more;
            for(var i23 = 0; i23 < valueArray.length; i23++){
                let event = toEvent(valueArray[i23]);
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
function fromPoll(delay1, poll) {
    var desc = new Desc("Bacon", "fromPoll", [
        delay1,
        poll
    ]);
    return fromBinder(function(handler) {
        var id3 = GlobalScheduler.scheduler.setInterval(handler, delay1);
        return function() {
            return GlobalScheduler.scheduler.clearInterval(id3);
        };
    }, poll).withDesc(desc);
}
function interval(delay2, value) {
    return fromPoll(delay2, function() {
        return nextEvent(value);
    }).withDesc(new Desc("Bacon", "interval", [
        delay2,
        value
    ]));
}
function makeCombinator(combinator) {
    if (typeof combinator == "function") {
        return combinator;
    } else {
        return _.id;
    }
}
function sampledBy(samplee, sampler, f46) {
    if (samplee instanceof EventStream) {
        return sampledByE(samplee, sampler, f46);
    } else {
        return sampledByP(samplee, sampler, f46);
    }
}
function sampledByP(samplee, sampler, f47) {
    let combinator = makeCombinator(f47);
    var result = withLatestFrom(sampler, samplee, flip(combinator));
    return result.withDesc(new Desc(samplee, "sampledBy", [
        sampler
    ]));
}
function sampledByE(samplee, sampler, f48) {
    return sampledByP(samplee.toProperty(), sampler, f48).withDesc(new Desc(samplee, "sampledBy", [
        sampler
    ]));
}
function sampleP(samplee, samplingInterval) {
    return sampledByP(samplee, interval(samplingInterval, {}), (a3, b)=>a3
    ).withDesc(new Desc(samplee, "sample", [
        samplingInterval
    ]));
}
function transformP(src, transformer, desc) {
    return new Property(new Desc(src, "transform", [
        transformer
    ]), (sink)=>src.subscribeInternal((e9)=>transformer(e9, sink)
        )
    ).withDesc(desc);
}
function transformE(src, transformer, desc) {
    return new EventStream(new Desc(src, "transform", [
        transformer
    ]), (sink)=>src.subscribeInternal((e10)=>transformer(e10, sink)
        )
    , undefined, allowSync).withDesc(desc);
}
function composeT(t1, t2) {
    let finalSink;
    const sink2 = (event)=>{
        return t2(event, finalSink);
    };
    return (event, sink)=>{
        finalSink = sink;
        return t1(event, sink2);
    };
}
function toPredicate(f49) {
    if (typeof f49 == "boolean") {
        return _.always(f49);
    } else if (typeof f49 != "function") {
        throw new Error("Not a function: " + f49);
    } else {
        return f49;
    }
}
function withPredicate(src, f50, predicateTransformer, desc) {
    if (f50 instanceof Property) {
        return withLatestFrom(src, f50, (p9, v5)=>[
                p9,
                v5
            ]
        ).transform(composeT(predicateTransformer((tuple)=>tuple[1]
        ), mapT((tuple)=>tuple[0]
        )), desc);
    }
    return src.transform(predicateTransformer(toPredicate(f50)), desc);
}
function filter$1(src, f51) {
    return withPredicate(src, f51, filterT, new Desc(src, "filter", [
        f51
    ]));
}
function filterT(f52) {
    return (e11, sink)=>{
        if (e11.filter(f52)) {
            return sink(e11);
        } else {
            return more;
        }
    };
}
function not(src) {
    return src.map((x24)=>!x24
    ).withDesc(new Desc(src, "not", []));
}
function and(left2, right2) {
    return left2.combine(toProperty(right2), (x25, y4)=>!!(x25 && y4)
    ).withDesc(new Desc(left2, "and", [
        right2
    ]));
}
function or(left3, right3) {
    return left3.combine(toProperty(right3), (x26, y5)=>x26 || y5
    ).withDesc(new Desc(left3, "or", [
        right3
    ]));
}
function toProperty(x27) {
    if (isProperty(x27)) {
        return x27;
    }
    return constant(x27);
}
function flatMapFirst(src, f53) {
    return flatMap_(handleEventValueWith(f53), src, {
        firstOnly: true,
        desc: new Desc(src, "flatMapFirst", [
            f53
        ])
    });
}
function concatE(left4, right4, options) {
    return new EventStream(new Desc(left4, "concat", [
        right4
    ]), function(sink) {
        var unsubRight = nop;
        var unsubLeft = left4.dispatcher.subscribe(function(e12) {
            if (e12.isEnd) {
                unsubRight = right4.toEventStream().dispatcher.subscribe(sink);
                return more;
            } else {
                return sink(e12);
            }
        });
        return function() {
            return unsubLeft(), unsubRight();
        };
    }, undefined, options);
}
function transformPropertyChanges(property, f54, desc) {
    let initValue;
    let comboSink;
    const changes = new EventStream(describe(property, "changes", []), (sink)=>property.dispatcher.subscribe(function(event) {
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
        })
    , undefined, allowSync);
    const transformedChanges = f54(changes);
    const combo = propertyFromStreamSubscribe(desc, (sink)=>{
        comboSink = sink;
        return transformedChanges.dispatcher.subscribe(function(event) {
            sink(event);
        });
    });
    return combo;
}
function fold$1(src, seed, f55) {
    return src.scan(seed, f55).last().withDesc(new Desc(src, "fold", [
        seed,
        f55
    ]));
}
function startWithE(src, seed) {
    return once(seed).concat(src).withDesc(new Desc(src, "startWith", [
        seed
    ]));
}
function startWithP(src, seed) {
    return src.scan(seed, (prev, next)=>next
    ).withDesc(new Desc(src, "startWith", [
        seed
    ]));
}
const endMarker = {};
function takeUntil(src, stopper1) {
    let endMapped = src.mapEnd(endMarker);
    let withEndMarker = groupSimultaneous_([
        endMapped,
        stopper1.skipErrors()
    ], allowSync);
    if (src instanceof Property) withEndMarker = withEndMarker.toProperty();
    return withEndMarker.transform(function(event, sink) {
        if (hasValue(event)) {
            var [data, stopper] = event.value;
            if (stopper.length) {
                return sink(endEvent());
            } else {
                var reply = more;
                for(var i24 = 0; i24 < data.length; i24++){
                    let value = data[i24];
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
    }, new Desc(src, "takeUntil", [
        stopper1
    ]));
}
function flatMap$1(src, f56) {
    return flatMap_(handleEventValueWith(f56), src, {
        desc: new Desc(src, "flatMap", [
            f56
        ])
    });
}
function flatMapError(src, f57) {
    return flatMap_((x28)=>{
        if (x28 instanceof Error$1) {
            let error = x28.error;
            return f57(error);
        } else {
            return x28;
        }
    }, src, {
        mapError: true,
        desc: new Desc(src, "flatMapError", [
            f57
        ])
    });
}
var spies = [];
var running = false;
function registerObs(obs) {
    if (spies.length) {
        if (!running) {
            try {
                running = true;
                spies.forEach(function(spy1) {
                    spy1(obs);
                });
            } finally{
                running = false;
            }
        }
    }
}
function flatMapLatest(src, f_) {
    let f58 = _.toFunction(f_);
    var stream = isProperty(src) ? src.toEventStream(allowSync) : src;
    let flatMapped = flatMap$1(stream, (value)=>makeObservable(f58(value)).takeUntil(stream)
    );
    if (isProperty(src)) flatMapped = flatMapped.toProperty();
    return flatMapped.withDesc(new Desc(src, "flatMapLatest", [
        f58
    ]));
}
class Dispatcher {
    constructor(observable, _subscribe, _handleEvent){
        this.pushing = false;
        this.ended = false;
        this.prevError = undefined;
        this.unsubSrc = undefined;
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
        return UpdateBarrier.inTransaction(event, this, this.pushIt, [
            event
        ]);
    }
    pushToSubscriptions(event) {
        try {
            let tmp = this.subscriptions;
            const len = tmp.length;
            for(let i25 = 0; i25 < len; i25++){
                const sub = tmp[i25];
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
            while(true){
                let e13 = this.queue.shift();
                if (e13) {
                    this.push(e13);
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
        this.unsubSrc = undefined;
    }
    subscribe(sink) {
        if (this.ended) {
            sink(endEvent());
            return nop;
        } else {
            assertFunction(sink);
            let subscription = {
                sink: sink
            };
            this.subscriptions.push(subscription);
            if (this.subscriptions.length === 1) {
                this.unsubSrc = this._subscribe(this.handleEvent);
                assertFunction(this.unsubSrc);
            }
            return ()=>{
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
}
class PropertyDispatcher extends Dispatcher {
    constructor(property, subscribe, handleEvent){
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
                UpdateBarrier.whenDoneWith(this.observable, ()=>{
                    if (this.currentValueRootId === valId) {
                        return sink(initialEvent(this.current.get().value));
                    }
                });
                return this.maybeSubSource(sink, reply);
            } else {
                UpdateBarrier.inTransaction(undefined, this, ()=>{
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
}
function flatMapWithConcurrencyLimit(src, limit, f59) {
    return flatMap_(handleEventValueWith(f59), src, {
        desc: new Desc(src, "flatMapWithConcurrencyLimit", [
            limit,
            f59
        ]),
        limit
    });
}
function bufferWithTime(src, delay3) {
    return bufferWithTimeOrCount(src, delay3, Number.MAX_VALUE).withDesc(new Desc(src, "bufferWithTime", [
        delay3
    ]));
}
function bufferWithCount(src, count6) {
    return bufferWithTimeOrCount(src, undefined, count6).withDesc(new Desc(src, "bufferWithCount", [
        count6
    ]));
}
function bufferWithTimeOrCount(src, delay4, count7) {
    const delayFunc = toDelayFunction(delay4);
    function flushOrSchedule(buffer1) {
        if (buffer1.values.length === count7) {
            return buffer1.flush();
        } else if (delayFunc !== undefined) {
            return buffer1.schedule(delayFunc);
        }
    }
    var desc = new Desc(src, "bufferWithTimeOrCount", [
        delay4,
        count7
    ]);
    return buffer(src, flushOrSchedule, flushOrSchedule).withDesc(desc);
}
class Buffer {
    constructor(onFlush, onInput){
        this.push = (e)=>more
        ;
        this.scheduled = null;
        this.end = undefined;
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
    schedule(delay5) {
        if (!this.scheduled) {
            return this.scheduled = delay5(()=>{
                return this.flush();
            });
        }
    }
}
function toDelayFunction(delay6) {
    if (delay6 === undefined) {
        return undefined;
    }
    if (typeof delay6 === "number") {
        var delayMs = delay6;
        return function(f60) {
            return GlobalScheduler.scheduler.setTimeout(f60, delayMs);
        };
    }
    return delay6;
}
function buffer(src, onInput = nop, onFlush = nop) {
    var reply = more;
    var buffer2 = new Buffer(onFlush, onInput);
    return src.transform((event, sink)=>{
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
    return function wrappedSubscribe(sink) {
        const inTransaction1 = UpdateBarrier.isInTransaction();
        subscribing = true;
        var asyncDeliveries;
        function deliverAsync() {
            var toDeliverNow = asyncDeliveries || [];
            asyncDeliveries = undefined;
            for(var i26 = 0; i26 < toDeliverNow.length; i26++){
                var event = toDeliverNow[i26];
                sink(event);
            }
        }
        try {
            return subscribe(function wrappedSink(event) {
                if (subscribing || asyncDeliveries) {
                    if (!asyncDeliveries) {
                        asyncDeliveries = [
                            event
                        ];
                        if (inTransaction1) {
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
        } finally{
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
            var sinks = map(smartSink, flattenedStreams);
            return new CompositeUnsubscribe(sinks).unsubscribe;
        });
    } else {
        return never();
    }
}
function later(delay7, value) {
    return fromBinder(function(sink) {
        var sender = function() {
            return sink([
                toEvent(value),
                endEvent()
            ]);
        };
        var id4 = GlobalScheduler.scheduler.setTimeout(sender, delay7);
        return function() {
            return GlobalScheduler.scheduler.clearTimeout(id4);
        };
    }).withDesc(new Desc("Bacon", "later", [
        delay7,
        value
    ]));
}
function delay(src, delay8) {
    return src.transformChanges(new Desc(src, "delay", [
        delay8
    ]), function(changes) {
        return changes.flatMap(function(value) {
            return later(delay8, value);
        });
    });
}
function debounce(src, delay9) {
    return src.transformChanges(new Desc(src, "debounce", [
        delay9
    ]), function(changes) {
        return changes.flatMapLatest(function(value) {
            return later(delay9, value);
        });
    });
}
function debounceImmediate(src, delay10) {
    return src.transformChanges(new Desc(src, "debounceImmediate", [
        delay10
    ]), function(changes) {
        return changes.flatMapFirst(function(value) {
            return once(value).concat(later(delay10, value).errors());
        });
    });
}
function throttle(src, delay11) {
    return src.transformChanges(new Desc(src, "throttle", [
        delay11
    ]), (changes)=>changes.bufferWithTime(delay11).map((values4)=>values4[values4.length - 1]
        )
    );
}
function bufferingThrottle(src, minimumInterval) {
    var desc = new Desc(src, "bufferingThrottle", [
        minimumInterval
    ]);
    return src.transformChanges(desc, (changes)=>changes.flatMapConcat((x29)=>{
            return once(x29).concat(later(minimumInterval, x29).errors());
        })
    );
}
function takeWhile(src, f61) {
    return withPredicate(src, f61, takeWhileT, new Desc(src, "takeWhile", [
        f61
    ]));
}
function takeWhileT(f62) {
    return (event, sink)=>{
        if (event.filter(f62)) {
            return sink(event);
        } else {
            sink(endEvent());
            return noMore;
        }
    };
}
function skipUntil(src, starter) {
    var started = starter.transform(composeT(takeT(1), mapT(true))).toProperty().startWith(false);
    return src.filter(started).withDesc(new Desc(src, "skipUntil", [
        starter
    ]));
}
function skipWhile(src, f63) {
    return withPredicate(src, f63, skipWhileT, new Desc(src, "skipWhile", [
        f63
    ]));
}
function skipWhileT(f64) {
    var started = false;
    return function(event, sink) {
        if (started || !hasValue(event) || !f64(event.value)) {
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
    return src.transform(composeT(filterT((x30)=>!streams[keyF(x30)]
    ), mapT(function(firstValue) {
        var key = keyF(firstValue);
        var similarValues = src.changes().filter((x31)=>keyF(x31) === key
        );
        var data = once(firstValue).concat(similarValues);
        var limited = limitF(data, firstValue).toEventStream().transform((event, sink)=>{
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
    return src.scan([], function(window, value) {
        return window.concat([
            value
        ]).slice(-maxValues);
    }).filter(function(values5) {
        return values5.length >= minValues;
    }).withDesc(new Desc(src, "slidingWindow", [
        maxValues,
        minValues
    ]));
}
const nullMarker = {};
function diff(src, start, f65) {
    return transformP(scan(src, [
        start,
        nullMarker
    ], (prevTuple, next)=>[
            next,
            f65(prevTuple[0], next)
        ]
    ), composeT(filterT((tuple)=>tuple[1] !== nullMarker
    ), mapT((tuple)=>tuple[1]
    )), new Desc(src, "diff", [
        start,
        f65
    ]));
}
function flatScan(src, seed, f66) {
    let current = seed;
    return src.flatMapConcat((next)=>makeObservable(f66(current, next)).doAction((updated)=>current = updated
        )
    ).toProperty().startWith(seed).withDesc(new Desc(src, "flatScan", [
        seed,
        f66
    ]));
}
function holdWhen(src, valve) {
    var onHold = false;
    var bufferedValues = [];
    var srcIsEnded = false;
    return new EventStream(new Desc(src, "holdWhen", [
        valve
    ]), function(sink) {
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
                        for(var i27 = 0; i27 < toSend.length; i27++){
                            result = sink(nextEvent(toSend[i27]));
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
function zipWith(f67, ...streams) {
    var [streams, f67] = argumentsToObservablesAndFunction(arguments);
    streams = _.map((s8)=>s8.toEventStream()
    , streams);
    return when([
        streams,
        f67
    ]).withDesc(new Desc("Bacon", "zipWith", [
        f67
    ].concat(streams)));
}
function zip(left5, right5, f68) {
    return zipWith(f68 || Array, left5, right5).withDesc(new Desc(left5, "zip", [
        right5
    ]));
}
function combineTemplate(template1) {
    function current(ctxStack) {
        return ctxStack[ctxStack.length - 1];
    }
    function setValue(ctxStack, key, value) {
        current(ctxStack)[key] = value;
        return value;
    }
    function applyStreamValue(key, index) {
        return function(ctxStack, values6) {
            setValue(ctxStack, key, values6[index]);
        };
    }
    function constantValue(key, value) {
        return function(ctxStack) {
            setValue(ctxStack, key, value);
        };
    }
    function mkContext(template) {
        return isArray(template) ? [] : {};
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
            for(var key in value){
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    const child = value[key];
                    if (containsObservables(child)) return true;
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
    function combinator(values7) {
        const rootContext = mkContext(template1);
        const ctxStack = [
            rootContext
        ];
        for(var i28 = 0, f69; i28 < funcs.length; i28++){
            f69 = funcs[i28];
            f69(ctxStack, values7);
        }
        return rootContext;
    }
    function compileTemplate(template) {
        _.each(template, compile);
    }
    const funcs = [];
    const streams = [];
    const resultProperty = containsObservables(template1) ? (compileTemplate(template1), combineAsArray(streams).map(combinator)) : constant(template1);
    return resultProperty.withDesc(new Desc("Bacon", "combineTemplate", [
        template1
    ]));
}
function decode(src, cases) {
    return src.combine(combineTemplate(cases), (key, values8)=>values8[key]
    ).withDesc(new Desc(src, "decode", [
        cases
    ]));
}
function firstToPromise(src, PromiseCtr) {
    const generator = (resolve, reject1)=>src.subscribe((event)=>{
            if (hasValue(event)) {
                resolve(event.value);
            }
            if (isError(event)) {
                reject1(event.error);
            }
            return noMore;
        })
    ;
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
class Observable {
    constructor(desc){
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
    combine(right6, f70) {
        return combineTwo(this, right6, f70).withDesc(new Desc(this, "combine", [
            right6,
            f70
        ]));
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
    diff(start, f71) {
        return diff(this, start, f71);
    }
    doAction(f72) {
        return this.transform(doActionT(f72), new Desc(this, "doAction", [
            f72
        ]));
    }
    doEnd(f73) {
        return this.transform(doEndT(f73), new Desc(this, "doEnd", [
            f73
        ]));
    }
    doError(f74) {
        return this.transform(doErrorT(f74), new Desc(this, "doError", [
            f74
        ]));
    }
    doLog(...args) {
        return this.transform(doLogT(args), new Desc(this, "doLog", args));
    }
    endAsValue() {
        return endAsValue(this);
    }
    endOnError(predicate = (x)=>true
    ) {
        return endOnError(this, predicate);
    }
    errors() {
        return this.filter((x)=>false
        ).withDesc(new Desc(this, "errors"));
    }
    filter(f75) {
        return filter$1(this, f75);
    }
    first() {
        return take(1, this, new Desc(this, "first"));
    }
    firstToPromise(PromiseCtr) {
        return firstToPromise(this, PromiseCtr);
    }
    fold(seed, f76) {
        return fold$1(this, seed, f76);
    }
    forEach(f77 = nullSink) {
        return this.onValue(f77);
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
    mapEnd(f78) {
        return this.transform(mapEndT(f78), new Desc(this, "mapEnd", [
            f78
        ]));
    }
    mapError(f79) {
        return this.transform(mapErrorT(f79), new Desc(this, "mapError", [
            f79
        ]));
    }
    name(name) {
        this._name = name;
        return this;
    }
    onEnd(f80 = nullVoidSink) {
        return this.subscribe(function(event) {
            if (event.isEnd) {
                return f80();
            }
            return more;
        });
    }
    onError(f81 = nullSink) {
        return this.subscribe(function(event) {
            if (isError(event)) {
                return f81(event.error);
            }
            return more;
        });
    }
    onValue(f82 = nullSink) {
        return this.subscribe(function(event) {
            if (hasValue(event)) {
                return f82(event.value);
            }
            return more;
        });
    }
    onValues(f83) {
        return this.onValue(function(args) {
            return f83(...args);
        });
    }
    reduce(seed, f84) {
        return fold$1(this, seed, f84);
    }
    sampledBy(sampler) {
        return sampledBy(this, sampler, arguments[1]);
    }
    scan(seed, f85) {
        return scan(this, seed, f85);
    }
    skip(count8) {
        return skip(this, count8);
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
    skipWhile(f86) {
        return skipWhile(this, f86);
    }
    slidingWindow(maxValues, minValues = 0) {
        return slidingWindow(this, maxValues, minValues);
    }
    subscribe(sink1 = nullSink) {
        return UpdateBarrier.wrappedSubscribe(this, (sink)=>this.subscribeInternal(sink)
        , sink1);
    }
    take(count9) {
        return take(count9, this);
    }
    takeUntil(stopper) {
        return takeUntil(this, stopper);
    }
    takeWhile(f87) {
        return takeWhile(this, f87);
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
        if (desc) this.desc = desc;
        return this;
    }
    withDescription(context, method, ...args) {
        this.desc = describe(context, method, ...args);
        return this;
    }
    zip(other, f88) {
        return zip(this, other, f88);
    }
}
class Property extends Observable {
    constructor(desc, subscribe, handler){
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
        return new EventStream(new Desc(this, "changes", []), (sink)=>this.dispatcher.subscribe(function(event) {
                if (!event.isInitial) {
                    return sink(event);
                }
                return more;
            })
        );
    }
    concat(other) {
        return this.transformChanges(describe(this, "concat", other), (changes)=>changes.concat(other)
        );
    }
    transformChanges(desc, f89) {
        return transformPropertyChanges(this, f89, desc);
    }
    flatMap(f90) {
        return flatMap$1(this, f90);
    }
    flatMapConcat(f91) {
        return flatMapConcat(this, f91);
    }
    flatMapError(f92) {
        return flatMapError(this, f92);
    }
    flatMapEvent(f93) {
        return flatMapEvent(this, f93);
    }
    flatMapFirst(f94) {
        return flatMapFirst(this, f94);
    }
    flatMapLatest(f95) {
        return flatMapLatest(this, f95);
    }
    flatMapWithConcurrencyLimit(limit, f96) {
        return flatMapWithConcurrencyLimit(this, limit, f96);
    }
    groupBy(keyF, limitF) {
        return groupBy(this, keyF, limitF);
    }
    map(f97) {
        return map$1(this, f97);
    }
    not() {
        return not(this);
    }
    or(other) {
        return or(this, other);
    }
    sample(interval1) {
        return sampleP(this, interval1);
    }
    startWith(seed) {
        return startWithP(this, seed);
    }
    subscribeInternal(sink = nullSink) {
        return this.dispatcher.subscribe(sink);
    }
    toEventStream(options) {
        return new EventStream(new Desc(this, "toEventStream", []), (sink)=>this.subscribeInternal(function(event) {
                return sink(event.toNext());
            })
        , undefined, options);
    }
    toProperty() {
        assertNoArguments(arguments);
        return this;
    }
    transform(transformer, desc) {
        return transformP(this, transformer, desc);
    }
    withLatestFrom(samplee, f98) {
        return withLatestFromP(this, samplee, f98);
    }
    withStateMachine(initState, f99) {
        return withStateMachine(initState, f99, this);
    }
}
function isProperty(x32) {
    return !!x32._isProperty;
}
const allowSync = {
    forceAsync: false
};
class EventStream extends Observable {
    constructor(desc, subscribe, handler, options){
        super(desc);
        this._isEventStream = true;
        if (options !== allowSync) {
            subscribe = asyncWrapSubscribe(this, subscribe);
        }
        this.dispatcher = new Dispatcher(this, subscribe, handler);
        registerObs(this);
    }
    bufferWithTime(delay12) {
        return bufferWithTime(this, delay12);
    }
    bufferWithCount(count10) {
        return bufferWithCount(this, count10);
    }
    bufferWithTimeOrCount(delay13, count11) {
        return bufferWithTimeOrCount(this, delay13, count11);
    }
    changes() {
        return this;
    }
    concat(other, options) {
        return concatE(this, other, options);
    }
    transformChanges(desc, f100) {
        return f100(this).withDesc(desc);
    }
    flatMap(f101) {
        return flatMap$1(this, f101);
    }
    flatMapConcat(f102) {
        return flatMapConcat(this, f102);
    }
    flatMapError(f103) {
        return flatMapError(this, f103);
    }
    flatMapFirst(f104) {
        return flatMapFirst(this, f104);
    }
    flatMapLatest(f105) {
        return flatMapLatest(this, f105);
    }
    flatMapWithConcurrencyLimit(limit, f106) {
        return flatMapWithConcurrencyLimit(this, limit, f106);
    }
    flatMapEvent(f107) {
        return flatMapEvent(this, f107);
    }
    flatScan(seed, f108) {
        return flatScan(this, seed, f108);
    }
    groupBy(keyF, limitF) {
        return groupBy(this, keyF, limitF);
    }
    map(f109) {
        return map$1(this, f109);
    }
    merge(other) {
        assertEventStream(other);
        return mergeAll(this, other).withDesc(new Desc(this, "merge", [
            other
        ]));
    }
    not() {
        return not(this);
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
    withLatestFrom(samplee, f110) {
        return withLatestFromE(this, samplee, f110);
    }
    withStateMachine(initState, f111) {
        return withStateMachine(initState, f111, this);
    }
}
function newEventStream(description, subscribe) {
    return new EventStream(description, subscribe);
}
function newEventStreamAllowSync(description, subscribe) {
    return new EventStream(description, subscribe, undefined, allowSync);
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
class ESObservable {
    constructor(observable){
        this.observable = observable;
    }
    subscribe(observerOrOnNext, onError, onComplete) {
        const observer = typeof observerOrOnNext === 'function' ? {
            next: observerOrOnNext,
            error: onError,
            complete: onComplete
        } : observerOrOnNext;
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
                if (observer.error) observer.error(event.error);
                subscription.unsubscribe();
            } else if (event.isEnd) {
                subscription.closed = true;
                if (observer.complete) observer.complete();
            }
        });
        return subscription;
    }
}
ESObservable.prototype[symbol('observable')] = function() {
    return this;
};
Observable.prototype.toESObservable = function() {
    return new ESObservable(this);
};
Observable.prototype[symbol('observable')] = Observable.prototype.toESObservable;
function withMethodCallSupport(wrapped) {
    return function(f112, ...args1) {
        if (typeof f112 === "object" && args1.length) {
            var context = f112;
            var methodName = args1[0];
            f112 = function(...args) {
                return context[methodName](...args);
            };
            args1 = args1.slice(1);
        }
        return wrapped(f112, ...args1);
    };
}
function partiallyApplied(f113, applied) {
    return function(...args) {
        return f113(...applied.concat(args));
    };
}
withMethodCallSupport(function(f114, ...args) {
    if (_.isFunction(f114)) {
        if (args.length) {
            return partiallyApplied(f114, args);
        } else {
            return f114;
        }
    } else {
        return _.always(f114);
    }
});
class Bus extends EventStream {
    constructor(){
        super(new Desc("Bacon", "Bus", []), (sink)=>this.subscribeAll(sink)
        );
        this.pushing = false;
        this.pushQueue = undefined;
        this.ended = false;
        this.subscriptions = [];
        this.unsubAll = _.bind(this.unsubAll, this);
        this.push = _.bind(this.push, this);
        this.subscriptions = [];
        this.ended = false;
    }
    plug(input) {
        assertObservable(input);
        if (this.ended) {
            return;
        }
        var sub = {
            input: input,
            unsub: undefined
        };
        this.subscriptions.push(sub);
        if (typeof this.sink !== "undefined") {
            this.subscribeInput(sub);
        }
        return ()=>this.unsubscribeInput(input)
        ;
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
                if (!this.pushQueue) this.pushQueue = [];
                this.pushQueue.push(value);
                return;
            }
            this.pushing = true;
            try {
                return this.sink(nextEvent(value));
            } finally{
                if (rootPush && this.pushQueue) {
                    var i29 = 0;
                    while(i29 < this.pushQueue.length){
                        var v6 = this.pushQueue[i29];
                        this.sink(nextEvent(v6));
                        i29++;
                    }
                    this.pushQueue = undefined;
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
        for(var i30 = 0, sub; i30 < iterable.length; i30++){
            sub = iterable[i30];
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
            for(var i31 = 0, subscription; i31 < iterable.length; i31++){
                subscription = iterable[i31];
                this.subscribeInput(subscription);
            }
        }
        return this.unsubAll;
    }
    guardedSink(input) {
        return (event)=>{
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
        for(var i32 = 0, sub; i32 < iterable.length; i32++){
            sub = iterable[i32];
            if (sub.input === input) {
                if (typeof sub.unsub === "function") {
                    sub.unsub();
                }
                this.subscriptions.splice(i32, 1);
                return;
            }
        }
    }
}
const $ = {
    asEventStream (eventName, selector, eventTransformer) {
        if (_.isFunction(selector)) {
            eventTransformer = selector;
            selector = undefined;
        }
        return fromBinder((handler)=>{
            this.on(eventName, selector, handler);
            return ()=>this.off(eventName, selector, handler)
            ;
        }, eventTransformer).withDesc(new Desc(this.selector || this, "asEventStream", [
            eventName
        ]));
    },
    init (jQuery) {
        jQuery.fn.asEventStream = $.asEventStream;
    }
};
const windowKeyDownListener = new Bus();
const windowKeyUpListener = new Bus();
const windowBlurListener = new Bus();
const mod = {
    windowKeyDownListener: windowKeyDownListener,
    windowKeyUpListener: windowKeyUpListener,
    windowBlurListener: windowBlurListener
};
const CBTracker = (labelName)=>{
    const events = new Set();
    const once1 = (...callbacks)=>{
        callbacks.forEach((callback)=>events.add([
                'once',
                callback
            ])
        );
    };
    const add2 = (...callbacks)=>{
        callbacks.forEach((callback)=>events.add([
                'always',
                callback
            ])
        );
    };
    return {
        once: once1,
        add: add2,
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
function _isPlaceholder(a4) {
    return a4 != null && typeof a4 === 'object' && a4['@@functional/placeholder'] === true;
}
function _curry1(fn2) {
    return function f1(a5) {
        if (arguments.length === 0 || _isPlaceholder(a5)) {
            return f1;
        } else {
            return fn2.apply(this, arguments);
        }
    };
}
function _curry2(fn3) {
    return function f2(a6, b4) {
        switch(arguments.length){
            case 0:
                return f2;
            case 1:
                return _isPlaceholder(a6) ? f2 : _curry1(function(_b) {
                    return fn3(a6, _b);
                });
            default:
                return _isPlaceholder(a6) && _isPlaceholder(b4) ? f2 : _isPlaceholder(a6) ? _curry1(function(_a) {
                    return fn3(_a, b4);
                }) : _isPlaceholder(b4) ? _curry1(function(_b) {
                    return fn3(a6, _b);
                }) : fn3(a6, b4);
        }
    };
}
var add = _curry2(function add(a7, b5) {
    return Number(a7) + Number(b5);
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
function _arity(n1, fn4) {
    switch(n1){
        case 0:
            return function() {
                return fn4.apply(this, arguments);
            };
        case 1:
            return function(a0) {
                return fn4.apply(this, arguments);
            };
        case 2:
            return function(a0, a1) {
                return fn4.apply(this, arguments);
            };
        case 3:
            return function(a0, a1, a2) {
                return fn4.apply(this, arguments);
            };
        case 4:
            return function(a0, a1, a2, a3) {
                return fn4.apply(this, arguments);
            };
        case 5:
            return function(a0, a1, a2, a3, a4) {
                return fn4.apply(this, arguments);
            };
        case 6:
            return function(a0, a1, a2, a3, a4, a5) {
                return fn4.apply(this, arguments);
            };
        case 7:
            return function(a0, a1, a2, a3, a4, a5, a6) {
                return fn4.apply(this, arguments);
            };
        case 8:
            return function(a0, a1, a2, a3, a4, a5, a6, a7) {
                return fn4.apply(this, arguments);
            };
        case 9:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
                return fn4.apply(this, arguments);
            };
        case 10:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
                return fn4.apply(this, arguments);
            };
        default:
            throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
    }
}
function _curryN(length1, received, fn5) {
    return function() {
        var combined = [];
        var argsIdx = 0;
        var left6 = length1;
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
                left6 -= 1;
            }
            combinedIdx += 1;
        }
        return left6 <= 0 ? fn5.apply(this, combined) : _arity(left6, _curryN(length1, combined, fn5));
    };
}
var curryN = _curry2(function curryN(length2, fn6) {
    if (length2 === 1) {
        return _curry1(fn6);
    }
    return _arity(length2, _curryN(length2, [], fn6));
});
_curry1(function addIndex(fn7) {
    return curryN(fn7.length, function() {
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
        return fn7.apply(this, args);
    });
});
function _curry3(fn8) {
    return function f3(a10, b6, c2) {
        switch(arguments.length){
            case 0:
                return f3;
            case 1:
                return _isPlaceholder(a10) ? f3 : _curry2(function(_b, _c) {
                    return fn8(a10, _b, _c);
                });
            case 2:
                return _isPlaceholder(a10) && _isPlaceholder(b6) ? f3 : _isPlaceholder(a10) ? _curry2(function(_a, _c) {
                    return fn8(_a, b6, _c);
                }) : _isPlaceholder(b6) ? _curry2(function(_b, _c) {
                    return fn8(a10, _b, _c);
                }) : _curry1(function(_c) {
                    return fn8(a10, b6, _c);
                });
            default:
                return _isPlaceholder(a10) && _isPlaceholder(b6) && _isPlaceholder(c2) ? f3 : _isPlaceholder(a10) && _isPlaceholder(b6) ? _curry2(function(_a, _b) {
                    return fn8(_a, _b, c2);
                }) : _isPlaceholder(a10) && _isPlaceholder(c2) ? _curry2(function(_a, _c) {
                    return fn8(_a, b6, _c);
                }) : _isPlaceholder(b6) && _isPlaceholder(c2) ? _curry2(function(_b, _c) {
                    return fn8(a10, _b, _c);
                }) : _isPlaceholder(a10) ? _curry1(function(_a) {
                    return fn8(_a, b6, c2);
                }) : _isPlaceholder(b6) ? _curry1(function(_b) {
                    return fn8(a10, _b, c2);
                }) : _isPlaceholder(c2) ? _curry1(function(_c) {
                    return fn8(a10, b6, _c);
                }) : fn8(a10, b6, c2);
        }
    };
}
var adjust = _curry3(function adjust(idx, fn9, list) {
    var len = list.length;
    if (idx >= len || idx < -len) {
        return list;
    }
    var _idx = (len + idx) % len;
    var _list = _concat(list);
    _list[_idx] = fn9(list[_idx]);
    return _list;
});
const __default = Array.isArray || function _isArray(val) {
    return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
};
function _isTransformer(obj) {
    return obj != null && typeof obj['@@transducer/step'] === 'function';
}
function _dispatchable(methodNames, transducerCreator, fn10) {
    return function() {
        if (arguments.length === 0) {
            return fn10();
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
        return fn10.apply(this, arguments);
    };
}
function _reduced(x33) {
    return x33 && x33['@@transducer/reduced'] ? x33 : {
        '@@transducer/value': x33,
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
    function XAll1(f115, xf) {
        this.xf = xf;
        this.f = f115;
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
var _xall = _curry2(function _xall(f116, xf) {
    return new XAll(f116, xf);
});
var all1 = _curry2(_dispatchable([
    'all'
], _xall, function all(fn11, list) {
    var idx = 0;
    while(idx < list.length){
        if (!fn11(list[idx])) {
            return false;
        }
        idx += 1;
    }
    return true;
}));
var max = _curry2(function max(a11, b7) {
    return b7 > a11 ? b7 : a11;
});
function _map(fn12, functor) {
    var idx = 0;
    var len = functor.length;
    var result = Array(len);
    while(idx < len){
        result[idx] = fn12(functor[idx]);
        idx += 1;
    }
    return result;
}
function _isString(x34) {
    return Object.prototype.toString.call(x34) === '[object String]';
}
var _isArrayLike = _curry1(function isArrayLike(x35) {
    if (__default(x35)) {
        return true;
    }
    if (!x35) {
        return false;
    }
    if (typeof x35 !== 'object') {
        return false;
    }
    if (_isString(x35)) {
        return false;
    }
    if (x35.length === 0) {
        return true;
    }
    if (x35.length > 0) {
        return x35.hasOwnProperty(0) && x35.hasOwnProperty(x35.length - 1);
    }
    return false;
});
var XWrap = function() {
    function XWrap1(fn13) {
        this.f = fn13;
    }
    XWrap1.prototype['@@transducer/init'] = function() {
        throw new Error('init not implemented on XWrap');
    };
    XWrap1.prototype['@@transducer/result'] = function(acc) {
        return acc;
    };
    XWrap1.prototype['@@transducer/step'] = function(acc, x36) {
        return this.f(acc, x36);
    };
    return XWrap1;
}();
function _xwrap(fn14) {
    return new XWrap(fn14);
}
var bind1 = _curry2(function bind(fn15, thisObj) {
    return _arity(fn15.length, function() {
        return fn15.apply(thisObj, arguments);
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
    return xf['@@transducer/result'](obj[methodName](bind1(xf['@@transducer/step'], xf), acc));
}
var symIterator = typeof Symbol !== 'undefined' ? Symbol.iterator : '@@iterator';
function _reduce(fn16, acc, list) {
    if (typeof fn16 === 'function') {
        fn16 = _xwrap(fn16);
    }
    if (_isArrayLike(list)) {
        return _arrayReduce(fn16, acc, list);
    }
    if (typeof list['fantasy-land/reduce'] === 'function') {
        return _methodReduce(fn16, acc, list, 'fantasy-land/reduce');
    }
    if (list[symIterator] != null) {
        return _iterableReduce(fn16, acc, list[symIterator]());
    }
    if (typeof list.next === 'function') {
        return _iterableReduce(fn16, acc, list);
    }
    if (typeof list.reduce === 'function') {
        return _methodReduce(fn16, acc, list, 'reduce');
    }
    throw new TypeError('reduce: list must be array or iterable');
}
var XMap = function() {
    function XMap1(f117, xf) {
        this.xf = xf;
        this.f = f117;
    }
    XMap1.prototype['@@transducer/init'] = __default1.init;
    XMap1.prototype['@@transducer/result'] = __default1.result;
    XMap1.prototype['@@transducer/step'] = function(result, input) {
        return this.xf['@@transducer/step'](result, this.f(input));
    };
    return XMap1;
}();
var _xmap = _curry2(function _xmap(f118, xf) {
    return new XMap(f118, xf);
});
function _has(prop5, obj) {
    return Object.prototype.hasOwnProperty.call(obj, prop5);
}
var toString1 = Object.prototype.toString;
var _isArguments = function() {
    return toString1.call(arguments) === '[object Arguments]' ? function _isArguments(x37) {
        return toString1.call(x37) === '[object Arguments]';
    } : function _isArguments(x38) {
        return _has('callee', x38);
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
var contains1 = function contains(list, item) {
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
            if (_has(prop6, obj) && !contains1(ks, prop6)) {
                ks[ks.length] = prop6;
            }
            nIdx -= 1;
        }
    }
    return ks;
});
var map1 = _curry2(_dispatchable([
    'fantasy-land/map',
    'map'
], _xmap, function map(fn17, functor) {
    switch(Object.prototype.toString.call(functor)){
        case '[object Function]':
            return curryN(functor.length, function() {
                return fn17.call(this, functor.apply(this, arguments));
            });
        case '[object Object]':
            return _reduce(function(acc, key) {
                acc[key] = fn17(functor[key]);
                return acc;
            }, {}, keys(functor));
        default:
            return _map(fn17, functor);
    }
}));
const __default2 = Number.isInteger || function _isInteger(n2) {
    return n2 << 0 === n2;
};
var nth = _curry2(function nth(offset, list) {
    var idx = offset < 0 ? list.length + offset : offset;
    return _isString(list) ? list.charAt(idx) : list[idx];
});
var prop = _curry2(function prop(p10, obj) {
    if (obj == null) {
        return;
    }
    return __default2(p10) ? nth(p10, obj) : obj[p10];
});
var pluck = _curry2(function pluck(p11, list) {
    return map1(prop(p11), list);
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
var always1 = _curry1(function always(val) {
    return function() {
        return val;
    };
});
var and1 = _curry2(function and(a12, b8) {
    return a12 && b8;
});
var XAny = function() {
    function XAny1(f119, xf) {
        this.xf = xf;
        this.f = f119;
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
var _xany = _curry2(function _xany(f120, xf) {
    return new XAny(f120, xf);
});
_curry2(_dispatchable([
    'any'
], _xany, function any(fn18, list) {
    var idx = 0;
    while(idx < list.length){
        if (fn18(list[idx])) {
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
    return typeof applyX['fantasy-land/ap'] === 'function' ? applyX['fantasy-land/ap'](applyF) : typeof applyF.ap === 'function' ? applyF.ap(applyX) : typeof applyF === 'function' ? function(x39) {
        return applyF(x39)(applyX(x39));
    } : _reduce(function(acc, f121) {
        return _concat(acc, map1(f121, applyX));
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
var apply = _curry2(function apply(fn19, args) {
    return fn19.apply(this, args);
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
function mapValues(fn20, obj) {
    return __default(obj) ? obj.map(fn20) : keys(obj).reduce(function(acc, key) {
        acc[key] = fn20(obj[key]);
        return acc;
    }, {});
}
_curry1(function applySpec1(spec) {
    spec = mapValues(function(v7) {
        return typeof v7 == 'function' ? v7 : applySpec1(v7);
    }, spec);
    return curryN(reduce(max, 0, pluck('length', values(spec))), function() {
        var args = arguments;
        return mapValues(function(f122) {
            return apply(f122, args);
        }, spec);
    });
});
_curry2(function applyTo(x40, f123) {
    return f123(x40);
});
_curry3(function ascend(fn21, a13, b9) {
    var aa = fn21(a13);
    var bb = fn21(b9);
    return aa < bb ? -1 : aa > bb ? 1 : 0;
});
function _assoc(prop7, val, obj) {
    if (__default2(prop7) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop7] = val;
        return arr;
    }
    var result = {};
    for(var p12 in obj){
        result[p12] = obj[p12];
    }
    result[prop7] = val;
    return result;
}
var isNil = _curry1(function isNil(x41) {
    return x41 == null;
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
var nAry = _curry2(function nAry(n6, fn22) {
    switch(n6){
        case 0:
            return function() {
                return fn22.call(this);
            };
        case 1:
            return function(a0) {
                return fn22.call(this, a0);
            };
        case 2:
            return function(a0, a1) {
                return fn22.call(this, a0, a1);
            };
        case 3:
            return function(a0, a1, a2) {
                return fn22.call(this, a0, a1, a2);
            };
        case 4:
            return function(a0, a1, a2, a3) {
                return fn22.call(this, a0, a1, a2, a3);
            };
        case 5:
            return function(a0, a1, a2, a3, a4) {
                return fn22.call(this, a0, a1, a2, a3, a4);
            };
        case 6:
            return function(a0, a1, a2, a3, a4, a5) {
                return fn22.call(this, a0, a1, a2, a3, a4, a5);
            };
        case 7:
            return function(a0, a1, a2, a3, a4, a5, a6) {
                return fn22.call(this, a0, a1, a2, a3, a4, a5, a6);
            };
        case 8:
            return function(a0, a1, a2, a3, a4, a5, a6, a7) {
                return fn22.call(this, a0, a1, a2, a3, a4, a5, a6, a7);
            };
        case 9:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
                return fn22.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8);
            };
        case 10:
            return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
                return fn22.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
            };
        default:
            throw new Error('First argument to nAry must be a non-negative integer no greater than ten');
    }
});
_curry1(function binary(fn23) {
    return nAry(2, fn23);
});
function _isFunction(x42) {
    var type3 = Object.prototype.toString.call(x42);
    return type3 === '[object Function]' || type3 === '[object AsyncFunction]' || type3 === '[object GeneratorFunction]' || type3 === '[object AsyncGeneratorFunction]';
}
var liftN = _curry2(function liftN(arity, fn24) {
    var lifted = curryN(arity, fn24);
    return curryN(arity, function() {
        return _reduce(ap, map1(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
    });
});
var lift = _curry1(function lift(fn25) {
    return liftN(fn25.length, fn25);
});
_curry2(function both(f124, g1) {
    return _isFunction(f124) ? function _both() {
        return f124.apply(this, arguments) && g1.apply(this, arguments);
    } : lift(and1)(f124, g1);
});
_curry1(function call(fn26) {
    return fn26.apply(this, Array.prototype.slice.call(arguments, 1));
});
function _makeFlat(recursive) {
    return function flatt(list) {
        var value, jlen, j3;
        var result = [];
        var idx = 0;
        var ilen = list.length;
        while(idx < ilen){
            if (_isArrayLike(list[idx])) {
                value = recursive ? flatt(list[idx]) : list[idx];
                j3 = 0;
                jlen = value.length;
                while(j3 < jlen){
                    result[result.length] = value[j3];
                    j3 += 1;
                }
            } else {
                result[result.length] = list[idx];
            }
            idx += 1;
        }
        return result;
    };
}
function _forceReduced(x43) {
    return {
        '@@transducer/value': x43,
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
var _xchain = _curry2(function _xchain(f125, xf) {
    return map1(f125, _flatCat(xf));
});
var chain = _curry2(_dispatchable([
    'fantasy-land/chain',
    'chain'
], _xchain, function chain(fn27, monad) {
    if (typeof monad === 'function') {
        return function(x44) {
            return fn27(monad(x44))(x44);
        };
    }
    return _makeFlat(false)(map1(fn27, monad));
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
_curry2(function collectBy(fn28, list) {
    var group = _reduce(function(o1, x45) {
        var tag = fn28(x45);
        if (o1[tag] === undefined) {
            o1[tag] = [];
        }
        o1[tag].push(x45);
        return o1;
    }, {}, list);
    var newList = [];
    for(var tag1 in group){
        newList.push(group[tag1]);
    }
    return newList;
});
_curry1(function comparator(pred) {
    return function(a14, b10) {
        return pred(a14, b10) ? -1 : pred(b10, a14) ? 1 : 0;
    };
});
var not1 = _curry1(function not(a15) {
    return !a15;
});
var complement = lift(not1);
function _pipe(f126, g2) {
    return function() {
        return g2.call(this, f126.apply(this, arguments));
    };
}
function _checkForMethod(methodname, fn29) {
    return function() {
        var length3 = arguments.length;
        if (length3 === 0) {
            return fn29();
        }
        var obj = arguments[length3 - 1];
        return __default(obj) || typeof obj[methodname] !== 'function' ? fn29.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length3 - 1));
    };
}
var slice = _curry3(_checkForMethod('slice', function slice(fromIndex, toIndex, list) {
    return Array.prototype.slice.call(list, fromIndex, toIndex);
}));
var tail1 = _curry1(_checkForMethod('tail', slice(1, Infinity)));
function pipe() {
    if (arguments.length === 0) {
        throw new Error('pipe requires at least one argument');
    }
    return _arity(arguments[0].length, reduce(_pipe, arguments[0], tail1(arguments)));
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
var head1 = nth(0);
function _identity(x46) {
    return x46;
}
var identity = _curry1(_identity);
var pipeWith = _curry2(function pipeWith(xf, list) {
    if (list.length <= 0) {
        return identity;
    }
    var headList = head1(list);
    var tailList = tail1(list);
    return _arity(headList.length, function() {
        return _reduce(function(result, f127) {
            return xf.call(this, f127, result);
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
function _includesWith(pred, x47, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (pred(x47, list[idx])) {
            return true;
        }
        idx += 1;
    }
    return false;
}
function _functionName(f128) {
    var match = String(f128).match(/^function (\w*)/);
    return match == null ? '' : match[1];
}
function _objectIs(a16, b11) {
    if (a16 === b11) {
        return a16 !== 0 || 1 / a16 === 1 / b11;
    } else {
        return a16 !== a16 && b11 !== b11;
    }
}
const __default3 = typeof Object.is === 'function' ? Object.is : _objectIs;
function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
    var a17 = _arrayFromIterator(aIterator);
    var b1 = _arrayFromIterator(bIterator);
    function eq(_a, _b) {
        return _equals(_a, _b, stackA.slice(), stackB.slice());
    }
    return !_includesWith(function(b12, aItem) {
        return !_includesWith(eq, aItem, b12);
    }, b1, a17);
}
function _equals(a18, b13, stackA, stackB) {
    if (__default3(a18, b13)) {
        return true;
    }
    var typeA = type(a18);
    if (typeA !== type(b13)) {
        return false;
    }
    if (typeof a18['fantasy-land/equals'] === 'function' || typeof b13['fantasy-land/equals'] === 'function') {
        return typeof a18['fantasy-land/equals'] === 'function' && a18['fantasy-land/equals'](b13) && typeof b13['fantasy-land/equals'] === 'function' && b13['fantasy-land/equals'](a18);
    }
    if (typeof a18.equals === 'function' || typeof b13.equals === 'function') {
        return typeof a18.equals === 'function' && a18.equals(b13) && typeof b13.equals === 'function' && b13.equals(a18);
    }
    switch(typeA){
        case 'Arguments':
        case 'Array':
        case 'Object':
            if (typeof a18.constructor === 'function' && _functionName(a18.constructor) === 'Promise') {
                return a18 === b13;
            }
            break;
        case 'Boolean':
        case 'Number':
        case 'String':
            if (!(typeof a18 === typeof b13 && __default3(a18.valueOf(), b13.valueOf()))) {
                return false;
            }
            break;
        case 'Date':
            if (!__default3(a18.valueOf(), b13.valueOf())) {
                return false;
            }
            break;
        case 'Error':
            return a18.name === b13.name && a18.message === b13.message;
        case 'RegExp':
            if (!(a18.source === b13.source && a18.global === b13.global && a18.ignoreCase === b13.ignoreCase && a18.multiline === b13.multiline && a18.sticky === b13.sticky && a18.unicode === b13.unicode)) {
                return false;
            }
            break;
    }
    var idx = stackA.length - 1;
    while(idx >= 0){
        if (stackA[idx] === a18) {
            return stackB[idx] === b13;
        }
        idx -= 1;
    }
    switch(typeA){
        case 'Map':
            if (a18.size !== b13.size) {
                return false;
            }
            return _uniqContentEquals(a18.entries(), b13.entries(), stackA.concat([
                a18
            ]), stackB.concat([
                b13
            ]));
        case 'Set':
            if (a18.size !== b13.size) {
                return false;
            }
            return _uniqContentEquals(a18.values(), b13.values(), stackA.concat([
                a18
            ]), stackB.concat([
                b13
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
    if (keysA.length !== keys(b13).length) {
        return false;
    }
    var extendedStackA = stackA.concat([
        a18
    ]);
    var extendedStackB = stackB.concat([
        b13
    ]);
    idx = keysA.length - 1;
    while(idx >= 0){
        var key = keysA[idx];
        if (!(_has(key, b13) && _equals(b13[key], a18[key], extendedStackA, extendedStackB))) {
            return false;
        }
        idx -= 1;
    }
    return true;
}
var equals1 = _curry2(function equals(a19, b14) {
    return _equals(a19, b14, [], []);
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
        if (equals1(list[idx], a20)) {
            return idx;
        }
        idx += 1;
    }
    return -1;
}
function _includes(a21, list) {
    return _indexOf(list, a21, 0) >= 0;
}
function _quote(s9) {
    var escaped = s9.replace(/\\/g, '\\\\').replace(/[\b]/g, '\\b').replace(/\f/g, '\\f').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\v/g, '\\v').replace(/\0/g, '\\0');
    return '"' + escaped.replace(/"/g, '\\"') + '"';
}
var pad = function pad(n7) {
    return (n7 < 10 ? '0' : '') + n7;
};
var _toISOString = typeof Date.prototype.toISOString === 'function' ? function _toISOString(d2) {
    return d2.toISOString();
} : function _toISOString(d3) {
    return d3.getUTCFullYear() + '-' + pad(d3.getUTCMonth() + 1) + '-' + pad(d3.getUTCDate()) + 'T' + pad(d3.getUTCHours()) + ':' + pad(d3.getUTCMinutes()) + ':' + pad(d3.getUTCSeconds()) + '.' + (d3.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
};
function _complement(f129) {
    return function() {
        return !f129.apply(this, arguments);
    };
}
function _filter(fn30, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    while(idx < len){
        if (fn30(list[idx])) {
            result[result.length] = list[idx];
        }
        idx += 1;
    }
    return result;
}
function _isObject(x48) {
    return Object.prototype.toString.call(x48) === '[object Object]';
}
var XFilter = function() {
    function XFilter1(f130, xf) {
        this.xf = xf;
        this.f = f130;
    }
    XFilter1.prototype['@@transducer/init'] = __default1.init;
    XFilter1.prototype['@@transducer/result'] = __default1.result;
    XFilter1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
    };
    return XFilter1;
}();
var _xfilter = _curry2(function _xfilter(f131, xf) {
    return new XFilter(f131, xf);
});
var filter1 = _curry2(_dispatchable([
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
    return filter1(_complement(pred), filterable);
});
function _toString(x49, seen) {
    var recur = function recur(y6) {
        var xs = seen.concat([
            x49
        ]);
        return _includes(y6, xs) ? '<Circular>' : _toString(y6, xs);
    };
    var mapPairs = function(obj, keys1) {
        return _map(function(k2) {
            return _quote(k2) + ': ' + recur(obj[k2]);
        }, keys1.slice().sort());
    };
    switch(Object.prototype.toString.call(x49)){
        case '[object Arguments]':
            return '(function() { return arguments; }(' + _map(recur, x49).join(', ') + '))';
        case '[object Array]':
            return '[' + _map(recur, x49).concat(mapPairs(x49, reject(function(k3) {
                return /^\d+$/.test(k3);
            }, keys(x49)))).join(', ') + ']';
        case '[object Boolean]':
            return typeof x49 === 'object' ? 'new Boolean(' + recur(x49.valueOf()) + ')' : x49.toString();
        case '[object Date]':
            return 'new Date(' + (isNaN(x49.valueOf()) ? recur(NaN) : _quote(_toISOString(x49))) + ')';
        case '[object Null]':
            return 'null';
        case '[object Number]':
            return typeof x49 === 'object' ? 'new Number(' + recur(x49.valueOf()) + ')' : 1 / x49 === -Infinity ? '-0' : x49.toString(10);
        case '[object String]':
            return typeof x49 === 'object' ? 'new String(' + recur(x49.valueOf()) + ')' : _quote(x49);
        case '[object Undefined]':
            return 'undefined';
        default:
            if (typeof x49.toString === 'function') {
                var repr = x49.toString();
                if (repr !== '[object Object]') {
                    return repr;
                }
            }
            return '{' + mapPairs(x49, keys(x49)).join(', ') + '}';
    }
}
var toString2 = _curry1(function toString(val) {
    return _toString(val, []);
});
var concat = _curry2(function concat(a22, b15) {
    if (__default(a22)) {
        if (__default(b15)) {
            return a22.concat(b15);
        }
        throw new TypeError(toString2(b15) + ' is not an array');
    }
    if (_isString(a22)) {
        if (_isString(b15)) {
            return a22 + b15;
        }
        throw new TypeError(toString2(b15) + ' is not a string');
    }
    if (a22 != null && _isFunction(a22['fantasy-land/concat'])) {
        return a22['fantasy-land/concat'](b15);
    }
    if (a22 != null && _isFunction(a22.concat)) {
        return a22.concat(b15);
    }
    throw new TypeError(toString2(a22) + ' does not have a method named "concat" or "fantasy-land/concat"');
});
_curry1(function cond(pairs) {
    var arity = reduce(max, 0, map1(function(pair) {
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
var curry = _curry1(function curry(fn31) {
    return curryN(fn31.length, fn31);
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
        return after.apply(context, _map(function(fn32) {
            return fn32.apply(context, args);
        }, fns));
    });
});
curry(function(pred, list) {
    return _reduce(function(a23, e14) {
        return pred(e14) ? a23 + 1 : a23;
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
var defaultTo = _curry2(function defaultTo(d4, v8) {
    return v8 == null || v8 !== v8 ? d4 : v8;
});
_curry3(function descend(fn33, a24, b16) {
    var aa = fn33(a24);
    var bb = fn33(b16);
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
    for(var i33 = 0; i33 < secondLen; i33 += 1){
        toFilterOut.add(second[i33]);
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
var remove1 = _curry3(function remove(start, count12, list) {
    var result = Array.prototype.slice.call(list, 0);
    result.splice(start, count12);
    return result;
});
function _dissoc(prop9, obj) {
    if (obj == null) {
        return obj;
    }
    if (__default2(prop9) && __default(obj)) {
        return remove1(prop9, 1, obj);
    }
    var result = {};
    for(var p13 in obj){
        result[p13] = obj[p13];
    }
    delete result[prop9];
    return result;
}
function _shallowCloneObject(prop10, obj) {
    if (__default2(prop10) && __default(obj)) {
        return [].concat(obj);
    }
    var result = {};
    for(var p14 in obj){
        result[p14] = obj[p14];
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
            var head2 = path4[0];
            var tail2 = Array.prototype.slice.call(path4, 1);
            if (obj[head2] == null) {
                return _shallowCloneObject(head2, obj);
            } else {
                return assoc(head2, dissocPath1(tail2, obj[head2]), obj);
            }
    }
});
_curry2(function dissoc(prop11, obj) {
    return dissocPath([
        prop11
    ], obj);
});
_curry2(function divide(a25, b17) {
    return a25 / b17;
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
var take1 = _curry2(_dispatchable([
    'take'
], _xtake, function take(n14, xs) {
    return slice(0, n14 < 0 ? Infinity : n14, xs);
}));
function dropLast(n15, xs) {
    return take1(n15 < xs.length ? xs.length - n15 : 0, xs);
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
    function XDropLastWhile1(fn34, xf) {
        this.f = fn34;
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
var _xdropLastWhile = _curry2(function _xdropLastWhile(fn35, xf) {
    return new XDropLastWhile(fn35, xf);
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
var last1 = nth(-1);
var dropRepeatsWith = _curry2(_dispatchable([], _xdropRepeatsWith, function dropRepeatsWith(pred, list) {
    var result = [];
    var idx = 1;
    var len = list.length;
    if (len !== 0) {
        result[0] = list[0];
        while(idx < len){
            if (!pred(last1(result), list[idx])) {
                result[result.length] = list[idx];
            }
            idx += 1;
        }
    }
    return result;
}));
_curry1(_dispatchable([], _xdropRepeatsWith(equals1), dropRepeatsWith(equals1)));
var XDropWhile = function() {
    function XDropWhile1(f132, xf) {
        this.xf = xf;
        this.f = f132;
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
var _xdropWhile = _curry2(function _xdropWhile(f133, xf) {
    return new XDropWhile(f133, xf);
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
var or1 = _curry2(function or(a26, b18) {
    return a26 || b18;
});
_curry2(function either(f134, g3) {
    return _isFunction(f134) ? function _either() {
        return f134.apply(this, arguments) || g3.apply(this, arguments);
    } : lift(or1)(f134, g3);
});
function _isTypedArray(val) {
    var type5 = Object.prototype.toString.call(val);
    return type5 === '[object Uint8ClampedArray]' || type5 === '[object Int8Array]' || type5 === '[object Uint8Array]' || type5 === '[object Int16Array]' || type5 === '[object Uint16Array]' || type5 === '[object Int32Array]' || type5 === '[object Uint32Array]' || type5 === '[object Float32Array]' || type5 === '[object Float64Array]' || type5 === '[object BigInt64Array]' || type5 === '[object BigUint64Array]';
}
var empty1 = _curry1(function empty(x50) {
    return x50 != null && typeof x50['fantasy-land/empty'] === 'function' ? x50['fantasy-land/empty']() : x50 != null && x50.constructor != null && typeof x50.constructor['fantasy-land/empty'] === 'function' ? x50.constructor['fantasy-land/empty']() : x50 != null && typeof x50.empty === 'function' ? x50.empty() : x50 != null && x50.constructor != null && typeof x50.constructor.empty === 'function' ? x50.constructor.empty() : __default(x50) ? [] : _isString(x50) ? '' : _isObject(x50) ? {} : _isArguments(x50) ? function() {
        return arguments;
    }() : _isTypedArray(x50) ? x50.constructor.from('') : void 0;
});
var takeLast = _curry2(function takeLast(n18, xs) {
    return drop(n18 >= 0 ? xs.length - n18 : 0, xs);
});
_curry2(function(suffix, list) {
    return equals1(takeLast(suffix.length, list), suffix);
});
_curry3(function eqBy(f135, x51, y7) {
    return equals1(f135(x51), f135(y7));
});
_curry3(function eqProps(prop12, obj1, obj2) {
    return equals1(obj1[prop12], obj2[prop12]);
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
    function XFind1(f136, xf) {
        this.xf = xf;
        this.f = f136;
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
var _xfind = _curry2(function _xfind(f137, xf) {
    return new XFind(f137, xf);
});
_curry2(_dispatchable([
    'find'
], _xfind, function find(fn36, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (fn36(list[idx])) {
            return list[idx];
        }
        idx += 1;
    }
}));
var XFindIndex = function() {
    function XFindIndex1(f138, xf) {
        this.xf = xf;
        this.f = f138;
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
var _xfindIndex = _curry2(function _xfindIndex(f139, xf) {
    return new XFindIndex(f139, xf);
});
_curry2(_dispatchable([], _xfindIndex, function findIndex(fn37, list) {
    var idx = 0;
    var len = list.length;
    while(idx < len){
        if (fn37(list[idx])) {
            return idx;
        }
        idx += 1;
    }
    return -1;
}));
var XFindLast = function() {
    function XFindLast1(f140, xf) {
        this.xf = xf;
        this.f = f140;
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
var _xfindLast = _curry2(function _xfindLast(f141, xf) {
    return new XFindLast(f141, xf);
});
_curry2(_dispatchable([], _xfindLast, function findLast(fn38, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        if (fn38(list[idx])) {
            return list[idx];
        }
        idx -= 1;
    }
}));
var XFindLastIndex = function() {
    function XFindLastIndex1(f142, xf) {
        this.xf = xf;
        this.f = f142;
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
var _xfindLastIndex = _curry2(function _xfindLastIndex(f143, xf) {
    return new XFindLastIndex(f143, xf);
});
_curry2(_dispatchable([], _xfindLastIndex, function findLastIndex(fn39, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        if (fn39(list[idx])) {
            return idx;
        }
        idx -= 1;
    }
    return -1;
}));
_curry1(_makeFlat(true));
var flip1 = _curry1(function flip(fn40) {
    return curryN(fn40.length, function(a27, b19) {
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = b19;
        args[1] = a27;
        return fn40.apply(this, args);
    });
});
_curry2(_checkForMethod('forEach', function forEach(fn41, list) {
    var len = list.length;
    var idx = 0;
    while(idx < len){
        fn41(list[idx]);
        idx += 1;
    }
    return list;
}));
_curry2(function forEachObjIndexed(fn42, obj) {
    var keyList = keys(obj);
    var idx = 0;
    while(idx < keyList.length){
        var key = keyList[idx];
        fn42(obj[key], key, obj);
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
_curry2(function(fn43, list) {
    var res = [];
    var idx = 0;
    var len = list.length;
    while(idx < len){
        var nextidx = idx + 1;
        while(nextidx < len && fn43(list[nextidx - 1], list[nextidx])){
            nextidx += 1;
        }
        res.push(list.slice(idx, nextidx));
        idx = nextidx;
    }
    return res;
});
_curry2(function gt(a28, b20) {
    return a28 > b20;
});
_curry2(function gte(a29, b21) {
    return a29 >= b21;
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
    return _filter(function(x52) {
        return _includesWith(pred, x52, ys);
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
    function XUniqBy1(f144, xf) {
        this.xf = xf;
        this.f = f144;
        this.set = new _Set();
    }
    XUniqBy1.prototype['@@transducer/init'] = __default1.init;
    XUniqBy1.prototype['@@transducer/result'] = __default1.result;
    XUniqBy1.prototype['@@transducer/step'] = function(result, input) {
        return this.set.add(this.f(input)) ? this.xf['@@transducer/step'](result, input) : result;
    };
    return XUniqBy1;
}();
var _xuniqBy = _curry2(function _xuniqBy(f145, xf) {
    return new XUniqBy(f145, xf);
});
var uniqBy = _curry2(_dispatchable([], _xuniqBy, function(fn44, list) {
    var set4 = new _Set();
    var result = [];
    var idx = 0;
    var appliedItem, item;
    while(idx < list.length){
        item = list[idx];
        appliedItem = fn44(item);
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
    return uniq(_filter(flip1(_includes)(lookupList), filteredList));
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
    '@@transducer/step': function(xs, x53) {
        xs.push(x53);
        return xs;
    },
    '@@transducer/result': _identity
};
var _stepCatString = {
    '@@transducer/init': String,
    '@@transducer/step': function(a30, b22) {
        return a30 + b22;
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
        throw new TypeError(toString2(target) + ' does not have a method named "' + method + '"');
    });
});
var is = _curry2(function is(Ctor, val) {
    return val instanceof Ctor || val != null && (val.constructor === Ctor || Ctor.name === 'Object' && typeof val === 'object');
});
_curry1(function isEmpty(x54) {
    return x54 != null && equals1(x54, empty1(x54));
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
            if (equals1(xs[idx], target)) {
                return idx;
            }
            idx -= 1;
        }
        return -1;
    }
});
function _isNumber(x55) {
    return Object.prototype.toString.call(x55) === '[object Number]';
}
var length = _curry1(function length(list) {
    return list != null && _isNumber(list.length) ? list.length : NaN;
});
var lens = _curry2(function lens(getter, setter) {
    return function(toFunctorFn) {
        return function(target) {
            return map1(function(focus) {
                return setter(focus, target);
            }, toFunctorFn(getter(target)));
        };
    };
});
var update = _curry3(function update(idx, x56, list) {
    return adjust(idx, always1(x56), list);
});
_curry1(function lensIndex(n19) {
    return lens(nth(n19), update(n19));
});
var paths = _curry2(function paths1(pathsArray, obj) {
    return pathsArray.map(function(paths2) {
        var val = obj;
        var idx = 0;
        var p15;
        while(idx < paths2.length){
            if (val == null) {
                return;
            }
            p15 = paths2[idx];
            val = __default2(p15) ? nth(p15, val) : val[p15];
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
_curry1(function lensPath(p16) {
    return lens(path(p16), assocPath(p16));
});
_curry1(function lensProp(k4) {
    return lens(prop(k4), assoc(k4));
});
_curry2(function lt(a31, b23) {
    return a31 < b23;
});
_curry2(function lte(a32, b24) {
    return a32 <= b24;
});
_curry3(function mapAccum(fn45, acc, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    var tuple = [
        acc
    ];
    while(idx < len){
        tuple = fn45(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx += 1;
    }
    return [
        tuple[0],
        result
    ];
});
_curry3(function mapAccumRight(fn46, acc, list) {
    var idx = list.length - 1;
    var result = [];
    var tuple = [
        acc
    ];
    while(idx >= 0){
        tuple = fn46(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx -= 1;
    }
    return [
        tuple[0],
        result
    ];
});
_curry2(function mapObjIndexed(fn47, obj) {
    return _reduce(function(acc, key) {
        acc[key] = fn47(obj[key], key, obj);
        return acc;
    }, {}, keys(obj));
});
_curry2(function match(rx, str) {
    return str.match(rx) || [];
});
_curry2(function mathMod(m1, p17) {
    if (!__default2(m1)) {
        return NaN;
    }
    if (!__default2(p17) || p17 < 1) {
        return NaN;
    }
    return (m1 % p17 + p17) % p17;
});
_curry3(function maxBy(f146, a33, b25) {
    return f146(b25) > f146(a33) ? b25 : a33;
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
    return mean(Array.prototype.slice.call(list, 0).sort(function(a34, b26) {
        return a34 < b26 ? -1 : a34 > b26 ? 1 : 0;
    }).slice(idx, idx + width));
});
_curry2(function memoizeWith(mFn, fn48) {
    var cache = {};
    return _arity(fn48.length, function() {
        var key = mFn.apply(this, arguments);
        if (!_has(key, cache)) {
            cache[key] = fn48.apply(this, arguments);
        }
        return cache[key];
    });
});
_curry1(function mergeAll(list) {
    return __default4.apply(null, [
        {}
    ].concat(list));
});
var mergeWithKey = _curry3(function mergeWithKey(fn49, l2, r2) {
    var result = {};
    var k5;
    for(k5 in l2){
        if (_has(k5, l2)) {
            result[k5] = _has(k5, r2) ? fn49(k5, l2[k5], r2[k5]) : l2[k5];
        }
    }
    for(k5 in r2){
        if (_has(k5, r2) && !_has(k5, result)) {
            result[k5] = r2[k5];
        }
    }
    return result;
});
var mergeDeepWithKey = _curry3(function mergeDeepWithKey1(fn50, lObj, rObj) {
    return mergeWithKey(function(k6, lVal, rVal) {
        if (_isObject(lVal) && _isObject(rVal)) {
            return mergeDeepWithKey1(fn50, lVal, rVal);
        } else {
            return fn50(k6, lVal, rVal);
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
_curry3(function mergeDeepWith(fn51, lObj, rObj) {
    return mergeDeepWithKey(function(k, lVal, rVal) {
        return fn51(lVal, rVal);
    }, lObj, rObj);
});
_curry2(function mergeLeft(l3, r3) {
    return __default4({}, r3, l3);
});
_curry2(function mergeRight(l4, r4) {
    return __default4({}, l4, r4);
});
_curry3(function mergeWith(fn52, l5, r5) {
    return mergeWithKey(function(_, _l, _r) {
        return fn52(_l, _r);
    }, l5, r5);
});
_curry2(function min(a35, b27) {
    return b27 < a35 ? b27 : a35;
});
_curry3(function minBy(f147, a36, b28) {
    return f147(b28) < f147(a36) ? b28 : a36;
});
function _modify(prop16, fn53, obj) {
    if (__default2(prop16) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop16] = fn53(arr[prop16]);
        return arr;
    }
    var result = {};
    for(var p18 in obj){
        result[p18] = obj[p18];
    }
    result[prop16] = fn53(result[prop16]);
    return result;
}
var modifyPath = _curry3(function modifyPath1(path5, fn54, object) {
    if (!_isObject(object) && !__default(object) || path5.length === 0) {
        return object;
    }
    var idx = path5[0];
    if (!_has(idx, object)) {
        return object;
    }
    if (path5.length === 1) {
        return _modify(idx, fn54, object);
    }
    var val = modifyPath1(Array.prototype.slice.call(path5, 1), fn54, object[idx]);
    if (val === object[idx]) {
        return object;
    }
    return _assoc(idx, val, object);
});
_curry3(function modify(prop17, fn55, object) {
    return modifyPath([
        prop17
    ], fn55, object);
});
_curry2(function modulo(a37, b29) {
    return a37 % b29;
});
_curry3(function(from, to, list) {
    var length6 = list.length;
    var result = list.slice();
    var positiveFrom = from < 0 ? length6 + from : from;
    var positiveTo = to < 0 ? length6 + to : to;
    var item = result.splice(positiveFrom, 1);
    return positiveFrom < 0 || positiveFrom >= list.length || positiveTo < 0 || positiveTo >= list.length ? list : [].concat(result.slice(0, positiveTo)).concat(item).concat(result.slice(positiveTo, list.length));
});
var multiply = _curry2(function multiply(a38, b30) {
    return a38 * b30;
});
_curry2((f148, o2)=>(props)=>f148.call(this, mergeDeepRight(o2, props))
);
_curry1(function negate(n20) {
    return -n20;
});
_curry2(function none(fn56, input) {
    return all1(_complement(fn56), input);
});
_curry1(function nthArg(n21) {
    var arity = n21 < 0 ? 1 : n21 + 1;
    return curryN(arity, function() {
        return nth(n21, arguments);
    });
});
_curry3(function o(f149, g4, x57) {
    return f149(g4(x57));
});
function _of(x58) {
    return [
        x58
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
_curryN(4, [], function on(f150, g5, a39, b31) {
    return f150(g5(a39), g5(b31));
});
_curry1(function once(fn57) {
    var called = false;
    var result;
    return _arity(fn57.length, function() {
        if (called) {
            return result;
        }
        called = true;
        result = fn57.apply(this, arguments);
        return result;
    });
});
function _assertPromise(name, p19) {
    if (p19 == null || !_isFunction(p19.then)) {
        throw new TypeError('`' + name + '` expected a Promise, received ' + _toString(p19, []));
    }
}
_curry2(function otherwise(f151, p20) {
    _assertPromise('otherwise', p20);
    return p20.then(null, f151);
});
var Identity = function(x59) {
    return {
        value: x59,
        map: function(f152) {
            return Identity(f152(x59));
        }
    };
};
var over = _curry3(function over(lens1, f153, x60) {
    return lens1(function(y8) {
        return Identity(f153(y8));
    })(x60).value;
});
_curry2(function pair(fst, snd) {
    return [
        fst,
        snd
    ];
});
function _createPartialApplicator(concat1) {
    return _curry2(function(fn58, args) {
        return _arity(Math.max(0, fn58.length - args.length), function() {
            return fn58.apply(this, concat1(args, arguments));
        });
    });
}
_createPartialApplicator(_concat);
_createPartialApplicator(flip1(_concat));
juxt([
    filter1,
    reject
]);
_curry3(function pathEq(_path, val, obj) {
    return equals1(path(_path, obj), val);
});
_curry3(function pathOr(d5, p21, obj) {
    return defaultTo(d5, path(p21, obj));
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
var useWith = _curry2(function useWith(fn59, transformers) {
    return curryN(transformers.length, function() {
        var args = [];
        var idx = 0;
        while(idx < transformers.length){
            args.push(transformers[idx].call(this, arguments[idx]));
            idx += 1;
        }
        return fn59.apply(this, args.concat(Array.prototype.slice.call(arguments, transformers.length)));
    });
});
useWith(_map, [
    pickAll,
    identity
]);
function _promap(f154, g6, profunctor) {
    return function(x61) {
        return g6(profunctor(f154(x61)));
    };
}
var XPromap = function() {
    function XPromap1(f155, g7, xf) {
        this.xf = xf;
        this.f = f155;
        this.g = g7;
    }
    XPromap1.prototype['@@transducer/init'] = __default1.init;
    XPromap1.prototype['@@transducer/result'] = __default1.result;
    XPromap1.prototype['@@transducer/step'] = function(result, input) {
        return this.xf['@@transducer/step'](result, _promap(this.f, this.g, input));
    };
    return XPromap1;
}();
var _xpromap = _curry3(function _xpromap(f156, g8, xf) {
    return new XPromap(f156, g8, xf);
});
_curry3(_dispatchable([
    'fantasy-land/promap',
    'promap'
], _xpromap, _promap));
_curry3(function propEq(name, val, obj) {
    return equals1(val, prop(name, obj));
});
_curry3(function propIs(type7, name, obj) {
    return is(type7, prop(name, obj));
});
_curry3(function propOr(val, p22, obj) {
    return defaultTo(val, prop(p22, obj));
});
_curry3(function propSatisfies(pred, name, obj) {
    return pred(prop(name, obj));
});
_curry2(function props(ps, obj) {
    return ps.map(function(p23) {
        return path([
            p23
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
var reduceRight = _curry3(function reduceRight(fn60, acc, list) {
    var idx = list.length - 1;
    while(idx >= 0){
        acc = fn60(list[idx], acc);
        if (acc && acc['@@transducer/reduced']) {
            acc = acc['@@transducer/value'];
            break;
        }
        idx -= 1;
    }
    return acc;
});
_curryN(4, [], function _reduceWhile(pred, fn61, a40, list) {
    return _reduce(function(acc, x62) {
        return pred(acc, x62) ? fn61(acc, x62) : _reduced(acc);
    }, a40, list);
});
_curry1(_reduced);
var times = _curry2(function times(fn62, n23) {
    var len = Number(n23);
    var idx = 0;
    var list;
    if (len < 0 || isNaN(len)) {
        throw new RangeError('n must be a non-negative number');
    }
    list = new Array(len);
    while(idx < len){
        list[idx] = fn62(idx);
        idx += 1;
    }
    return list;
});
_curry2(function repeat(value, n24) {
    return times(always1(value), n24);
});
_curry3(function replace(regex, replacement, str) {
    return str.replace(regex, replacement);
});
_curry3(function scan(fn63, acc, list) {
    var idx = 0;
    var len = list.length;
    var result = [
        acc
    ];
    while(idx < len){
        acc = fn63(acc, list[idx]);
        result[idx + 1] = acc;
        idx += 1;
    }
    return result;
});
var sequence = _curry2(function sequence(of, traversable) {
    return typeof traversable.sequence === 'function' ? traversable.sequence(of) : reduceRight(function(x63, acc) {
        return ap(map1(prepend, x63), acc);
    }, of([]), traversable);
});
_curry3(function set(lens2, v9, x64) {
    return over(lens2, always1(v9), x64);
});
_curry2(function sort(comparator, list) {
    return Array.prototype.slice.call(list, 0).sort(comparator);
});
_curry2(function sortBy(fn64, list) {
    return Array.prototype.slice.call(list, 0).sort(function(a41, b32) {
        var aa = fn64(a41);
        var bb = fn64(b32);
        return aa < bb ? -1 : aa > bb ? 1 : 0;
    });
});
_curry2(function sortWith(fns, list) {
    return Array.prototype.slice.call(list, 0).sort(function(a42, b33) {
        var result = 0;
        var i34 = 0;
        while(result === 0 && i34 < fns.length){
            result = fns[i34](a42, b33);
            i34 += 1;
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
    for(var i35 = 0; i35 < list.length; i35 = i35 + 1){
        if (!pred(list[i35])) {
            curr.push(list[i35]);
        }
        if ((i35 < list.length - 1 && pred(list[i35 + 1]) || i35 === list.length - 1) && curr.length > 0) {
            acc.push(curr);
            curr = [];
        }
    }
    return acc;
});
_curry2(function(prefix, list) {
    return equals1(take1(prefix.length, list), prefix);
});
_curry2(function subtract(a43, b34) {
    return Number(a43) - Number(b34);
});
_curry2(function symmetricDifference(list1, list2) {
    return concat(difference(list1, list2), difference(list2, list1));
});
_curry3(function symmetricDifferenceWith(pred, list1, list2) {
    return concat(differenceWith(pred, list1, list2), differenceWith(pred, list2, list1));
});
_curry2(function takeLastWhile(fn65, xs) {
    var idx = xs.length - 1;
    while(idx >= 0 && fn65(xs[idx])){
        idx -= 1;
    }
    return slice(idx + 1, Infinity, xs);
});
var XTakeWhile = function() {
    function XTakeWhile1(f157, xf) {
        this.xf = xf;
        this.f = f157;
    }
    XTakeWhile1.prototype['@@transducer/init'] = __default1.init;
    XTakeWhile1.prototype['@@transducer/result'] = __default1.result;
    XTakeWhile1.prototype['@@transducer/step'] = function(result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : _reduced(result);
    };
    return XTakeWhile1;
}();
var _xtakeWhile = _curry2(function _xtakeWhile(f158, xf) {
    return new XTakeWhile(f158, xf);
});
_curry2(_dispatchable([
    'takeWhile'
], _xtakeWhile, function takeWhile(fn66, xs) {
    var idx = 0;
    var len = xs.length;
    while(idx < len && fn66(xs[idx])){
        idx += 1;
    }
    return slice(0, idx, xs);
}));
var XTap = function() {
    function XTap1(f159, xf) {
        this.xf = xf;
        this.f = f159;
    }
    XTap1.prototype['@@transducer/init'] = __default1.init;
    XTap1.prototype['@@transducer/result'] = __default1.result;
    XTap1.prototype['@@transducer/step'] = function(result, input) {
        this.f(input);
        return this.xf['@@transducer/step'](result, input);
    };
    return XTap1;
}();
var _xtap = _curry2(function _xtap(f160, xf) {
    return new XTap(f160, xf);
});
_curry2(_dispatchable([], _xtap, function tap(fn67, x65) {
    fn67(x65);
    return x65;
}));
function _isRegExp(x66) {
    return Object.prototype.toString.call(x66) === '[object RegExp]';
}
_curry2(function test(pattern, str) {
    if (!_isRegExp(pattern)) {
        throw new TypeError('‘test’ requires a value of type RegExp as its first argument; received ' + toString2(pattern));
    }
    return _cloneRegExp(pattern).test(str);
});
_curry2(function andThen(f161, p24) {
    _assertPromise('andThen', p24);
    return p24.then(f161);
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
curryN(4, function transduce(xf, fn68, acc, list) {
    return _reduce(xf(typeof fn68 === 'function' ? _xwrap(fn68) : fn68), acc, list);
});
_curry1(function transpose(outerlist) {
    var i36 = 0;
    var result = [];
    while(i36 < outerlist.length){
        var innerlist = outerlist[i36];
        var j4 = 0;
        while(j4 < innerlist.length){
            if (typeof result[j4] === 'undefined') {
                result[j4] = [];
            }
            result[j4].push(innerlist[j4]);
            j4 += 1;
        }
        i36 += 1;
    }
    return result;
});
_curry3(function traverse(of, f162, traversable) {
    return typeof traversable['fantasy-land/traverse'] === 'function' ? traversable['fantasy-land/traverse'](f162, of) : typeof traversable.traverse === 'function' ? traversable.traverse(f162, of) : sequence(of, map1(f162, traversable));
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
        } catch (e15) {
            return catcher.apply(this, _concat([
                e15
            ], arguments));
        }
    });
});
_curry1(function unapply(fn69) {
    return function() {
        return fn69(Array.prototype.slice.call(arguments, 0));
    };
});
_curry1(function unary(fn70) {
    return nAry(1, fn70);
});
_curry2(function uncurryN(depth, fn71) {
    return curryN(depth, function() {
        var currentDepth = 1;
        var value = fn71;
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
_curry2(function unfold(fn72, seed) {
    var pair = fn72(seed);
    var result = [];
    while(pair && pair.length){
        result[result.length] = pair[0];
        pair = fn72(pair[1]);
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
_curry3(function unless(pred, whenFalseFn, x67) {
    return pred(x67) ? x67 : whenFalseFn(x67);
});
chain(_identity);
_curry3(function until(pred, fn73, init) {
    var val = init;
    while(!pred(val)){
        val = fn73(val);
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
var Const = function(x68) {
    return {
        value: x68,
        'fantasy-land/map': function() {
            return this;
        }
    };
};
_curry2(function view(lens3, x69) {
    return lens3(Const)(x69).value;
});
_curry3(function when(pred, whenTrueFn, x70) {
    return pred(x70) ? whenTrueFn(x70) : x70;
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
    return where(map1(equals1, spec), testObj);
});
_curry2(function(xs, list) {
    return reject(flip1(_includes)(xs), list);
});
_curry2(function xor(a44, b35) {
    return Boolean(!a44 ^ !b35);
});
_curry2(function xprod(a45, b36) {
    var idx = 0;
    var ilen = a45.length;
    var j5;
    var jlen = b36.length;
    var result = [];
    while(idx < ilen){
        j5 = 0;
        while(j5 < jlen){
            result[result.length] = [
                a45[idx],
                b36[j5]
            ];
            j5 += 1;
        }
        idx += 1;
    }
    return result;
});
_curry2(function zip(a46, b37) {
    var rv = [];
    var idx = 0;
    var len = Math.min(a46.length, b37.length);
    while(idx < len){
        rv[idx] = [
            a46[idx],
            b37[idx]
        ];
        idx += 1;
    }
    return rv;
});
_curry2(function zipObj(keys2, values9) {
    var idx = 0;
    var len = Math.min(keys2.length, values9.length);
    var out = {};
    while(idx < len){
        out[keys2[idx]] = values9[idx];
        idx += 1;
    }
    return out;
});
_curry3(function zipWith(fn74, a47, b38) {
    var rv = [];
    var idx = 0;
    var len = Math.min(a47.length, b38.length);
    while(idx < len){
        rv[idx] = fn74(a47[idx], b38[idx]);
        idx += 1;
    }
    return rv;
});
_curry1(function thunkify(fn75) {
    return curryN(fn75.length, function createThunk() {
        var fnArgs = arguments;
        return function invokeThunk() {
            return fn75.apply(this, fnArgs);
        };
    });
});
const isFunction1 = (item)=>typeof item === 'function'
;
complement(isNil);
const random = (from, to = 0)=>{
    const min = Math.min(from, to);
    const max2 = Math.max(from, to);
    return Math.random() * (max2 - min) + min;
};
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
function _1() {
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
            A: r22 ? r22.A : _1(),
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
    return (t13 ? t13.A : _1()).p.push(e11), e11;
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
                A: r33 ? r33.A : _1(),
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
                A: r51 ? r51.A : _1(),
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
                A: r59 ? r59.A : _1(),
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
            internalState = isFunction1(handler) ? handler(internalState) : handler;
        }
        return internalState;
    };
};
let activeContext = null;
const renderContext = (method)=>{
    activeContext = [];
    method();
    let response = activeContext;
    activeContext = null;
    return response;
};
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
const beginPath = c1(e.beginPath);
c1(e.bezierCurveTo);
const clearRect = c1(e.clearRect);
c1(e.clip);
const closePath = c1(e.closePath);
c1(e.createConicGradient);
c1(e.createImageData);
c1(e.createLinearGradient);
c1(e.createPattern);
c1(e.createRadialGradient);
c1(e.drawFocusIfNeeded);
const drawImage = c1(e.drawImage);
c1(e.ellipse);
const fill = c1(e.fill);
c1(e.fillRect);
const fillText = c1(e.fillText);
c1(e.getContextAttributes);
c1(e.getImageData);
c1(e.getLineDash);
c1(e.getTransform);
c1(e.isContextLost);
c1(e.isPointInPath);
c1(e.isPointInStroke);
const lineTo = c1(e.lineTo);
c1(e.measureText);
const moveTo = c1(e.moveTo);
c1(e.putImageData);
c1(e.quadraticCurveTo);
const rect = c1(e.rect);
c1(e.reset);
c1(e.resetTransform);
const restore = c1(e.restore);
c1(e.rotate);
c1(e.roundRect);
const save = c1(e.save);
c1(e.scale);
c1(e.setLineDash);
c1(e.setTransform);
const stroke = c1(e.stroke);
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
const fillStyle = c1(e.fillStyle);
c1(e.filter);
const font = c1(e.font);
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
const lineWidth = c1(e.lineWidth);
c1(e.miterLimit);
c1(e.shadowBlur);
c1(e.shadowColor);
c1(e.shadowOffsetX);
c1(e.shadowOffsetY);
const strokeStyle = c1(e.strokeStyle);
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
const $$initiate = CBTracker('$$initiate2');
const inputs = CBTracker('inputs2');
const preframe = CBTracker('preframe2');
const physics = CBTracker('physics2');
const update1 = CBTracker('update2');
const removal = CBTracker('removal2');
const prerender = CBTracker('prerender');
const render = CBTracker('render');
const __final = CBTracker('final');
const timeMS = State(0);
const timeDiffMS = State(0);
const timeS = State(0);
const timeDiffS = State(0);
const fps = State(0);
const calculateFpsFromDiff = (timeDiff)=>Math.round(1 / timeDiff)
;
const attachTimes = (animateTimeMs)=>{
    const lastTimeMs = timeMS();
    const diffTimeMs = animateTimeMs - lastTimeMs;
    timeMS(animateTimeMs);
    timeDiffMS(diffTimeMs);
    timeS(animateTimeMs / 1000);
    timeDiffS(diffTimeMs / 1000);
    fps(calculateFpsFromDiff(timeDiffS()));
};
const frame = (method)=>{
    return requestAnimationFrame(method);
};
new WeakSet();
function activate(canvasWorker1) {
    async function animate(t3) {
        attachTimes(t3);
        const stateMethods = [
            ...$$initiate,
            ...inputs,
            ...preframe,
            ...physics,
            ...update1
        ];
        const endMethods = [
            ...removal,
            ...__final
        ];
        stateMethods.forEach((callback)=>callback()
        );
        const renderContext2 = renderContext(()=>{
            const prerenderSorted = [
                ...prerender
            ].map((item)=>isFunction1(item) ? [
                    0,
                    item
                ] : item
            ).sort((a48, b39)=>a48[0] - b39[0]
            );
            const renderSorted = [
                ...render
            ].map((item)=>isFunction1(item) ? [
                    0,
                    item
                ] : item
            ).sort((a49, b40)=>a49[0] - b40[0]
            );
            [
                ...prerenderSorted,
                ...renderSorted
            ].forEach(([, callback])=>callback()
            );
        });
        endMethods.forEach((callback)=>callback()
        );
        await canvasWorker1.newRenderer2(renderContext2);
        frame(animate);
    }
    frame(animate);
}
const ComponentNameSymbol = Symbol('ECS_Component_Name');
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
const createComponent = (name, def)=>({
        [ComponentNameSymbol]: name,
        ...def
    })
;
const Counter = ()=>{
    let number = 0;
    return ()=>number++
    ;
};
const EntityList = ()=>{
    const entityIdCounter = Counter();
    const entities = new Map();
    const componentEntityMapping = new Map();
    const addEntity1 = (components)=>{
        const id5 = entityIdCounter();
        const entity = {
            id: id5,
            components: {}
        };
        const defaultComponents = [
            createComponent('EntityId', {
                id: id5
            })
        ];
        entities.set(entity.id, entity);
        for (const component of [
            ...components,
            ...defaultComponents
        ]){
            addComponentToEntity1(id5, component);
        }
        return entity;
    };
    const addComponentToEntity1 = (entityId, component)=>{
        const componentName = component[ComponentNameSymbol];
        const componentMapping = componentEntityMapping.get(componentName) || [];
        const entity = entities.get(entityId);
        if (!entity) return;
        entity.components[componentName] = ComponentStateManager(component);
        componentEntityMapping.set(componentName, [
            ...componentMapping,
            entityId
        ]);
    };
    function removeEntity1(id6) {
        const entity = entities.get(id6);
        if (!entity) return;
        const { components  } = entity;
        entities.delete(id6);
        for (const componentName of Object.keys(components)){
            const idmappings = (componentEntityMapping.get(componentName) || []).filter((i37)=>i37 !== id6
            );
            componentEntityMapping.set(componentName, idmappings);
        }
    }
    function count1(componentFilter) {
        const componentMapping = [];
        for (const componentName of componentFilter){
            const component = componentEntityMapping.get(componentName) || [];
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
        for (const componentName of componentFilter){
            const component = componentEntityMapping.get(componentName) || [];
            if (!component || component.length === 0) {
                return;
            }
            componentMapping.push(component);
        }
        componentMapping = componentMapping.sort((a50, b41)=>a50.length - b41.length
        );
        const entityIds = intersectionBetweenOrderedIntegerLists(componentMapping);
        for (const entityId of entityIds){
            const entity = entities.get(entityId);
            if (!entity) {
                continue;
            }
            const components = {};
            for (const componentName of componentFilter){
                components[componentName] = entity.components[componentName];
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
const addEntity = globalEntityList.addEntity;
const removeEntity = globalEntityList.removeEntity;
globalEntityList.addComponentToEntity;
const count = globalEntityList.count;
const query = globalEntityList.query;
const intersectionBetweenOrderedIntegerLists = (intLists)=>{
    let last3 = intLists[0];
    for(let i38 = 1; i38 < intLists.length; i38++){
        const current = intLists[i38];
        const matches = [];
        const lastLength = last3.length;
        const currentLength = current.length;
        let currentIndexStartingPoint = 0;
        for(let lastIndex = 0; lastIndex < lastLength; lastIndex++){
            const lastId = last3[lastIndex];
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
        last3 = matches;
    }
    return last3;
};
removal.add(()=>{
    for (let { DeleteQueueManager , EntityId  } of query([
        'DeleteQueueManager',
        'EntityId'
    ])){
        const { markedForDeletion  } = DeleteQueueManager();
        if (markedForDeletion) {
            removeEntity(EntityId().id);
        }
    }
});
const createHitBoxComponent = (label, [x71, y9], [width, height])=>{
    return createComponent('Hitbox', {
        label,
        x: x71,
        y: y9,
        x2: x71 + width,
        y2: y9 + height,
        width,
        height,
        entityInteractions: []
    });
};
const updateHitboxTransform = (Hitbox, [x72, y10], [width, height])=>{
    Hitbox({
        x: x72,
        y: y10,
        x2: x72 + width,
        y2: y10 + height,
        width,
        height
    });
};
const isLine = (hitbox)=>hitbox.x === hitbox.x2 || hitbox.y === hitbox.y2
;
const hittest = (hitboxA, hitboxB)=>{
    if (isLine(hitboxA) || isLine(hitboxB)) return false;
    if (hitboxB.x >= hitboxA.x2) return false;
    if (hitboxA.x >= hitboxB.x2) return false;
    if (hitboxB.y >= hitboxA.y2) return false;
    if (hitboxA.y >= hitboxB.y2) return false;
    return true;
};
const checkHitboxes = ()=>{
    const ht = [
        ...query([
            'EntityId',
            'Hitbox'
        ])
    ];
    for(let i39 = 0; i39 < ht.length; i39++){
        const a51 = ht[i39];
        for(let j6 = i39 + 1; j6 < ht.length; j6++){
            const b42 = ht[j6];
            const aHitbox = a51.Hitbox();
            const bHitbox = b42.Hitbox();
            if (hittest(aHitbox, bHitbox)) {
                const aid = a51.EntityId().id;
                const bid = b42.EntityId().id;
                a51.Hitbox({
                    entityInteractions: [
                        ...aHitbox.entityInteractions,
                        bid
                    ]
                });
                b42.Hitbox({
                    entityInteractions: [
                        ...bHitbox.entityInteractions,
                        aid
                    ]
                });
            }
        }
    }
};
const clearHitboxInteractions = ()=>{
    for (let { Hitbox  } of query([
        'Hitbox'
    ])){
        Hitbox({
            entityInteractions: []
        });
    }
};
removal.add(clearHitboxInteractions);
physics.add(checkHitboxes);
function* it() {
    yield this.x;
    yield this.y;
}
const v1 = (x73, y11)=>{
    return {
        x: x73,
        y: y11,
        [0]: x73,
        [1]: x73,
        [Symbol.iterator]: it
    };
};
const zero = ()=>v1(0, 0)
;
const add1 = curry(([x1, y1], [x2, y2])=>{
    return v1(x1 + x2, y1 + y2);
});
const up = (value)=>v1(0, value * -1)
;
const down = (value)=>v1(0, value)
;
const left = (value)=>v1(value * -1, 0)
;
const right = (value)=>v1(value, 0)
;
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
prerender.add(()=>{
    const { width , height  } = Canvas();
    clearRect(...zero(), width, height);
});
const trackedKeys = State({});
const frameSnapshotKeys = State({});
const removeAllDownKeys = ()=>{
    trackedKeys({});
};
const setKeyDown = (code)=>{
    trackedKeys((keys3)=>({
            ...keys3,
            [code]: true
        })
    );
};
const setKeyUp = (code)=>{
    trackedKeys(({ [code]: _ , ...rest })=>rest
    );
};
inputs.add(()=>{
    frameSnapshotKeys(trackedKeys());
});
windowKeyDownListener.onValue(({ code  })=>{
    setKeyDown(code);
});
windowKeyUpListener.onValue(({ code  })=>{
    setKeyUp(code);
});
windowBlurListener.onValue(()=>{
    removeAllDownKeys();
});
const isKeyDown = (keyString)=>Boolean(frameSnapshotKeys()[keyString])
;
const resources = {
    USER_IMAGE: 'https://kybernetik.com.au/animancer/docs/manual/tools/modify-sprites/mage-sprite-big.png'
};
new Map();
$$initiate.once(()=>{
    addEntity([
        createComponent('User', {
            speed: 400
        }),
        createComponent('Position', zero()),
        createComponent('Size', v1(50, 50)), 
    ]);
});
const calculateSpeedForFrame = (speed)=>speed * timeDiffS()
;
update1.add(()=>{
    for (let { User , Position , Size  } of query([
        'User',
        'Position',
        'Size'
    ])){
        if (isKeyDown('KeyW')) {
            Position(add1(Position(), up(calculateSpeedForFrame(User().speed))));
        }
        if (isKeyDown('KeyS')) {
            Position(add1(Position(), down(calculateSpeedForFrame(User().speed))));
        }
        if (isKeyDown('KeyA')) {
            Position(add1(Position(), left(calculateSpeedForFrame(User().speed))));
        }
        if (isKeyDown('KeyD')) {
            Position(add1(Position(), right(calculateSpeedForFrame(User().speed))));
        }
        const canvas = Canvas();
        const [width, height] = Size();
        const [x74, y12] = Position();
        Position(v1(Math.max(0, Math.min(x74, canvas.width - width)), Math.max(0, Math.min(y12, canvas.height - height))));
    }
});
render.add(()=>{
    for (let { Position , Size  } of query([
        'Position',
        'User',
        'Size'
    ])){
        save();
        drawImage(resources.USER_IMAGE, ...Position());
        restore();
    }
});
$$initiate.once(()=>{
    addEntity([
        createComponent('EnemyManager', {
            lastSpawnTime: 0
        }), 
    ]);
});
const createEnemy = (posX)=>{
    const startingPosition = v1(1800, posX);
    const startingSize = v1(100, 50);
    addEntity([
        createComponent('Enemy', {
            speed: 350,
            health: 100,
            originalHealth: 100
        }),
        createComponent('Position', startingPosition),
        createComponent('Size', startingSize),
        createComponent('DeleteQueueManager', {
            markedForDeletion: false
        }),
        createHitBoxComponent('Enemy', startingPosition, startingSize), 
    ]);
};
const moveEnemies = ()=>{
    for (const { Enemy , Position , Size , Hitbox  } of query([
        'Enemy',
        'Position',
        'Size',
        'Hitbox'
    ])){
        Position(add1(Position(), left(Enemy().speed * timeDiffS())));
        updateHitboxTransform(Hitbox, Position(), Size());
    }
};
const enemyRemover = ()=>{
    for (const { Position , DeleteQueueManager  } of query([
        'Position',
        'DeleteQueueManager'
    ])){
        if (Position().x < 100) {
            DeleteQueueManager({
                markedForDeletion: true
            });
        }
    }
};
const spawnEnemies = ()=>{
    for (let { EnemyManager  } of query([
        'EnemyManager'
    ])){
        const { lastSpawnTime  } = EnemyManager();
        if (timeMS() - lastSpawnTime < 1000) continue;
        EnemyManager({
            lastSpawnTime: timeMS()
        });
        createEnemy(random(100, 900));
    }
};
const damageEnemy = (entityId, amount)=>{
    for (let { Enemy , DeleteQueueManager  } of query([
        'Enemy',
        'DeleteQueueManager'
    ], [
        entityId
    ])){
        Enemy({
            health: Math.max(0, Enemy().health - amount)
        });
        if (Enemy().health === 0) {
            DeleteQueueManager({
                markedForDeletion: true
            });
        }
    }
};
update1.add(spawnEnemies, moveEnemies, enemyRemover);
render.add(()=>{
    for (const { Enemy , Position , Size  } of query([
        'Enemy',
        'Position',
        'Size'
    ])){
        const { health , originalHealth  } = Enemy();
        const healthPercentage = health / originalHealth;
        const pos = Position();
        const size = Size();
        save();
        beginPath();
        fillStyle('red');
        rect(...add1(pos, up(50)), ...v1(size.x, 20));
        fill();
        restore();
        save();
        beginPath();
        fillStyle('green');
        rect(...add1(pos, up(50)), ...v1(size.x * healthPercentage, 20));
        fill();
        restore();
        save();
        beginPath();
        fillStyle(false ? 'blue' : 'green');
        rect(...pos, ...size);
        fill();
        restore();
    }
});
$$initiate.once(()=>{
    addEntity([
        createComponent('UserBulletManager', {
            lastBulletFiredTime: 0
        }), 
    ]);
});
const createBullet = (pos)=>{
    const size = v1(10, 10);
    addEntity([
        createComponent('UserBullet', {
            speed: 700,
            status: 'ACTIVE'
        }),
        createComponent('Position', pos),
        createComponent('Size', size),
        createComponent('DeleteQueueManager', {
            markedForDeletion: false
        }),
        createHitBoxComponent('UserBullet', pos, size), 
    ]);
};
const calculateBulletSpeedForFrame = (speed)=>speed * timeDiffS()
;
const spawnBullet = ()=>{
    for (let { UserBulletManager  } of query([
        'UserBulletManager'
    ])){
        if (!isKeyDown('Space')) return;
        if (timeMS() - UserBulletManager().lastBulletFiredTime < 100) return;
        UserBulletManager({
            lastBulletFiredTime: timeMS()
        });
        for (let { Position  } of query([
            'User',
            'Position'
        ])){
            createBullet(Position());
        }
    }
};
const moveBullet = ()=>{
    for (let { UserBullet , Position , Size , Hitbox  } of query([
        'UserBullet',
        'Position',
        'Size',
        'Hitbox'
    ])){
        const { speed  } = UserBullet();
        Position(add1(Position(), right(calculateBulletSpeedForFrame(speed))));
        updateHitboxTransform(Hitbox, Position(), Size());
    }
};
const removeBullet = ()=>{
    for (let { Position , DeleteQueueManager  } of query([
        'UserBullet',
        'Position',
        'DeleteQueueManager'
    ])){
        if (Position().x < 1920) return;
        DeleteQueueManager({
            markedForDeletion: true
        });
    }
};
const bulletEnemyManager = ()=>{
    const enemies = [
        ...query([
            'Enemy',
            'EntityId'
        ])
    ];
    for (const { Hitbox , DeleteQueueManager  } of query([
        'UserBullet',
        'EntityId',
        'Hitbox',
        'DeleteQueueManager'
    ])){
        const { entityInteractions  } = Hitbox();
        const firstInteractedEnemeyId = entityInteractions.find((entityId)=>enemies.some(({ EntityId  })=>entityId === EntityId().id
            )
        );
        if (firstInteractedEnemeyId) {
            damageEnemy(firstInteractedEnemeyId, 20);
            DeleteQueueManager({
                markedForDeletion: true
            });
        }
    }
};
update1.add(spawnBullet, moveBullet, bulletEnemyManager, removeBullet);
render.add(()=>{
    for (let { Position , Size  } of query([
        'UserBullet',
        'Position',
        'Size'
    ])){
        save();
        beginPath();
        rect(...Position(), ...Size());
        fillStyle('black');
        fill();
        restore();
    }
});
render.add(()=>{
    const metrics = [
        [
            'fps',
            fps()
        ],
        [
            'bullets',
            count([
                'UserBullet'
            ])
        ],
        [
            'enemies',
            count([
                'Enemy'
            ])
        ],
        [
            'hitboxes',
            count([
                'Hitbox'
            ])
        ], 
    ];
    metrics.forEach(([label, textLog], index)=>{
        save();
        beginPath();
        const count1 = `${label}: ${textLog}`;
        const pos = v1(10, 40 + index * 40);
        font(`${40}px serif`);
        fillText(count1, ...pos);
        restore();
    });
});
render.add([
    99999,
    ()=>{
        for (let { Hitbox  } of query([
            'Hitbox'
        ])){
            const { x: x75 , x2 , y: y13 , y2  } = Hitbox();
            save();
            beginPath();
            moveTo(x75, y13);
            lineTo(x2, y13);
            lineTo(x2, y2);
            lineTo(x75, y2);
            lineWidth(4);
            strokeStyle('blue');
            closePath();
            stroke();
            restore();
        }
    }
]);
let canvasWorker;
const attachCanvasWorker = (transferredCanvasWorker)=>{
    console.log('received canvas worker');
    canvasWorker = wrap(transferredCanvasWorker);
    return true;
};
const fireEvent = (key, data)=>{
    mod[key].push(data);
};
const run = async ()=>{
    if (!canvasWorker) throw new Error('canvasWorker has not been setup yet');
    activate(canvasWorker);
};
const methods = {
    attachCanvasWorker,
    fireEvent,
    run
};
expose(methods);
export { attachCanvasWorker as attachCanvasWorker };
export { fireEvent as fireEvent };
export { run as run };
export { methods as default };
