var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next, lookup.has(block.key));
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    class Connection {
        constructor(id, parentPort, parentPortInput, parentNode, externalNode, externalPort) {
            this.dragType = 'connection';
            this.id = id;
            this.parentPort = parentPort;
            this.parentNode = parentNode;
            this.parentPortInput = parentPortInput;
        }
        setEndPoints(endPointX, endPointY) {
            this.endPointX = endPointX;
            this.endPointY = endPointY;
        }
        setConnectedPort(externalPort, externalNode) {
            this.externalPort = externalPort;
            this.externalNode = externalNode;
            this.endPointX = externalPort.xPos;
            this.endPointY = externalPort.yPos;
        }
        calculateCurve() {
            let dEndX;
            let dEndY;
            if (this.externalPort == undefined) {
                if (this.endPointX != undefined && this.endPointY != undefined) {
                    dEndX = this.endPointX;
                    dEndY = this.endPointY;
                }
                else {
                    console.error("End point for connection does not exist");
                    return;
                }
            }
            else {
                dEndX = this.externalPort.getXPos();
                dEndY = this.externalPort.getYPos();
            }
            //initialize vars
            let dX = this.parentPort.getXPos();
            let dY = this.parentPort.getYPos();
            //mid-point of line
            let mpX = (dX + dEndX) * 0.5;
            let mpY = (dY + dEndY) * 0.5;
            // angle of perpendicular to line:
            var theta = Math.atan2(dEndY - dY, dEndX - dX) - Math.PI / 2;
            // distance of control point from mid-point of line:
            var offset = 100;
            // location of control point:
            var c1x = mpX + offset * Math.cos(theta);
            var c1y = mpY + offset * Math.sin(theta);
            this.curve = `M${dX} ${dY} Q${c1x} ${c1y} ${dEndX} ${dEndY}`;
            //console.log(curve)
        }
    }
    class Port {
        constructor(isInput, varType, varName) {
            this.xPos = 0;
            this.yPos = 0;
            this.id = 0;
            //default -> 7.5 raio externo
            //default -> 5 raio interno
            this.hiboxSize = 7.5;
            this.isInput = isInput;
            this.varType = varType;
            this.varName = varName;
        }
        knowIfIsInput() {
            return this.isInput;
        }
        getVarType() {
            return this.varType;
        }
        getVarName() {
            return this.varName;
        }
        getXPos() {
            return this.xPos;
        }
        getYPos() {
            return this.yPos;
        }
        setXPos(xPos) {
            this.xPos = xPos;
        }
        setYPos(yPos) {
            this.yPos = yPos;
        }
        setId(id) {
            this.id = id;
        }
    }
    class Module {
        constructor(id, name, xPos, yPos, moduleWidth) {
            this.dragType = 'module';
            //TODO
            //default
            this.functionId = 0;
            this.inputList = [];
            this.outputList = [];
            this.id = id;
            this.name = name;
            this.xPos = xPos;
            this.yPos = yPos;
        }
        addFunctionId(id) {
            this.functionId = id;
        }
        addInputs(inputList) {
            this.inputList = inputList;
        }
        addOutputs(outputList) {
            this.outputList = outputList;
        }
        getId() {
            return this.id;
        }
        getName() {
            return this.name;
        }
        getDragType() {
            return this.dragType;
        }
        getInputList() {
            if (this.inputList) {
                return this.inputList;
            }
            else {
                return '';
            }
        }
        getOutputList() {
            if (this.outputList) {
                return this.outputList;
            }
            else {
                return '';
            }
        }
        getXPos() {
            return this.xPos;
        }
        getYPos() {
            return this.yPos;
        }
        setXPos(xPos) {
            this.xPos = xPos;
        }
        setYPos(yPos) {
            this.yPos = yPos;
        }
        setModuleWidth() {
            //default
            this.moduleWidth = 200;
            let maxInputlength = 0; //size of the bigger input (characters size)
            for (let input of this.inputList) {
                let varTypeSize = input.getVarType().length;
                let varTypeName = input.getVarName().length;
                if (varTypeSize + varTypeName > maxInputlength) {
                    maxInputlength = varTypeSize + varTypeName;
                }
            }
            let maxOutputlength = 0; //size of the bigger output (characters size)
            for (let output of this.outputList) {
                let varTypeSize = output.getVarType().length;
                let varTypeName = output.getVarName().length;
                if (varTypeSize + varTypeName > maxOutputlength) {
                    maxOutputlength = varTypeSize + varTypeName;
                }
            }
            let newWidthValue = (maxInputlength + maxOutputlength) * 8 + 50;
            if (newWidthValue > this.moduleWidth) {
                this.moduleWidth = newWidthValue;
            }
        }
        setModuleHeight() {
            if (this.headerHeight == undefined) {
                this.headerHeight = 40;
            }
            this.moduleHeight = this.headerHeight;
            let maxNumberOfInputs = this.inputList.length; //ammount of inputs
            let maxNumberOfOutputs = this.outputList.length; //ammount of outputs
            let maxNumberOfPorts;
            if (maxNumberOfInputs > maxNumberOfOutputs) {
                maxNumberOfPorts = maxNumberOfInputs;
            }
            else {
                maxNumberOfPorts = maxNumberOfOutputs;
            }
            this.contentHeight = (maxNumberOfPorts) * 30;
            this.moduleHeight += this.contentHeight;
        }
        setPortCoords() {
            let portNumber = 0;
            for (let input of this.inputList) {
                input.setXPos(this.xPos + 15);
                input.setYPos(this.yPos + 50 + (25 * portNumber) + 10);
                portNumber += 1;
            }
            portNumber = 0;
            for (let output of this.outputList) {
                if (this.moduleWidth == undefined) {
                    this.setModuleWidth();
                }
                if (this.moduleWidth != undefined) { //so pq tava a dar erro a dzr que this.moduleWidth n tava definido
                    output.setXPos(this.xPos + this.moduleWidth - 11);
                    output.setYPos(this.yPos + 50 + (25 * portNumber) + 10); //ypos -> posicao do modulo + 50 -> header e espaco  + 25*portNumber -> separacao entre cada port + 10 -> para ficar no centro do circulo +-
                    portNumber += 1;
                }
            }
        }
        addInputConnection(InternalPort, ExternalPort, ExternalNode, Connection) {
            if (this.connectionsInputs == undefined) {
                this.connectionsInputs = [{ InternalPort, ExternalPort, ExternalNode, Connection }];
            }
            else {
                this.connectionsInputs.push({ InternalPort, ExternalPort, ExternalNode, Connection });
            }
        }
        addOutputConnection(InternalPort, ExternalPort, ExternalNode, Connection) {
            if (this.connectionsOutputs == undefined) {
                this.connectionsOutputs = [{ InternalPort, ExternalPort, ExternalNode, Connection }];
            }
            else {
                this.connectionsOutputs.push({ InternalPort, ExternalPort, ExternalNode, Connection });
            }
        }
        getModuleWidth() {
            return this.moduleWidth;
        }
        getModuleHeight() {
            return this.moduleHeight;
        }
        getContentHeight() {
            return this.contentHeight;
        }
        adjustBackgroundMovement(_dx, _dy) {
            this.xPos += _dx;
            this.yPos += _dy;
        }
    }
    class Chart {
        constructor(ProjectName) {
            this.ModuleList = [];
            this.TemporaryConnections = [];
            this.FinalConnections = [];
            //default
            this.nextModuleID = 0;
            this.ProjectName = ProjectName;
        }
        addModule(ModuletoInsert) {
            this.ModuleList.push(ModuletoInsert);
            this.ModuleList = this.ModuleList;
        }
        addFinalConnection(ConnectiontoInsert) {
            this.FinalConnections.push(ConnectiontoInsert);
            this.FinalConnections = this.FinalConnections;
        }
        //TODO to JSON & others
        findIdealModuleId(idStart) {
            let possible = true;
            for (let moduleentry of this.ModuleList) {
                if (idStart == moduleentry.id) {
                    possible = false;
                    break;
                }
            }
            if (possible == false) {
                this.findIdealModuleId(idStart + 1);
            }
            else {
                this.nextModuleID = idStart;
            }
        }
    }

    function connections(node) {
        //last known coords
        let lastX;
        let lastY;
        function handleMousedown(event) {
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            event.stopPropagation();
            node.dispatchEvent(new CustomEvent('connectionStart', {
                detail: { lastX, lastY }
            }));
            window.addEventListener('mousemove', handleMousemove);
            window.addEventListener('mouseup', handleMouseup);
            //added now
            window.addEventListener('mousedown', handleDoubleClick);
        }
        function handleMousemove(event) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent('connectionDrag', {
                detail: { lastX, lastY, dx, dy }
            }));
        }
        function handleMouseup(event) {
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent('connectionEnd', {
                detail: { lastX, lastY }
            }));
            window.removeEventListener('mousemove', handleMousemove);
            window.removeEventListener('mouseup', handleMouseup);
        }
        function handleDoubleClick(event) {
            //added now
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent('connectionEnd', {
                detail: { lastX, lastY }
            }));
            window.removeEventListener('mousemove', handleMousemove);
            window.removeEventListener('mouseup', handleMouseup);
        }
        node.addEventListener('mousedown', handleMousedown);
        return {
            destroy() {
                node.removeEventListener('mousedown', handleMousedown);
                node.removeEventListener('mouseup', handleMouseup);
                node.removeEventListener('mousemove', handleMousemove);
            }
        };
    }

    /* src/FlowModuleInput.svelte generated by Svelte v3.22.2 */
    const file = "src/FlowModuleInput.svelte";

    function create_fragment(ctx) {
    	let g1;
    	let g0;
    	let circle0;
    	let circle1;
    	let circle2;
    	let connections_action;
    	let text_1;
    	let t0;
    	let t1;
    	let t2;
    	let g1_transform_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			text_1 = svg_element("text");
    			t0 = text(/*varType*/ ctx[0]);
    			t1 = text(/*space*/ ctx[7]);
    			t2 = text(/*varName*/ ctx[1]);
    			attr_dev(circle0, "class", "port-outer svelte-uhnajl");
    			attr_dev(circle0, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle0, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle0, "r", "7.5");
    			add_location(circle0, file, 62, 2, 1669);
    			attr_dev(circle1, "class", "port-inner svelte-uhnajl");
    			attr_dev(circle1, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle1, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle1, "r", "5");
    			add_location(circle1, file, 63, 2, 1725);
    			attr_dev(circle2, "class", "port-scrim svelte-uhnajl");
    			attr_dev(circle2, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle2, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle2, "r", "7.5");
    			add_location(circle2, file, 64, 2, 1779);
    			attr_dev(g0, "class", "port svelte-uhnajl");
    			add_location(g0, file, 57, 1, 1494);
    			attr_dev(text_1, "class", "port-label svelte-uhnajl");
    			attr_dev(text_1, "x", /*portLabelX*/ ctx[4]);
    			attr_dev(text_1, "y", /*portLabelY*/ ctx[5]);
    			add_location(text_1, file, 66, 1, 1840);
    			attr_dev(g1, "class", "input-field svelte-uhnajl");
    			attr_dev(g1, "transform", g1_transform_value = "translate(0, " + /*transformValue*/ ctx[6] + ")");
    			add_location(g1, file, 56, 0, 1426);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, g1, anchor);
    			append_dev(g1, g0);
    			append_dev(g0, circle0);
    			append_dev(g0, circle1);
    			append_dev(g0, circle2);
    			append_dev(g1, text_1);
    			append_dev(text_1, t0);
    			append_dev(text_1, t1);
    			append_dev(text_1, t2);
    			if (remount) run_all(dispose);

    			dispose = [
    				action_destroyer(connections_action = connections.call(null, g0)),
    				listen_dev(g0, "connectionDrag", /*handleConnectionDrag*/ ctx[9], false, false, false),
    				listen_dev(g0, "connectionStart", /*handleConnectionStart*/ ctx[8], false, false, false),
    				listen_dev(g0, "connectionEnd", /*handleConnectionEnd*/ ctx[10], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*varType*/ 1) set_data_dev(t0, /*varType*/ ctx[0]);
    			if (dirty & /*varName*/ 2) set_data_dev(t2, /*varName*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { portNumber } = $$props;
    	let { varType } = $$props;
    	let { varName } = $$props;
    	let { port } = $$props;
    	let { xPos } = $$props;
    	let { yPos } = $$props;
    	let cx = xPos + 15;
    	let cy = yPos + 10;
    	let portLabelX = xPos + 28;
    	let portLabelY = yPos + 14;
    	let transformValue = 50 + 25 * portNumber;
    	let cyRealValue = cy + transformValue;
    	let space = " ";
    	port.setXPos(cx);
    	port.setYPos(cyRealValue);
    	port.setId(portNumber);
    	const dispatch = createEventDispatcher();

    	const handleConnectionStart = e => {
    		let { lastX, lastY } = e.detail;

    		dispatch("handleConnectionStart", {
    			xInitial: cx,
    			xFinal: lastX,
    			yInitial: cyRealValue,
    			yFinal: lastY,
    			port: { port }
    		});
    	};

    	const handleConnectionDrag = e => {
    		let { lastX, lastY, dx, dy } = e.detail;

    		dispatch("handleConnectionDrag", {
    			xInitial: cx,
    			xFinal: lastX,
    			yInitial: cyRealValue,
    			yFinal: lastY,
    			port: { port }
    		});
    	};

    	const handleConnectionEnd = e => {
    		let { lastX, lastY, dx, dy } = e.detail;

    		dispatch("handleConnectionEnd", {
    			xInitial: cx,
    			xFinal: lastX,
    			yInitial: cyRealValue,
    			yFinal: lastY,
    			port: { port }
    		});
    	};

    	const writable_props = ["portNumber", "varType", "varName", "port", "xPos", "yPos"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleInput> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleInput", $$slots, []);

    	$$self.$set = $$props => {
    		if ("portNumber" in $$props) $$invalidate(11, portNumber = $$props.portNumber);
    		if ("varType" in $$props) $$invalidate(0, varType = $$props.varType);
    		if ("varName" in $$props) $$invalidate(1, varName = $$props.varName);
    		if ("port" in $$props) $$invalidate(12, port = $$props.port);
    		if ("xPos" in $$props) $$invalidate(13, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(14, yPos = $$props.yPos);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Module,
    		Port,
    		connections,
    		portNumber,
    		varType,
    		varName,
    		port,
    		xPos,
    		yPos,
    		cx,
    		cy,
    		portLabelX,
    		portLabelY,
    		transformValue,
    		cyRealValue,
    		space,
    		dispatch,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("portNumber" in $$props) $$invalidate(11, portNumber = $$props.portNumber);
    		if ("varType" in $$props) $$invalidate(0, varType = $$props.varType);
    		if ("varName" in $$props) $$invalidate(1, varName = $$props.varName);
    		if ("port" in $$props) $$invalidate(12, port = $$props.port);
    		if ("xPos" in $$props) $$invalidate(13, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(14, yPos = $$props.yPos);
    		if ("cx" in $$props) $$invalidate(2, cx = $$props.cx);
    		if ("cy" in $$props) $$invalidate(3, cy = $$props.cy);
    		if ("portLabelX" in $$props) $$invalidate(4, portLabelX = $$props.portLabelX);
    		if ("portLabelY" in $$props) $$invalidate(5, portLabelY = $$props.portLabelY);
    		if ("transformValue" in $$props) $$invalidate(6, transformValue = $$props.transformValue);
    		if ("cyRealValue" in $$props) cyRealValue = $$props.cyRealValue;
    		if ("space" in $$props) $$invalidate(7, space = $$props.space);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		varType,
    		varName,
    		cx,
    		cy,
    		portLabelX,
    		portLabelY,
    		transformValue,
    		space,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd,
    		portNumber,
    		port,
    		xPos,
    		yPos
    	];
    }

    class FlowModuleInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			portNumber: 11,
    			varType: 0,
    			varName: 1,
    			port: 12,
    			xPos: 13,
    			yPos: 14
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleInput",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*portNumber*/ ctx[11] === undefined && !("portNumber" in props)) {
    			console.warn("<FlowModuleInput> was created without expected prop 'portNumber'");
    		}

    		if (/*varType*/ ctx[0] === undefined && !("varType" in props)) {
    			console.warn("<FlowModuleInput> was created without expected prop 'varType'");
    		}

    		if (/*varName*/ ctx[1] === undefined && !("varName" in props)) {
    			console.warn("<FlowModuleInput> was created without expected prop 'varName'");
    		}

    		if (/*port*/ ctx[12] === undefined && !("port" in props)) {
    			console.warn("<FlowModuleInput> was created without expected prop 'port'");
    		}

    		if (/*xPos*/ ctx[13] === undefined && !("xPos" in props)) {
    			console.warn("<FlowModuleInput> was created without expected prop 'xPos'");
    		}

    		if (/*yPos*/ ctx[14] === undefined && !("yPos" in props)) {
    			console.warn("<FlowModuleInput> was created without expected prop 'yPos'");
    		}
    	}

    	get portNumber() {
    		throw new Error("<FlowModuleInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set portNumber(value) {
    		throw new Error("<FlowModuleInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get varType() {
    		throw new Error("<FlowModuleInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set varType(value) {
    		throw new Error("<FlowModuleInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get varName() {
    		throw new Error("<FlowModuleInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set varName(value) {
    		throw new Error("<FlowModuleInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get port() {
    		throw new Error("<FlowModuleInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set port(value) {
    		throw new Error("<FlowModuleInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xPos() {
    		throw new Error("<FlowModuleInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xPos(value) {
    		throw new Error("<FlowModuleInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yPos() {
    		throw new Error("<FlowModuleInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yPos(value) {
    		throw new Error("<FlowModuleInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/FlowModuleOutput.svelte generated by Svelte v3.22.2 */
    const file$1 = "src/FlowModuleOutput.svelte";

    function create_fragment$1(ctx) {
    	let g1;
    	let g0;
    	let circle0;
    	let circle1;
    	let circle2;
    	let connections_action;
    	let text_1;
    	let t0;
    	let t1;
    	let t2;
    	let g1_transform_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			text_1 = svg_element("text");
    			t0 = text(/*varType*/ ctx[0]);
    			t1 = text(/*space*/ ctx[7]);
    			t2 = text(/*varName*/ ctx[1]);
    			attr_dev(circle0, "class", "port-outer svelte-1uz01zx");
    			attr_dev(circle0, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle0, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle0, "r", "7.5");
    			add_location(circle0, file$1, 61, 8, 1729);
    			attr_dev(circle1, "class", "port-inner svelte-1uz01zx");
    			attr_dev(circle1, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle1, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle1, "r", "5");
    			add_location(circle1, file$1, 62, 8, 1791);
    			attr_dev(circle2, "class", "port-scrim svelte-1uz01zx");
    			attr_dev(circle2, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle2, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle2, "r", "7.5");
    			add_location(circle2, file$1, 63, 8, 1851);
    			attr_dev(g0, "class", "port svelte-1uz01zx");
    			add_location(g0, file$1, 56, 4, 1548);
    			attr_dev(text_1, "class", "port-label svelte-1uz01zx");
    			attr_dev(text_1, "x", /*portLabelX*/ ctx[4]);
    			attr_dev(text_1, "y", /*portLabelY*/ ctx[5]);
    			add_location(text_1, file$1, 65, 4, 1918);
    			attr_dev(g1, "class", "output-field svelte-1uz01zx");
    			attr_dev(g1, "transform", g1_transform_value = "translate(0, " + /*transformValue*/ ctx[6] + ")");
    			add_location(g1, file$1, 55, 0, 1476);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, g1, anchor);
    			append_dev(g1, g0);
    			append_dev(g0, circle0);
    			append_dev(g0, circle1);
    			append_dev(g0, circle2);
    			append_dev(g1, text_1);
    			append_dev(text_1, t0);
    			append_dev(text_1, t1);
    			append_dev(text_1, t2);
    			if (remount) run_all(dispose);

    			dispose = [
    				action_destroyer(connections_action = connections.call(null, g0)),
    				listen_dev(g0, "connectionDrag", /*handleConnectionDrag*/ ctx[9], false, false, false),
    				listen_dev(g0, "connectionStart", /*handleConnectionStart*/ ctx[8], false, false, false),
    				listen_dev(g0, "connectionEnd", /*handleConnectionEnd*/ ctx[10], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*varType*/ 1) set_data_dev(t0, /*varType*/ ctx[0]);
    			if (dirty & /*varName*/ 2) set_data_dev(t2, /*varName*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { portNumber } = $$props;
    	let { varType } = $$props;
    	let { varName } = $$props;
    	let { port } = $$props;
    	let { xPos } = $$props;
    	let { yPos } = $$props;
    	let { moduleWidth } = $$props;
    	let cx = xPos + moduleWidth - 11;
    	let cy = yPos + 10;
    	let portLabelX = xPos + moduleWidth - 24;
    	let portLabelY = yPos + 14;
    	let transformValue = 50 + 25 * portNumber;
    	let cyRealValue = cy + transformValue;
    	let space = " ";
    	port.setXPos(cx);
    	port.setYPos(cyRealValue);
    	port.setId(portNumber);
    	const dispatch = createEventDispatcher();

    	const handleConnectionStart = e => {
    		let { lastX, lastY } = e.detail;

    		dispatch("handleConnectionStart", {
    			xInitial: cx,
    			xFinal: lastX,
    			yInitial: cyRealValue,
    			yFinal: lastY,
    			port: { port }
    		});
    	};

    	const handleConnectionDrag = e => {
    		let { lastX, lastY, dx, dy } = e.detail;

    		dispatch("handleConnectionDrag", {
    			xInitial: cx,
    			xFinal: lastX,
    			yInitial: cyRealValue,
    			yFinal: lastY,
    			port: { port }
    		});
    	};

    	const handleConnectionEnd = e => {
    		let { lastX, lastY, dx, dy } = e.detail;

    		dispatch("handleConnectionEnd", {
    			xInitial: cx,
    			xFinal: lastX,
    			yInitial: cyRealValue,
    			yFinal: lastY,
    			port: { port }
    		});
    	};

    	const writable_props = ["portNumber", "varType", "varName", "port", "xPos", "yPos", "moduleWidth"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleOutput> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleOutput", $$slots, []);

    	$$self.$set = $$props => {
    		if ("portNumber" in $$props) $$invalidate(11, portNumber = $$props.portNumber);
    		if ("varType" in $$props) $$invalidate(0, varType = $$props.varType);
    		if ("varName" in $$props) $$invalidate(1, varName = $$props.varName);
    		if ("port" in $$props) $$invalidate(12, port = $$props.port);
    		if ("xPos" in $$props) $$invalidate(13, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(14, yPos = $$props.yPos);
    		if ("moduleWidth" in $$props) $$invalidate(15, moduleWidth = $$props.moduleWidth);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Module,
    		Port,
    		connections,
    		portNumber,
    		varType,
    		varName,
    		port,
    		xPos,
    		yPos,
    		moduleWidth,
    		cx,
    		cy,
    		portLabelX,
    		portLabelY,
    		transformValue,
    		cyRealValue,
    		space,
    		dispatch,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("portNumber" in $$props) $$invalidate(11, portNumber = $$props.portNumber);
    		if ("varType" in $$props) $$invalidate(0, varType = $$props.varType);
    		if ("varName" in $$props) $$invalidate(1, varName = $$props.varName);
    		if ("port" in $$props) $$invalidate(12, port = $$props.port);
    		if ("xPos" in $$props) $$invalidate(13, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(14, yPos = $$props.yPos);
    		if ("moduleWidth" in $$props) $$invalidate(15, moduleWidth = $$props.moduleWidth);
    		if ("cx" in $$props) $$invalidate(2, cx = $$props.cx);
    		if ("cy" in $$props) $$invalidate(3, cy = $$props.cy);
    		if ("portLabelX" in $$props) $$invalidate(4, portLabelX = $$props.portLabelX);
    		if ("portLabelY" in $$props) $$invalidate(5, portLabelY = $$props.portLabelY);
    		if ("transformValue" in $$props) $$invalidate(6, transformValue = $$props.transformValue);
    		if ("cyRealValue" in $$props) cyRealValue = $$props.cyRealValue;
    		if ("space" in $$props) $$invalidate(7, space = $$props.space);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		varType,
    		varName,
    		cx,
    		cy,
    		portLabelX,
    		portLabelY,
    		transformValue,
    		space,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd,
    		portNumber,
    		port,
    		xPos,
    		yPos,
    		moduleWidth
    	];
    }

    class FlowModuleOutput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			portNumber: 11,
    			varType: 0,
    			varName: 1,
    			port: 12,
    			xPos: 13,
    			yPos: 14,
    			moduleWidth: 15
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleOutput",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*portNumber*/ ctx[11] === undefined && !("portNumber" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'portNumber'");
    		}

    		if (/*varType*/ ctx[0] === undefined && !("varType" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'varType'");
    		}

    		if (/*varName*/ ctx[1] === undefined && !("varName" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'varName'");
    		}

    		if (/*port*/ ctx[12] === undefined && !("port" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'port'");
    		}

    		if (/*xPos*/ ctx[13] === undefined && !("xPos" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'xPos'");
    		}

    		if (/*yPos*/ ctx[14] === undefined && !("yPos" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'yPos'");
    		}

    		if (/*moduleWidth*/ ctx[15] === undefined && !("moduleWidth" in props)) {
    			console.warn("<FlowModuleOutput> was created without expected prop 'moduleWidth'");
    		}
    	}

    	get portNumber() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set portNumber(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get varType() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set varType(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get varName() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set varName(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get port() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set port(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xPos() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xPos(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yPos() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yPos(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moduleWidth() {
    		throw new Error("<FlowModuleOutput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moduleWidth(value) {
    		throw new Error("<FlowModuleOutput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/FlowModuleContent.svelte generated by Svelte v3.22.2 */
    const file$2 = "src/FlowModuleContent.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (53:8) {#each InputList as item, i (i)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let current;

    	const flowmoduleinput = new FlowModuleInput({
    			props: {
    				port: /*item*/ ctx[13],
    				xPos: /*xPos*/ ctx[0],
    				yPos: /*yPos*/ ctx[1],
    				portNumber: /*i*/ ctx[15],
    				varType: /*item*/ ctx[13].getVarType(),
    				varName: /*item*/ ctx[13].getVarName()
    			},
    			$$inline: true
    		});

    	flowmoduleinput.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[9]);
    	flowmoduleinput.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[10]);
    	flowmoduleinput.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[11]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(flowmoduleinput.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(flowmoduleinput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const flowmoduleinput_changes = {};
    			if (dirty & /*InputList*/ 16) flowmoduleinput_changes.port = /*item*/ ctx[13];
    			if (dirty & /*xPos*/ 1) flowmoduleinput_changes.xPos = /*xPos*/ ctx[0];
    			if (dirty & /*yPos*/ 2) flowmoduleinput_changes.yPos = /*yPos*/ ctx[1];
    			if (dirty & /*InputList*/ 16) flowmoduleinput_changes.portNumber = /*i*/ ctx[15];
    			if (dirty & /*InputList*/ 16) flowmoduleinput_changes.varType = /*item*/ ctx[13].getVarType();
    			if (dirty & /*InputList*/ 16) flowmoduleinput_changes.varName = /*item*/ ctx[13].getVarName();
    			flowmoduleinput.$set(flowmoduleinput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmoduleinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmoduleinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(flowmoduleinput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(53:8) {#each InputList as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    // (67:8) {#each OutputList as item, i (i)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let current;

    	const flowmoduleoutput = new FlowModuleOutput({
    			props: {
    				port: /*item*/ ctx[13],
    				xPos: /*xPos*/ ctx[0],
    				yPos: /*yPos*/ ctx[1],
    				portNumber: /*i*/ ctx[15],
    				moduleWidth: /*moduleWidth*/ ctx[2],
    				varType: /*item*/ ctx[13].getVarType(),
    				varName: /*item*/ ctx[13].getVarName()
    			},
    			$$inline: true
    		});

    	flowmoduleoutput.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[9]);
    	flowmoduleoutput.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[10]);
    	flowmoduleoutput.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[11]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(flowmoduleoutput.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(flowmoduleoutput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const flowmoduleoutput_changes = {};
    			if (dirty & /*OutputList*/ 8) flowmoduleoutput_changes.port = /*item*/ ctx[13];
    			if (dirty & /*xPos*/ 1) flowmoduleoutput_changes.xPos = /*xPos*/ ctx[0];
    			if (dirty & /*yPos*/ 2) flowmoduleoutput_changes.yPos = /*yPos*/ ctx[1];
    			if (dirty & /*OutputList*/ 8) flowmoduleoutput_changes.portNumber = /*i*/ ctx[15];
    			if (dirty & /*moduleWidth*/ 4) flowmoduleoutput_changes.moduleWidth = /*moduleWidth*/ ctx[2];
    			if (dirty & /*OutputList*/ 8) flowmoduleoutput_changes.varType = /*item*/ ctx[13].getVarType();
    			if (dirty & /*OutputList*/ 8) flowmoduleoutput_changes.varName = /*item*/ ctx[13].getVarName();
    			flowmoduleoutput.$set(flowmoduleoutput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmoduleoutput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmoduleoutput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(flowmoduleoutput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(67:8) {#each OutputList as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let g2;
    	let rect0;
    	let rect1;
    	let g0;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let g1;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let current;
    	let each_value_1 = /*InputList*/ ctx[4];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*i*/ ctx[15];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*OutputList*/ ctx[3];
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*i*/ ctx[15];
    	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			g2 = svg_element("g");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			g0 = svg_element("g");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			g1 = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(rect0, "class", "content-round-rect");
    			attr_dev(rect0, "width", /*moduleWidth*/ ctx[2]);
    			attr_dev(rect0, "height", /*contentHeight*/ ctx[5]);
    			attr_dev(rect0, "x", /*contentRectX*/ ctx[7]);
    			attr_dev(rect0, "y", /*contentRectY*/ ctx[8]);
    			attr_dev(rect0, "rx", "4");
    			attr_dev(rect0, "ry", "4");
    			add_location(rect0, file$2, 49, 4, 1617);
    			attr_dev(rect1, "class", "content-rect");
    			attr_dev(rect1, "width", /*moduleWidth*/ ctx[2]);
    			attr_dev(rect1, "height", /*contentHeightRect*/ ctx[6]);
    			attr_dev(rect1, "x", /*contentRectX*/ ctx[7]);
    			attr_dev(rect1, "y", /*contentRectY*/ ctx[8]);
    			add_location(rect1, file$2, 50, 4, 1748);
    			attr_dev(g0, "class", "inputs");
    			add_location(g0, file$2, 51, 4, 1864);
    			attr_dev(g1, "class", "outputs");
    			add_location(g1, file$2, 65, 4, 2387);
    			attr_dev(g2, "class", "node-content svelte-puufcv");
    			add_location(g2, file$2, 48, 0, 1588);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g2, anchor);
    			append_dev(g2, rect0);
    			append_dev(g2, rect1);
    			append_dev(g2, g0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(g0, null);
    			}

    			append_dev(g2, g1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*moduleWidth*/ 4) {
    				attr_dev(rect0, "width", /*moduleWidth*/ ctx[2]);
    			}

    			if (!current || dirty & /*contentHeight*/ 32) {
    				attr_dev(rect0, "height", /*contentHeight*/ ctx[5]);
    			}

    			if (!current || dirty & /*moduleWidth*/ 4) {
    				attr_dev(rect1, "width", /*moduleWidth*/ ctx[2]);
    			}

    			if (dirty & /*InputList, xPos, yPos, handleConnectionStart, handleConnectionDrag, handleConnectionEnd*/ 3603) {
    				const each_value_1 = /*InputList*/ ctx[4];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, g0, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (dirty & /*OutputList, xPos, yPos, moduleWidth, handleConnectionStart, handleConnectionDrag, handleConnectionEnd*/ 3599) {
    				const each_value = /*OutputList*/ ctx[3];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, g1, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { xPos } = $$props;
    	let { yPos } = $$props;
    	let { moduleWidth } = $$props;
    	let { OutputList } = $$props;
    	let { InputList } = $$props;
    	let { contentHeight } = $$props;
    	let contentHeightRect = contentHeight - 5;

    	//if needed to change or adjust the background of the content
    	let contentRectX = xPos + 2;

    	let contentRectY = yPos + 44; //40 is the header size... can make it a attribute later //TODO
    	const dispatch = createEventDispatcher();

    	const handleConnectionStart = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port } = e.detail;

    		dispatch("handleConnectionStart", {
    			xInitial: { xInitial },
    			xFinal: { xFinal },
    			yInitial: { yInitial },
    			yFinal: { yFinal },
    			port: { port }
    		});
    	};

    	const handleConnectionDrag = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port } = e.detail;

    		dispatch("handleConnectionDrag", {
    			xInitial: { xInitial },
    			xFinal: { xFinal },
    			yInitial: { yInitial },
    			yFinal: { yFinal },
    			port: { port }
    		});
    	};

    	const handleConnectionEnd = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port } = e.detail;

    		dispatch("handleConnectionEnd", {
    			xInitial: { xInitial },
    			xFinal: { xFinal },
    			yInitial: { yInitial },
    			yFinal: { yFinal },
    			port: { port }
    		});
    	};

    	const writable_props = ["xPos", "yPos", "moduleWidth", "OutputList", "InputList", "contentHeight"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleContent> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleContent", $$slots, []);

    	$$self.$set = $$props => {
    		if ("xPos" in $$props) $$invalidate(0, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(1, yPos = $$props.yPos);
    		if ("moduleWidth" in $$props) $$invalidate(2, moduleWidth = $$props.moduleWidth);
    		if ("OutputList" in $$props) $$invalidate(3, OutputList = $$props.OutputList);
    		if ("InputList" in $$props) $$invalidate(4, InputList = $$props.InputList);
    		if ("contentHeight" in $$props) $$invalidate(5, contentHeight = $$props.contentHeight);
    	};

    	$$self.$capture_state = () => ({
    		FlowModuleInput,
    		FlowModuleOutput,
    		Module,
    		Port,
    		Connection,
    		createEventDispatcher,
    		xPos,
    		yPos,
    		moduleWidth,
    		OutputList,
    		InputList,
    		contentHeight,
    		contentHeightRect,
    		contentRectX,
    		contentRectY,
    		dispatch,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("xPos" in $$props) $$invalidate(0, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(1, yPos = $$props.yPos);
    		if ("moduleWidth" in $$props) $$invalidate(2, moduleWidth = $$props.moduleWidth);
    		if ("OutputList" in $$props) $$invalidate(3, OutputList = $$props.OutputList);
    		if ("InputList" in $$props) $$invalidate(4, InputList = $$props.InputList);
    		if ("contentHeight" in $$props) $$invalidate(5, contentHeight = $$props.contentHeight);
    		if ("contentHeightRect" in $$props) $$invalidate(6, contentHeightRect = $$props.contentHeightRect);
    		if ("contentRectX" in $$props) $$invalidate(7, contentRectX = $$props.contentRectX);
    		if ("contentRectY" in $$props) $$invalidate(8, contentRectY = $$props.contentRectY);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		xPos,
    		yPos,
    		moduleWidth,
    		OutputList,
    		InputList,
    		contentHeight,
    		contentHeightRect,
    		contentRectX,
    		contentRectY,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	];
    }

    class FlowModuleContent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			xPos: 0,
    			yPos: 1,
    			moduleWidth: 2,
    			OutputList: 3,
    			InputList: 4,
    			contentHeight: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleContent",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*xPos*/ ctx[0] === undefined && !("xPos" in props)) {
    			console.warn("<FlowModuleContent> was created without expected prop 'xPos'");
    		}

    		if (/*yPos*/ ctx[1] === undefined && !("yPos" in props)) {
    			console.warn("<FlowModuleContent> was created without expected prop 'yPos'");
    		}

    		if (/*moduleWidth*/ ctx[2] === undefined && !("moduleWidth" in props)) {
    			console.warn("<FlowModuleContent> was created without expected prop 'moduleWidth'");
    		}

    		if (/*OutputList*/ ctx[3] === undefined && !("OutputList" in props)) {
    			console.warn("<FlowModuleContent> was created without expected prop 'OutputList'");
    		}

    		if (/*InputList*/ ctx[4] === undefined && !("InputList" in props)) {
    			console.warn("<FlowModuleContent> was created without expected prop 'InputList'");
    		}

    		if (/*contentHeight*/ ctx[5] === undefined && !("contentHeight" in props)) {
    			console.warn("<FlowModuleContent> was created without expected prop 'contentHeight'");
    		}
    	}

    	get xPos() {
    		throw new Error("<FlowModuleContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xPos(value) {
    		throw new Error("<FlowModuleContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yPos() {
    		throw new Error("<FlowModuleContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yPos(value) {
    		throw new Error("<FlowModuleContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moduleWidth() {
    		throw new Error("<FlowModuleContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moduleWidth(value) {
    		throw new Error("<FlowModuleContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get OutputList() {
    		throw new Error("<FlowModuleContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set OutputList(value) {
    		throw new Error("<FlowModuleContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get InputList() {
    		throw new Error("<FlowModuleContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set InputList(value) {
    		throw new Error("<FlowModuleContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get contentHeight() {
    		throw new Error("<FlowModuleContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set contentHeight(value) {
    		throw new Error("<FlowModuleContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/FlowModuleHeader.svelte generated by Svelte v3.22.2 */

    const file$3 = "src/FlowModuleHeader.svelte";

    function create_fragment$3(ctx) {
    	let g;
    	let rect0;
    	let rect1;
    	let text_1;
    	let t;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			text_1 = svg_element("text");
    			t = text(/*ModuleName*/ ctx[0]);
    			attr_dev(rect0, "class", "header-round-rect");
    			attr_dev(rect0, "width", /*moduleWidth*/ ctx[1]);
    			attr_dev(rect0, "height", "40");
    			attr_dev(rect0, "x", /*xPosHeader*/ ctx[2]);
    			attr_dev(rect0, "y", /*yPosHeader*/ ctx[3]);
    			attr_dev(rect0, "rx", "4");
    			attr_dev(rect0, "ry", "4");
    			add_location(rect0, file$3, 13, 4, 384);
    			attr_dev(rect1, "class", "header-rect");
    			attr_dev(rect1, "width", /*moduleWidth*/ ctx[1]);
    			attr_dev(rect1, "height", "36");
    			attr_dev(rect1, "x", /*headerRectX*/ ctx[6]);
    			attr_dev(rect1, "y", /*headerRectY*/ ctx[7]);
    			add_location(rect1, file$3, 14, 4, 499);
    			attr_dev(text_1, "class", "header-title svelte-19oxj6a");
    			attr_dev(text_1, "x", /*headerTitleX*/ ctx[4]);
    			attr_dev(text_1, "y", /*headerTitleY*/ ctx[5]);
    			add_location(text_1, file$3, 15, 4, 596);
    			attr_dev(g, "class", "node-header svelte-19oxj6a");
    			add_location(g, file$3, 12, 0, 356);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, rect0);
    			append_dev(g, rect1);
    			append_dev(g, text_1);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*moduleWidth*/ 2) {
    				attr_dev(rect0, "width", /*moduleWidth*/ ctx[1]);
    			}

    			if (dirty & /*moduleWidth*/ 2) {
    				attr_dev(rect1, "width", /*moduleWidth*/ ctx[1]);
    			}

    			if (dirty & /*ModuleName*/ 1) set_data_dev(t, /*ModuleName*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { ModuleName } = $$props;
    	let { moduleWidth } = $$props;
    	let { xPos } = $$props;
    	let { yPos } = $$props;
    	let xPosHeader = xPos + 2;
    	let yPosHeader = yPos + 2;
    	let headerTitleX = xPosHeader + moduleWidth / 2;
    	let headerTitleY = yPosHeader + 30;

    	//alterar possivelmente o fundo do header e ajustar
    	let headerRectX = xPos;

    	let headerRectY = yPos;
    	const writable_props = ["ModuleName", "moduleWidth", "xPos", "yPos"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleHeader> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleHeader", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ModuleName" in $$props) $$invalidate(0, ModuleName = $$props.ModuleName);
    		if ("moduleWidth" in $$props) $$invalidate(1, moduleWidth = $$props.moduleWidth);
    		if ("xPos" in $$props) $$invalidate(8, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(9, yPos = $$props.yPos);
    	};

    	$$self.$capture_state = () => ({
    		ModuleName,
    		moduleWidth,
    		xPos,
    		yPos,
    		xPosHeader,
    		yPosHeader,
    		headerTitleX,
    		headerTitleY,
    		headerRectX,
    		headerRectY
    	});

    	$$self.$inject_state = $$props => {
    		if ("ModuleName" in $$props) $$invalidate(0, ModuleName = $$props.ModuleName);
    		if ("moduleWidth" in $$props) $$invalidate(1, moduleWidth = $$props.moduleWidth);
    		if ("xPos" in $$props) $$invalidate(8, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(9, yPos = $$props.yPos);
    		if ("xPosHeader" in $$props) $$invalidate(2, xPosHeader = $$props.xPosHeader);
    		if ("yPosHeader" in $$props) $$invalidate(3, yPosHeader = $$props.yPosHeader);
    		if ("headerTitleX" in $$props) $$invalidate(4, headerTitleX = $$props.headerTitleX);
    		if ("headerTitleY" in $$props) $$invalidate(5, headerTitleY = $$props.headerTitleY);
    		if ("headerRectX" in $$props) $$invalidate(6, headerRectX = $$props.headerRectX);
    		if ("headerRectY" in $$props) $$invalidate(7, headerRectY = $$props.headerRectY);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		ModuleName,
    		moduleWidth,
    		xPosHeader,
    		yPosHeader,
    		headerTitleX,
    		headerTitleY,
    		headerRectX,
    		headerRectY,
    		xPos,
    		yPos
    	];
    }

    class FlowModuleHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			ModuleName: 0,
    			moduleWidth: 1,
    			xPos: 8,
    			yPos: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleHeader",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ModuleName*/ ctx[0] === undefined && !("ModuleName" in props)) {
    			console.warn("<FlowModuleHeader> was created without expected prop 'ModuleName'");
    		}

    		if (/*moduleWidth*/ ctx[1] === undefined && !("moduleWidth" in props)) {
    			console.warn("<FlowModuleHeader> was created without expected prop 'moduleWidth'");
    		}

    		if (/*xPos*/ ctx[8] === undefined && !("xPos" in props)) {
    			console.warn("<FlowModuleHeader> was created without expected prop 'xPos'");
    		}

    		if (/*yPos*/ ctx[9] === undefined && !("yPos" in props)) {
    			console.warn("<FlowModuleHeader> was created without expected prop 'yPos'");
    		}
    	}

    	get ModuleName() {
    		throw new Error("<FlowModuleHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ModuleName(value) {
    		throw new Error("<FlowModuleHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moduleWidth() {
    		throw new Error("<FlowModuleHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moduleWidth(value) {
    		throw new Error("<FlowModuleHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xPos() {
    		throw new Error("<FlowModuleHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xPos(value) {
    		throw new Error("<FlowModuleHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yPos() {
    		throw new Error("<FlowModuleHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yPos(value) {
    		throw new Error("<FlowModuleHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function tick_spring(ctx, last_value, current_value, target_value) {
        if (typeof current_value === 'number' || is_date(current_value)) {
            // @ts-ignore
            const delta = target_value - current_value;
            // @ts-ignore
            const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
            const spring = ctx.opts.stiffness * delta;
            const damper = ctx.opts.damping * velocity;
            const acceleration = (spring - damper) * ctx.inv_mass;
            const d = (velocity + acceleration) * ctx.dt;
            if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
                return target_value; // settled
            }
            else {
                ctx.settled = false; // signal loop to keep ticking
                // @ts-ignore
                return is_date(current_value) ?
                    new Date(current_value.getTime() + d) : current_value + d;
            }
        }
        else if (Array.isArray(current_value)) {
            // @ts-ignore
            return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
        }
        else if (typeof current_value === 'object') {
            const next_value = {};
            for (const k in current_value)
                // @ts-ignore
                next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
            // @ts-ignore
            return next_value;
        }
        else {
            throw new Error(`Cannot spring ${typeof current_value} values`);
        }
    }
    function spring(value, opts = {}) {
        const store = writable(value);
        const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
        let last_time;
        let task;
        let current_token;
        let last_value = value;
        let target_value = value;
        let inv_mass = 1;
        let inv_mass_recovery_rate = 0;
        let cancel_task = false;
        function set(new_value, opts = {}) {
            target_value = new_value;
            const token = current_token = {};
            if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
                cancel_task = true; // cancel any running animation
                last_time = now();
                last_value = new_value;
                store.set(value = target_value);
                return Promise.resolve();
            }
            else if (opts.soft) {
                const rate = opts.soft === true ? .5 : +opts.soft;
                inv_mass_recovery_rate = 1 / (rate * 60);
                inv_mass = 0; // infinite mass, unaffected by spring forces
            }
            if (!task) {
                last_time = now();
                cancel_task = false;
                task = loop(now => {
                    if (cancel_task) {
                        cancel_task = false;
                        task = null;
                        return false;
                    }
                    inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                    const ctx = {
                        inv_mass,
                        opts: spring,
                        settled: true,
                        dt: (now - last_time) * 60 / 1000
                    };
                    const next_value = tick_spring(ctx, last_value, value, target_value);
                    last_time = now;
                    last_value = value;
                    store.set(value = next_value);
                    if (ctx.settled)
                        task = null;
                    return !ctx.settled;
                });
            }
            return new Promise(fulfil => {
                task.promise.then(() => {
                    if (token === current_token)
                        fulfil();
                });
            });
        }
        const spring = {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe,
            stiffness,
            damping,
            precision
        };
        return spring;
    }

    function draggable(node) {
        //last known coords
        let lastX;
        let lastY;
        function handleMousedown(event) {
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            event.stopPropagation();
            node.dispatchEvent(new CustomEvent('dragstart', {
                detail: { lastX, lastY }
            }));
            window.addEventListener('mousemove', handleMousemove);
            window.addEventListener('mouseup', handleMouseup);
        }
        function handleMousemove(event) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent('dragmove', {
                detail: { lastX, lastY, dx, dy }
            }));
        }
        function handleMouseup(event) {
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent('dragend', {
                detail: { lastX, lastY }
            }));
            window.removeEventListener('mousemove', handleMousemove);
            window.removeEventListener('mouseup', handleMouseup);
        }
        node.addEventListener('mousedown', handleMousedown);
        return {
            destroy() {
                node.removeEventListener('mousedown', handleMousedown);
                node.removeEventListener('mouseup', handleMouseup);
                node.removeEventListener('mousemove', handleMousemove);
            }
        };
    }

    /* src/FlowModule.svelte generated by Svelte v3.22.2 */
    const file$4 = "src/FlowModule.svelte";

    function create_fragment$4(ctx) {
    	let g1;
    	let rect_1;
    	let g0;
    	let draggable_action;
    	let g1_transform_value;
    	let current;
    	let dispose;

    	const flowmoduleheader = new FlowModuleHeader({
    			props: {
    				ModuleName: /*StrucModule*/ ctx[0].getName(),
    				moduleWidth: /*moduleWidth*/ ctx[8],
    				xPos: /*xPos*/ ctx[4],
    				yPos: /*yPos*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const flowmodulecontent = new FlowModuleContent({
    			props: {
    				moduleWidth: /*moduleWidth*/ ctx[8],
    				xPos: /*xPos*/ ctx[4],
    				yPos: /*yPos*/ ctx[5],
    				OutputList: /*StrucModule*/ ctx[0].getOutputList(),
    				InputList: /*StrucModule*/ ctx[0].getInputList(),
    				contentHeight: /*contentHeight*/ ctx[7]
    			},
    			$$inline: true
    		});

    	flowmodulecontent.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[12]);
    	flowmodulecontent.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[13]);
    	flowmodulecontent.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[14]);

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");
    			rect_1 = svg_element("rect");
    			g0 = svg_element("g");
    			create_component(flowmoduleheader.$$.fragment);
    			create_component(flowmodulecontent.$$.fragment);
    			attr_dev(rect_1, "class", "node-background svelte-1ov6lm2");
    			attr_dev(rect_1, "x", /*xPos*/ ctx[4]);
    			attr_dev(rect_1, "y", /*yPos*/ ctx[5]);
    			attr_dev(rect_1, "width", /*moduleWidth*/ ctx[8]);
    			attr_dev(rect_1, "height", /*moduleHeight*/ ctx[6]);
    			attr_dev(rect_1, "rx", "6");
    			attr_dev(rect_1, "ry", "6");
    			add_location(rect_1, file$4, 103, 1, 3408);
    			add_location(g0, file$4, 112, 4, 3609);
    			attr_dev(g1, "class", "node-container svelte-1ov6lm2");
    			attr_dev(g1, "transform", g1_transform_value = `translate(${/*dx*/ ctx[2]} ${/*dy*/ ctx[3]})`);
    			add_location(g1, file$4, 101, 0, 3331);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, g1, anchor);
    			append_dev(g1, rect_1);
    			/*rect_1_binding*/ ctx[18](rect_1);
    			append_dev(g1, g0);
    			mount_component(flowmoduleheader, g0, null);
    			mount_component(flowmodulecontent, g1, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				action_destroyer(draggable_action = draggable.call(null, g0)),
    				listen_dev(g0, "dragmove", /*handleDragMove*/ ctx[9], false, false, false),
    				listen_dev(g0, "dragstart", /*handleDragStart*/ ctx[11], false, false, false),
    				listen_dev(g0, "dragend", /*handleDragEnd*/ ctx[10], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			const flowmoduleheader_changes = {};
    			if (dirty & /*StrucModule*/ 1) flowmoduleheader_changes.ModuleName = /*StrucModule*/ ctx[0].getName();
    			flowmoduleheader.$set(flowmoduleheader_changes);
    			const flowmodulecontent_changes = {};
    			if (dirty & /*StrucModule*/ 1) flowmodulecontent_changes.OutputList = /*StrucModule*/ ctx[0].getOutputList();
    			if (dirty & /*StrucModule*/ 1) flowmodulecontent_changes.InputList = /*StrucModule*/ ctx[0].getInputList();
    			flowmodulecontent.$set(flowmodulecontent_changes);

    			if (!current || dirty & /*dx, dy*/ 12 && g1_transform_value !== (g1_transform_value = `translate(${/*dx*/ ctx[2]} ${/*dy*/ ctx[3]})`)) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmoduleheader.$$.fragment, local);
    			transition_in(flowmodulecontent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmoduleheader.$$.fragment, local);
    			transition_out(flowmodulecontent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			/*rect_1_binding*/ ctx[18](null);
    			destroy_component(flowmoduleheader);
    			destroy_component(flowmodulecontent);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { StrucModule } = $$props;
    	let xPos = StrucModule.getXPos();
    	let yPos = StrucModule.getYPos();

    	//this needs to be dynamic due to the number of outputs and inputs
    	let moduleHeight = StrucModule.getModuleHeight(); //size of the header

    	let contentHeight = StrucModule.getContentHeight();
    	let moduleWidth = StrucModule.getModuleWidth();

    	//TODO verify types of list here to ts
    	//if i want to access rect from component's parent (chart) -> add export
    	let rect;

    	//draggable vars
    	let dx = 0;

    	let dy = 0;

    	//in order to set x and y pos correctly on the module, we need to revert previous transformations changes (dx, dy)
    	let lastdx = 0;

    	let lastdy = 0;

    	const handleDragMove = e => {
    		let { lastX, lastY, dx: _dx, dy: _dy } = e.detail;
    		rect.setAttribute("stroke-width", "14px");
    		$$invalidate(2, dx += _dx);
    		$$invalidate(3, dy += _dy);
    		let moduleX = StrucModule.getXPos();
    		let moduleY = StrucModule.getYPos();
    		StrucModule.setXPos(moduleX + dx - lastdx);
    		StrucModule.setYPos(moduleY + dy - lastdy);

    		dispatch("handleDragMove", {
    			Module: { StrucModule },
    			lastX: { lastX },
    			lastY: { lastY },
    			dx: { dx },
    			dy: { dy }
    		});

    		lastdx = dx;
    		lastdy = dy;
    	};

    	const handleDragEnd = e => {
    		let { lastX, lastY } = e.detail;
    		rect.setAttribute("stroke", "green");
    		rect.setAttribute("stroke-width", "0px");
    		let moduleX = StrucModule.getXPos();
    		let moduleY = StrucModule.getYPos();
    		StrucModule.setXPos(moduleX + dx - lastdx);
    		StrucModule.setYPos(moduleY + dy - lastdy);

    		dispatch("handleDragEnd", {
    			Module: { StrucModule },
    			lastX: { lastX },
    			lastY: { lastY },
    			dx: { dx },
    			dy: { dy }
    		});

    		lastdx = dx;
    		lastdy = dy;
    	};

    	const handleDragStart = e => {
    		let { lastX, lastY } = e.detail;
    		rect.setAttribute("stroke", "green");
    		rect.setAttribute("stroke-width", "10px");
    	};

    	const handleConnectionStart = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port } = e.detail;

    		dispatch("handleConnectionStart", {
    			xInitial: { xInitial },
    			xFinal: { xFinal },
    			yInitial: { yInitial },
    			yFinal: { yFinal },
    			port: { port },
    			parentModule: { StrucModule }
    		});
    	};

    	const handleConnectionDrag = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port } = e.detail;

    		dispatch("handleConnectionDrag", {
    			xInitial: { xInitial },
    			xFinal: { xFinal },
    			yInitial: { yInitial },
    			yFinal: { yFinal },
    			port: { port },
    			parentModule: { StrucModule }
    		});
    	};

    	const handleConnectionEnd = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port } = e.detail;

    		dispatch("handleConnectionEnd", {
    			xInitial: { xInitial },
    			xFinal: { xFinal },
    			yInitial: { yInitial },
    			yFinal: { yFinal },
    			port: { port },
    			parentModule: { StrucModule }
    		});
    	};

    	const writable_props = ["StrucModule"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModule> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModule", $$slots, []);

    	function rect_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, rect = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(0, StrucModule = $$props.StrucModule);
    	};

    	$$self.$capture_state = () => ({
    		FlowModuleContent,
    		FlowModuleHeader,
    		spring,
    		draggable,
    		Module,
    		Port,
    		Connection,
    		createEventDispatcher,
    		dispatch,
    		StrucModule,
    		xPos,
    		yPos,
    		moduleHeight,
    		contentHeight,
    		moduleWidth,
    		rect,
    		dx,
    		dy,
    		lastdx,
    		lastdy,
    		handleDragMove,
    		handleDragEnd,
    		handleDragStart,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(0, StrucModule = $$props.StrucModule);
    		if ("xPos" in $$props) $$invalidate(4, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(5, yPos = $$props.yPos);
    		if ("moduleHeight" in $$props) $$invalidate(6, moduleHeight = $$props.moduleHeight);
    		if ("contentHeight" in $$props) $$invalidate(7, contentHeight = $$props.contentHeight);
    		if ("moduleWidth" in $$props) $$invalidate(8, moduleWidth = $$props.moduleWidth);
    		if ("rect" in $$props) $$invalidate(1, rect = $$props.rect);
    		if ("dx" in $$props) $$invalidate(2, dx = $$props.dx);
    		if ("dy" in $$props) $$invalidate(3, dy = $$props.dy);
    		if ("lastdx" in $$props) lastdx = $$props.lastdx;
    		if ("lastdy" in $$props) lastdy = $$props.lastdy;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		StrucModule,
    		rect,
    		dx,
    		dy,
    		xPos,
    		yPos,
    		moduleHeight,
    		contentHeight,
    		moduleWidth,
    		handleDragMove,
    		handleDragEnd,
    		handleDragStart,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd,
    		lastdx,
    		lastdy,
    		dispatch,
    		rect_1_binding
    	];
    }

    class FlowModule extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { StrucModule: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModule",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*StrucModule*/ ctx[0] === undefined && !("StrucModule" in props)) {
    			console.warn("<FlowModule> was created without expected prop 'StrucModule'");
    		}
    	}

    	get StrucModule() {
    		return this.$$.ctx[0];
    	}

    	set StrucModule(StrucModule) {
    		this.$set({ StrucModule });
    		flush();
    	}
    }

    /* src/ConnectionSVG.svelte generated by Svelte v3.22.2 */
    const file$5 = "src/ConnectionSVG.svelte";

    function create_fragment$5(ctx) {
    	let path;
    	let path_d_value;
    	let t0;
    	let circle0;
    	let circle0_cx_value;
    	let circle0_cy_value;
    	let t1;
    	let circle1;
    	let circle1_cx_value;
    	let circle1_cy_value;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			t0 = space();
    			circle0 = svg_element("circle");
    			t1 = space();
    			circle1 = svg_element("circle");
    			attr_dev(path, "d", path_d_value = /*connection*/ ctx[0].curve);
    			attr_dev(path, "fill", "transparent");
    			attr_dev(path, "class", "svelte-rzbiv9");
    			add_location(path, file$5, 4, 0, 107);
    			attr_dev(circle0, "cx", circle0_cx_value = /*connection*/ ctx[0].parentPort.xPos);
    			attr_dev(circle0, "cy", circle0_cy_value = /*connection*/ ctx[0].parentPort.yPos);
    			attr_dev(circle0, "r", "5");
    			attr_dev(circle0, "class", "svelte-rzbiv9");
    			add_location(circle0, file$5, 5, 0, 155);
    			attr_dev(circle1, "cx", circle1_cx_value = /*connection*/ ctx[0].externalPort.xPos);
    			attr_dev(circle1, "cy", circle1_cy_value = /*connection*/ ctx[0].externalPort.yPos);
    			attr_dev(circle1, "r", "5");
    			attr_dev(circle1, "class", "svelte-rzbiv9");
    			add_location(circle1, file$5, 6, 0, 236);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, circle0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, circle1, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*connection*/ 1 && path_d_value !== (path_d_value = /*connection*/ ctx[0].curve)) {
    				attr_dev(path, "d", path_d_value);
    			}

    			if (dirty & /*connection*/ 1 && circle0_cx_value !== (circle0_cx_value = /*connection*/ ctx[0].parentPort.xPos)) {
    				attr_dev(circle0, "cx", circle0_cx_value);
    			}

    			if (dirty & /*connection*/ 1 && circle0_cy_value !== (circle0_cy_value = /*connection*/ ctx[0].parentPort.yPos)) {
    				attr_dev(circle0, "cy", circle0_cy_value);
    			}

    			if (dirty & /*connection*/ 1 && circle1_cx_value !== (circle1_cx_value = /*connection*/ ctx[0].externalPort.xPos)) {
    				attr_dev(circle1, "cx", circle1_cx_value);
    			}

    			if (dirty & /*connection*/ 1 && circle1_cy_value !== (circle1_cy_value = /*connection*/ ctx[0].externalPort.yPos)) {
    				attr_dev(circle1, "cy", circle1_cy_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(circle0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(circle1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { connection } = $$props;
    	const writable_props = ["connection"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ConnectionSVG> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ConnectionSVG", $$slots, []);

    	$$self.$set = $$props => {
    		if ("connection" in $$props) $$invalidate(0, connection = $$props.connection);
    	};

    	$$self.$capture_state = () => ({ Connection, connection });

    	$$self.$inject_state = $$props => {
    		if ("connection" in $$props) $$invalidate(0, connection = $$props.connection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [connection];
    }

    class ConnectionSVG extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { connection: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ConnectionSVG",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*connection*/ ctx[0] === undefined && !("connection" in props)) {
    			console.warn("<ConnectionSVG> was created without expected prop 'connection'");
    		}
    	}

    	get connection() {
    		throw new Error("<ConnectionSVG>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set connection(value) {
    		throw new Error("<ConnectionSVG>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Canvas.svelte generated by Svelte v3.22.2 */
    const file$6 = "src/Canvas.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (183:12) {#each ChartStruc.ModuleList as moduleEntry,i (i)}
    function create_each_block_2(key_1, ctx) {
    	let first;
    	let current;

    	const flowmodule = new FlowModule({
    			props: { StrucModule: /*moduleEntry*/ ctx[18] },
    			$$inline: true
    		});

    	flowmodule.$on("handleDragEnd", /*handleDragEnd*/ ctx[5]);
    	flowmodule.$on("handleDragMove", /*handleDragMove*/ ctx[6]);
    	flowmodule.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[7]);
    	flowmodule.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[8]);
    	flowmodule.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[9]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(flowmodule.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(flowmodule, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const flowmodule_changes = {};
    			if (dirty & /*ChartStruc*/ 1) flowmodule_changes.StrucModule = /*moduleEntry*/ ctx[18];
    			flowmodule.$set(flowmodule_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmodule.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmodule.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(flowmodule, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(183:12) {#each ChartStruc.ModuleList as moduleEntry,i (i)}",
    		ctx
    	});

    	return block;
    }

    // (194:12) {#each connections as connection,i (i)}
    function create_each_block_1$1(key_1, ctx) {
    	let path;
    	let path_d_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = /*connection*/ ctx[14].curve);
    			attr_dev(path, "fill", "transparent");
    			attr_dev(path, "class", "svelte-txhvs3");
    			add_location(path, file$6, 194, 16, 9785);
    			this.first = path;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*connections*/ 8 && path_d_value !== (path_d_value = /*connection*/ ctx[14].curve)) {
    				attr_dev(path, "d", path_d_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(194:12) {#each connections as connection,i (i)}",
    		ctx
    	});

    	return block;
    }

    // (197:12) {#each ChartStruc.FinalConnections as connection,i (i)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let current;

    	const connectionsvg = new ConnectionSVG({
    			props: { connection: /*connection*/ ctx[14] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(connectionsvg.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(connectionsvg, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const connectionsvg_changes = {};
    			if (dirty & /*ChartStruc*/ 1) connectionsvg_changes.connection = /*connection*/ ctx[14];
    			connectionsvg.$set(connectionsvg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(connectionsvg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(connectionsvg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(connectionsvg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(197:12) {#each ChartStruc.FinalConnections as connection,i (i)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let svg;
    	let g;
    	let each_blocks_2 = [];
    	let each0_lookup = new Map();
    	let each0_anchor;
    	let each_blocks_1 = [];
    	let each1_lookup = new Map();
    	let each1_anchor;
    	let each_blocks = [];
    	let each2_lookup = new Map();
    	let svg_transform_value;
    	let draggable_action;
    	let current;
    	let dispose;
    	let each_value_2 = /*ChartStruc*/ ctx[0].ModuleList;
    	validate_each_argument(each_value_2);
    	const get_key = ctx => /*i*/ ctx[16];
    	validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = /*connections*/ ctx[3];
    	validate_each_argument(each_value_1);
    	const get_key_1 = ctx => /*i*/ ctx[16];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key_1);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
    	}

    	let each_value = /*ChartStruc*/ ctx[0].FinalConnections;
    	validate_each_argument(each_value);
    	const get_key_2 = ctx => /*i*/ ctx[16];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key_2);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key_2(child_ctx);
    		each2_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			each0_anchor = empty();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(g, file$6, 181, 1, 9246);
    			attr_dev(svg, "transform", svg_transform_value = `translate(${/*Background_dx*/ ctx[1]} ${/*Background_dy*/ ctx[2]})`);
    			attr_dev(svg, "class", "svelte-txhvs3");
    			add_location(svg, file$6, 178, 0, 9105);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(g, null);
    			}

    			append_dev(g, each0_anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(g, null);
    			}

    			append_dev(g, each1_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g, null);
    			}

    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				action_destroyer(draggable_action = draggable.call(null, svg)),
    				listen_dev(svg, "dragmove", /*handleDragMoveBackground*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ChartStruc, handleDragEnd, handleDragMove, handleConnectionStart, handleConnectionDrag, handleConnectionEnd*/ 993) {
    				const each_value_2 = /*ChartStruc*/ ctx[0].ModuleList;
    				validate_each_argument(each_value_2);
    				group_outros();
    				validate_each_keys(ctx, each_value_2, get_each_context_2, get_key);
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key, 1, ctx, each_value_2, each0_lookup, g, outro_and_destroy_block, create_each_block_2, each0_anchor, get_each_context_2);
    				check_outros();
    			}

    			if (dirty & /*connections*/ 8) {
    				const each_value_1 = /*connections*/ ctx[3];
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key_1);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_1, each1_lookup, g, destroy_block, create_each_block_1$1, each1_anchor, get_each_context_1$1);
    			}

    			if (dirty & /*ChartStruc*/ 1) {
    				const each_value = /*ChartStruc*/ ctx[0].FinalConnections;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key_2);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_2, 1, ctx, each_value, each2_lookup, g, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}

    			if (!current || dirty & /*Background_dx, Background_dy*/ 6 && svg_transform_value !== (svg_transform_value = `translate(${/*Background_dx*/ ctx[1]} ${/*Background_dy*/ ctx[2]})`)) {
    				attr_dev(svg, "transform", svg_transform_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { ChartStruc } = $$props;

    	//TODO allow dragging the chart --> need to chage values here and send it somehow to the modules so handlers can work properly
    	let dx = 0;

    	let dy = 0;
    	let { Background_dx } = $$props;
    	let { Background_dy } = $$props;

    	const handleDragMoveBackground = e => {
    		let { dx: _dx, dy: _dy } = e.detail;
    		dx += _dx;
    		dy += _dy;
    		$$invalidate(1, Background_dx += _dx);
    		$$invalidate(2, Background_dy += _dy);

    		dispatch("BackgroundMovement", {
    			Background_dx: { Background_dx },
    			Background_dy: { Background_dy }
    		});
    	};

    	//ggotta be global and export from app maybe.. so other "apps" can access
    	var connections = [];

    	//verify if given coords represent a port and if it has certain PortType //TODO O(n**2) not a good thing
    	function verifyCoordsIsPortFromType(CoordX, CoordY, originalPort, originalModule) {
    		for (let module of ChartStruc.ModuleList) {
    			//se a porta inicial for input so vamos avaliar outputs e vice versa
    			if (originalPort.isInput == false) {
    				for (let input of module.inputList) {
    					if (input.xPos - input.hiboxSize <= CoordX && input.xPos + input.hiboxSize >= CoordX) {
    						if (input.yPos - input.hiboxSize <= CoordY && input.yPos + input.hiboxSize >= CoordY) {
    							//we need to know if the types are the same
    							if (input.varType == originalPort.varType) {
    								//TODO nomes dinamicos
    								let name = "connection" + ChartStruc.ModuleList.length;

    								let connection = new Connection(name, originalPort, originalPort.isInput, originalModule, module, input);
    								connection.setConnectedPort(input, module);

    								//inputmodule
    								//InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection)
    								originalModule.addOutputConnection(originalPort, input, module, connection);

    								//outputmodule
    								//InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection
    								module.addInputConnection(input, originalPort, originalModule, connection);

    								connection.calculateCurve();
    								ChartStruc.FinalConnections.push(connection);
    								$$invalidate(0, ChartStruc);
    							}
    						}
    					}
    				}
    			} else {
    				for (let output of module.outputList) {
    					if (output.xPos - output.hiboxSize <= CoordX && output.xPos + output.hiboxSize >= CoordX) {
    						if (output.yPos - output.hiboxSize <= CoordY && output.yPos + output.hiboxSize >= CoordY) {
    							//we need to know the port of the module now
    							if (output.varType == originalPort.varType) {
    								//TODO nomes dinamicos
    								let name = "connection" + ChartStruc.ModuleList.length;

    								let connection = new Connection(name, originalPort, originalPort.isInput, originalModule, module, output);
    								connection.setConnectedPort(output, module);

    								//inputmodule
    								//InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection)
    								originalModule.addInputConnection(originalPort, output, module, connection);

    								//outputmodule
    								//InternalPort: Port, ExternalPort: Port, ExternalNode: Module, Connection: Connection
    								module.addOutputConnection(output, originalPort, originalModule, connection);

    								connection.calculateCurve();
    								ChartStruc.FinalConnections.push(connection);
    								$$invalidate(0, ChartStruc);
    							}
    						}
    					}
    				}
    			}
    		}
    	}

    	//TODO posso nao tar sempre a criar e dar simplesment update as ligacoes
    	const handleDragEnd = e => {
    		let moduleDragged;
    		moduleDragged = e.detail.Module;
    		let dx = e.detail.dx.dx;
    		let dy = e.detail.dy.dy;
    		let lastX = e.detail.lastX.lastX;
    		let lastY = e.detail.lastY.lastY;

    		//TODO ma logica a dar coord no modulo
    		for (let moduleentry of ChartStruc.ModuleList) {
    			if (moduleentry.id == moduleDragged.StrucModule.id) {
    				moduleentry.setPortCoords();

    				if (moduleentry.connectionsInputs !== undefined) {
    					for (let inputconnection of moduleentry.connectionsInputs) {
    						inputconnection.Connection.calculateCurve();

    						for (let finalconnection of ChartStruc.FinalConnections) {
    							if (finalconnection.id == inputconnection.Connection.id) {
    								finalconnection = inputconnection;
    							}
    						}
    					}
    				}

    				if (moduleentry.connectionsOutputs !== undefined) {
    					for (let outputconnection of moduleentry.connectionsOutputs) {
    						outputconnection.Connection.calculateCurve();

    						for (let finalconnection of ChartStruc.FinalConnections) {
    							if (finalconnection.id == outputconnection.Connection.id) {
    								finalconnection = outputconnection;
    							}
    						}
    					}
    				}
    			}

    			$$invalidate(0, ChartStruc);
    		}
    	};

    	const handleDragMove = e => {
    		let moduleDragged;
    		moduleDragged = e.detail.Module;
    		let dx = e.detail.dx.dx;
    		let dy = e.detail.dy.dy;
    		let lastX = e.detail.lastX.lastX;
    		let lastY = e.detail.lastY.lastY;

    		//TODO
    		for (let moduleentry of ChartStruc.ModuleList) {
    			if (moduleentry.id == moduleDragged.StrucModule.id) {
    				moduleentry.setPortCoords();

    				if (moduleentry.connectionsInputs !== undefined) {
    					for (let inputconnection of moduleentry.connectionsInputs) {
    						inputconnection.Connection.calculateCurve();

    						for (let finalconnection of ChartStruc.FinalConnections) {
    							if (finalconnection.id == inputconnection.Connection.id) {
    								finalconnection = inputconnection;
    							}
    						}
    					}
    				}

    				if (moduleentry.connectionsOutputs !== undefined) {
    					for (let outputconnection of moduleentry.connectionsOutputs) {
    						outputconnection.Connection.calculateCurve();

    						for (let finalconnection of ChartStruc.FinalConnections) {
    							if (finalconnection.id == outputconnection.Connection.id) {
    								finalconnection = outputconnection;
    							}
    						}
    					}
    				}
    			}

    			$$invalidate(0, ChartStruc);
    		}
    	};

    	const handleConnectionStart = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port, parentModule } = e.detail;

    		//TODO id da conexao dinamicamente
    		let connection = new Connection("tentativa", port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);

    		connection.setEndPoints(xFinal.xFinal.xFinal - Background_dx, yFinal.yFinal.yFinal - Background_dy);
    		connection.calculateCurve();
    		connections.push(connection);
    		$$invalidate(3, connections);
    	};

    	const handleConnectionDrag = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port, parentModule } = e.detail;
    		$$invalidate(3, connections = []);

    		//TODO id da conexao dinamicamente
    		let connection = new Connection("tentativa", port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);

    		connection.setEndPoints(xFinal.xFinal.xFinal - Background_dx, yFinal.yFinal.yFinal - Background_dy);
    		connection.calculateCurve();
    		connections.push(connection);
    		$$invalidate(3, connections);
    	};

    	const handleConnectionEnd = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port, parentModule } = e.detail;
    		$$invalidate(3, connections = []);
    		verifyCoordsIsPortFromType(xFinal.xFinal.xFinal - Background_dx, yFinal.yFinal.yFinal - Background_dy, port.port.port.port, parentModule.StrucModule);
    	};

    	const writable_props = ["ChartStruc", "Background_dx", "Background_dy"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ChartStruc" in $$props) $$invalidate(0, ChartStruc = $$props.ChartStruc);
    		if ("Background_dx" in $$props) $$invalidate(1, Background_dx = $$props.Background_dx);
    		if ("Background_dy" in $$props) $$invalidate(2, Background_dy = $$props.Background_dy);
    	};

    	$$self.$capture_state = () => ({
    		FlowModule,
    		ConnectionSVG,
    		onMount,
    		Module,
    		Port,
    		Connection,
    		Chart,
    		spring,
    		draggable,
    		createEventDispatcher,
    		dispatch,
    		ChartStruc,
    		dx,
    		dy,
    		Background_dx,
    		Background_dy,
    		handleDragMoveBackground,
    		connections,
    		verifyCoordsIsPortFromType,
    		handleDragEnd,
    		handleDragMove,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("ChartStruc" in $$props) $$invalidate(0, ChartStruc = $$props.ChartStruc);
    		if ("dx" in $$props) dx = $$props.dx;
    		if ("dy" in $$props) dy = $$props.dy;
    		if ("Background_dx" in $$props) $$invalidate(1, Background_dx = $$props.Background_dx);
    		if ("Background_dy" in $$props) $$invalidate(2, Background_dy = $$props.Background_dy);
    		if ("connections" in $$props) $$invalidate(3, connections = $$props.connections);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		ChartStruc,
    		Background_dx,
    		Background_dy,
    		connections,
    		handleDragMoveBackground,
    		handleDragEnd,
    		handleDragMove,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			ChartStruc: 0,
    			Background_dx: 1,
    			Background_dy: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ChartStruc*/ ctx[0] === undefined && !("ChartStruc" in props)) {
    			console.warn("<Canvas> was created without expected prop 'ChartStruc'");
    		}

    		if (/*Background_dx*/ ctx[1] === undefined && !("Background_dx" in props)) {
    			console.warn("<Canvas> was created without expected prop 'Background_dx'");
    		}

    		if (/*Background_dy*/ ctx[2] === undefined && !("Background_dy" in props)) {
    			console.warn("<Canvas> was created without expected prop 'Background_dy'");
    		}
    	}

    	get ChartStruc() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ChartStruc(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get Background_dx() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Background_dx(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get Background_dy() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Background_dy(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/Modal.svelte generated by Svelte v3.22.2 */
    const file$7 = "src/Modal.svelte";

    // (1:0) {#if show}
    function create_if_block(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let main;
    	let h1;
    	let t1;
    	let h4;
    	let t3;
    	let h20;
    	let t5;
    	let p0;
    	let t7;
    	let h21;
    	let t9;
    	let h30;
    	let t11;
    	let p1;
    	let t13;
    	let p2;
    	let t15;
    	let h31;
    	let t17;
    	let p3;
    	let t19;
    	let p4;
    	let t21;
    	let h22;
    	let t23;
    	let p5;
    	let t25;
    	let p6;
    	let t27;
    	let h23;
    	let t29;
    	let p7;
    	let t31;
    	let p8;
    	let t33;
    	let p9;
    	let div1_transition;
    	let current;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "ComputeFlow";
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "https://github.com/DanielMoreiraPT/ComputeFlow";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Computeflow is a final project for Informatics Engineering Bachlor's degree.";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "It's goal is to develop software able to provide an intuitive and interactive Interface for users that require usage of data flow programming without having extensive programming knowledge.\n                Members";
    			t7 = space();
    			h21 = element("h2");
    			h21.textContent = "Members";
    			t9 = space();
    			h30 = element("h3");
    			h30.textContent = "Computation:";
    			t11 = space();
    			p1 = element("p");
    			p1.textContent = "Aneta Pawelec (pawelec.aneta98@gmail.com)";
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "Daniel Moreira (danielbarbosa@ua.pt)";
    			t15 = space();
    			h31 = element("h3");
    			h31.textContent = "Interface:";
    			t17 = space();
    			p3 = element("p");
    			p3.textContent = "André Catarino (andre.catarino@ua.pt)";
    			t19 = space();
    			p4 = element("p");
    			p4.textContent = "Rui Melo (r.melo@ua.pt)";
    			t21 = space();
    			h22 = element("h2");
    			h22.textContent = "Orientators";
    			t23 = space();
    			p5 = element("p");
    			p5.textContent = "José Maria Fernandes (jfernan@ua.pt)";
    			t25 = space();
    			p6 = element("p");
    			p6.textContent = "Sérgio Miguel Santos (sergio.santos@ua.pt)";
    			t27 = space();
    			h23 = element("h2");
    			h23.textContent = "Supervisors";
    			t29 = space();
    			p7 = element("p");
    			p7.textContent = "José Moreira (jose.moreira@ua.pt)";
    			t31 = space();
    			p8 = element("p");
    			p8.textContent = "António Sousa Pereira (f185@ua.pt)";
    			t33 = space();
    			p9 = element("p");
    			p9.textContent = "Rui Aguiar (ruilaa@ua.pt)";
    			add_location(h1, file$7, 5, 12, 164);
    			add_location(h4, file$7, 6, 12, 197);
    			add_location(h20, file$7, 7, 12, 265);
    			add_location(p0, file$7, 8, 12, 363);
    			add_location(h21, file$7, 10, 12, 596);
    			add_location(h30, file$7, 11, 12, 629);
    			add_location(p1, file$7, 12, 20, 672);
    			add_location(p2, file$7, 13, 20, 741);
    			add_location(h31, file$7, 14, 12, 797);
    			add_location(p3, file$7, 15, 20, 838);
    			add_location(p4, file$7, 16, 20, 903);
    			add_location(h22, file$7, 18, 12, 947);
    			add_location(p5, file$7, 19, 16, 987);
    			add_location(p6, file$7, 20, 16, 1047);
    			add_location(h23, file$7, 22, 12, 1130);
    			add_location(p7, file$7, 23, 16, 1170);
    			add_location(p8, file$7, 24, 16, 1227);
    			add_location(p9, file$7, 25, 16, 1285);
    			attr_dev(main, "class", "svelte-1gzoxsy");
    			add_location(main, file$7, 5, 6, 158);
    			attr_dev(div0, "class", "modal-container svelte-1gzoxsy");
    			add_location(div0, file$7, 4, 4, 122);
    			attr_dev(div1, "class", "modal-overlay svelte-1gzoxsy");
    			attr_dev(div1, "data-close", "");
    			add_location(div1, file$7, 3, 2, 20);
    			add_location(div2, file$7, 1, 0, 11);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, main);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h4);
    			append_dev(main, t3);
    			append_dev(main, h20);
    			append_dev(main, t5);
    			append_dev(main, p0);
    			append_dev(main, t7);
    			append_dev(main, h21);
    			append_dev(main, t9);
    			append_dev(main, h30);
    			append_dev(main, t11);
    			append_dev(main, p1);
    			append_dev(main, t13);
    			append_dev(main, p2);
    			append_dev(main, t15);
    			append_dev(main, h31);
    			append_dev(main, t17);
    			append_dev(main, p3);
    			append_dev(main, t19);
    			append_dev(main, p4);
    			append_dev(main, t21);
    			append_dev(main, h22);
    			append_dev(main, t23);
    			append_dev(main, p5);
    			append_dev(main, t25);
    			append_dev(main, p6);
    			append_dev(main, t27);
    			append_dev(main, h23);
    			append_dev(main, t29);
    			append_dev(main, p7);
    			append_dev(main, t31);
    			append_dev(main, p8);
    			append_dev(main, t33);
    			append_dev(main, p9);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*overlay_click*/ ctx[1], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 150 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 150 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching && div1_transition) div1_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(1:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	function overlay_click(e) {
    		if ("close" in e.target.dataset) $$invalidate(0, show = false);
    	}

    	let { show = false } = $$props;
    	const writable_props = ["show"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Modal", $$slots, []);

    	$$self.$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    	};

    	$$self.$capture_state = () => ({ fade, overlay_click, show });

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show, overlay_click];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { show: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get show() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    class TemplateModule {
        constructor(name) {
            this.listInputs = [];
            this.listOutputs = [];
            this.name = name;
        }
    }
    class TemplatePort {
        constructor(isInput, varType, varName) {
            this.isInput = isInput;
            this.varType = varType;
            this.varName = varName;
        }
    }

    /* src/Button.svelte generated by Svelte v3.22.2 */

    const file$8 = "src/Button.svelte";

    function create_fragment$8(ctx) {
    	let button;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-info svelte-1xfvrkd");
    			add_location(button, file$8, 1, 0, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Button", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/ModalModulos.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$9 = "src/ModalModulos.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (63:0) {#if show}
    function create_if_block$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let main;
    	let current_block_type_index;
    	let if_block0;
    	let t;
    	let current_block_type_index_1;
    	let if_block1;
    	let div1_transition;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block_2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*ModuleVarList*/ ctx[2].length != 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	const if_block_creators_1 = [create_if_block_1, create_else_block];
    	const if_blocks_1 = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*ModuleFunctionList*/ ctx[3].length != 0) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(ctx);
    	if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			main = element("main");
    			if_block0.c();
    			t = space();
    			if_block1.c();
    			attr_dev(main, "class", "svelte-1g2wfk6");
    			add_location(main, file$9, 67, 8, 2637);
    			attr_dev(div0, "class", "modal-container svelte-1g2wfk6");
    			add_location(div0, file$9, 66, 4, 2599);
    			attr_dev(div1, "class", "modal-overlay svelte-1g2wfk6");
    			attr_dev(div1, "data-close", "");
    			add_location(div1, file$9, 65, 2, 2497);
    			add_location(div2, file$9, 63, 0, 2488);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, main);
    			if_blocks[current_block_type_index].m(main, null);
    			append_dev(main, t);
    			if_blocks_1[current_block_type_index_1].m(main, null);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*overlay_click*/ ctx[1], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if_block0.p(ctx, dirty);
    			if_block1.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 250 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 250 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_blocks[current_block_type_index].d();
    			if_blocks_1[current_block_type_index_1].d();
    			if (detaching && div1_transition) div1_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(63:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (74:12) {:else}
    function create_else_block_1(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "No templates for Variables";
    			add_location(h1, file$9, 74, 16, 2925);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(74:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:12) {#if ModuleVarList.length!=0}
    function create_if_block_2(ctx) {
    	let h1;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*ModuleVarList*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Variables";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h1, file$9, 69, 16, 2702);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sendModuleInfo, ModuleVarList*/ 20) {
    				each_value_1 = /*ModuleVarList*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(69:12) {#if ModuleVarList.length!=0}",
    		ctx
    	});

    	return block;
    }

    // (72:20) <Button on:click={e => sendModuleInfo(variable)}>
    function create_default_slot_1(ctx) {
    	let t_value = /*variable*/ ctx[12].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(72:20) <Button on:click={e => sendModuleInfo(variable)}>",
    		ctx
    	});

    	return block;
    }

    // (71:16) {#each ModuleVarList as variable}
    function create_each_block_1$2(ctx) {
    	let current;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[10](/*variable*/ ctx[12], ...args);
    	}

    	const button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(71:16) {#each ModuleVarList as variable}",
    		ctx
    	});

    	return block;
    }

    // (82:12) {:else}
    function create_else_block(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "No templates for Functions";
    			add_location(h1, file$9, 82, 16, 3270);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(82:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (77:12) {#if ModuleFunctionList.length!=0}
    function create_if_block_1(ctx) {
    	let h1;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value = /*ModuleFunctionList*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Functions";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h1, file$9, 77, 16, 3042);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sendModuleInfo, ModuleFunctionList*/ 24) {
    				each_value = /*ModuleFunctionList*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(77:12) {#if ModuleFunctionList.length!=0}",
    		ctx
    	});

    	return block;
    }

    // (80:20) <Button on:click={e => sendModuleInfo(variable)}>
    function create_default_slot(ctx) {
    	let t_value = /*variable*/ ctx[12].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(80:20) <Button on:click={e => sendModuleInfo(variable)}>",
    		ctx
    	});

    	return block;
    }

    // (79:16) {#each ModuleFunctionList as variable}
    function create_each_block$2(ctx) {
    	let current;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[11](/*variable*/ ctx[12], ...args);
    	}

    	const button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_1);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 131072) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(79:16) {#each ModuleFunctionList as variable}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { show = false } = $$props;

    	function overlay_click(e) {
    		if ("close" in e.target.dataset) $$invalidate(0, show = false);
    	}

    	let ModulesTemplatesList = [];
    	let ModuleVarList = [];
    	let ModuleFunctionList = [];

    	function sendModuleInfo(ModuleTemplate) {
    		$$invalidate(0, show = false);
    		dispatch("AddModule", { module: ModuleTemplate });
    	}

    	//read Templates for the Modules --> inside public dr
    	var fs = require("fs");

    	var path = require("path");
    	var filePath = path.join(__dirname, "ModulesTemplates.json");

    	fs.readFile(filePath, function (err, data) {
    		if (!err) {
    			let json = JSON.parse(data);

    			//console.log(json);
    			let i;

    			for (i = 0; i < json.Templates.Variables.length; i++) {
    				let tempVar = new TemplateModule(json.Templates.Variables[i].Name);

    				//como é var so vai ter outputs
    				let j;

    				for (j = 0; j < json.Templates.Variables[i].IO.Outputs.length; j++) {
    					let tempPort = new TemplatePort(false, json.Templates.Variables[i].IO.Outputs[j].PortType, json.Templates.Variables[i].IO.Outputs[j].VarName);
    					tempVar.listOutputs.push(tempPort);
    				}

    				//console.log(tempVar)
    				ModuleVarList.push(tempVar);
    			}

    			for (i = 0; i < json.Templates.Functions.length; i++) {
    				let tempVar = new TemplateModule(json.Templates.Functions[i].Name);

    				//como é function vai ter inputs e outputs
    				let j;

    				for (j = 0; j < json.Templates.Functions[i].IO.Inputs.length; j++) {
    					let tempPort = new TemplatePort(true, json.Templates.Functions[i].IO.Inputs[j].PortType, json.Templates.Variables[i].IO.Outputs[j].VarName);
    					tempVar.listInputs.push(tempPort);
    				}

    				for (j = 0; j < json.Templates.Functions[i].IO.Outputs.length; j++) {
    					let tempPort = new TemplatePort(false, json.Templates.Functions[i].IO.Outputs[j].PortType, json.Templates.Variables[i].IO.Outputs[j].VarName);
    					tempVar.listOutputs.push(tempPort);
    				}

    				//console.log(tempVar)
    				ModuleFunctionList.push(tempVar);
    			}
    		} else {
    			console.log(err);
    		}
    	});

    	const writable_props = ["show"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<ModalModulos> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ModalModulos", $$slots, []);
    	const click_handler = (variable, e) => sendModuleInfo(variable);
    	const click_handler_1 = (variable, e) => sendModuleInfo(variable);

    	$$self.$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		TemplateModule,
    		TemplatePort,
    		createEventDispatcher,
    		dispatch,
    		Button,
    		show,
    		overlay_click,
    		ModulesTemplatesList,
    		ModuleVarList,
    		ModuleFunctionList,
    		sendModuleInfo,
    		fs,
    		path,
    		filePath
    	});

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("ModulesTemplatesList" in $$props) ModulesTemplatesList = $$props.ModulesTemplatesList;
    		if ("ModuleVarList" in $$props) $$invalidate(2, ModuleVarList = $$props.ModuleVarList);
    		if ("ModuleFunctionList" in $$props) $$invalidate(3, ModuleFunctionList = $$props.ModuleFunctionList);
    		if ("fs" in $$props) fs = $$props.fs;
    		if ("path" in $$props) path = $$props.path;
    		if ("filePath" in $$props) filePath = $$props.filePath;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		show,
    		overlay_click,
    		ModuleVarList,
    		ModuleFunctionList,
    		sendModuleInfo,
    		dispatch,
    		ModulesTemplatesList,
    		fs,
    		path,
    		filePath,
    		click_handler,
    		click_handler_1
    	];
    }

    class ModalModulos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { show: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalModulos",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get show() {
    		throw new Error("<ModalModulos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<ModalModulos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ModalProjectName.svelte generated by Svelte v3.22.2 */
    const file$a = "src/ModalProjectName.svelte";

    // (1:0) {#if show}
    function create_if_block$2(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let main;
    	let div0;
    	let h1;
    	let t1;
    	let input;
    	let t2;
    	let div1;
    	let div3_transition;
    	let current;
    	let dispose;

    	const button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", /*saveProject*/ ctx[2]);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			main = element("main");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Name:";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			div1 = element("div");
    			create_component(button.$$.fragment);
    			attr_dev(h1, "class", "svelte-1869b54");
    			add_location(h1, file$a, 7, 12, 192);
    			add_location(input, file$a, 8, 12, 220);
    			add_location(div0, file$a, 6, 8, 173);
    			add_location(div1, file$a, 10, 8, 276);
    			attr_dev(main, "class", "svelte-1869b54");
    			add_location(main, file$a, 5, 6, 158);
    			attr_dev(div2, "class", "modal-container svelte-1869b54");
    			add_location(div2, file$a, 4, 4, 122);
    			attr_dev(div3, "class", "modal-overlay svelte-1869b54");
    			attr_dev(div3, "data-close", "");
    			add_location(div3, file$a, 3, 2, 20);
    			add_location(div4, file$a, 1, 0, 11);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, main);
    			append_dev(main, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, input);
    			set_input_value(input, /*ProjectName*/ ctx[0]);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			mount_component(button, div1, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    				listen_dev(div3, "click", /*overlay_click*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ProjectName*/ 1 && input.value !== /*ProjectName*/ ctx[0]) {
    				set_input_value(input, /*ProjectName*/ ctx[0]);
    			}

    			const button_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, { duration: 150 }, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, { duration: 150 }, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(button);
    			if (detaching && div3_transition) div3_transition.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(1:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (12:12) <Button on:click={saveProject}>
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Save");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(12:12) <Button on:click={saveProject}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	const saveProject = e => {
    		$$invalidate(1, show = false);
    		dispatch("SaveProjectAndName", { name: ProjectName });
    	};

    	function overlay_click(e) {
    		if ("close" in e.target.dataset) $$invalidate(1, show = false);
    	}

    	let { ProjectName } = $$props;
    	let { show = false } = $$props;
    	const writable_props = ["ProjectName", "show"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalProjectName> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ModalProjectName", $$slots, []);

    	function input_input_handler() {
    		ProjectName = this.value;
    		$$invalidate(0, ProjectName);
    	}

    	$$self.$set = $$props => {
    		if ("ProjectName" in $$props) $$invalidate(0, ProjectName = $$props.ProjectName);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    	};

    	$$self.$capture_state = () => ({
    		Button,
    		fade,
    		createEventDispatcher,
    		dispatch,
    		saveProject,
    		overlay_click,
    		ProjectName,
    		show
    	});

    	$$self.$inject_state = $$props => {
    		if ("ProjectName" in $$props) $$invalidate(0, ProjectName = $$props.ProjectName);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ProjectName, show, saveProject, overlay_click, dispatch, input_input_handler];
    }

    class ModalProjectName extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { ProjectName: 0, show: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalProjectName",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ProjectName*/ ctx[0] === undefined && !("ProjectName" in props)) {
    			console.warn("<ModalProjectName> was created without expected prop 'ProjectName'");
    		}
    	}

    	get ProjectName() {
    		throw new Error("<ModalProjectName>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ProjectName(value) {
    		throw new Error("<ModalProjectName>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get show() {
    		throw new Error("<ModalProjectName>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<ModalProjectName>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Sidebar.svelte generated by Svelte v3.22.2 */
    const file$b = "src/Sidebar.svelte";

    // (41:4) {:else}
    function create_else_block$1(ctx) {
    	let h4;
    	let t;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			t = text(/*ProjectName*/ ctx[3]);
    			attr_dev(h4, "class", "svelte-1b67aco");
    			add_location(h4, file$b, 41, 8, 1086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ProjectName*/ 8) set_data_dev(t, /*ProjectName*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(41:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (39:4) {#if ProjectName == undefined}
    function create_if_block$3(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "New Project";
    			attr_dev(h4, "class", "svelte-1b67aco");
    			add_location(h4, file$b, 39, 8, 1045);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(39:4) {#if ProjectName == undefined}",
    		ctx
    	});

    	return block;
    }

    // (44:4) <Button on:click={() => {modalModulos_show = true;}}>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Add Module");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(44:4) <Button on:click={() => {modalModulos_show = true;}}>",
    		ctx
    	});

    	return block;
    }

    // (49:4) <Button on:click={saveProject}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Save Project");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(49:4) <Button on:click={saveProject}>",
    		ctx
    	});

    	return block;
    }

    // (50:4) <Button on:click={() => {modalProjectName_show = true;}}>
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Save Project as");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(50:4) <Button on:click={() => {modalProjectName_show = true;}}>",
    		ctx
    	});

    	return block;
    }

    // (51:4) <Button on:click={() => {modal_show = true;}}>
    function create_default_slot$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("About");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(51:4) <Button on:click={() => {modal_show = true;}}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let nav;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let updating_show;
    	let t7;
    	let updating_show_1;
    	let t8;
    	let updating_show_2;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*ProjectName*/ ctx[3] == undefined) return create_if_block$3;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const button0 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*click_handler*/ ctx[8]);

    	const button1 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*saveProject*/ ctx[4]);

    	const button2 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button2.$on("click", /*click_handler_1*/ ctx[9]);

    	const button3 = new Button({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button3.$on("click", /*click_handler_2*/ ctx[10]);

    	function modal_show_binding(value) {
    		/*modal_show_binding*/ ctx[11].call(null, value);
    	}

    	let modal_props = {};

    	if (/*modal_show*/ ctx[0] !== void 0) {
    		modal_props.show = /*modal_show*/ ctx[0];
    	}

    	const modal = new Modal({ props: modal_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal, "show", modal_show_binding));

    	function modalmodulos_show_binding(value) {
    		/*modalmodulos_show_binding*/ ctx[12].call(null, value);
    	}

    	let modalmodulos_props = {};

    	if (/*modalModulos_show*/ ctx[1] !== void 0) {
    		modalmodulos_props.show = /*modalModulos_show*/ ctx[1];
    	}

    	const modalmodulos = new ModalModulos({
    			props: modalmodulos_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(modalmodulos, "show", modalmodulos_show_binding));
    	modalmodulos.$on("AddModule", /*handleAddModule*/ ctx[5]);

    	function modalprojectname_show_binding(value) {
    		/*modalprojectname_show_binding*/ ctx[13].call(null, value);
    	}

    	let modalprojectname_props = { ProjectName: /*ProjectName*/ ctx[3] };

    	if (/*modalProjectName_show*/ ctx[2] !== void 0) {
    		modalprojectname_props.show = /*modalProjectName_show*/ ctx[2];
    	}

    	const modalprojectname = new ModalProjectName({
    			props: modalprojectname_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(modalprojectname, "show", modalprojectname_show_binding));
    	modalprojectname.$on("SaveProjectAndName", /*handlesaveProjectandName*/ ctx[6]);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			h1 = element("h1");
    			h1.textContent = "ComputeFlow";
    			t1 = space();
    			if_block.c();
    			t2 = space();
    			create_component(button0.$$.fragment);
    			t3 = space();
    			create_component(button1.$$.fragment);
    			t4 = space();
    			create_component(button2.$$.fragment);
    			t5 = space();
    			create_component(button3.$$.fragment);
    			t6 = space();
    			create_component(modal.$$.fragment);
    			t7 = space();
    			create_component(modalmodulos.$$.fragment);
    			t8 = space();
    			create_component(modalprojectname.$$.fragment);
    			attr_dev(h1, "class", "svelte-1b67aco");
    			add_location(h1, file$b, 37, 4, 981);
    			attr_dev(nav, "class", "svelte-1b67aco");
    			add_location(nav, file$b, 36, 0, 971);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, h1);
    			append_dev(nav, t1);
    			if_block.m(nav, null);
    			append_dev(nav, t2);
    			mount_component(button0, nav, null);
    			append_dev(nav, t3);
    			mount_component(button1, nav, null);
    			append_dev(nav, t4);
    			mount_component(button2, nav, null);
    			append_dev(nav, t5);
    			mount_component(button3, nav, null);
    			insert_dev(target, t6, anchor);
    			mount_component(modal, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(modalmodulos, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(modalprojectname, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(nav, t2);
    				}
    			}

    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    			const button3_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				button3_changes.$$scope = { dirty, ctx };
    			}

    			button3.$set(button3_changes);
    			const modal_changes = {};

    			if (!updating_show && dirty & /*modal_show*/ 1) {
    				updating_show = true;
    				modal_changes.show = /*modal_show*/ ctx[0];
    				add_flush_callback(() => updating_show = false);
    			}

    			modal.$set(modal_changes);
    			const modalmodulos_changes = {};

    			if (!updating_show_1 && dirty & /*modalModulos_show*/ 2) {
    				updating_show_1 = true;
    				modalmodulos_changes.show = /*modalModulos_show*/ ctx[1];
    				add_flush_callback(() => updating_show_1 = false);
    			}

    			modalmodulos.$set(modalmodulos_changes);
    			const modalprojectname_changes = {};
    			if (dirty & /*ProjectName*/ 8) modalprojectname_changes.ProjectName = /*ProjectName*/ ctx[3];

    			if (!updating_show_2 && dirty & /*modalProjectName_show*/ 4) {
    				updating_show_2 = true;
    				modalprojectname_changes.show = /*modalProjectName_show*/ ctx[2];
    				add_flush_callback(() => updating_show_2 = false);
    			}

    			modalprojectname.$set(modalprojectname_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			transition_in(button3.$$.fragment, local);
    			transition_in(modal.$$.fragment, local);
    			transition_in(modalmodulos.$$.fragment, local);
    			transition_in(modalprojectname.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			transition_out(button3.$$.fragment, local);
    			transition_out(modal.$$.fragment, local);
    			transition_out(modalmodulos.$$.fragment, local);
    			transition_out(modalprojectname.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_block.d();
    			destroy_component(button0);
    			destroy_component(button1);
    			destroy_component(button2);
    			destroy_component(button3);
    			if (detaching) detach_dev(t6);
    			destroy_component(modal, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(modalmodulos, detaching);
    			if (detaching) detach_dev(t8);
    			destroy_component(modalprojectname, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let modal_show = false;
    	let modalModulos_show = false;
    	let modalProjectName_show = false;
    	let ProjectName;

    	const saveProject = e => {
    		if (ProjectName == undefined) {
    			$$invalidate(2, modalProjectName_show = true);
    		} else {
    			dispatch("SaveProject", { name: ProjectName });
    		}
    	};

    	const handleAddModule = e => {
    		dispatch("AddModule", { module: e.detail.module });
    	};

    	const handlesaveProjectandName = e => {
    		$$invalidate(3, ProjectName = e.detail.name);
    		dispatch("SaveProject", { name: ProjectName });
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", $$slots, []);

    	const click_handler = () => {
    		$$invalidate(1, modalModulos_show = true);
    	};

    	const click_handler_1 = () => {
    		$$invalidate(2, modalProjectName_show = true);
    	};

    	const click_handler_2 = () => {
    		$$invalidate(0, modal_show = true);
    	};

    	function modal_show_binding(value) {
    		modal_show = value;
    		$$invalidate(0, modal_show);
    	}

    	function modalmodulos_show_binding(value) {
    		modalModulos_show = value;
    		$$invalidate(1, modalModulos_show);
    	}

    	function modalprojectname_show_binding(value) {
    		modalProjectName_show = value;
    		$$invalidate(2, modalProjectName_show);
    	}

    	$$self.$capture_state = () => ({
    		fly,
    		Modal,
    		ModalModulos,
    		ModalProjectName,
    		Button,
    		createEventDispatcher,
    		dispatch,
    		TemplateModule,
    		TemplatePort,
    		modal_show,
    		modalModulos_show,
    		modalProjectName_show,
    		ProjectName,
    		saveProject,
    		handleAddModule,
    		handlesaveProjectandName
    	});

    	$$self.$inject_state = $$props => {
    		if ("modal_show" in $$props) $$invalidate(0, modal_show = $$props.modal_show);
    		if ("modalModulos_show" in $$props) $$invalidate(1, modalModulos_show = $$props.modalModulos_show);
    		if ("modalProjectName_show" in $$props) $$invalidate(2, modalProjectName_show = $$props.modalProjectName_show);
    		if ("ProjectName" in $$props) $$invalidate(3, ProjectName = $$props.ProjectName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		modal_show,
    		modalModulos_show,
    		modalProjectName_show,
    		ProjectName,
    		saveProject,
    		handleAddModule,
    		handlesaveProjectandName,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		modal_show_binding,
    		modalmodulos_show_binding,
    		modalprojectname_show_binding
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    //TODO remove module args: chart a onde se esta a ler & module.. o que interessa é o id deste... 
    function removeModule(chart, module) {
        for (let moduleentry of chart.ModuleList) {
            if (moduleentry.id == module.id) {
                //delete connections associated in FinalConnections
                for (let conex of chart.FinalConnections) {
                    if (conex.externalNode !== undefined) {
                        if (conex.parentNode.id == moduleentry.id || conex.externalNode.id == moduleentry.id) {
                            let indexC = chart.FinalConnections.indexOf(conex);
                            if (indexC > -1) {
                                chart.FinalConnections.splice(indexC, 1);
                            }
                        }
                    }
                }
                //delete module
                let indexM = chart.ModuleList.indexOf(moduleentry);
                if (indexM > -1) {
                    chart.ModuleList.splice(indexM, 1);
                }
            }
        }
        for (let moduleentry of chart.ModuleList) {
            //delete connections inside modules
            if (moduleentry.connectionsInputs !== undefined) {
                for (let conexCI of moduleentry.connectionsInputs) {
                    if (conexCI.Connection.parentNode.id == moduleentry.id) {
                        let indexCI = moduleentry.connectionsInputs.indexOf(conexCI);
                        if (indexCI > -1) {
                            moduleentry.connectionsInputs.splice(indexCI, 1);
                        }
                    }
                }
            }
            if (moduleentry.connectionsOutputs !== undefined) {
                for (let conexCO of moduleentry.connectionsOutputs) {
                    if (conexCO.Connection.externalNode !== undefined) {
                        if (conexCO.Connection.externalNode.id == moduleentry.id) {
                            let indexCO = moduleentry.connectionsOutputs.indexOf(conexCO);
                            if (indexCO > -1) {
                                moduleentry.connectionsOutputs.splice(indexCO, 1);
                            }
                        }
                    }
                }
            }
        }
    }
    function addModule(chart, module) {
        chart.addModule(module);
    }

    /* src/AppCanvas.svelte generated by Svelte v3.22.2 */

    const { console: console_1$1 } = globals;

    function create_fragment$c(ctx) {
    	let current;

    	const canvas = new Canvas({
    			props: {
    				ChartStruc: /*ChartStruc*/ ctx[0],
    				Background_dx: -3000,
    				Background_dy: -3000
    			},
    			$$inline: true
    		});

    	canvas.$on("BackgroundMovement", /*handleBackGroundMovement*/ ctx[1]);

    	const block = {
    		c: function create() {
    			create_component(canvas.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(canvas, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const canvas_changes = {};
    			if (dirty & /*ChartStruc*/ 1) canvas_changes.ChartStruc = /*ChartStruc*/ ctx[0];
    			canvas.$set(canvas_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(canvas, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function sayHello(name) {
    	console.log("hello " + name);
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { ChartStruc } = $$props;

    	//positions where a module may "spawn"
    	let SpawnX;

    	let SpawnY;
    	let Background_dx;
    	let Background_dy;

    	const handleBackGroundMovement = e => {
    		Background_dx = e.detail.Background_dx.Background_dx;
    		Background_dy = e.detail.Background_dy.Background_dy;
    		SpawnX = -Background_dx + 600;
    		SpawnY = -Background_dy + 600;
    	};

    	const writable_props = ["ChartStruc"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<AppCanvas> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AppCanvas", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ChartStruc" in $$props) $$invalidate(0, ChartStruc = $$props.ChartStruc);
    	};

    	$$self.$capture_state = () => ({
    		Canvas,
    		Module,
    		Port,
    		Connection,
    		Chart,
    		Sidebar,
    		Button,
    		addModule,
    		removeModule,
    		ChartStruc,
    		SpawnX,
    		SpawnY,
    		Background_dx,
    		Background_dy,
    		handleBackGroundMovement,
    		sayHello
    	});

    	$$self.$inject_state = $$props => {
    		if ("ChartStruc" in $$props) $$invalidate(0, ChartStruc = $$props.ChartStruc);
    		if ("SpawnX" in $$props) SpawnX = $$props.SpawnX;
    		if ("SpawnY" in $$props) SpawnY = $$props.SpawnY;
    		if ("Background_dx" in $$props) Background_dx = $$props.Background_dx;
    		if ("Background_dy" in $$props) Background_dy = $$props.Background_dy;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [ChartStruc, handleBackGroundMovement];
    }

    class AppCanvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { ChartStruc: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppCanvas",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ChartStruc*/ ctx[0] === undefined && !("ChartStruc" in props)) {
    			console_1$1.warn("<AppCanvas> was created without expected prop 'ChartStruc'");
    		}
    	}

    	get ChartStruc() {
    		throw new Error("<AppCanvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ChartStruc(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.22.2 */
    const file$c = "src/App.svelte";

    function create_fragment$d(ctx) {
    	let div;
    	let t;
    	let current;

    	const canvas = new Canvas({
    			props: {
    				ChartStruc: /*Chart0*/ ctx[0],
    				Background_dx: /*Background_dxInitial*/ ctx[1],
    				Background_dy: /*Background_dyInitial*/ ctx[2]
    			},
    			$$inline: true
    		});

    	canvas.$on("BackgroundMovement", /*handleBackGroundMovement*/ ctx[3]);
    	const sidebar = new Sidebar({ $$inline: true });
    	sidebar.$on("SaveProject", /*handleSaveProject*/ ctx[4]);
    	sidebar.$on("AddModule", /*handleAddModule*/ ctx[5]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(canvas.$$.fragment);
    			t = space();
    			create_component(sidebar.$$.fragment);
    			attr_dev(div, "id", "WorkingCanvas");
    			attr_dev(div, "class", "svelte-3b6ajk");
    			add_location(div, file$c, 172, 0, 7790);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(canvas, div, null);
    			append_dev(div, t);
    			mount_component(sidebar, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const canvas_changes = {};
    			if (dirty & /*Chart0*/ 1) canvas_changes.ChartStruc = /*Chart0*/ ctx[0];
    			canvas.$set(canvas_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(canvas.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(canvas);
    			destroy_component(sidebar);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	var fs = require("fs");
    	var dir = "../MyFlowProjects";
    	let Chart0 = new Chart("Old Project");

    	//need to initialize vars
    	let Background_dxInitial = -3000;

    	let Background_dyInitial = -3000;

    	//positions where a module may "spawn"
    	let Background_dx;

    	let Background_dy;
    	let SpawnX = -Background_dxInitial + 600;
    	let SpawnY = -Background_dxInitial + 600;

    	const handleBackGroundMovement = e => {
    		Background_dx = e.detail.Background_dx.Background_dx;
    		Background_dy = e.detail.Background_dy.Background_dy;
    		SpawnX = -Background_dx + 600;
    		SpawnY = -Background_dy + 600;
    	};

    	//bunch of inputs/outputs for a module
    	let InputObject0 = new Port(true, "String", "IN");

    	let InputObject1 = new Port(true, "String", "INININ");
    	let OutputObject0 = new Port(false, "String", "nooo");
    	let OutputObject1 = new Port(false, "String", "out out out out");
    	let FlowModuleObject = new Module(0, "modulo0", 3000, 3300);
    	FlowModuleObject.addOutputs([OutputObject0, OutputObject1]);
    	FlowModuleObject.addInputs([InputObject0, InputObject1]);
    	FlowModuleObject.setModuleWidth();
    	FlowModuleObject.setModuleHeight();
    	FlowModuleObject.setPortCoords();
    	let InputObject2 = new Port(true, "String", "jesus & devil");
    	let InputObject3 = new Port(true, "String", "hello good sir");
    	let OutputObject2 = new Port(false, "String", "nooo");
    	let OutputObject3 = new Port(false, "String", "ole");
    	let FlowModuleObject2 = new Module(1, "exemplo2", 2700, 2900);
    	FlowModuleObject2.addOutputs([OutputObject2, OutputObject3]);
    	FlowModuleObject2.addInputs([InputObject2, InputObject3]);
    	FlowModuleObject2.setModuleWidth();
    	FlowModuleObject2.setModuleHeight();
    	FlowModuleObject2.setPortCoords();
    	let connection0 = new Connection("connectionX", InputObject0, true, FlowModuleObject);
    	connection0.setConnectedPort(OutputObject3, FlowModuleObject2);
    	FlowModuleObject.addInputConnection(InputObject0, OutputObject1, FlowModuleObject2, connection0);
    	FlowModuleObject2.addOutputConnection(OutputObject3, InputObject0, FlowModuleObject, connection0);
    	connection0.calculateCurve();
    	Chart0.addFinalConnection(connection0);
    	Chart0.addModule(FlowModuleObject);
    	Chart0.addModule(FlowModuleObject2);
    	let InputObject4 = new Port(true, "String", "IN");
    	let OutputObject4 = new Port(false, "String", "nooo");
    	let FlowModuleObject3 = new Module(3, "exemplo3", 3700, 3600);
    	FlowModuleObject3.addOutputs([OutputObject4]);
    	FlowModuleObject3.addInputs([InputObject4]);
    	FlowModuleObject3.setModuleWidth();
    	FlowModuleObject3.setModuleHeight();
    	FlowModuleObject3.setPortCoords();

    	//addModule(Chart0, FlowModuleObject3) 
    	//removeModule(Chart0, FlowModuleObject);
    	//reset
    	//Chart0 = new Chart('New Project');
    	//console.log(Chart0);
    	//conditon to swithc canvas here needed to be implemented
    	let activeChart = Chart0;

    	let myCanvas;

    	const handleSaveProject = e => {
    		let ProjectName = e.detail.name;

    		//TODO not the  ideal solution
    		let chart = activeChart;

    		var obj = {
    			"title": chart.ProjectName,
    			"Modules": []
    		};

    		let i;

    		if (chart.ModuleList.length) {
    			for (i = 0; i < chart.ModuleList.length; i++) {
    				let module_obj = {
    					"Name": chart.ModuleList[i].name,
    					"Id": i,
    					"Coord": {
    						"CoordX": chart.ModuleList[i].xPos,
    						"CoordY": chart.ModuleList[i].yPos
    					},
    					"FunctionID": chart.ModuleList[i].functionId,
    					"IO": { "Inputs": [], "Outputs": [] },
    					"Connections": { "Inputs": [], "Outputs": [] }
    				};

    				let j;

    				for (j = 0; j < chart.ModuleList[i].inputList.length; j++) {
    					let inputPortObj = {
    						"PortID": j,
    						"PortType": chart.ModuleList[i].inputList[j].varType,
    						"VarName": chart.ModuleList[i].inputList[j].varName
    					};

    					module_obj["IO"]["Inputs"].push(inputPortObj);
    					let connectionIndex;

    					if (chart.ModuleList[i].connectionsInputs !== undefined) {
    						for (connectionIndex = 0; connectionIndex < chart.ModuleList[i].connectionsInputs.length; connectionIndex++) {
    							if (chart.ModuleList[i].connectionsInputs[connectionIndex].InternalPort.id == j) {
    								let connectionObj = {
    									"ModuleID": chart.ModuleList[i].connectionsInputs[connectionIndex].ExternalNode.id,
    									"ModulePort": chart.ModuleList[i].connectionsInputs[connectionIndex].ExternalPort.id,
    									"InputPort": j
    								};

    								module_obj["Connections"]["Inputs"].push(connectionObj);
    							}
    						}
    					}

    					if (chart.ModuleList[i].connectionsOutputs !== undefined) {
    						for (connectionIndex = 0; connectionIndex < chart.ModuleList[i].connectionsOutputs.length; connectionIndex++) {
    							if (chart.ModuleList[i].connectionsOutputs[connectionIndex].InternalPort.id == j) {
    								let connectionObj = {
    									"ModuleID": chart.ModuleList[i].connectionsOutputs[connectionIndex].ExternalNode.id,
    									"ModulePort": chart.ModuleList[i].connectionsOutputs[connectionIndex].ExternalPort.id,
    									"OutputPort": j
    								};

    								module_obj["Connections"]["Outputs"].push(connectionObj);
    							}
    						}
    					}
    				}

    				obj["Modules"].push(module_obj);
    			}
    		}

    		var json = JSON.stringify(obj);

    		//create directory with files
    		if (!fs.existsSync(dir)) {
    			fs.mkdirSync(dir);
    		}

    		fs.writeFile("../MyFlowProjects/" + ProjectName + ".json", json, err => {
    			if (err) {
    				alert("An error ocurred creating the file " + err.message);
    			}

    			alert("The file has been succesfully saved");
    		});
    	};

    	const handleAddModule = e => {
    		Chart0.findIdealModuleId(0);
    		let TemplateModule = e.detail.module;
    		let ModuleToBeAdded = new Module(Chart0.nextModuleID);

    		for (let i = 0; i < TemplateModule.listInputs.length; i++) {
    			let PortToBeAdded = new Port(TemplateModule.listInputs[i].isInput, TemplateModule.listInputs[i].varType, TemplateModule.listInputs[i].varName);
    			ModuleToBeAdded.inputList.push(PortToBeAdded);
    		}

    		for (let i = 0; i < TemplateModule.listOutputs.length; i++) {
    			let PortToBeAdded = new Port(TemplateModule.listOutputs[i].isInput, TemplateModule.listOutputs[i].varType, TemplateModule.listOutputs[i].varName);
    			ModuleToBeAdded.outputList.push(PortToBeAdded);
    		}

    		ModuleToBeAdded.name = TemplateModule.name;
    		ModuleToBeAdded.setXPos(SpawnX);
    		ModuleToBeAdded.setYPos(SpawnY);
    		ModuleToBeAdded.setModuleWidth();
    		ModuleToBeAdded.setModuleHeight();
    		ModuleToBeAdded.setPortCoords();
    		activeChart.ModuleList.push(ModuleToBeAdded);
    		activeChart.ModuleList = activeChart.ModuleList;

    		//not great logic here... should separate all of this
    		//used to help rendering... it was adding but did not show until i moved a module
    		//and so, updated the chart
    		$$invalidate(0, Chart0 = activeChart);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		AppCanvas,
    		Canvas,
    		onMount,
    		Module,
    		Port,
    		Connection,
    		Chart,
    		Sidebar,
    		addModule,
    		removeModule,
    		fs,
    		dir,
    		Chart0,
    		Background_dxInitial,
    		Background_dyInitial,
    		Background_dx,
    		Background_dy,
    		SpawnX,
    		SpawnY,
    		handleBackGroundMovement,
    		InputObject0,
    		InputObject1,
    		OutputObject0,
    		OutputObject1,
    		FlowModuleObject,
    		InputObject2,
    		InputObject3,
    		OutputObject2,
    		OutputObject3,
    		FlowModuleObject2,
    		connection0,
    		InputObject4,
    		OutputObject4,
    		FlowModuleObject3,
    		activeChart,
    		myCanvas,
    		handleSaveProject,
    		handleAddModule
    	});

    	$$self.$inject_state = $$props => {
    		if ("fs" in $$props) fs = $$props.fs;
    		if ("dir" in $$props) dir = $$props.dir;
    		if ("Chart0" in $$props) $$invalidate(0, Chart0 = $$props.Chart0);
    		if ("Background_dxInitial" in $$props) $$invalidate(1, Background_dxInitial = $$props.Background_dxInitial);
    		if ("Background_dyInitial" in $$props) $$invalidate(2, Background_dyInitial = $$props.Background_dyInitial);
    		if ("Background_dx" in $$props) Background_dx = $$props.Background_dx;
    		if ("Background_dy" in $$props) Background_dy = $$props.Background_dy;
    		if ("SpawnX" in $$props) SpawnX = $$props.SpawnX;
    		if ("SpawnY" in $$props) SpawnY = $$props.SpawnY;
    		if ("InputObject0" in $$props) InputObject0 = $$props.InputObject0;
    		if ("InputObject1" in $$props) InputObject1 = $$props.InputObject1;
    		if ("OutputObject0" in $$props) OutputObject0 = $$props.OutputObject0;
    		if ("OutputObject1" in $$props) OutputObject1 = $$props.OutputObject1;
    		if ("FlowModuleObject" in $$props) FlowModuleObject = $$props.FlowModuleObject;
    		if ("InputObject2" in $$props) InputObject2 = $$props.InputObject2;
    		if ("InputObject3" in $$props) InputObject3 = $$props.InputObject3;
    		if ("OutputObject2" in $$props) OutputObject2 = $$props.OutputObject2;
    		if ("OutputObject3" in $$props) OutputObject3 = $$props.OutputObject3;
    		if ("FlowModuleObject2" in $$props) FlowModuleObject2 = $$props.FlowModuleObject2;
    		if ("connection0" in $$props) connection0 = $$props.connection0;
    		if ("InputObject4" in $$props) InputObject4 = $$props.InputObject4;
    		if ("OutputObject4" in $$props) OutputObject4 = $$props.OutputObject4;
    		if ("FlowModuleObject3" in $$props) FlowModuleObject3 = $$props.FlowModuleObject3;
    		if ("activeChart" in $$props) activeChart = $$props.activeChart;
    		if ("myCanvas" in $$props) myCanvas = $$props.myCanvas;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		Chart0,
    		Background_dxInitial,
    		Background_dyInitial,
    		handleBackGroundMovement,
    		handleSaveProject,
    		handleAddModule
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: "world"
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
