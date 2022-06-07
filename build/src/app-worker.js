// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

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
                        path: path2.map((p)=>p.toString()
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
                const r = requestResponseMessage(ep, {
                    type: "GET",
                    path: path2.map((p)=>p.toString()
                    )
                }).then(fromWireValue);
                return r.then.bind(r);
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
                ].map((p)=>p.toString()
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
                path: path2.map((p)=>p.toString()
                ),
                argumentList
            }, transferables).then(fromWireValue);
        },
        construct (_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, {
                type: "CONSTRUCT",
                path: path2.map((p)=>p.toString()
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
        processed.map((v1)=>v1[0]
        ),
        myFlat(processed.map((v2)=>v2[1]
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
        ep.addEventListener("message", function l(ev) {
            if (!ev.data || !ev.data.id || ev.data.id !== id2) {
                return;
            }
            ep.removeEventListener("message", l);
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
const wrap1 = (...args)=>{
    return wrap(...args);
};
const exposedMethods = new Map();
const expose1 = (a, b)=>{
    const event = new Event('message', {});
    event.data = {
        id: Math.random(),
        type: 'RELEASE'
    };
    self.dispatchEvent(event);
    for (const [name, method] of Object.entries(a)){
        exposedMethods.set(name, method);
    }
    const items = Object.fromEntries(exposedMethods);
    expose(items, b);
};
function nop() {}
const isArray = Array.isArray || function(xs) {
    return xs instanceof Array;
};
function isObservable(x) {
    return x && x._isObservable;
}
function all(xs, f) {
    for(var i = 0, x; i < xs.length; i++){
        x = xs[i];
        if (!f(x)) {
            return false;
        }
    }
    return true;
}
function always(x) {
    return ()=>x
    ;
}
function any(xs, f) {
    for(var i = 0, x; i < xs.length; i++){
        x = xs[i];
        if (f(x)) {
            return true;
        }
    }
    return false;
}
function bind(fn, me) {
    return function() {
        return fn.apply(me, arguments);
    };
}
function contains(xs, x) {
    return indexOf(xs, x) !== -1;
}
function each(xs, f) {
    for(var key in xs){
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
    for(var i = 0, x; i < xs.length; i++){
        x = xs[i];
        if (f(x)) {
            filtered.push(x);
        }
    }
    return filtered;
}
function flatMap(f, xs) {
    return fold(xs, [], function(ys, x) {
        return ys.concat(f(x));
    });
}
function flip(f) {
    return (a, b)=>f(b, a)
    ;
}
function fold(xs, seed, f) {
    for(var i = 0, x; i < xs.length; i++){
        x = xs[i];
        seed = f(seed, x);
    }
    return seed;
}
function head(xs) {
    return xs[0];
}
function id(x) {
    return x;
}
function indexOfDefault(xs, x) {
    return xs.indexOf(x);
}
function indexOfFallback(xs, x) {
    for(var i = 0, y; i < xs.length; i++){
        y = xs[i];
        if (x === y) {
            return i;
        }
    }
    return -1;
}
const indexOf = Array.prototype.indexOf ? indexOfDefault : indexOfFallback;
function indexWhere(xs, f) {
    for(var i = 0, y; i < xs.length; i++){
        y = xs[i];
        if (f(y)) {
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
function map(f, xs) {
    var result = [];
    for(var i = 0, x; i < xs.length; i++){
        x = xs[i];
        result.push(f(x));
    }
    return result;
}
function negate(f) {
    return function(x) {
        return !f(x);
    };
}
function remove(x, xs) {
    var i = indexOf(xs, x);
    if (i >= 0) {
        return xs.splice(i, 1);
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
function toFunction(f) {
    if (typeof f == "function") {
        return f;
    }
    return (x)=>f
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
function without(x, xs) {
    return filter(function(y) {
        return y !== x;
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
function assertFunction(f) {
    return assert("not a function : " + f, _.isFunction(f));
}
function assertNoArguments(args) {
    return assert("no arguments supported", args.length === 0);
}
const defaultScheduler = {
    setTimeout (f, d) {
        return setTimeout(f, d);
    },
    setInterval (f, i) {
        return setInterval(f, i);
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
function ensureStackHeight(h) {
    if (h <= aftersStackHeight) return;
    if (!aftersStack[h - 1]) {
        aftersStack[h - 1] = [
            [],
            0
        ];
    }
    aftersStackHeight = h;
}
function isInTransaction() {
    return rootEvent !== undefined;
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
        while(stackIndexForThisObs < aftersStackHeight - 1){
            if (containsObs(obs, aftersStack[stackIndexForThisObs][0])) {
                break;
            }
            stackIndexForThisObs++;
        }
        var listFromStack = aftersStack[stackIndexForThisObs][0];
        listFromStack.push([
            obs,
            f
        ]);
        if (!rootEvent) {
            processAfters();
        }
    } else {
        return f();
    }
}
function containsObs(obs, aftersList) {
    for(var i = 0; i < aftersList.length; i++){
        if (aftersList[i][0].id == obs.id) return true;
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
function whenDoneWith(obs, f) {
    if (rootEvent) {
        var obsWaiters = waiters[obs.id];
        if (obsWaiters === undefined) {
            obsWaiters = waiters[obs.id] = [
                f
            ];
            return waiterObs.push(obs);
        } else {
            return obsWaiters.push(f);
        }
    } else {
        return f();
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
    for(var i = 0, f; i < obsWaiters.length; i++){
        f = obsWaiters[i];
        f();
    }
}
function flushDepsOf(obs) {
    if (flushed[obs.id]) return;
    var deps = obs.internalDeps();
    for(var i = 0, dep; i < deps.length; i++){
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
function findDeps(x) {
    if (isArray(x)) {
        return _.flatMap(findDeps, x);
    } else if (isObservable(x)) {
        return [
            x
        ];
    } else if (typeof x !== "undefined" && x !== null ? x._isSource : undefined) {
        return [
            x.obs
        ];
    } else {
        return [];
    }
}
const nullSink = ()=>more
;
const nullVoidSink = ()=>more
;
function withStateMachine(initState, f, src) {
    return src.transform(withStateMachineT(initState, f), new Desc(src, "withStateMachine", [
        initState,
        f
    ]));
}
function withStateMachineT(initState, f) {
    let state = initState;
    return (event, sink)=>{
        var fromF = f(state, event);
        var [newState, outputs] = fromF;
        state = newState;
        var reply = more;
        for(var i = 0; i < outputs.length; i++){
            let output = outputs[i];
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
var eventIdCounter = 0;
class Event1 {
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
class Value extends Event1 {
    constructor(value){
        super();
        this.hasValue = true;
        if (value instanceof Event1) {
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
class NoValue extends Event1 {
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
function toEvent(x) {
    if (x && x._isEvent) {
        return x;
    } else {
        return nextEvent(x);
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
function equals(a, b) {
    return a === b;
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
function doErrorT(f) {
    return (event, sink)=>{
        if (isError(event)) {
            f(event.error);
        }
        return sink(event);
    };
}
function doActionT(f) {
    return (event, sink)=>{
        if (hasValue(event)) {
            f(event.value);
        }
        return sink(event);
    };
}
function doEndT(f) {
    return (event, sink)=>{
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
    return resultProperty = new Property(new Desc(src, "scan", [
        seed,
        f
    ]), subscribe);
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
class CompositeUnsubscribe {
    constructor(ss = []){
        this.unsubscribed = false;
        this.unsubscribe = _.bind(this.unsubscribe, this);
        this.unsubscribed = false;
        this.subscriptions = [];
        this.starting = [];
        for(var i = 0, s; i < ss.length; i++){
            s = ss[i];
            this.add(s);
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
        for(var i = 0; i < iterable.length; i++){
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
    const s = new EventStream(new Desc("Bacon", "once", [
        value
    ]), function(sink) {
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
function handleEventValueWith(f) {
    if (typeof f == "function") {
        return (event)=>{
            if (hasValue(event)) {
                return f(event.value);
            }
            return event;
        };
    }
    return (event)=>f
    ;
}
function makeObservable(x) {
    if (isObservable(x)) {
        return x;
    } else {
        return once(x);
    }
}
function flatMapEvent(src, f) {
    return flatMap_(f, src, {
        mapError: true,
        desc: new Desc(src, "flatMapEvent", [
            f
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
    push(x) {
        this.value = x;
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
    push(x) {
        this.queue.push(x);
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
    push(x) {
        return this.queue.push(x.value);
    }
    hasAtLeast(count) {
        return true;
    }
}
function isTrigger(s) {
    if (s == null) return false;
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
    var needsBarrier = any(sources, (s)=>s.flatten
    ) && containsDuplicateDeps(map((s)=>s.obs
    , sources));
    var desc = new Desc("Bacon", "when", Array.prototype.slice.call(patterns));
    var resultStream = ctor(desc, function(sink) {
        var triggers = [];
        var ends = false;
        function match(p) {
            for(var i = 0; i < p.ixs.length; i++){
                let ix = p.ixs[i];
                if (!sources[ix.index].hasAtLeast(ix.count)) {
                    return false;
                }
            }
            return true;
        }
        function cannotMatch(p) {
            for(var i = 0; i < p.ixs.length; i++){
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
                    return UpdateBarrier.whenDoneWith(resultStream, flush1);
                }
                function flushWhileTriggers() {
                    var trigger;
                    if ((trigger = triggers.pop()) !== undefined) {
                        var reply = more;
                        for(var i = 0, p; i < ixPats.length; i++){
                            p = ixPats[i];
                            if (match(p)) {
                                const values2 = [];
                                for(var j = 0; j < p.ixs.length; j++){
                                    let event = sources[p.ixs[j].index].consume();
                                    if (!event) throw new Error("Event was undefined");
                                    values2.push(event.value);
                                }
                                let applied = p.f.apply(null, values2);
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
    for(let i = 0; i < rawPatterns.length; i++){
        let [patSources, f] = rawPatterns[i];
        var pat = {
            f,
            ixs: []
        };
        var triggerFound = false;
        for(var j = 0, s; j < patSources.length; j++){
            s = patSources[j];
            var index = indexOf(sources, s);
            if (!triggerFound) {
                triggerFound = isTrigger(s);
            }
            if (index < 0) {
                sources.push(s);
                index = sources.length - 1;
            }
            for(var k = 0; k < pat.ixs.length; k++){
                let ix = pat.ixs[k];
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
    var i = 0;
    var len = sourceArgs.length;
    var rawPatterns = [];
    while(i < len){
        let patSources = toArray(sourceArgs[i++]);
        let f = toFunction(sourceArgs[i++]);
        rawPatterns.push([
            patSources,
            f
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
    for(let i = 0; i < patterns.length; i++){
        let pattern = patterns[i];
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
            let f = toFunction(pattern[pattern.length - 1]);
            rawPatterns.push([
                sources,
                f
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
function withLatestFromE(sampler, samplee, f) {
    var result = when([
        new DefaultSource(samplee.toProperty(), false),
        new DefaultSource(sampler, true),
        flip(f)
    ]);
    return result.withDesc(new Desc(sampler, "withLatestFrom", [
        samplee,
        f
    ]));
}
function withLatestFromP(sampler, samplee, f) {
    var result = whenP([
        new DefaultSource(samplee.toProperty(), false),
        new DefaultSource(sampler, true),
        flip(f)
    ]);
    return result.withDesc(new Desc(sampler, "withLatestFrom", [
        samplee,
        f
    ]));
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
        return withLatestFrom(src, f, (a, b)=>b
        );
    }
    return src.transform(mapT(f), new Desc(src, "map", [
        f
    ]));
}
function mapT(f) {
    let theF = _.toFunction(f);
    return (e8, sink)=>{
        return sink(e8.fmap(theF));
    };
}
function constant(x) {
    return new Property(new Desc("Bacon", "constant", [
        x
    ]), function(sink) {
        sink(initialEvent(x));
        sink(endEvent());
        return nop;
    });
}
function argumentsToObservables(args) {
    args = Array.prototype.slice.call(args);
    return _.flatMap(singleToObservables, args);
}
function singleToObservables(x) {
    if (isObservable(x)) {
        return [
            x
        ];
    } else if (isArray(x)) {
        return argumentsToObservables(x);
    } else {
        return [
            constant(x)
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
        for(var i = 0; i < streams.length; i++){
            let stream = isObservable(streams[i]) ? streams[i] : constant(streams[i]);
            sources.push(wrap2(stream));
        }
        return whenP([
            sources,
            (...xs)=>xs
        ]).withDesc(new Desc("Bacon", "combineAsArray", streams));
    } else {
        return constant([]);
    }
}
function combineTwo(left1, right1, f) {
    return whenP([
        [
            wrap2(left1),
            wrap2(right1)
        ],
        f
    ]).withDesc(new Desc(left1, "combine", [
        right1,
        f
    ]));
}
function wrap2(obs) {
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
function flatMapConcat(src, f) {
    return flatMap_(handleEventValueWith(f), src, {
        desc: new Desc(src, "flatMapConcat", [
            f
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
            for(var i = 0; i < valueArray.length; i++){
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
    return result.withDesc(new Desc(samplee, "sampledBy", [
        sampler
    ]));
}
function sampledByE(samplee, sampler, f) {
    return sampledByP(samplee.toProperty(), sampler, f).withDesc(new Desc(samplee, "sampledBy", [
        sampler
    ]));
}
function sampleP(samplee, samplingInterval) {
    return sampledByP(samplee, interval(samplingInterval, {}), (a, b)=>a
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
        return withLatestFrom(src, f, (p, v4)=>[
                p,
                v4
            ]
        ).transform(composeT(predicateTransformer((tuple)=>tuple[1]
        ), mapT((tuple)=>tuple[0]
        )), desc);
    }
    return src.transform(predicateTransformer(toPredicate(f)), desc);
}
function filter$1(src, f) {
    return withPredicate(src, f, filterT, new Desc(src, "filter", [
        f
    ]));
}
function filterT(f) {
    return (e11, sink)=>{
        if (e11.filter(f)) {
            return sink(e11);
        } else {
            return more;
        }
    };
}
function not(src) {
    return src.map((x)=>!x
    ).withDesc(new Desc(src, "not", []));
}
function and(left2, right2) {
    return left2.combine(toProperty(right2), (x, y)=>!!(x && y)
    ).withDesc(new Desc(left2, "and", [
        right2
    ]));
}
function or(left3, right3) {
    return left3.combine(toProperty(right3), (x, y)=>x || y
    ).withDesc(new Desc(left3, "or", [
        right3
    ]));
}
function toProperty(x) {
    if (isProperty(x)) {
        return x;
    }
    return constant(x);
}
function flatMapFirst(src, f) {
    return flatMap_(handleEventValueWith(f), src, {
        firstOnly: true,
        desc: new Desc(src, "flatMapFirst", [
            f
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
function transformPropertyChanges(property, f, desc) {
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
    const transformedChanges = f(changes);
    const combo = propertyFromStreamSubscribe(desc, (sink)=>{
        comboSink = sink;
        return transformedChanges.dispatcher.subscribe(function(event) {
            sink(event);
        });
    });
    return combo;
}
function fold$1(src, seed, f) {
    return src.scan(seed, f).last().withDesc(new Desc(src, "fold", [
        seed,
        f
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
                for(var i = 0; i < data.length; i++){
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
    }, new Desc(src, "takeUntil", [
        stopper1
    ]));
}
function flatMap$1(src, f) {
    return flatMap_(handleEventValueWith(f), src, {
        desc: new Desc(src, "flatMap", [
            f
        ])
    });
}
function flatMapError(src, f) {
    return flatMap_((x)=>{
        if (x instanceof Error$1) {
            let error = x.error;
            return f(error);
        } else {
            return x;
        }
    }, src, {
        mapError: true,
        desc: new Desc(src, "flatMapError", [
            f
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
    let f = _.toFunction(f_);
    var stream = isProperty(src) ? src.toEventStream(allowSync) : src;
    let flatMapped = flatMap$1(stream, (value)=>makeObservable(f(value)).takeUntil(stream)
    );
    if (isProperty(src)) flatMapped = flatMapped.toProperty();
    return flatMapped.withDesc(new Desc(src, "flatMapLatest", [
        f
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
            for(let i = 0; i < len; i++){
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
function flatMapWithConcurrencyLimit(src, limit, f) {
    return flatMap_(handleEventValueWith(f), src, {
        desc: new Desc(src, "flatMapWithConcurrencyLimit", [
            limit,
            f
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
        return function(f) {
            return GlobalScheduler.scheduler.setTimeout(f, delayMs);
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
            for(var i = 0; i < toDeliverNow.length; i++){
                var event = toDeliverNow[i];
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
    return src.transformChanges(desc, (changes)=>changes.flatMapConcat((x)=>{
            return once(x).concat(later(minimumInterval, x).errors());
        })
    );
}
function takeWhile(src, f) {
    return withPredicate(src, f, takeWhileT, new Desc(src, "takeWhile", [
        f
    ]));
}
function takeWhileT(f) {
    return (event, sink)=>{
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
    return src.filter(started).withDesc(new Desc(src, "skipUntil", [
        starter
    ]));
}
function skipWhile(src, f) {
    return withPredicate(src, f, skipWhileT, new Desc(src, "skipWhile", [
        f
    ]));
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
    return src.transform(composeT(filterT((x)=>!streams[keyF(x)]
    ), mapT(function(firstValue) {
        var key = keyF(firstValue);
        var similarValues = src.changes().filter((x)=>keyF(x) === key
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
function diff(src, start, f) {
    return transformP(scan(src, [
        start,
        nullMarker
    ], (prevTuple, next)=>[
            next,
            f(prevTuple[0], next)
        ]
    ), composeT(filterT((tuple)=>tuple[1] !== nullMarker
    ), mapT((tuple)=>tuple[1]
    )), new Desc(src, "diff", [
        start,
        f
    ]));
}
function flatScan(src, seed, f) {
    let current = seed;
    return src.flatMapConcat((next)=>makeObservable(f(current, next)).doAction((updated)=>current = updated
        )
    ).toProperty().startWith(seed).withDesc(new Desc(src, "flatScan", [
        seed,
        f
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
                        for(var i = 0; i < toSend.length; i++){
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
    streams = _.map((s)=>s.toEventStream()
    , streams);
    return when([
        streams,
        f
    ]).withDesc(new Desc("Bacon", "zipWith", [
        f
    ].concat(streams)));
}
function zip(left5, right5, f) {
    return zipWith(f || Array, left5, right5).withDesc(new Desc(left5, "zip", [
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
        for(var i = 0, f; i < funcs.length; i++){
            f = funcs[i];
            f(ctxStack, values7);
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
    combine(right6, f) {
        return combineTwo(this, right6, f).withDesc(new Desc(this, "combine", [
            right6,
            f
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
    diff(start, f) {
        return diff(this, start, f);
    }
    doAction(f) {
        return this.transform(doActionT(f), new Desc(this, "doAction", [
            f
        ]));
    }
    doEnd(f) {
        return this.transform(doEndT(f), new Desc(this, "doEnd", [
            f
        ]));
    }
    doError(f) {
        return this.transform(doErrorT(f), new Desc(this, "doError", [
            f
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
        return this.transform(mapEndT(f), new Desc(this, "mapEnd", [
            f
        ]));
    }
    mapError(f) {
        return this.transform(mapErrorT(f), new Desc(this, "mapError", [
            f
        ]));
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
    skipWhile(f) {
        return skipWhile(this, f);
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
        if (desc) this.desc = desc;
        return this;
    }
    withDescription(context, method, ...args) {
        this.desc = describe(context, method, ...args);
        return this;
    }
    zip(other, f) {
        return zip(this, other, f);
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
    withLatestFrom(samplee, f) {
        return withLatestFromP(this, samplee, f);
    }
    withStateMachine(initState, f) {
        return withStateMachine(initState, f, this);
    }
}
function isProperty(x) {
    return !!x._isProperty;
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
    withLatestFrom(samplee, f) {
        return withLatestFromE(this, samplee, f);
    }
    withStateMachine(initState, f) {
        return withStateMachine(initState, f, this);
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
    return function(f, ...args1) {
        if (typeof f === "object" && args1.length) {
            var context = f;
            var methodName = args1[0];
            f = function(...args) {
                return context[methodName](...args);
            };
            args1 = args1.slice(1);
        }
        return wrapped(f, ...args1);
    };
}
function partiallyApplied(f, applied) {
    return function(...args) {
        return f(...applied.concat(args));
    };
}
withMethodCallSupport(function(f, ...args) {
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
                    var i = 0;
                    while(i < this.pushQueue.length){
                        var v5 = this.pushQueue[i];
                        this.sink(nextEvent(v5));
                        i++;
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
        for(var i = 0, sub; i < iterable.length; i++){
            sub = iterable[i];
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
            for(var i = 0, subscription; i < iterable.length; i++){
                subscription = iterable[i];
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
        for(var i = 0, sub; i < iterable.length; i++){
            sub = iterable[i];
            if (sub.input === input) {
                if (typeof sub.unsub === "function") {
                    sub.unsub();
                }
                this.subscriptions.splice(i, 1);
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
const KeyCodes = immutable({
    ...NativeKeyCodes,
    ...AliasKeyCodes
});
const activeKeys = new Set();
const justActivated = new Set();
let activeKeysSnapshot = new Set();
let justActivatedSnapshot = new Set();
const keyDown = (codes)=>{
    if (Array.isArray(codes)) {
        return codes.some((code)=>justPressed(code)
        );
    }
    return activeKeysSnapshot.has(codes);
};
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
const applySnapshot = ()=>{
    activeKeysSnapshot = new Set(activeKeys);
    justActivatedSnapshot = new Set(justActivated);
};
const attachListeners = (worker)=>{
    if (isWorkerContext()) {
        return {
            'module:Keyboard:event:window:keydown': triggerKeyDown,
            'module:Keyboard:event:window:keyup': triggerKeyUp,
            'module:Keyboard:event:window:blur': clearKeys
        };
    } else {
        const keydownEvent = worker ? (event)=>worker['module:Keyboard:event:window:keydown'](event.code)
         : triggerKeyDown;
        const keyUpEvent = worker ? (event)=>worker['module:Keyboard:event:window:keyup'](event.code)
         : triggerKeyUp;
        const blurEvent = worker ? ()=>worker['module:Keyboard:event:window:blur']()
         : triggerKeyUp;
        window.addEventListener('keydown', (e14)=>{
            keydownEvent({
                code: e14.code
            });
        });
        window.addEventListener('keyup', keyUpEvent);
        window.addEventListener('blur', blurEvent);
    }
};
const CBTracker = ()=>{
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
        return left6 <= 0 ? fn.apply(this, combined) : _arity(left6, _curryN(length1, combined, fn));
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
var all1 = _curry2(_dispatchable([
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
var bind1 = _curry2(function bind(fn, thisObj) {
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
    return xf['@@transducer/result'](obj[methodName](bind1(xf['@@transducer/step'], xf), acc));
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
function _has(prop5, obj) {
    return Object.prototype.hasOwnProperty.call(obj, prop5);
}
var toString1 = Object.prototype.toString;
var _isArguments = function() {
    return toString1.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
        return toString1.call(x) === '[object Arguments]';
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
    return map1(prop(p), list);
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
var and1 = _curry2(function and(a, b) {
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
        return _concat(acc, map1(f, applyX));
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
    spec = mapValues(function(v6) {
        return typeof v6 == 'function' ? v6 : applySpec1(v6);
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
function _assoc(prop7, val, obj) {
    if (__default2(prop7) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop7] = val;
        return arr;
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
    }
    result[prop7] = val;
    return result;
}
var isNil = _curry1(function isNil(x) {
    return x == null;
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
    var type3 = Object.prototype.toString.call(x);
    return type3 === '[object Function]' || type3 === '[object AsyncFunction]' || type3 === '[object GeneratorFunction]' || type3 === '[object AsyncGeneratorFunction]';
}
var liftN = _curry2(function liftN(arity, fn) {
    var lifted = curryN(arity, fn);
    return curryN(arity, function() {
        return _reduce(ap, map1(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
    });
});
var lift = _curry1(function lift(fn) {
    return liftN(fn.length, fn);
});
_curry2(function both(f, g) {
    return _isFunction(f) ? function _both() {
        return f.apply(this, arguments) && g.apply(this, arguments);
    } : lift(and1)(f, g);
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
    return map1(f, _flatCat(xf));
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
    return _makeFlat(false)(map1(fn, monad));
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
var not1 = _curry1(function not(a) {
    return !a;
});
var complement = lift(not1);
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
function _identity(x) {
    return x;
}
var identity = _curry1(_identity);
var pipeWith = _curry2(function pipeWith(xf, list) {
    if (list.length <= 0) {
        return identity;
    }
    var headList = head1(list);
    var tailList = tail1(list);
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
var equals1 = _curry2(function equals(a, b) {
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
        if (equals1(list[idx], a)) {
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
var toString2 = _curry1(function toString(val) {
    return _toString(val, []);
});
var concat = _curry2(function concat(a, b) {
    if (__default(a)) {
        if (__default(b)) {
            return a.concat(b);
        }
        throw new TypeError(toString2(b) + ' is not an array');
    }
    if (_isString(a)) {
        if (_isString(b)) {
            return a + b;
        }
        throw new TypeError(toString2(b) + ' is not a string');
    }
    if (a != null && _isFunction(a['fantasy-land/concat'])) {
        return a['fantasy-land/concat'](b);
    }
    if (a != null && _isFunction(a.concat)) {
        return a.concat(b);
    }
    throw new TypeError(toString2(a) + ' does not have a method named "concat" or "fantasy-land/concat"');
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
    return _reduce(function(a, e15) {
        return pred(e15) ? a + 1 : a;
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
var defaultTo = _curry2(function defaultTo(d, v7) {
    return v7 == null || v7 !== v7 ? d : v7;
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
    var type4 = typeof item;
    var prevSize, newSize;
    switch(type4){
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
                if (!(type4 in set._items)) {
                    if (shouldAdd) {
                        set._items[type4] = {};
                        set._items[type4][item] = true;
                    }
                    return false;
                } else if (item in set._items[type4]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items[type4][item] = true;
                    }
                    return false;
                }
            }
        case 'boolean':
            if (type4 in set._items) {
                var bIdx = item ? 1 : 0;
                if (set._items[type4][bIdx]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items[type4][bIdx] = true;
                    }
                    return false;
                }
            } else {
                if (shouldAdd) {
                    set._items[type4] = item ? [
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
                if (!(type4 in set._items)) {
                    if (shouldAdd) {
                        set._items[type4] = [
                            item
                        ];
                    }
                    return false;
                }
                if (!_includes(item, set._items[type4])) {
                    if (shouldAdd) {
                        set._items[type4].push(item);
                    }
                    return false;
                }
                return true;
            }
        case 'undefined':
            if (set._items[type4]) {
                return true;
            } else {
                if (shouldAdd) {
                    set._items[type4] = true;
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
            type4 = Object.prototype.toString.call(item);
            if (!(type4 in set._items)) {
                if (shouldAdd) {
                    set._items[type4] = [
                        item
                    ];
                }
                return false;
            }
            if (!_includes(item, set._items[type4])) {
                if (shouldAdd) {
                    set._items[type4].push(item);
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
    for(var p in obj){
        result[p] = obj[p];
    }
    delete result[prop9];
    return result;
}
function _shallowCloneObject(prop10, obj) {
    if (__default2(prop10) && __default(obj)) {
        return [].concat(obj);
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
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
var take1 = _curry2(_dispatchable([
    'take'
], _xtake, function take(n, xs) {
    return slice(0, n < 0 ? Infinity : n, xs);
}));
function dropLast(n, xs) {
    return take1(n < xs.length ? xs.length - n : 0, xs);
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
var or1 = _curry2(function or(a, b) {
    return a || b;
});
_curry2(function either(f, g) {
    return _isFunction(f) ? function _either() {
        return f.apply(this, arguments) || g.apply(this, arguments);
    } : lift(or1)(f, g);
});
function _isTypedArray(val) {
    var type5 = Object.prototype.toString.call(val);
    return type5 === '[object Uint8ClampedArray]' || type5 === '[object Int8Array]' || type5 === '[object Uint8Array]' || type5 === '[object Int16Array]' || type5 === '[object Uint16Array]' || type5 === '[object Int32Array]' || type5 === '[object Uint32Array]' || type5 === '[object Float32Array]' || type5 === '[object Float64Array]' || type5 === '[object BigInt64Array]' || type5 === '[object BigUint64Array]';
}
var empty1 = _curry1(function empty(x) {
    return x != null && typeof x['fantasy-land/empty'] === 'function' ? x['fantasy-land/empty']() : x != null && x.constructor != null && typeof x.constructor['fantasy-land/empty'] === 'function' ? x.constructor['fantasy-land/empty']() : x != null && typeof x.empty === 'function' ? x.empty() : x != null && x.constructor != null && typeof x.constructor.empty === 'function' ? x.constructor.empty() : __default(x) ? [] : _isString(x) ? '' : _isObject(x) ? {} : _isArguments(x) ? function() {
        return arguments;
    }() : _isTypedArray(x) ? x.constructor.from('') : void 0;
});
var takeLast = _curry2(function takeLast(n, xs) {
    return drop(n >= 0 ? xs.length - n : 0, xs);
});
_curry2(function(suffix, list) {
    return equals1(takeLast(suffix.length, list), suffix);
});
_curry3(function eqBy(f, x, y) {
    return equals1(f(x), f(y));
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
var flip1 = _curry1(function flip(fn) {
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
        throw new TypeError(toString2(target) + ' does not have a method named "' + method + '"');
    });
});
var is = _curry2(function is(Ctor, val) {
    return val instanceof Ctor || val != null && (val.constructor === Ctor || Ctor.name === 'Object' && typeof val === 'object');
});
_curry1(function isEmpty(x) {
    return x != null && equals1(x, empty1(x));
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
function _isNumber(x) {
    return Object.prototype.toString.call(x) === '[object Number]';
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
var update = _curry3(function update(idx, x, list) {
    return adjust(idx, always1(x), list);
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
function _modify(prop16, fn, obj) {
    if (__default2(prop16) && __default(obj)) {
        var arr = [].concat(obj);
        arr[prop16] = fn(arr[prop16]);
        return arr;
    }
    var result = {};
    for(var p in obj){
        result[p] = obj[p];
    }
    result[prop16] = fn(result[prop16]);
    return result;
}
var modifyPath = _curry3(function modifyPath1(path5, fn, object) {
    if (!_isObject(object) && !__default(object) || path5.length === 0) {
        return object;
    }
    var idx = path5[0];
    if (!_has(idx, object)) {
        return object;
    }
    if (path5.length === 1) {
        return _modify(idx, fn, object);
    }
    var val = modifyPath1(Array.prototype.slice.call(path5, 1), fn, object[idx]);
    if (val === object[idx]) {
        return object;
    }
    return _assoc(idx, val, object);
});
_curry3(function modify(prop17, fn, object) {
    return modifyPath([
        prop17
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
    return all1(_complement(fn), input);
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
    for(var prop18 in obj){
        if (!index.hasOwnProperty(prop18)) {
            result[prop18] = obj[prop18];
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
_createPartialApplicator(flip1(_concat));
juxt([
    filter1,
    reject
]);
_curry3(function pathEq(_path, val, obj) {
    return equals1(path(_path, obj), val);
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
    return equals1(val, prop(name, obj));
});
_curry3(function propIs(type7, name, obj) {
    return is(type7, prop(name, obj));
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
    return times(always1(value), n);
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
        return ap(map1(prepend, x), acc);
    }, of([]), traversable);
});
_curry3(function set(lens2, v8, x) {
    return over(lens2, always1(v8), x);
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
    return equals1(take1(prefix.length, list), prefix);
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
        throw new TypeError('‘test’ requires a value of type RegExp as its first argument; received ' + toString2(pattern));
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
    return typeof traversable['fantasy-land/traverse'] === 'function' ? traversable['fantasy-land/traverse'](f, of) : typeof traversable.traverse === 'function' ? traversable.traverse(f, of) : sequence(of, map1(f, traversable));
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
        } catch (e16) {
            return catcher.apply(this, _concat([
                e16
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
    var prop22;
    var vs = [];
    for(prop22 in obj){
        vs[vs.length] = obj[prop22];
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
c(e.arcTo);
const beginPath = c(e.beginPath);
c(e.bezierCurveTo);
const clearRect = c(e.clearRect);
c(e.clip);
const closePath = c(e.closePath);
c(e.createConicGradient);
c(e.createImageData);
c(e.createLinearGradient);
c(e.createPattern);
c(e.createRadialGradient);
c(e.drawFocusIfNeeded);
const drawImage = c(e.drawImage);
c(e.ellipse);
const fill = c(e.fill);
c(e.fillRect);
const fillText = c(e.fillText);
c(e.getContextAttributes);
c(e.getImageData);
c(e.getLineDash);
c(e.getTransform);
c(e.isContextLost);
c(e.isPointInPath);
c(e.isPointInStroke);
const lineTo = c(e.lineTo);
c(e.measureText);
const moveTo = c(e.moveTo);
c(e.putImageData);
c(e.quadraticCurveTo);
const rect = c(e.rect);
c(e.reset);
c(e.resetTransform);
const restore = c(e.restore);
c(e.rotate);
c(e.roundRect);
const save = c(e.save);
c(e.scale);
c(e.setLineDash);
c(e.setTransform);
const stroke = c(e.stroke);
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
const fillStyle = c(e.fillStyle);
c(e.filter);
const font = c(e.font);
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
const lineWidth = c(e.lineWidth);
c(e.miterLimit);
c(e.shadowBlur);
c(e.shadowColor);
c(e.shadowOffsetX);
c(e.shadowOffsetY);
const strokeStyle = c(e.strokeStyle);
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
new Map();
const $$initiate = CBTracker();
const inputs = CBTracker();
const preframe = CBTracker();
const physics = CBTracker();
const update1 = CBTracker();
const removal = CBTracker();
const prerender = CBTracker();
const render = CBTracker();
const __final = CBTracker();
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
    async function animate(t) {
        attachTimes(t);
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
            ).sort((a, b)=>a[0] - b[0]
            );
            const renderSorted = [
                ...render
            ].map((item)=>isFunction1(item) ? [
                    0,
                    item
                ] : item
            ).sort((a, b)=>a[0] - b[0]
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
        const id5 = entityIdCounter();
        const entity = {
            id: id5,
            components: new Map()
        };
        entities.set(entity.id, entity);
        addComponentToEntity1(id5, EntityId({
            id: id5
        }));
        for (const component of components){
            addComponentToEntity1(id5, component);
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
    function removeEntity1(id6) {
        const entity = entities.get(id6);
        if (!entity) return;
        const { components  } = entity;
        entities.delete(id6);
        for (const [componentName] of components){
            componentEntityMapping.removeItem(componentName, id6);
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
const addEntity = globalEntityList.addEntity;
const removeEntity = globalEntityList.removeEntity;
globalEntityList.addComponentToEntity;
const count = globalEntityList.count;
const query = globalEntityList.query;
const intersectionBetweenOrderedIntegerLists = (intLists)=>{
    let last3 = intLists[0];
    for(let i = 1; i < intLists.length; i++){
        const current = intLists[i];
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
const DeleteQueueManager = Component();
const removeMarkedEntities = ()=>{
    for (const { deleteQueueManager , entityId  } of query({
        deleteQueueManager: DeleteQueueManager,
        entityId: EntityId
    })){
        const { markedForDeletion  } = deleteQueueManager();
        if (markedForDeletion) {
            removeEntity(entityId().id);
        }
    }
};
removal.add(removeMarkedEntities);
const Position = Component();
const Size = Component();
const Hitbox = Component();
const createHitBoxComponent = (label, [x, y], [width, height])=>{
    return Hitbox({
        label,
        x,
        y,
        x2: x + width,
        y2: y + height,
        width,
        height,
        entityInteractions: []
    });
};
const updateHitboxTransform = (hitbox, [x, y], [width, height])=>{
    hitbox({
        x,
        y,
        x2: x + width,
        y2: y + height,
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
        ...query({
            entityId: EntityId,
            hitbox: Hitbox
        })
    ];
    for(let i = 0; i < ht.length; i++){
        const a = ht[i];
        for(let j = i + 1; j < ht.length; j++){
            const b = ht[j];
            const aHitbox = a.hitbox();
            const bHitbox = b.hitbox();
            if (hittest(aHitbox, bHitbox)) {
                const aid = a.entityId().id;
                const bid = b.entityId().id;
                a.hitbox({
                    entityInteractions: [
                        ...aHitbox.entityInteractions,
                        bid
                    ]
                });
                b.hitbox({
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
    for (const { hitbox  } of query({
        hitbox: Hitbox
    })){
        hitbox({
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
const v = (x, y)=>{
    return {
        x,
        y,
        [0]: x,
        [1]: x,
        [Symbol.iterator]: it
    };
};
const zero = ()=>v(0, 0)
;
const add1 = curry(([x1, y1], [x2, y2])=>{
    return v(x1 + x2, y1 + y2);
});
const up = (value)=>v(0, value * -1)
;
const down = (value)=>v(0, value)
;
const left = (value)=>v(value * -1, 0)
;
const right = (value)=>v(value, 0)
;
const Canvas = State({
    width: 1920,
    height: 1080
});
prerender.add(()=>{
    const { width , height  } = Canvas();
    clearRect(...zero(), width, height);
});
inputs.add(()=>{
    applySnapshot();
});
const resources = {
    USER_IMAGE: '/sprites/MainPlayerWalkDown.png'
};
new Map();
const User = Component();
const UserAnimation = Component();
$$initiate.once(()=>{
    addEntity([
        User({
            speed: 400
        }),
        Position(zero()),
        Size(v(50, 50)),
        UserAnimation({
            row: 0,
            column: 0,
            interval: 300
        })
    ]);
});
const calculateSpeedForFrame = (speed)=>speed * timeDiffS()
;
update1.add(()=>{
    for (const { user , position , size  } of query({
        user: User,
        position: Position,
        size: Size
    })){
        if (keyDown(KeyCodes.KeyW)) {
            position(add1(position(), up(calculateSpeedForFrame(user().speed))));
        }
        if (keyDown(KeyCodes.KeyS)) {
            position(add1(position(), down(calculateSpeedForFrame(user().speed))));
        }
        if (keyDown(KeyCodes.KeyA)) {
            position(add1(position(), left(calculateSpeedForFrame(user().speed))));
        }
        if (keyDown(KeyCodes.KeyD)) {
            position(add1(position(), right(calculateSpeedForFrame(user().speed))));
        }
        const canvas = Canvas();
        const [width, height] = size();
        const [x, y] = position();
        position(v(Math.max(0, Math.min(x, canvas.width - width)), Math.max(0, Math.min(y, canvas.height - height))));
    }
});
render.add(()=>{
    for (const { position  } of query({
        user: User,
        position: Position
    })){
        save();
        drawImage(resources.USER_IMAGE, ...position());
        restore();
    }
});
const Enemy = Component();
const EnemyManager = Component();
$$initiate.once(()=>{
    addEntity([
        EnemyManager({
            lastSpawnTime: 0
        }), 
    ]);
});
const createEnemy = (posX)=>{
    const startingPosition = v(1800, posX);
    const startingSize = v(100, 50);
    addEntity([
        Enemy({
            speed: 350,
            health: 100,
            originalHealth: 100
        }),
        Position(startingPosition),
        Size(startingSize),
        DeleteQueueManager({
            markedForDeletion: false
        }),
        createHitBoxComponent('Enemy', startingPosition, startingSize), 
    ]);
};
const moveEnemies = ()=>{
    for (const { enemy , position , size , hitbox  } of query({
        enemy: Enemy,
        position: Position,
        size: Size,
        hitbox: Hitbox
    })){
        position(add1(position(), left(enemy().speed * timeDiffS())));
        updateHitboxTransform(hitbox, position(), size());
    }
};
const enemyRemover = ()=>{
    for (const { position , deleteQueueManager  } of query({
        position: Position,
        deleteQueueManager: DeleteQueueManager
    })){
        if (position().x < 100) {
            deleteQueueManager({
                markedForDeletion: true
            });
        }
    }
};
const spawnEnemies = ()=>{
    for (const { enemyManager  } of query({
        enemyManager: EnemyManager
    })){
        const { lastSpawnTime  } = enemyManager();
        if (timeMS() - lastSpawnTime < 1000) continue;
        enemyManager({
            lastSpawnTime: timeMS()
        });
        createEnemy(random(100, 900));
    }
};
const damageEnemy = (entityId, amount)=>{
    for (const { enemy , deleteQueueManager  } of query({
        enemy: Enemy,
        deleteQueueManager: DeleteQueueManager
    }, [
        entityId
    ])){
        enemy({
            health: Math.max(0, enemy().health - amount)
        });
        if (enemy().health === 0) {
            deleteQueueManager({
                markedForDeletion: true
            });
        }
    }
};
update1.add(spawnEnemies, moveEnemies, enemyRemover);
render.add(()=>{
    for (const { enemy , position , size  } of query({
        enemy: Enemy,
        position: Position,
        size: Size
    })){
        const { health , originalHealth  } = enemy();
        const healthPercentage = health / originalHealth;
        save();
        beginPath();
        fillStyle('red');
        rect(...add1(position(), up(50)), ...v(size().x, 20));
        fill();
        restore();
        save();
        beginPath();
        fillStyle('green');
        rect(...add1(position(), up(50)), ...v(size().x * healthPercentage, 20));
        fill();
        restore();
        save();
        beginPath();
        fillStyle(false ? 'blue' : 'green');
        rect(...position(), ...size());
        fill();
        restore();
    }
});
const UserBullet = Component();
const UserBulletManager = Component();
$$initiate.once(()=>{
    addEntity([
        UserBulletManager({
            lastBulletFiredTime: 0
        }), 
    ]);
});
const createBullet = (pos)=>{
    const size = v(10, 10);
    addEntity([
        UserBullet({
            speed: 700,
            status: 'ACTIVE'
        }),
        Position(pos),
        Size(size),
        DeleteQueueManager({
            markedForDeletion: false
        }),
        createHitBoxComponent('UserBullet', pos, size), 
    ]);
};
const calculateBulletSpeedForFrame = (speed)=>speed * timeDiffS()
;
const spawnBullet = ()=>{
    for (const { userBulletManager  } of query({
        userBulletManager: UserBulletManager
    })){
        if (!keyDown(KeyCodes.Space)) return;
        if (timeMS() - userBulletManager().lastBulletFiredTime < 100) return;
        userBulletManager({
            lastBulletFiredTime: timeMS()
        });
        for (const { position  } of query({
            user: User,
            position: Position
        })){
            createBullet(position());
        }
    }
};
const moveBullet = ()=>{
    for (const { userBullet , position , size , hitbox  } of query({
        userBullet: UserBullet,
        position: Position,
        size: Size,
        hitbox: Hitbox
    })){
        const { speed  } = userBullet();
        position(add1(position(), right(calculateBulletSpeedForFrame(speed))));
        updateHitboxTransform(hitbox, position(), size());
    }
};
const removeBullet = ()=>{
    for (const { position , deleteQueueManager  } of query({
        userBullet: Size,
        position: Position,
        deleteQueueManager: DeleteQueueManager
    })){
        if (position().x < 1920) return;
        deleteQueueManager({
            markedForDeletion: true
        });
    }
};
const bulletEnemyManager = ()=>{
    const enemies = [
        ...query({
            enemy: Enemy,
            entityId: EntityId
        })
    ];
    for (const { hitbox , deleteQueueManager  } of query({
        userBullet: UserBullet,
        entityId: EntityId,
        hitbox: Hitbox,
        deleteQueueManager: DeleteQueueManager
    })){
        const { entityInteractions  } = hitbox();
        const firstInteractedEnemeyId = entityInteractions.find((entityIdInteraction)=>enemies.some(({ entityId  })=>entityIdInteraction === entityId().id
            )
        );
        if (firstInteractedEnemeyId) {
            damageEnemy(firstInteractedEnemeyId, 20);
            deleteQueueManager({
                markedForDeletion: true
            });
        }
    }
};
update1.add(spawnBullet, moveBullet, bulletEnemyManager, removeBullet);
render.add(()=>{
    for (const { position , size  } of query({
        userBullet: UserBullet,
        position: Position,
        size: Size
    })){
        save();
        beginPath();
        rect(...position(), ...size());
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
                UserBullet
            ])
        ],
        [
            'enemies',
            count([
                Enemy
            ])
        ],
        [
            'hitboxes',
            count([
                Hitbox
            ])
        ], 
    ];
    metrics.forEach(([label, textLog], index)=>{
        save();
        beginPath();
        const count1 = `${label}: ${textLog}`;
        const pos = v(10, 40 + index * 40);
        font(`${40}px serif`);
        fillText(count1, ...pos);
        restore();
    });
});
render.add([
    99999,
    ()=>{
        for (const { hitbox  } of query({
            hitbox: Hitbox
        })){
            const { x , x2 , y , y2  } = hitbox();
            save();
            beginPath();
            moveTo(x, y);
            lineTo(x2, y);
            lineTo(x2, y2);
            lineTo(x, y2);
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
    canvasWorker = wrap1(transferredCanvasWorker);
    return true;
};
const fireEvent = (key, data)=>{
    console.log('fireEvent');
    mod[key].push(data);
};
const run = async ()=>{
    console.log('run');
    if (!canvasWorker) {
        throw new Error('canvasWorker has not been setup yet');
    }
    await activate(canvasWorker);
};
const methods = {
    attachCanvasWorker,
    fireEvent,
    run
};
expose1({
    ...methods,
    ...attachListeners()
});
export { attachCanvasWorker as attachCanvasWorker };
export { fireEvent as fireEvent };
export { run as run };
export { methods as default };
