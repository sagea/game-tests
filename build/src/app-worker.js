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
const Counter = ()=>{
    let number = 0;
    return ()=>number++
    ;
};
const globalCounter = Counter();
const isEvent = (data)=>{
    if (!data) return false;
    if (typeof data !== 'object') return false;
    if ('$$event_type$$' in data) return data;
    return false;
};
const wrap2 = (self)=>{
    const idCounter = Counter();
    const createWorker1 = (...args)=>{
        return new Promise((resolve)=>{
            const id = idCounter();
            const handler = ({ data  })=>{
                if (!isEvent(data)) return;
                if (data.id !== id) return;
                self.removeEventListener('message', handler);
                resolve(data.result);
            };
            self.addEventListener('message', handler);
            self.postMessage({
                $$event_type$$: 'createWorker',
                $$event_state$$: 'out',
                id,
                args: args
            });
        });
    };
    return {
        createWorker: createWorker1
    };
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
const isNumber = (item)=>typeof item === 'number' && isNaN(item) === false
;
function* range(a, b) {
    const hasB = isNumber(b);
    const start1 = hasB ? a : 0;
    const end1 = hasB ? b : a;
    if (start1 > end1) throw new Error('range start is larger than end');
    for(let i = start1; i < end1; i++){
        yield i;
    }
}
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
    justActivated.clear();
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
const addEntity = globalEntityList.addEntity;
const removeEntity = globalEntityList.removeEntity;
globalEntityList.addComponentToEntity;
const count = globalEntityList.count;
const query = globalEntityList.query;
const intersectionBetweenOrderedIntegerLists = (intLists)=>{
    let last2 = intLists[0];
    for(let i = 1; i < intLists.length; i++){
        const current = intLists[i];
        const matches = [];
        const lastLength = last2.length;
        const currentLength = current.length;
        let currentIndexStartingPoint = 0;
        for(let lastIndex = 0; lastIndex < lastLength; lastIndex++){
            const lastId = last2[lastIndex];
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
        last2 = matches;
    }
    return last2;
};
const baseStages = [
    'start',
    'init',
    'main',
    'end'
];
const errors = {
    stageAlreadyExists: (stageName)=>new Error(`Stage with the name "${stageName}" already exists.`)
    ,
    stageDoesNotExist: (stageName)=>new Error(`Stage with the name "${stageName}" does not exist.`)
    ,
    cantAddStageBeforeStart: ()=>new Error(`Not allowed. Can't add any stages before start stage`)
    ,
    cantAddStageAfterEnd: ()=>new Error(`Not allowed. Can't add any stages after end stage`)
};
class App {
    state = {};
    #runcount = 0;
    #stages = new Map(baseStages.map((stage)=>[
            stage,
            new Set()
        ]
    ));
    #plugins = [];
    hasStage(stageName) {
        return this.#stages.has(stageName);
    }
    addStage(stageName) {
        return this.addStageBefore(stageName, 'end');
    }
    addStageBefore(stageName, otherStageName) {
        if (this.hasStage(stageName)) throw errors.stageAlreadyExists(stageName);
        if (!this.hasStage(otherStageName)) throw errors.stageDoesNotExist(otherStageName);
        if (otherStageName === 'start') throw errors.cantAddStageBeforeStart();
        const entries = [
            ...this.#stages
        ];
        const index = entries.findIndex((item)=>item[0] === otherStageName
        );
        entries.splice(index - 1, 0, [
            stageName,
            new Set()
        ]);
        this.#stages = new Map(entries);
        return this;
    }
    addStageAfter(stageName, otherStageName) {
        if (this.hasStage(stageName)) throw errors.stageAlreadyExists(stageName);
        if (!this.hasStage(otherStageName)) throw errors.stageDoesNotExist(otherStageName);
        if (otherStageName === 'end') throw errors.cantAddStageAfterEnd();
        const entries = [
            ...this.#stages
        ];
        const index = entries.findIndex((item)=>item[0] === otherStageName
        );
        entries.splice(index, 0, [
            stageName,
            new Set()
        ]);
        this.#stages = new Map(entries);
        return this;
    }
    addAppSystem(appSystem) {
        const stages = this.#stages.get(appSystem.appStage) || new Set();
        const list = [
            ...stages,
            appSystem
        ].sort((a, b)=>{
            const ass = a.appSystemStage;
            const bss = b.appSystemStage;
            if (ass === bss) return a.order - b.order;
            if (ass === 'pre') return -1;
            if (ass === 'post') return 1;
            if (bss === 'pre') return 1;
            if (bss === 'post') return -1;
            return 0;
        });
        this.#stages.set(appSystem.appStage, new Set(list));
        return this;
    }
    addSystem(...args) {
        const appStage = args.find((item)=>typeof item === 'string'
        );
        const systems = args.filter((item)=>typeof item === 'function'
        );
        const options = args.find((item)=>typeof item === 'object'
        );
        if (systems.length === 0) {
            throw new Error(`Missing system`);
        }
        for (const system of systems){
            const appSystem = {
                appStage: appStage || 'main',
                runOnce: options?.once || false,
                order: options?.order || 0,
                system,
                appSystemStage: options?.stage || 'main'
            };
            this.addAppSystem(appSystem);
        }
        return this;
    }
    addPlugin(appPlugin) {
        this.#plugins.push(appPlugin);
        return this;
    }
    async run() {
        if (this.#runcount === 0) {
            await Promise.all(this.#plugins.map((plugin)=>plugin(this)
            ));
        }
        this.#runcount += 1;
        for (const [stageName, appSystems] of this.#stages){
            for (const appSystem of appSystems){
                const res = appSystem.system(this);
                if (appSystem.runOnce) {
                    this.#stages.get(stageName).delete(appSystem);
                }
                if (res instanceof Promise) {
                    await res;
                }
            }
        }
        return this;
    }
}
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
const deleteQueuePlugin = (app)=>{
    app.addSystem(removeMarkedEntities);
};
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
const hitboxPlugin = (app)=>{
    app.addSystem(clearHitboxInteractions, checkHitboxes);
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
        var left1 = length1;
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
                left1 -= 1;
            }
            combinedIdx += 1;
        }
        return left1 <= 0 ? fn.apply(this, combined) : _arity(left1, _curryN(length1, combined, fn));
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
    return function f3(a, b, c) {
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
                return _isPlaceholder(a) && _isPlaceholder(b) && _isPlaceholder(c) ? f3 : _isPlaceholder(a) && _isPlaceholder(b) ? _curry2(function(_a, _b) {
                    return fn(_a, _b, c);
                }) : _isPlaceholder(a) && _isPlaceholder(c) ? _curry2(function(_a, _c) {
                    return fn(_a, b, _c);
                }) : _isPlaceholder(b) && _isPlaceholder(c) ? _curry2(function(_b, _c) {
                    return fn(a, _b, _c);
                }) : _isPlaceholder(a) ? _curry1(function(_a) {
                    return fn(_a, b, c);
                }) : _isPlaceholder(b) ? _curry1(function(_b) {
                    return fn(a, _b, c);
                }) : _isPlaceholder(c) ? _curry1(function(_c) {
                    return fn(a, b, _c);
                }) : fn(a, b, c);
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
function _has(prop5, obj) {
    return Object.prototype.hasOwnProperty.call(obj, prop5);
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
    spec = mapValues(function(v3) {
        return typeof v3 == 'function' ? v3 : applySpec1(v3);
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
    var type2 = Object.prototype.toString.call(x);
    return type2 === '[object Function]' || type2 === '[object AsyncFunction]' || type2 === '[object GeneratorFunction]' || type2 === '[object AsyncGeneratorFunction]';
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
    return _reduce(function(a, e) {
        return pred(e) ? a + 1 : a;
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
var defaultTo = _curry2(function defaultTo(d, v4) {
    return v4 == null || v4 !== v4 ? d : v4;
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
    var type3 = typeof item;
    var prevSize, newSize;
    switch(type3){
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
                if (!(type3 in set._items)) {
                    if (shouldAdd) {
                        set._items[type3] = {};
                        set._items[type3][item] = true;
                    }
                    return false;
                } else if (item in set._items[type3]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items[type3][item] = true;
                    }
                    return false;
                }
            }
        case 'boolean':
            if (type3 in set._items) {
                var bIdx = item ? 1 : 0;
                if (set._items[type3][bIdx]) {
                    return true;
                } else {
                    if (shouldAdd) {
                        set._items[type3][bIdx] = true;
                    }
                    return false;
                }
            } else {
                if (shouldAdd) {
                    set._items[type3] = item ? [
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
                if (!(type3 in set._items)) {
                    if (shouldAdd) {
                        set._items[type3] = [
                            item
                        ];
                    }
                    return false;
                }
                if (!_includes(item, set._items[type3])) {
                    if (shouldAdd) {
                        set._items[type3].push(item);
                    }
                    return false;
                }
                return true;
            }
        case 'undefined':
            if (set._items[type3]) {
                return true;
            } else {
                if (shouldAdd) {
                    set._items[type3] = true;
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
            type3 = Object.prototype.toString.call(item);
            if (!(type3 in set._items)) {
                if (shouldAdd) {
                    set._items[type3] = [
                        item
                    ];
                }
                return false;
            }
            if (!_includes(item, set._items[type3])) {
                if (shouldAdd) {
                    set._items[type3].push(item);
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
var remove = _curry3(function remove(start2, count2, list) {
    var result = Array.prototype.slice.call(list, 0);
    result.splice(start2, count2);
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
    var type4 = Object.prototype.toString.call(val);
    return type4 === '[object Uint8ClampedArray]' || type4 === '[object Int8Array]' || type4 === '[object Uint8Array]' || type4 === '[object Int16Array]' || type4 === '[object Uint16Array]' || type4 === '[object Int32Array]' || type4 === '[object Uint32Array]' || type4 === '[object Float32Array]' || type4 === '[object Float64Array]' || type4 === '[object BigInt64Array]' || type4 === '[object BigUint64Array]';
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
_curry3(function eqProps(prop12, obj1, obj2) {
    return equals(obj1[prop12], obj2[prop12]);
});
_curry2(function evolve1(transformations, object) {
    if (!_isObject(object) && !__default(object)) {
        return object;
    }
    var result = object instanceof Array ? [] : {};
    var transformation, key, type5;
    for(key in object){
        transformation = transformations[key];
        type5 = typeof transformation;
        result[key] = type5 === 'function' ? transformation(object[key]) : transformation && type5 === 'object' ? evolve1(transformation, object[key]) : object[key];
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
    return equals(val, prop(name, obj));
});
_curry3(function propIs(type6, name, obj) {
    return is(type6, prop(name, obj));
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
_curry3(function set(lens2, v5, x) {
    return over(lens2, always(v5), x);
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
        } catch (e) {
            return catcher.apply(this, _concat([
                e
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
const random = (from, to = 0)=>{
    const min = Math.min(from, to);
    const max2 = Math.max(from, to);
    return Math.random() * (max2 - min) + min;
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
const Canvas = State({
    width: 1920,
    height: 1080
});
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
const LoopPlugin = (app)=>{
    app.addSystem('end', {
        stage: 'post',
        order: Infinity
    }, ()=>{
        requestAnimationFrame((time)=>{
            attachTimes(time);
            app.run();
        });
    });
};
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
const add1 = curry((a, b)=>{
    return v(a.x + b.x, a.y + b.y);
});
const up = (value)=>v(0, value * -1)
;
const down = (value)=>v(0, value)
;
const left = (value)=>v(value * -1, 0)
;
const right = (value)=>v(value, 0)
;
const Position = Component();
const Size = Component();
const resources = {
    USER_IMAGE: '/sprites/MainPlayer.png'
};
new Map();
const createSpriteMatrix = (rowCount, colCount)=>{
    return [
        ...range(rowCount)
    ].map((row)=>{
        return [
            ...range(colCount)
        ].map((col)=>v(col, row)
        );
    });
};
const Sprite = Component();
const spriteSetRow = (sprite, row)=>{
    if (!sprite.active) {
        return {
            ...sprite,
            active: true,
            activeCol: 0,
            activeRow: row
        };
    }
    if (sprite.activeRow === row) {
        return sprite;
    }
    return {
        ...sprite,
        activeCol: 0,
        activeRow: row,
        lastTime: 0
    };
};
const spritePoll = (sprite, deltaTime)=>{
    const { lastTime , interval , matrix , activeRow , activeCol , active: active1  } = sprite;
    if (active1 === false) {
        return sprite;
    }
    const l = lastTime + deltaTime;
    if (l < interval) return {
        ...sprite,
        lastTime: l
    };
    const steps = Math.floor(l / interval);
    const leftover = l % interval;
    const maxCol = matrix[activeRow].length;
    let nextCol = activeCol;
    for (const _ of range(steps)){
        nextCol += 1;
        if (nextCol >= maxCol) {
            nextCol = 0;
        }
    }
    return {
        ...sprite,
        lastTime: leftover,
        activeCol: nextCol
    };
};
const getSpritePos = ({ matrix , activeCol , activeRow  })=>{
    return matrix[activeRow][activeCol];
};
const registeredMethods = new Map();
const listeners = new Set();
const addListener = (callback)=>{
    listeners.add(callback);
    return ()=>removeListener(callback)
    ;
};
const removeListener = (callback)=>{
    listeners.delete(callback);
};
const getRegisteredMethod = (id)=>{
    return registeredMethods.get(id);
};
const createMethod = (method)=>{
    const id = globalCounter();
    registeredMethods.set(id, method.toString());
    return (...args)=>{
        for (const listener of listeners){
            listener(id, args);
        }
    };
};
const User = Component();
const calculateSpeedForFrame = (speed)=>speed * timeDiffS()
;
const spawnUserSystem = ()=>{
    addEntity([
        User({
            speed: 400
        }),
        Position(zero()),
        Size(v(50, 50)),
        Sprite({
            active: false,
            matrix: createSpriteMatrix(2, 4),
            activeRow: 0,
            activeCol: 0,
            lastTime: 0,
            interval: 300
        })
    ]);
};
const moveUserSystem = ()=>{
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
};
const userAnimationSystem = ()=>{
    for (const { sprite  } of query({
        user: User,
        sprite: Sprite
    })){
        const last3 = sprite();
        if (!last3.active) {
            sprite(spriteSetRow(sprite(), 0));
        }
        if (justPressed(KeyCodes.KeyW)) {
            sprite(spriteSetRow(sprite(), 1));
        }
        if (justPressed(KeyCodes.KeyS)) {
            sprite(spriteSetRow(sprite(), 0));
        }
        sprite(spritePoll(sprite(), timeDiffMS()));
    }
};
const drawUser = createMethod((ctx, imageUrl, pos, spritePos)=>{
    performance.mark('drawUser');
    const col = spritePos.x;
    const row = spritePos.y;
    const { x , y  } = pos;
    ctx.save();
    ctx.drawImage(getResource(imageUrl), col * 32, row * 52, 32, 52, x, y, 32, 52);
    ctx.restore();
    performance.mark('drawUser');
});
const renderUserSystem = ()=>{
    for (const { position , sprite  } of query({
        user: User,
        position: Position,
        sprite: Sprite
    })){
        drawUser(resources.USER_IMAGE, position(), getSpritePos(sprite()));
    }
};
const userPlugin = (app)=>{
    app.addSystem('init', {
        once: true
    }, spawnUserSystem).addSystem(moveUserSystem, userAnimationSystem).addSystem('render', renderUserSystem);
};
const Enemy = Component();
const EnemyManager = Component();
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
const spawnEntityManagerSystem = ()=>{
    addEntity([
        EnemyManager({
            lastSpawnTime: 0
        }), 
    ]);
};
const drawEnemy = createMethod((ctx, size, position, healthPercentage, hasTouchedBullet)=>{
    performance.mark('drawEnemy');
    const healthBarPosition = add1(position, up(50));
    const healthbarSize = v(size.x, 20);
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.rect(healthBarPosition.x, healthBarPosition.y, healthbarSize.x, healthbarSize.y);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'green';
    ctx.rect(healthBarPosition.x, healthBarPosition.y, healthbarSize.x * healthPercentage, healthbarSize.y);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = hasTouchedBullet ? 'blue' : 'green';
    ctx.rect(position.x, position.y, size.x, size.y);
    ctx.fill();
    ctx.restore();
    performance.mark('drawEnemy');
});
const renderEnemiesSystem = ()=>{
    for (const { enemy , position , size  } of query({
        enemy: Enemy,
        position: Position,
        size: Size
    })){
        const { health , originalHealth  } = enemy();
        const healthPercentage = health / originalHealth;
        drawEnemy(size(), position(), healthPercentage, false);
    }
};
const EnemyPlugin = (app)=>{
    app.addSystem('init', {
        once: true
    }, spawnEntityManagerSystem).addSystem(spawnEnemies, moveEnemies, enemyRemover).addSystem('render', renderEnemiesSystem);
};
const UserBullet = Component();
const UserBulletManager = Component();
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
const bulletManagerSystem = ()=>{
    addEntity([
        UserBulletManager({
            lastBulletFiredTime: 0
        }), 
    ]);
};
const drawBullet = createMethod((ctx, position, size)=>{
    performance.mark('drawBullet');
    ctx.save();
    ctx.beginPath();
    ctx.rect(position.x, position.y, size.x, size.y);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.restore();
    performance.mark('drawBullet');
});
const bulletRenderSystem = ()=>{
    for (const { position , size  } of query({
        userBullet: UserBullet,
        position: Position,
        size: Size
    })){
        drawBullet(position(), size());
    }
};
const bulletPlugin = (app)=>{
    app.addSystem('init', {
        once: true
    }, bulletManagerSystem).addSystem(spawnBullet, moveBullet, bulletEnemyManager, removeBullet).addSystem('render', bulletRenderSystem);
};
const active = new Set();
const reset = ()=>{
    active.clear();
    performance.clearMarks();
    performance.clearMeasures();
};
const start = (item)=>{
    active.add(item);
    performance.mark(`${item}:start`, {
        detail: 'perf.ts'
    });
};
const end = (item)=>{
    if (active.has(item)) {
        performance.mark(`${item}:end`, {
            detail: 'perf.ts'
        });
        performance.measure(item, `${item}:start`, `${item}:end`);
        active.delete(item);
    }
};
let debugItems = new Map();
const addToGroup = (group, label, value)=>{
    let groupedItems = debugItems.get(group);
    if (!groupedItems) {
        const val = new Map();
        debugItems.set(group, val);
        debugItems = new Map([
            ...debugItems.entries()
        ].sort(([a], [b])=>a.localeCompare(b)
        ));
        groupedItems = val;
    }
    debugItems.set(group, groupedItems);
    groupedItems.set(label, value);
};
const addDebug = (label, value, group = '')=>{
    addToGroup(group, label, value);
};
new EMap(()=>[]
);
const drawText = createMethod((ctx, renderIndex, label, textLog)=>{
    performance.mark('drawText');
    ctx.save();
    ctx.beginPath();
    const fontSize = 40;
    const count1 = `${label} ${textLog}`;
    const pos = v(10, 40 + renderIndex * 40);
    ctx.font = `${fontSize}px serif`;
    ctx.fillText(count1, ...pos);
    ctx.restore();
    performance.mark('drawText');
});
const drawHitbox = createMethod((ctx, x, y, x2, y2)=>{
    const id = 'drawHitbox' + Math.random();
    performance.mark(id);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x, y2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'blue';
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    performance.mark(id);
});
const debugRenderMenu = ()=>{
    let renderIndex = 0;
    addDebug('fps', fps());
    addDebug('Entities', count([
        EntityId
    ]));
    addDebug('bullets', count([
        UserBullet
    ]));
    addDebug('enemies', count([
        Enemy
    ]));
    addDebug('hitboxes', count([
        Hitbox
    ]));
    for (let [groupName, groupitems] of debugItems){
        if (groupName !== '') {
            drawText(renderIndex++, groupName, '');
        }
        let prefix = groupName !== '' ? '  ' : '';
        for (let [key, value] of groupitems){
            drawText(renderIndex++, prefix + key, value.toString());
        }
    }
};
const renderHitboxes = ()=>{
    for (const { hitbox  } of query({
        hitbox: Hitbox
    })){
        const { x , x2 , y , y2  } = hitbox();
        drawHitbox(x, y, x2, y2);
    }
};
const debugPlugin = (app)=>{
    app.addSystem('start', {
        stage: 'pre'
    }, ()=>{
        reset();
        start('frame');
    }).addSystem('end', {
        stage: 'post'
    }, ()=>end('frame')
    ).addSystem('init', {
        stage: 'pre'
    }, ()=>start('init')
    ).addSystem('init', {
        stage: 'post'
    }, ()=>end('init')
    ).addSystem({
        stage: 'pre'
    }, ()=>start('main')
    ).addSystem({
        stage: 'post'
    }, ()=>end('main')
    ).addSystem('render', {
        stage: 'pre',
        order: -Infinity
    }, ()=>start('render')
    ).addSystem('render', {
        stage: 'post',
        order: Infinity
    }, ()=>end('render')
    ).addSystem('render', {
        order: 99999
    }, renderHitboxes, debugRenderMenu);
};
const attachCanvasWorkerToPort = (port)=>{
    const comlink = wrap1(port);
    const registeredMethods1 = new Set();
    const registering = new Map();
    let drawQueue = [];
    const registerMethod = async (id, methodString)=>{
        if (registeredMethods1.has(id)) return;
        if (registering.has(id)) return;
        const promise = comlink.registerDrawMethod(id, methodString);
        registering.set(id, promise);
        await promise.then(()=>{
            registering.delete(id);
            registeredMethods1.add(id);
        });
    };
    const draw = (id, args)=>{
        drawQueue.push([
            id,
            args
        ]);
    };
    const drawAllQueued = async ()=>{
        if (registering.size) {
            await Promise.all(Array.from(registering));
        }
        comlink.drawMany(drawQueue);
        drawQueue = [];
    };
    return {
        setCanvas: (canvas)=>{
            comlink.setCanvas(transfer1(canvas, [
                canvas
            ]));
        },
        draw,
        drawAllQueued,
        registerMethod,
        port: port,
        loadResources: comlink.loadResources
    };
};
const clearCanvas = createMethod((ctx)=>{
    performance.mark('clearCanvas');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    performance.mark('clearCanvas');
});
const OffscreenCanvasPlugin = (worker)=>(app)=>{
        const renderMethodCaller = (id, args)=>{
            worker.registerMethod(id, getRegisteredMethod(id));
            worker.draw(id, args);
        };
        app.addStageAfter('render', 'main').addSystem('render', {
            stage: 'pre'
        }, ()=>addListener(renderMethodCaller)
        ).addSystem('render', {
            stage: 'post'
        }, ()=>removeListener(renderMethodCaller)
        , ()=>worker.drawAllQueued()
        ).addSystem('render', clearCanvas);
    }
;
const startApp = async (canvasWorker)=>{
    const resourceUrls = Array.from(Object.values(resources));
    await canvasWorker.loadResources(resourceUrls);
    return new App().addPlugin(LoopPlugin).addPlugin(OffscreenCanvasPlugin(canvasWorker)).addPlugin((app)=>app.addSystem(applySnapshot)
    ).addPlugin(deleteQueuePlugin).addPlugin(hitboxPlugin).addPlugin(EnemyPlugin).addPlugin(bulletPlugin).addPlugin(userPlugin).addPlugin(debugPlugin).run();
};
const { createWorker  } = wrap2(self);
const run = async (canvas)=>{
    console.log('run');
    const worker = await createWorker('/src/offthread-worker.js', {
        type: 'module'
    });
    const canvasWorker = attachCanvasWorkerToPort(worker);
    canvasWorker.setCanvas(canvas);
    await startApp(canvasWorker);
};
const methods = {
    run
};
expose1({
    ...methods,
    ...attachListeners()
});
export { run as run };
export { methods as default };
