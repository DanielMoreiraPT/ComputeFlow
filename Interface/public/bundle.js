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
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
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
            node.dispatchEvent(new CustomEvent("dragstart", {
                detail: { lastX, lastY }
            }));
            window.addEventListener("mousemove", handleMousemove);
            window.addEventListener("mouseup", handleMouseup);
        }
        function handleMousemove(event) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent("dragmove", {
                detail: { lastX, lastY, dx, dy }
            }));
        }
        function handleMouseup(event) {
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent("dragend", {
                detail: { lastX, lastY }
            }));
            window.removeEventListener("mousemove", handleMousemove);
            window.removeEventListener("mouseup", handleMouseup);
        }
        node.addEventListener("mousedown", handleMousedown);
        return {
            destroy() {
                node.removeEventListener("mousedown", handleMousedown);
                node.removeEventListener("mouseup", handleMouseup);
                node.removeEventListener("mousemove", handleMousemove);
            }
        };
    }

    class Connection {
        constructor(id, parentPort, parentPortInput, parentNode) {
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
            if (this.externalPort === undefined) {
                if (this.endPointX !== undefined && this.endPointY !== undefined) {
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
        constructor(id, name, xPos, yPos) {
            //TODO
            //default
            this.functionId = 0;
            this.inputList = [];
            this.outputList = [];
            this.id = id;
            this.name = name;
            this.xPos = xPos;
            this.yPos = yPos;
            this.connectionsInputs = [];
            this.connectionsOutputs = [];
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
        getInputList() {
            if (this.inputList) {
                return this.inputList;
            }
            else {
                return "";
            }
        }
        getOutputList() {
            if (this.outputList) {
                return this.outputList;
            }
            else {
                return "";
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
            let titleSize = this.name.length * 14;
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
            if (titleSize > this.moduleWidth) {
                this.moduleWidth = titleSize;
            }
        }
        setModuleHeight() {
            if (this.headerHeight === undefined) {
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
                if (this.moduleWidth === undefined) {
                    this.setModuleWidth();
                }
                if (this.moduleWidth !== undefined) { //so pq tava a dar erro a dzr que this.moduleWidth n tava definido
                    output.setXPos(this.xPos + this.moduleWidth - 11);
                    output.setYPos(this.yPos + 50 + (25 * portNumber) + 10); //ypos -> posicao do modulo + 50 -> header e espaco  + 25*portNumber -> separacao entre cada port + 10 -> para ficar no centro do circulo +-
                    portNumber += 1;
                }
            }
        }
        addInputConnection(InternalPort, ExternalPort, ExternalNode, Connection) {
            if (this.connectionsInputs === undefined) {
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
        adjustOwnProperties() {
            this.setModuleHeight();
            this.setModuleWidth();
            this.setPortCoords();
        }
    }
    class Chart {
        constructor(ProjectName) {
            this.ModuleList = [];
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
            if (this.ModuleList.length == 0) {
                this.nextModuleID = 0;
            }
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
        toJSON() {
            var obj = {
                "title": this.ProjectName,
                "Modules": []
            };
            let i;
            if (this.ModuleList.length) {
                for (i = 0; i < this.ModuleList.length; i++) {
                    let module_obj = {
                        "Name": this.ModuleList[i].name,
                        "Id": i,
                        "Variables": {},
                        "Coord": {
                            "CoordX": this.ModuleList[i].xPos,
                            "CoordY": this.ModuleList[i].yPos
                        },
                        "FunctionID": this.ModuleList[i].functionId,
                        "IO": {
                            "Inputs": [],
                            "Outputs": []
                        },
                        "Connections": {
                            "Inputs": [],
                            "Outputs": []
                        }
                    };
                    if (this.ModuleList[i].listVariables) {
                        module_obj["Variables"] = this.ModuleList[i].listVariables;
                    }
                    let j;
                    for (j = 0; j < this.ModuleList[i].inputList.length; j++) {
                        let inputPortObj = {
                            "PortID": j,
                            "PortType": this.ModuleList[i].inputList[j].varType,
                            "VarName": this.ModuleList[i].inputList[j].varName
                        };
                        module_obj["IO"]["Inputs"].push(inputPortObj);
                        let connectionIndex;
                        if (this.ModuleList[i].connectionsInputs !== undefined) {
                            for (connectionIndex = 0; connectionIndex < this.ModuleList[i].connectionsInputs.length; connectionIndex++) {
                                if (this.ModuleList[i].connectionsInputs[connectionIndex].InternalPort.id == j) {
                                    let connectionObj = {
                                        "ModuleID": this.ModuleList[i].connectionsInputs[connectionIndex].ExternalNode.id,
                                        "ModulePort": this.ModuleList[i].connectionsInputs[connectionIndex].ExternalPort.id,
                                        "InputPort": j
                                    };
                                    module_obj["Connections"]["Inputs"].push(connectionObj);
                                }
                            }
                        }
                    }
                    for (j = 0; j < this.ModuleList[i].outputList.length; j++) {
                        let outputPortObj = {
                            "PortID": j,
                            "PortType": this.ModuleList[i].outputList[j].varType,
                            "VarName": this.ModuleList[i].outputList[j].varName
                        };
                        module_obj["IO"]["Outputs"].push(outputPortObj);
                        let connectionIndex;
                        if (this.ModuleList[i].connectionsOutputs !== undefined) {
                            for (connectionIndex = 0; connectionIndex < this.ModuleList[i].connectionsOutputs.length; connectionIndex++) {
                                if (this.ModuleList[i].connectionsOutputs[connectionIndex].InternalPort.id == j) {
                                    let connectionObj = {
                                        "ModuleID": this.ModuleList[i].connectionsOutputs[connectionIndex].ExternalNode.id,
                                        "ModulePort": this.ModuleList[i].connectionsOutputs[connectionIndex].ExternalPort.id,
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
            return json;
        }
        loadJSON(data) {
            let json = JSON.parse(data);
            console.log(json);
            this.ModuleList = [];
            this.FinalConnections = [];
            for (let i = 0; i < json.Modules.length; i++) {
                let inputlist = [];
                let outputlist = [];
                for (let j = 0; j < json.Modules[i].IO.Inputs.length; j++) {
                    let InputObject = new Port(true, json.Modules[i].IO.Inputs[j].PortType, json.Modules[i].IO.Inputs[j].VarName);
                    inputlist.push(InputObject);
                }
                for (let h = 0; h < json.Modules[i].IO.Outputs.length; h++) {
                    let OutputObject = new Port(false, json.Modules[i].IO.Outputs[h].PortType, json.Modules[i].IO.Outputs[h].VarName);
                    outputlist.push(OutputObject);
                }
                let FlowModuleObject = new Module(json.Modules[i].Id, json.Modules[i].Name, json.Modules[i].Coord.CoordX, json.Modules[i].Coord.CoordY);
                FlowModuleObject.functionId = json.Modules[i].FunctionID;
                FlowModuleObject.addOutputs(outputlist);
                FlowModuleObject.addInputs(inputlist);
                FlowModuleObject.setModuleWidth();
                FlowModuleObject.setModuleHeight();
                FlowModuleObject.setPortCoords();
                if (json.Modules[i].Variables) {
                    FlowModuleObject.listVariables = json.Modules[i].Variables;
                }
                console.log(FlowModuleObject);
                this.addModule(FlowModuleObject);
            }
            for (let i = 0; i < json.Modules.length; i++) {
                for (let j = 0; j < json.Modules[i].Connections.Inputs.length; j++) {
                    //correto
                    let InputObject = this.ModuleList[i].inputList[json.Modules[i].Connections.Inputs[j].InputPort];
                    let InputModule = this.ModuleList[i];
                    let OutputModule = this.ModuleList[json.Modules[i].Connections.Inputs[j].ModuleID];
                    let OutputObject = OutputModule.outputList[json.Modules[i].Connections.Inputs[j].ModulePort];
                    let connection = new Connection('connectionX', InputObject, true, InputModule);
                    connection.setConnectedPort(OutputObject, OutputModule);
                    connection.calculateCurve();
                    InputModule.addInputConnection(InputObject, OutputObject, OutputModule, connection);
                    OutputModule.addOutputConnection(OutputObject, InputObject, InputModule, connection);
                    this.addFinalConnection(connection);
                }
            }
        }
    }

    /* src\FlowModuleHeaderv2.svelte generated by Svelte v3.22.2 */

    const file = "src\\FlowModuleHeaderv2.svelte";

    function create_fragment(ctx) {
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
    			t = text(/*moduleName*/ ctx[0]);
    			attr_dev(rect0, "class", "header-round-rect");
    			attr_dev(rect0, "width", /*moduleWidth*/ ctx[1]);
    			attr_dev(rect0, "height", "40");
    			attr_dev(rect0, "x", /*xPosHeader*/ ctx[2]);
    			attr_dev(rect0, "y", /*yPosHeader*/ ctx[3]);
    			attr_dev(rect0, "rx", "4");
    			attr_dev(rect0, "ry", "4");
    			add_location(rect0, file, 20, 4, 605);
    			attr_dev(rect1, "class", "header-rect");
    			attr_dev(rect1, "width", /*moduleWidth*/ ctx[1]);
    			attr_dev(rect1, "height", "36");
    			attr_dev(rect1, "x", /*headerRectX*/ ctx[6]);
    			attr_dev(rect1, "y", /*headerRectY*/ ctx[7]);
    			add_location(rect1, file, 21, 4, 721);
    			attr_dev(text_1, "class", "header-title svelte-izndw0");
    			attr_dev(text_1, "x", /*headerTitleX*/ ctx[4]);
    			attr_dev(text_1, "y", /*headerTitleY*/ ctx[5]);
    			add_location(text_1, file, 22, 4, 819);
    			attr_dev(g, "class", "node-header svelte-izndw0");
    			add_location(g, file, 19, 0, 576);
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

    			if (dirty & /*xPosHeader*/ 4) {
    				attr_dev(rect0, "x", /*xPosHeader*/ ctx[2]);
    			}

    			if (dirty & /*yPosHeader*/ 8) {
    				attr_dev(rect0, "y", /*yPosHeader*/ ctx[3]);
    			}

    			if (dirty & /*moduleWidth*/ 2) {
    				attr_dev(rect1, "width", /*moduleWidth*/ ctx[1]);
    			}

    			if (dirty & /*headerRectX*/ 64) {
    				attr_dev(rect1, "x", /*headerRectX*/ ctx[6]);
    			}

    			if (dirty & /*headerRectY*/ 128) {
    				attr_dev(rect1, "y", /*headerRectY*/ ctx[7]);
    			}

    			if (dirty & /*moduleName*/ 1) set_data_dev(t, /*moduleName*/ ctx[0]);

    			if (dirty & /*headerTitleX*/ 16) {
    				attr_dev(text_1, "x", /*headerTitleX*/ ctx[4]);
    			}

    			if (dirty & /*headerTitleY*/ 32) {
    				attr_dev(text_1, "y", /*headerTitleY*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
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
    	let { StrucModule } = $$props;
    	let moduleName;
    	let moduleWidth;
    	let xPosHeader;
    	let yPosHeader;
    	let headerTitleX;
    	let headerTitleY;

    	//alterar possivelmente o fundo do header e ajustar
    	let headerRectX;

    	let headerRectY;
    	const writable_props = ["StrucModule"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleHeaderv2> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleHeaderv2", $$slots, []);

    	$$self.$set = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(8, StrucModule = $$props.StrucModule);
    	};

    	$$self.$capture_state = () => ({
    		StrucModule,
    		moduleName,
    		moduleWidth,
    		xPosHeader,
    		yPosHeader,
    		headerTitleX,
    		headerTitleY,
    		headerRectX,
    		headerRectY
    	});

    	$$self.$inject_state = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(8, StrucModule = $$props.StrucModule);
    		if ("moduleName" in $$props) $$invalidate(0, moduleName = $$props.moduleName);
    		if ("moduleWidth" in $$props) $$invalidate(1, moduleWidth = $$props.moduleWidth);
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

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*StrucModule*/ 256) {
    			 $$invalidate(2, xPosHeader = StrucModule.xPos + 2);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 256) {
    			 $$invalidate(3, yPosHeader = StrucModule.yPos + 2);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 256) {
    			 $$invalidate(0, moduleName = StrucModule.name);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 256) {
    			 $$invalidate(1, moduleWidth = StrucModule.getModuleWidth());
    		}

    		if ($$self.$$.dirty & /*xPosHeader, moduleWidth*/ 6) {
    			 $$invalidate(4, headerTitleX = xPosHeader + moduleWidth / 2);
    		}

    		if ($$self.$$.dirty & /*yPosHeader*/ 8) {
    			 $$invalidate(5, headerTitleY = yPosHeader + 30);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 256) {
    			 $$invalidate(6, headerRectX = StrucModule.xPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 256) {
    			 $$invalidate(7, headerRectY = StrucModule.yPos);
    		}
    	};

    	return [
    		moduleName,
    		moduleWidth,
    		xPosHeader,
    		yPosHeader,
    		headerTitleX,
    		headerTitleY,
    		headerRectX,
    		headerRectY,
    		StrucModule
    	];
    }

    class FlowModuleHeaderv2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { StrucModule: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleHeaderv2",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*StrucModule*/ ctx[8] === undefined && !("StrucModule" in props)) {
    			console.warn("<FlowModuleHeaderv2> was created without expected prop 'StrucModule'");
    		}
    	}

    	get StrucModule() {
    		throw new Error("<FlowModuleHeaderv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set StrucModule(value) {
    		throw new Error("<FlowModuleHeaderv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
            node.dispatchEvent(new CustomEvent("connectionStart", {
                detail: { lastX, lastY }
            }));
            window.addEventListener("mousemove", handleMousemove);
            window.addEventListener("mouseup", handleMouseup);
            //added now
            window.addEventListener("mousedown", handleDoubleClick);
        }
        function handleMousemove(event) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent("connectionDrag", {
                detail: { lastX, lastY, dx, dy }
            }));
        }
        function handleMouseup(event) {
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent("connectionEnd", {
                detail: { lastX, lastY }
            }));
            window.removeEventListener("mousemove", handleMousemove);
            window.removeEventListener("mouseup", handleMouseup);
        }
        function handleDoubleClick(event) {
            //added now
            lastX = event.clientX;
            lastY = event.clientY;
            event.preventDefault();
            node.dispatchEvent(new CustomEvent("connectionEnd", {
                detail: { lastX, lastY }
            }));
            window.removeEventListener("mousemove", handleMousemove);
            window.removeEventListener("mouseup", handleMouseup);
        }
        node.addEventListener("mousedown", handleMousedown);
        return {
            destroy() {
                node.removeEventListener("mousedown", handleMousedown);
                node.removeEventListener("mouseup", handleMouseup);
                node.removeEventListener("mousemove", handleMousemove);
            }
        };
    }

    /* src\FlowModuleInputv2.svelte generated by Svelte v3.22.2 */
    const file$1 = "src\\FlowModuleInputv2.svelte";

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
    			attr_dev(circle0, "class", "port-outer svelte-14g2rp3");
    			attr_dev(circle0, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle0, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle0, "r", "7.5");
    			add_location(circle0, file$1, 79, 2, 2216);
    			attr_dev(circle1, "class", "port-inner svelte-14g2rp3");
    			attr_dev(circle1, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle1, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle1, "r", "5");
    			add_location(circle1, file$1, 80, 2, 2273);
    			attr_dev(circle2, "class", "port-scrim svelte-14g2rp3");
    			attr_dev(circle2, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle2, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle2, "r", "7.5");
    			add_location(circle2, file$1, 81, 2, 2328);
    			attr_dev(g0, "class", "port svelte-14g2rp3");
    			add_location(g0, file$1, 74, 1, 2024);
    			attr_dev(text_1, "class", "port-label svelte-14g2rp3");
    			attr_dev(text_1, "x", /*portLabelX*/ ctx[4]);
    			attr_dev(text_1, "y", /*portLabelY*/ ctx[5]);
    			add_location(text_1, file$1, 83, 1, 2391);
    			attr_dev(g1, "class", "input-field svelte-14g2rp3");
    			attr_dev(g1, "transform", g1_transform_value = "translate(0, " + /*transformValue*/ ctx[6] + ")");
    			add_location(g1, file$1, 73, 0, 1955);
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
    			if (dirty & /*cx*/ 4) {
    				attr_dev(circle0, "cx", /*cx*/ ctx[2]);
    			}

    			if (dirty & /*cy*/ 8) {
    				attr_dev(circle0, "cy", /*cy*/ ctx[3]);
    			}

    			if (dirty & /*cx*/ 4) {
    				attr_dev(circle1, "cx", /*cx*/ ctx[2]);
    			}

    			if (dirty & /*cy*/ 8) {
    				attr_dev(circle1, "cy", /*cy*/ ctx[3]);
    			}

    			if (dirty & /*cx*/ 4) {
    				attr_dev(circle2, "cx", /*cx*/ ctx[2]);
    			}

    			if (dirty & /*cy*/ 8) {
    				attr_dev(circle2, "cy", /*cy*/ ctx[3]);
    			}

    			if (dirty & /*varType*/ 1) set_data_dev(t0, /*varType*/ ctx[0]);
    			if (dirty & /*varName*/ 2) set_data_dev(t2, /*varName*/ ctx[1]);

    			if (dirty & /*portLabelX*/ 16) {
    				attr_dev(text_1, "x", /*portLabelX*/ ctx[4]);
    			}

    			if (dirty & /*portLabelY*/ 32) {
    				attr_dev(text_1, "y", /*portLabelY*/ ctx[5]);
    			}

    			if (dirty & /*transformValue*/ 64 && g1_transform_value !== (g1_transform_value = "translate(0, " + /*transformValue*/ ctx[6] + ")")) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}
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
    	const dispatch = createEventDispatcher();
    	let { portNumber } = $$props;
    	let { port } = $$props;
    	let { StrucModule } = $$props;
    	let xPos;
    	let yPos;
    	let varType;
    	let varName;
    	let cx;
    	let cy;
    	let portLabelX;
    	let portLabelY;
    	let transformValue;
    	let cyRealValue;
    	let space = " ";

    	//console.log(StrucModule)
    	port.xPos = parseInt(StrucModule.xPos) + 15;

    	port.yPos = parseInt(StrucModule.yPos) + 10 + 50 + 25 * portNumber;
    	port.id = portNumber;

    	//console.log("cx: "+port.xPos)
    	//console.log("cyRealValue: "+port.yPos)
    	//console.log("portNumber: "+port.id)
    	//console.log("FlowModuleINputv2 -->  port")
    	//console.log(port)
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

    	const writable_props = ["portNumber", "port", "StrucModule"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleInputv2> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleInputv2", $$slots, []);

    	$$self.$set = $$props => {
    		if ("portNumber" in $$props) $$invalidate(12, portNumber = $$props.portNumber);
    		if ("port" in $$props) $$invalidate(11, port = $$props.port);
    		if ("StrucModule" in $$props) $$invalidate(13, StrucModule = $$props.StrucModule);
    	};

    	$$self.$capture_state = () => ({
    		Module,
    		Port,
    		connections,
    		createEventDispatcher,
    		dispatch,
    		portNumber,
    		port,
    		StrucModule,
    		xPos,
    		yPos,
    		varType,
    		varName,
    		cx,
    		cy,
    		portLabelX,
    		portLabelY,
    		transformValue,
    		cyRealValue,
    		space,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("portNumber" in $$props) $$invalidate(12, portNumber = $$props.portNumber);
    		if ("port" in $$props) $$invalidate(11, port = $$props.port);
    		if ("StrucModule" in $$props) $$invalidate(13, StrucModule = $$props.StrucModule);
    		if ("xPos" in $$props) $$invalidate(14, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(15, yPos = $$props.yPos);
    		if ("varType" in $$props) $$invalidate(0, varType = $$props.varType);
    		if ("varName" in $$props) $$invalidate(1, varName = $$props.varName);
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

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*StrucModule*/ 8192) {
    			 $$invalidate(14, xPos = StrucModule.xPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 8192) {
    			 $$invalidate(15, yPos = StrucModule.yPos);
    		}

    		if ($$self.$$.dirty & /*port*/ 2048) {
    			 $$invalidate(0, varType = port.varType);
    		}

    		if ($$self.$$.dirty & /*port*/ 2048) {
    			 $$invalidate(1, varName = port.varName);
    		}

    		if ($$self.$$.dirty & /*xPos*/ 16384) {
    			 $$invalidate(2, cx = xPos + 15);
    		}

    		if ($$self.$$.dirty & /*yPos*/ 32768) {
    			 $$invalidate(3, cy = yPos + 10);
    		}

    		if ($$self.$$.dirty & /*xPos*/ 16384) {
    			 $$invalidate(4, portLabelX = xPos + 28);
    		}

    		if ($$self.$$.dirty & /*yPos*/ 32768) {
    			 $$invalidate(5, portLabelY = yPos + 14);
    		}

    		if ($$self.$$.dirty & /*portNumber*/ 4096) {
    			 $$invalidate(6, transformValue = 50 + 25 * portNumber);
    		}

    		if ($$self.$$.dirty & /*cy, transformValue*/ 72) {
    			 cyRealValue = cy + transformValue;
    		}
    	};

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
    		port,
    		portNumber,
    		StrucModule
    	];
    }

    class FlowModuleInputv2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			portNumber: 12,
    			port: 11,
    			StrucModule: 13
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleInputv2",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*portNumber*/ ctx[12] === undefined && !("portNumber" in props)) {
    			console.warn("<FlowModuleInputv2> was created without expected prop 'portNumber'");
    		}

    		if (/*port*/ ctx[11] === undefined && !("port" in props)) {
    			console.warn("<FlowModuleInputv2> was created without expected prop 'port'");
    		}

    		if (/*StrucModule*/ ctx[13] === undefined && !("StrucModule" in props)) {
    			console.warn("<FlowModuleInputv2> was created without expected prop 'StrucModule'");
    		}
    	}

    	get portNumber() {
    		throw new Error("<FlowModuleInputv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set portNumber(value) {
    		throw new Error("<FlowModuleInputv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get port() {
    		throw new Error("<FlowModuleInputv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set port(value) {
    		throw new Error("<FlowModuleInputv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get StrucModule() {
    		throw new Error("<FlowModuleInputv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set StrucModule(value) {
    		throw new Error("<FlowModuleInputv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\FlowModuleOutputv2.svelte generated by Svelte v3.22.2 */
    const file$2 = "src\\FlowModuleOutputv2.svelte";

    function create_fragment$2(ctx) {
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
    			attr_dev(circle0, "class", "port-outer svelte-1mvmq7w");
    			attr_dev(circle0, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle0, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle0, "r", "7.5");
    			add_location(circle0, file$2, 76, 8, 2250);
    			attr_dev(circle1, "class", "port-inner svelte-1mvmq7w");
    			attr_dev(circle1, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle1, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle1, "r", "5");
    			add_location(circle1, file$2, 77, 8, 2313);
    			attr_dev(circle2, "class", "port-scrim svelte-1mvmq7w");
    			attr_dev(circle2, "cx", /*cx*/ ctx[2]);
    			attr_dev(circle2, "cy", /*cy*/ ctx[3]);
    			attr_dev(circle2, "r", "7.5");
    			add_location(circle2, file$2, 78, 8, 2374);
    			attr_dev(g0, "class", "port svelte-1mvmq7w");
    			add_location(g0, file$2, 71, 4, 2064);
    			attr_dev(text_1, "class", "port-label svelte-1mvmq7w");
    			attr_dev(text_1, "x", /*portLabelX*/ ctx[4]);
    			attr_dev(text_1, "y", /*portLabelY*/ ctx[5]);
    			add_location(text_1, file$2, 80, 4, 2443);
    			attr_dev(g1, "class", "output-field svelte-1mvmq7w");
    			attr_dev(g1, "transform", g1_transform_value = "translate(0, " + /*transformValue*/ ctx[6] + ")");
    			add_location(g1, file$2, 70, 0, 1991);
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
    			if (dirty & /*cx*/ 4) {
    				attr_dev(circle0, "cx", /*cx*/ ctx[2]);
    			}

    			if (dirty & /*cy*/ 8) {
    				attr_dev(circle0, "cy", /*cy*/ ctx[3]);
    			}

    			if (dirty & /*cx*/ 4) {
    				attr_dev(circle1, "cx", /*cx*/ ctx[2]);
    			}

    			if (dirty & /*cy*/ 8) {
    				attr_dev(circle1, "cy", /*cy*/ ctx[3]);
    			}

    			if (dirty & /*cx*/ 4) {
    				attr_dev(circle2, "cx", /*cx*/ ctx[2]);
    			}

    			if (dirty & /*cy*/ 8) {
    				attr_dev(circle2, "cy", /*cy*/ ctx[3]);
    			}

    			if (dirty & /*varType*/ 1) set_data_dev(t0, /*varType*/ ctx[0]);
    			if (dirty & /*varName*/ 2) set_data_dev(t2, /*varName*/ ctx[1]);

    			if (dirty & /*portLabelX*/ 16) {
    				attr_dev(text_1, "x", /*portLabelX*/ ctx[4]);
    			}

    			if (dirty & /*portLabelY*/ 32) {
    				attr_dev(text_1, "y", /*portLabelY*/ ctx[5]);
    			}

    			if (dirty & /*transformValue*/ 64 && g1_transform_value !== (g1_transform_value = "translate(0, " + /*transformValue*/ ctx[6] + ")")) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { portNumber } = $$props;
    	let { port } = $$props;
    	let { StrucModule } = $$props;
    	let xPos;
    	let yPos;
    	let moduleWidth;
    	let varType;
    	let varName;
    	let cx;
    	let cy;
    	let portLabelX;
    	let portLabelY;
    	let transformValue;
    	let cyRealValue;
    	let space = " ";
    	port.xPos = parseInt(StrucModule.xPos) + parseInt(StrucModule.getModuleWidth()) - 11;
    	port.yPos = parseInt(StrucModule.yPos) + 10 + 50 + 25 * portNumber;
    	port.id = portNumber;

    	//console.log("cx: "+port.xPos)
    	//console.log("cyRealValue: "+port.yPos)
    	//console.log("portNumber: "+port.id)
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

    	const writable_props = ["portNumber", "port", "StrucModule"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleOutputv2> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleOutputv2", $$slots, []);

    	$$self.$set = $$props => {
    		if ("portNumber" in $$props) $$invalidate(12, portNumber = $$props.portNumber);
    		if ("port" in $$props) $$invalidate(11, port = $$props.port);
    		if ("StrucModule" in $$props) $$invalidate(13, StrucModule = $$props.StrucModule);
    	};

    	$$self.$capture_state = () => ({
    		Module,
    		Port,
    		connections,
    		createEventDispatcher,
    		dispatch,
    		portNumber,
    		port,
    		StrucModule,
    		xPos,
    		yPos,
    		moduleWidth,
    		varType,
    		varName,
    		cx,
    		cy,
    		portLabelX,
    		portLabelY,
    		transformValue,
    		cyRealValue,
    		space,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	});

    	$$self.$inject_state = $$props => {
    		if ("portNumber" in $$props) $$invalidate(12, portNumber = $$props.portNumber);
    		if ("port" in $$props) $$invalidate(11, port = $$props.port);
    		if ("StrucModule" in $$props) $$invalidate(13, StrucModule = $$props.StrucModule);
    		if ("xPos" in $$props) $$invalidate(14, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(15, yPos = $$props.yPos);
    		if ("moduleWidth" in $$props) $$invalidate(16, moduleWidth = $$props.moduleWidth);
    		if ("varType" in $$props) $$invalidate(0, varType = $$props.varType);
    		if ("varName" in $$props) $$invalidate(1, varName = $$props.varName);
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

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*StrucModule*/ 8192) {
    			 $$invalidate(14, xPos = StrucModule.xPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 8192) {
    			 $$invalidate(15, yPos = StrucModule.yPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 8192) {
    			 $$invalidate(16, moduleWidth = StrucModule.getModuleWidth());
    		}

    		if ($$self.$$.dirty & /*port*/ 2048) {
    			 $$invalidate(0, varType = port.varType);
    		}

    		if ($$self.$$.dirty & /*port*/ 2048) {
    			 $$invalidate(1, varName = port.varName);
    		}

    		if ($$self.$$.dirty & /*xPos, moduleWidth*/ 81920) {
    			 $$invalidate(2, cx = xPos + moduleWidth - 11);
    		}

    		if ($$self.$$.dirty & /*yPos*/ 32768) {
    			 $$invalidate(3, cy = yPos + 10);
    		}

    		if ($$self.$$.dirty & /*xPos, moduleWidth*/ 81920) {
    			 $$invalidate(4, portLabelX = xPos + moduleWidth - 24);
    		}

    		if ($$self.$$.dirty & /*yPos*/ 32768) {
    			 $$invalidate(5, portLabelY = yPos + 14);
    		}

    		if ($$self.$$.dirty & /*portNumber*/ 4096) {
    			 $$invalidate(6, transformValue = 50 + 25 * portNumber);
    		}

    		if ($$self.$$.dirty & /*cy, transformValue*/ 72) {
    			 cyRealValue = cy + transformValue;
    		}
    	};

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
    		port,
    		portNumber,
    		StrucModule
    	];
    }

    class FlowModuleOutputv2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			portNumber: 12,
    			port: 11,
    			StrucModule: 13
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleOutputv2",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*portNumber*/ ctx[12] === undefined && !("portNumber" in props)) {
    			console.warn("<FlowModuleOutputv2> was created without expected prop 'portNumber'");
    		}

    		if (/*port*/ ctx[11] === undefined && !("port" in props)) {
    			console.warn("<FlowModuleOutputv2> was created without expected prop 'port'");
    		}

    		if (/*StrucModule*/ ctx[13] === undefined && !("StrucModule" in props)) {
    			console.warn("<FlowModuleOutputv2> was created without expected prop 'StrucModule'");
    		}
    	}

    	get portNumber() {
    		throw new Error("<FlowModuleOutputv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set portNumber(value) {
    		throw new Error("<FlowModuleOutputv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get port() {
    		throw new Error("<FlowModuleOutputv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set port(value) {
    		throw new Error("<FlowModuleOutputv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get StrucModule() {
    		throw new Error("<FlowModuleOutputv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set StrucModule(value) {
    		throw new Error("<FlowModuleOutputv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\FlowModuleContentv2.svelte generated by Svelte v3.22.2 */
    const file$3 = "src\\FlowModuleContentv2.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (64:8) {#each InputList as item, i (i)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let current;

    	const flowmoduleinputv2 = new FlowModuleInputv2({
    			props: {
    				port: /*item*/ ctx[14],
    				portNumber: /*i*/ ctx[16],
    				StrucModule: /*StrucModule*/ ctx[0]
    			},
    			$$inline: true
    		});

    	flowmoduleinputv2.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[8]);
    	flowmoduleinputv2.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[9]);
    	flowmoduleinputv2.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[10]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(flowmoduleinputv2.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(flowmoduleinputv2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const flowmoduleinputv2_changes = {};
    			if (dirty & /*InputList*/ 8) flowmoduleinputv2_changes.port = /*item*/ ctx[14];
    			if (dirty & /*InputList*/ 8) flowmoduleinputv2_changes.portNumber = /*i*/ ctx[16];
    			if (dirty & /*StrucModule*/ 1) flowmoduleinputv2_changes.StrucModule = /*StrucModule*/ ctx[0];
    			flowmoduleinputv2.$set(flowmoduleinputv2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmoduleinputv2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmoduleinputv2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(flowmoduleinputv2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(64:8) {#each InputList as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    // (76:8) {#each OutputList as item, i (i)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let current;

    	const flowmoduleoutputv2 = new FlowModuleOutputv2({
    			props: {
    				port: /*item*/ ctx[14],
    				portNumber: /*i*/ ctx[16],
    				StrucModule: /*StrucModule*/ ctx[0]
    			},
    			$$inline: true
    		});

    	flowmoduleoutputv2.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[8]);
    	flowmoduleoutputv2.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[9]);
    	flowmoduleoutputv2.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[10]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(flowmoduleoutputv2.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(flowmoduleoutputv2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const flowmoduleoutputv2_changes = {};
    			if (dirty & /*OutputList*/ 4) flowmoduleoutputv2_changes.port = /*item*/ ctx[14];
    			if (dirty & /*OutputList*/ 4) flowmoduleoutputv2_changes.portNumber = /*i*/ ctx[16];
    			if (dirty & /*StrucModule*/ 1) flowmoduleoutputv2_changes.StrucModule = /*StrucModule*/ ctx[0];
    			flowmoduleoutputv2.$set(flowmoduleoutputv2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmoduleoutputv2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmoduleoutputv2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(flowmoduleoutputv2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(76:8) {#each OutputList as item, i (i)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
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
    	let each_value_1 = /*InputList*/ ctx[3];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*i*/ ctx[16];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*OutputList*/ ctx[2];
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*i*/ ctx[16];
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
    			attr_dev(rect0, "width", /*moduleWidth*/ ctx[1]);
    			attr_dev(rect0, "height", /*contentHeight*/ ctx[4]);
    			attr_dev(rect0, "x", /*contentRectX*/ ctx[5]);
    			attr_dev(rect0, "y", /*contentRectY*/ ctx[6]);
    			attr_dev(rect0, "rx", "4");
    			attr_dev(rect0, "ry", "4");
    			add_location(rect0, file$3, 59, 4, 1950);
    			attr_dev(rect1, "class", "content-rect");
    			attr_dev(rect1, "width", /*moduleWidth*/ ctx[1]);
    			attr_dev(rect1, "height", /*contentHeightRect*/ ctx[7]);
    			attr_dev(rect1, "x", /*contentRectX*/ ctx[5]);
    			attr_dev(rect1, "y", /*contentRectY*/ ctx[6]);
    			add_location(rect1, file$3, 60, 4, 2082);
    			attr_dev(g0, "class", "inputs");
    			add_location(g0, file$3, 61, 4, 2199);
    			attr_dev(g1, "class", "outputs");
    			add_location(g1, file$3, 73, 4, 2640);
    			attr_dev(g2, "class", "node-content svelte-6ixkuv");
    			add_location(g2, file$3, 58, 0, 1920);
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
    			if (!current || dirty & /*moduleWidth*/ 2) {
    				attr_dev(rect0, "width", /*moduleWidth*/ ctx[1]);
    			}

    			if (!current || dirty & /*contentHeight*/ 16) {
    				attr_dev(rect0, "height", /*contentHeight*/ ctx[4]);
    			}

    			if (!current || dirty & /*contentRectX*/ 32) {
    				attr_dev(rect0, "x", /*contentRectX*/ ctx[5]);
    			}

    			if (!current || dirty & /*contentRectY*/ 64) {
    				attr_dev(rect0, "y", /*contentRectY*/ ctx[6]);
    			}

    			if (!current || dirty & /*moduleWidth*/ 2) {
    				attr_dev(rect1, "width", /*moduleWidth*/ ctx[1]);
    			}

    			if (!current || dirty & /*contentRectX*/ 32) {
    				attr_dev(rect1, "x", /*contentRectX*/ ctx[5]);
    			}

    			if (!current || dirty & /*contentRectY*/ 64) {
    				attr_dev(rect1, "y", /*contentRectY*/ ctx[6]);
    			}

    			if (dirty & /*InputList, StrucModule, handleConnectionStart, handleConnectionDrag, handleConnectionEnd*/ 1801) {
    				const each_value_1 = /*InputList*/ ctx[3];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, g0, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (dirty & /*OutputList, StrucModule, handleConnectionStart, handleConnectionDrag, handleConnectionEnd*/ 1797) {
    				const each_value = /*OutputList*/ ctx[2];
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { StrucModule } = $$props;
    	let xPos;
    	let yPos;
    	let moduleWidth;
    	let OutputList;
    	let InputList;

    	//it changes due to the number of inputs
    	let contentHeight;

    	let contentHeightRect;

    	//if needed to change or adjust the background of the content
    	let contentRectX;

    	let contentRectY; //40 is the header size... can make it a attribute later //TODO

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

    	const writable_props = ["StrucModule"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModuleContentv2> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModuleContentv2", $$slots, []);

    	$$self.$set = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(0, StrucModule = $$props.StrucModule);
    	};

    	$$self.$capture_state = () => ({
    		FlowModuleInputv2,
    		FlowModuleOutputv2,
    		Module,
    		Port,
    		Connection,
    		createEventDispatcher,
    		dispatch,
    		StrucModule,
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
    	});

    	$$self.$inject_state = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(0, StrucModule = $$props.StrucModule);
    		if ("xPos" in $$props) $$invalidate(11, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(12, yPos = $$props.yPos);
    		if ("moduleWidth" in $$props) $$invalidate(1, moduleWidth = $$props.moduleWidth);
    		if ("OutputList" in $$props) $$invalidate(2, OutputList = $$props.OutputList);
    		if ("InputList" in $$props) $$invalidate(3, InputList = $$props.InputList);
    		if ("contentHeight" in $$props) $$invalidate(4, contentHeight = $$props.contentHeight);
    		if ("contentHeightRect" in $$props) $$invalidate(7, contentHeightRect = $$props.contentHeightRect);
    		if ("contentRectX" in $$props) $$invalidate(5, contentRectX = $$props.contentRectX);
    		if ("contentRectY" in $$props) $$invalidate(6, contentRectY = $$props.contentRectY);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(11, xPos = StrucModule.xPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(12, yPos = StrucModule.yPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(1, moduleWidth = StrucModule.getModuleWidth());
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(3, InputList = StrucModule.inputList);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(2, OutputList = StrucModule.outputList);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(4, contentHeight = StrucModule.getContentHeight());
    		}

    		if ($$self.$$.dirty & /*contentHeight*/ 16) {
    			 $$invalidate(4, contentHeight = contentHeight - 5);
    		}

    		if ($$self.$$.dirty & /*xPos*/ 2048) {
    			 $$invalidate(5, contentRectX = xPos + 2);
    		}

    		if ($$self.$$.dirty & /*yPos*/ 4096) {
    			 $$invalidate(6, contentRectY = yPos + 44);
    		}
    	};

    	return [
    		StrucModule,
    		moduleWidth,
    		OutputList,
    		InputList,
    		contentHeight,
    		contentRectX,
    		contentRectY,
    		contentHeightRect,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd
    	];
    }

    class FlowModuleContentv2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { StrucModule: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModuleContentv2",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*StrucModule*/ ctx[0] === undefined && !("StrucModule" in props)) {
    			console.warn("<FlowModuleContentv2> was created without expected prop 'StrucModule'");
    		}
    	}

    	get StrucModule() {
    		throw new Error("<FlowModuleContentv2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set StrucModule(value) {
    		throw new Error("<FlowModuleContentv2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\FlowModulev2.svelte generated by Svelte v3.22.2 */
    const file$4 = "src\\FlowModulev2.svelte";

    function create_fragment$4(ctx) {
    	let g1;
    	let rect_1;
    	let g0;
    	let draggable_action;
    	let g1_transform_value;
    	let current;
    	let dispose;

    	const flowmoduleheaderv2 = new FlowModuleHeaderv2({
    			props: { StrucModule: /*StrucModule*/ ctx[0] },
    			$$inline: true
    		});

    	const flowmodulecontentv2 = new FlowModuleContentv2({
    			props: { StrucModule: /*StrucModule*/ ctx[0] },
    			$$inline: true
    		});

    	flowmodulecontentv2.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[11]);
    	flowmodulecontentv2.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[12]);
    	flowmodulecontentv2.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[13]);

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");
    			rect_1 = svg_element("rect");
    			g0 = svg_element("g");
    			create_component(flowmoduleheaderv2.$$.fragment);
    			create_component(flowmodulecontentv2.$$.fragment);
    			attr_dev(rect_1, "class", "node-background svelte-1iv5d");
    			attr_dev(rect_1, "x", /*xPos*/ ctx[1]);
    			attr_dev(rect_1, "y", /*yPos*/ ctx[2]);
    			attr_dev(rect_1, "width", /*moduleWidth*/ ctx[3]);
    			attr_dev(rect_1, "height", /*moduleHeight*/ ctx[4]);
    			attr_dev(rect_1, "rx", "6");
    			attr_dev(rect_1, "ry", "6");
    			add_location(rect_1, file$4, 103, 1, 3300);
    			add_location(g0, file$4, 113, 4, 3520);
    			attr_dev(g1, "class", "node-container svelte-1iv5d");
    			attr_dev(g1, "transform", g1_transform_value = `translate(${/*dx*/ ctx[6]} ${/*dy*/ ctx[7]})`);
    			add_location(g1, file$4, 100, 0, 3190);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, g1, anchor);
    			append_dev(g1, rect_1);
    			/*rect_1_binding*/ ctx[19](rect_1);
    			append_dev(g1, g0);
    			mount_component(flowmoduleheaderv2, g0, null);
    			mount_component(flowmodulecontentv2, g1, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				action_destroyer(draggable_action = draggable.call(null, g0)),
    				listen_dev(g0, "dragmove", /*handleDragMove*/ ctx[9], false, false, false),
    				listen_dev(g0, "dragstart", /*handleDragStart*/ ctx[8], false, false, false),
    				listen_dev(g0, "dragend", /*handleDragEnd*/ ctx[10], false, false, false),
    				listen_dev(g1, "dblclick", /*handleDblClick*/ ctx[14], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*xPos*/ 2) {
    				attr_dev(rect_1, "x", /*xPos*/ ctx[1]);
    			}

    			if (!current || dirty & /*yPos*/ 4) {
    				attr_dev(rect_1, "y", /*yPos*/ ctx[2]);
    			}

    			if (!current || dirty & /*moduleWidth*/ 8) {
    				attr_dev(rect_1, "width", /*moduleWidth*/ ctx[3]);
    			}

    			if (!current || dirty & /*moduleHeight*/ 16) {
    				attr_dev(rect_1, "height", /*moduleHeight*/ ctx[4]);
    			}

    			const flowmoduleheaderv2_changes = {};
    			if (dirty & /*StrucModule*/ 1) flowmoduleheaderv2_changes.StrucModule = /*StrucModule*/ ctx[0];
    			flowmoduleheaderv2.$set(flowmoduleheaderv2_changes);
    			const flowmodulecontentv2_changes = {};
    			if (dirty & /*StrucModule*/ 1) flowmodulecontentv2_changes.StrucModule = /*StrucModule*/ ctx[0];
    			flowmodulecontentv2.$set(flowmodulecontentv2_changes);

    			if (!current || dirty & /*dx, dy*/ 192 && g1_transform_value !== (g1_transform_value = `translate(${/*dx*/ ctx[6]} ${/*dy*/ ctx[7]})`)) {
    				attr_dev(g1, "transform", g1_transform_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmoduleheaderv2.$$.fragment, local);
    			transition_in(flowmodulecontentv2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmoduleheaderv2.$$.fragment, local);
    			transition_out(flowmodulecontentv2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			/*rect_1_binding*/ ctx[19](null);
    			destroy_component(flowmoduleheaderv2);
    			destroy_component(flowmodulecontentv2);
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
    	let xPos;
    	let yPos;
    	let moduleName;
    	let moduleWidth;
    	let moduleHeight;

    	//if i want to access rect from component's parent (chart) -> add export
    	let rect;

    	//draggable vars
    	let dx = 0;

    	let dy = 0;

    	//in order to set x and y pos correctly on the module, we need to revert previous transformations changes (dx, dy)
    	let lastdx = 0;

    	let lastdy = 0;

    	const handleDragStart = e => {
    		rect.setAttribute("stroke", "#E7DFDD");
    		rect.setAttribute("stroke-width", "10px");
    	};

    	const handleDragMove = e => {
    		let { lastX, lastY, dx: _dx, dy: _dy } = e.detail;
    		$$invalidate(6, dx += _dx);
    		$$invalidate(7, dy += _dy);
    		$$invalidate(0, StrucModule.xPos = xPos + dx - lastdx, StrucModule);
    		$$invalidate(0, StrucModule.yPos = yPos + dy - lastdy, StrucModule);
    		$$invalidate(6, dx = 0);
    		$$invalidate(7, dy = 0);

    		//console.log("FlowModulev2 -> xPos:"+xPos+" ; yPos:"+yPos)
    		//console.log("FlowModulev2 -> dx:"+dx+" ; dy:"+dy)
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
    		dispatch("handleDragEnd");
    		lastdx = 0;
    		lastdy = 0;
    	};

    	const handleConnectionStart = e => {
    		//console.log("FlowModulev2 -> connection start handler")
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

    	const handleDblClick = e => {
    		//console.log("FlowModulev2 -> Modulo clickado")
    		dispatch("DblclickModule", { moduleClicked: StrucModule });
    	};

    	const writable_props = ["StrucModule"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FlowModulev2> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FlowModulev2", $$slots, []);

    	function rect_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, rect = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(0, StrucModule = $$props.StrucModule);
    	};

    	$$self.$capture_state = () => ({
    		spring,
    		draggable,
    		Module,
    		Port,
    		Connection,
    		createEventDispatcher,
    		dispatch,
    		FlowModuleHeaderv2,
    		FlowModuleContentv2,
    		StrucModule,
    		xPos,
    		yPos,
    		moduleName,
    		moduleWidth,
    		moduleHeight,
    		rect,
    		dx,
    		dy,
    		lastdx,
    		lastdy,
    		handleDragStart,
    		handleDragMove,
    		handleDragEnd,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd,
    		handleDblClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("StrucModule" in $$props) $$invalidate(0, StrucModule = $$props.StrucModule);
    		if ("xPos" in $$props) $$invalidate(1, xPos = $$props.xPos);
    		if ("yPos" in $$props) $$invalidate(2, yPos = $$props.yPos);
    		if ("moduleName" in $$props) moduleName = $$props.moduleName;
    		if ("moduleWidth" in $$props) $$invalidate(3, moduleWidth = $$props.moduleWidth);
    		if ("moduleHeight" in $$props) $$invalidate(4, moduleHeight = $$props.moduleHeight);
    		if ("rect" in $$props) $$invalidate(5, rect = $$props.rect);
    		if ("dx" in $$props) $$invalidate(6, dx = $$props.dx);
    		if ("dy" in $$props) $$invalidate(7, dy = $$props.dy);
    		if ("lastdx" in $$props) lastdx = $$props.lastdx;
    		if ("lastdy" in $$props) lastdy = $$props.lastdy;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(1, xPos = StrucModule.xPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(2, yPos = StrucModule.yPos);
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 moduleName = StrucModule.name;
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(3, moduleWidth = StrucModule.getModuleWidth());
    		}

    		if ($$self.$$.dirty & /*StrucModule*/ 1) {
    			 $$invalidate(4, moduleHeight = StrucModule.getModuleHeight());
    		}
    	};

    	return [
    		StrucModule,
    		xPos,
    		yPos,
    		moduleWidth,
    		moduleHeight,
    		rect,
    		dx,
    		dy,
    		handleDragStart,
    		handleDragMove,
    		handleDragEnd,
    		handleConnectionStart,
    		handleConnectionDrag,
    		handleConnectionEnd,
    		handleDblClick,
    		moduleName,
    		lastdx,
    		lastdy,
    		dispatch,
    		rect_1_binding
    	];
    }

    class FlowModulev2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { StrucModule: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FlowModulev2",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*StrucModule*/ ctx[0] === undefined && !("StrucModule" in props)) {
    			console.warn("<FlowModulev2> was created without expected prop 'StrucModule'");
    		}
    	}

    	get StrucModule() {
    		throw new Error("<FlowModulev2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set StrucModule(value) {
    		throw new Error("<FlowModulev2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\ConnectionSVG.svelte generated by Svelte v3.22.2 */
    const file$5 = "src\\ConnectionSVG.svelte";

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
    	let dispose;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			t0 = space();
    			circle0 = svg_element("circle");
    			t1 = space();
    			circle1 = svg_element("circle");
    			attr_dev(path, "d", path_d_value = /*connection*/ ctx[0].curve);
    			attr_dev(path, "fill", "transparent");
    			attr_dev(path, "class", "svelte-17ykc0i");
    			add_location(path, file$5, 13, 0, 330);
    			attr_dev(circle0, "cx", circle0_cx_value = /*connection*/ ctx[0].parentPort.xPos);
    			attr_dev(circle0, "cy", circle0_cy_value = /*connection*/ ctx[0].parentPort.yPos);
    			attr_dev(circle0, "r", "5");
    			attr_dev(circle0, "class", "svelte-17ykc0i");
    			add_location(circle0, file$5, 14, 0, 408);
    			attr_dev(circle1, "cx", circle1_cx_value = /*connection*/ ctx[0].externalPort.xPos);
    			attr_dev(circle1, "cy", circle1_cy_value = /*connection*/ ctx[0].externalPort.yPos);
    			attr_dev(circle1, "r", "5");
    			attr_dev(circle1, "class", "svelte-17ykc0i");
    			add_location(circle1, file$5, 15, 0, 490);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, path, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, circle0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, circle1, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(path, "dblclick", /*handleDblClick*/ ctx[1], false, false, false);
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
    			dispose();
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
    	const dispatch = createEventDispatcher();

    	const handleDblClick = e => {
    		dispatch("DblclickConnection", { connectionClicked: connection });
    	};

    	const writable_props = ["connection"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ConnectionSVG> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ConnectionSVG", $$slots, []);

    	$$self.$set = $$props => {
    		if ("connection" in $$props) $$invalidate(0, connection = $$props.connection);
    	};

    	$$self.$capture_state = () => ({
    		Connection,
    		connection,
    		createEventDispatcher,
    		dispatch,
    		handleDblClick
    	});

    	$$self.$inject_state = $$props => {
    		if ("connection" in $$props) $$invalidate(0, connection = $$props.connection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [connection, handleDblClick];
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

    /* src\Canvas.svelte generated by Svelte v3.22.2 */
    const file$6 = "src\\Canvas.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (256:12) {#each ChartStruc.ModuleList as moduleEntry}
    function create_each_block_2(ctx) {
    	let current;

    	const flowmodulev2 = new FlowModulev2({
    			props: { StrucModule: /*moduleEntry*/ ctx[23] },
    			$$inline: true
    		});

    	flowmodulev2.$on("handleDragEnd", /*handleDragEnd*/ ctx[5]);
    	flowmodulev2.$on("handleDragMove", /*handleDragMove*/ ctx[6]);
    	flowmodulev2.$on("handleConnectionStart", /*handleConnectionStart*/ ctx[7]);
    	flowmodulev2.$on("handleConnectionDrag", /*handleConnectionDrag*/ ctx[8]);
    	flowmodulev2.$on("handleConnectionEnd", /*handleConnectionEnd*/ ctx[9]);
    	flowmodulev2.$on("DblclickModule", /*handleDblClickModule*/ ctx[11]);

    	const block = {
    		c: function create() {
    			create_component(flowmodulev2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(flowmodulev2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const flowmodulev2_changes = {};
    			if (dirty & /*ChartStruc*/ 1) flowmodulev2_changes.StrucModule = /*moduleEntry*/ ctx[23];
    			flowmodulev2.$set(flowmodulev2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flowmodulev2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flowmodulev2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flowmodulev2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(256:12) {#each ChartStruc.ModuleList as moduleEntry}",
    		ctx
    	});

    	return block;
    }

    // (267:12) {#each connections as connection,i (i)}
    function create_each_block_1$1(key_1, ctx) {
    	let path;
    	let path_d_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", path_d_value = /*connection*/ ctx[19].curve);
    			attr_dev(path, "fill", "transparent");
    			attr_dev(path, "class", "svelte-10cs1us");
    			add_location(path, file$6, 267, 16, 13825);
    			this.first = path;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*connections*/ 8 && path_d_value !== (path_d_value = /*connection*/ ctx[19].curve)) {
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
    		source: "(267:12) {#each connections as connection,i (i)}",
    		ctx
    	});

    	return block;
    }

    // (270:12) {#each ChartStruc.FinalConnections as connection,i (i)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let current;

    	const connectionsvg = new ConnectionSVG({
    			props: { connection: /*connection*/ ctx[19] },
    			$$inline: true
    		});

    	connectionsvg.$on("DblclickConnection", /*handleDblClickConnection*/ ctx[10]);

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
    			if (dirty & /*ChartStruc*/ 1) connectionsvg_changes.connection = /*connection*/ ctx[19];
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
    		source: "(270:12) {#each ChartStruc.FinalConnections as connection,i (i)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let svg;
    	let g;
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
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	let each_value_1 = /*connections*/ ctx[3];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*i*/ ctx[21];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
    	}

    	let each_value = /*ChartStruc*/ ctx[0].FinalConnections;
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*i*/ ctx[21];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
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

    			add_location(g, file$6, 254, 1, 13190);
    			attr_dev(svg, "transform", svg_transform_value = `translate(${/*Background_dx*/ ctx[1]} ${/*Background_dy*/ ctx[2]})`);
    			attr_dev(svg, "class", "svelte-10cs1us");
    			add_location(svg, file$6, 251, 0, 13046);
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
    			if (dirty & /*ChartStruc, handleDragEnd, handleDragMove, handleConnectionStart, handleConnectionDrag, handleConnectionEnd, handleDblClickModule*/ 3041) {
    				each_value_2 = /*ChartStruc*/ ctx[0].ModuleList;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(g, each0_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*connections*/ 8) {
    				const each_value_1 = /*connections*/ ctx[3];
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each1_lookup, g, destroy_block, create_each_block_1$1, each1_anchor, get_each_context_1$1);
    			}

    			if (dirty & /*ChartStruc, handleDblClickConnection*/ 1025) {
    				const each_value = /*ChartStruc*/ ctx[0].FinalConnections;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each2_lookup, g, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
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
    			each_blocks_2 = each_blocks_2.filter(Boolean);

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
    			destroy_each(each_blocks_2, detaching);

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
    	let { __HistoryChart } = $$props;

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

    								//History
    								__HistoryChart.addState(ChartStruc.toJSON());
    							} else {
    								dispatch("wrongTypes");
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
    								dispatch("updateHistory");
    							} else {
    								dispatch("wrongTypes");
    							}
    						}
    					}
    				}
    			}
    		}
    	}

    	//TODO posso nao tar sempre a criar e dar simplesment update as ligacoes
    	const handleDragEnd = e => {
    		//History
    		__HistoryChart.addState(ChartStruc.toJSON());
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

    		connection.setEndPoints(xFinal.xFinal.xFinal - Background_dx - left, yFinal.yFinal.yFinal - Background_dy - top);
    		connection.calculateCurve();
    		connections.push(connection);
    		$$invalidate(3, connections);
    	};

    	const handleConnectionDrag = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port, parentModule } = e.detail;
    		$$invalidate(3, connections = []);

    		//TODO id da conexao dinamicamente
    		let connection = new Connection("tentativa", port.port.port.port, port.port.port.port.isInput, parentModule.StrucModule);

    		connection.setEndPoints(xFinal.xFinal.xFinal - Background_dx - left, yFinal.yFinal.yFinal - Background_dy - top);
    		connection.calculateCurve();
    		connections.push(connection);
    		$$invalidate(3, connections);
    	};

    	const handleConnectionEnd = e => {
    		let { xInitial, xFinal, yInitial, yFinal, port, parentModule } = e.detail;
    		$$invalidate(3, connections = []);
    		verifyCoordsIsPortFromType(xFinal.xFinal.xFinal - Background_dx - left, yFinal.yFinal.yFinal - Background_dy - top, port.port.port.port, parentModule.StrucModule);
    	};

    	const handleDblClickConnection = e => {
    		//History
    		__HistoryChart.addState(ChartStruc.toJSON());

    		for (let i = 0; i < ChartStruc.ModuleList.length; i++) {
    			//retirar conexao do modulo pai
    			if (ChartStruc.ModuleList[i].connectionsInputs !== undefined) {
    				for (let j = 0; j < ChartStruc.ModuleList[i].connectionsInputs.length; j++) {
    					if (ChartStruc.ModuleList[i].connectionsInputs[j].Connection == e.detail.connectionClicked) {
    						ChartStruc.ModuleList[i].connectionsInputs.splice(j, 1);
    						$$invalidate(0, ChartStruc);
    					}
    				}
    			}

    			//retirar conexao do modulo externo
    			if (ChartStruc.ModuleList[i].connectionsOutputs !== undefined) {
    				for (let j = 0; j < ChartStruc.ModuleList[i].connectionsOutputs.length; j++) {
    					if (ChartStruc.ModuleList[i].connectionsOutputs[j].Connection == e.detail.connectionClicked) {
    						ChartStruc.ModuleList[i].connectionsOutputs.splice(j, 1);
    						$$invalidate(0, ChartStruc);
    					}
    				}
    			}
    		}

    		//retirr do Final connextions do canvas que é o que representa graficamente
    		let index = ChartStruc.FinalConnections.indexOf(e.detail.connectionClicked);

    		if (index > -1) {
    			ChartStruc.FinalConnections.splice(index, 1);
    		}

    		$$invalidate(0, ChartStruc);
    	};

    	const handleDblClickModule = e => {
    		//History
    		__HistoryChart.addState(ChartStruc.toJSON());

    		let moduleClicked = e.detail.moduleClicked;
    		let moduleClickedInputConnections = e.detail.moduleClicked.connectionsInputs;
    		let moduleClickedOutputConnections = e.detail.moduleClicked.connectionsOutputs;
    		let moduleList = ChartStruc.ModuleList;
    		let finalConnections = ChartStruc.FinalConnections;

    		//se tem ligacoes nos inputs
    		if (moduleClickedInputConnections) {
    			for (let a = 0; a < moduleClickedInputConnections.length; a++) {
    				//cannot  go inside details of connections inputs like external module-> return undefineds              
    				for (let i = 0; i < moduleList.length; i++) {
    					//retirar conexao do modulo externo
    					if (moduleList[i].connectionsOutputs !== undefined) {
    						for (let j = 0; j < moduleList[i].connectionsOutputs.length; j++) {
    							if (moduleList[i].connectionsOutputs[j].Connection == moduleClickedInputConnections[a].Connection) {
    								moduleList[i].connectionsOutputs.splice(j, 1);
    								moduleList[i].connectionsOutputs = moduleList[i].connectionsOutputs;
    							}
    						}
    					}
    				}

    				//delete from final connections
    				let index = finalConnections.indexOf(moduleClickedInputConnections[a].Connection);

    				if (index > -1) {
    					finalConnections.splice(index, 1);
    				}
    			}
    		}

    		//se tem ligacoes nos outputs\
    		if (moduleClickedOutputConnections) {
    			for (let a = 0; a < moduleClickedOutputConnections.length; a++) {
    				//cannot  go inside details of connections inputs like external module-> return undefineds
    				for (let i = 0; i < moduleList.length; i++) {
    					//retirar conexao do modulo externo
    					if (moduleList[i].connectionsInputs !== undefined) {
    						for (let j = 0; j < moduleList[i].connectionsInputs.length; j++) {
    							if (moduleList[i].connectionsInputs[j].Connection == moduleClickedOutputConnections[a].Connection) {
    								moduleList[i].connectionsInputs.splice(j, 1);
    								moduleList[i].connectionsInputs = moduleList[i].connectionsInputs;
    							}
    						}
    					}
    				}

    				//delete from final connections
    				let index = finalConnections.indexOf(moduleClickedOutputConnections[a].Connection);

    				if (index > -1) {
    					finalConnections.splice(index, 1);
    				}

    				finalConnections = finalConnections;
    			}
    		}

    		//ChartStruc.ModuleList.forEach(function(m){console.log(`${m.id}=${m.xPos},${m.yPos}`)})
    		for (let i = 0; i < moduleList.length; i++) {
    			if (moduleList[i].id == moduleClicked.id) {
    				moduleList.splice(i, 1);
    				break;
    			}
    		}

    		$$invalidate(0, ChartStruc);
    	};

    	let { left } = $$props;
    	let { top } = $$props;

    	const writable_props = [
    		"ChartStruc",
    		"__HistoryChart",
    		"Background_dx",
    		"Background_dy",
    		"left",
    		"top"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ChartStruc" in $$props) $$invalidate(0, ChartStruc = $$props.ChartStruc);
    		if ("__HistoryChart" in $$props) $$invalidate(12, __HistoryChart = $$props.__HistoryChart);
    		if ("Background_dx" in $$props) $$invalidate(1, Background_dx = $$props.Background_dx);
    		if ("Background_dy" in $$props) $$invalidate(2, Background_dy = $$props.Background_dy);
    		if ("left" in $$props) $$invalidate(13, left = $$props.left);
    		if ("top" in $$props) $$invalidate(14, top = $$props.top);
    	};

    	$$self.$capture_state = () => ({
    		FlowModulev2,
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
    		__HistoryChart,
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
    		handleConnectionEnd,
    		handleDblClickConnection,
    		handleDblClickModule,
    		left,
    		top
    	});

    	$$self.$inject_state = $$props => {
    		if ("ChartStruc" in $$props) $$invalidate(0, ChartStruc = $$props.ChartStruc);
    		if ("__HistoryChart" in $$props) $$invalidate(12, __HistoryChart = $$props.__HistoryChart);
    		if ("dx" in $$props) dx = $$props.dx;
    		if ("dy" in $$props) dy = $$props.dy;
    		if ("Background_dx" in $$props) $$invalidate(1, Background_dx = $$props.Background_dx);
    		if ("Background_dy" in $$props) $$invalidate(2, Background_dy = $$props.Background_dy);
    		if ("connections" in $$props) $$invalidate(3, connections = $$props.connections);
    		if ("left" in $$props) $$invalidate(13, left = $$props.left);
    		if ("top" in $$props) $$invalidate(14, top = $$props.top);
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
    		handleConnectionEnd,
    		handleDblClickConnection,
    		handleDblClickModule,
    		__HistoryChart,
    		left,
    		top
    	];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			ChartStruc: 0,
    			__HistoryChart: 12,
    			Background_dx: 1,
    			Background_dy: 2,
    			left: 13,
    			top: 14
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

    		if (/*__HistoryChart*/ ctx[12] === undefined && !("__HistoryChart" in props)) {
    			console.warn("<Canvas> was created without expected prop '__HistoryChart'");
    		}

    		if (/*Background_dx*/ ctx[1] === undefined && !("Background_dx" in props)) {
    			console.warn("<Canvas> was created without expected prop 'Background_dx'");
    		}

    		if (/*Background_dy*/ ctx[2] === undefined && !("Background_dy" in props)) {
    			console.warn("<Canvas> was created without expected prop 'Background_dy'");
    		}

    		if (/*left*/ ctx[13] === undefined && !("left" in props)) {
    			console.warn("<Canvas> was created without expected prop 'left'");
    		}

    		if (/*top*/ ctx[14] === undefined && !("top" in props)) {
    			console.warn("<Canvas> was created without expected prop 'top'");
    		}
    	}

    	get ChartStruc() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ChartStruc(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get __HistoryChart() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set __HistoryChart(value) {
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

    	get left() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set left(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get top() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set top(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Button.svelte generated by Svelte v3.22.2 */

    const file$7 = "src\\Button.svelte";

    function create_fragment$7(ctx) {
    	let button;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*displayName*/ ctx[0]);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-info svelte-l7fb54");
    			add_location(button, file$7, 10, 0, 227);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*displayName*/ 1) set_data_dev(t, /*displayName*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
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
    	let { name } = $$props;
    	let maxLength = 16;
    	let displayName = " ";
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Button", $$slots, []);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ name, maxLength, displayName });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("maxLength" in $$props) $$invalidate(2, maxLength = $$props.maxLength);
    		if ("displayName" in $$props) $$invalidate(0, displayName = $$props.displayName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*name*/ 2) {
    			 if (name.length > maxLength) {
    				$$invalidate(0, displayName = `${name.slice(0, maxLength)}...`);
    			} else {
    				$$invalidate(0, displayName = name);
    			}
    		}
    	};

    	return [displayName, name, maxLength, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[1] === undefined && !("name" in props)) {
    			console.warn("<Button> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    class ChartHistory {
        constructor() {
            this.__redoStack = [];
            this.__undoStack = [];
            this.__redoStack = [];
            this.__undoStack = [];
        }
        redo(ChartStruc) {
            const newState = this.__redoStack.pop();
            if (newState) {
                this.__undoStack.push(ChartStruc.toJSON());
            }
            return newState;
        }
        undo(ChartStruc) {
            const newState = this.__undoStack.pop();
            if (newState) {
                this.__redoStack.push(ChartStruc.toJSON());
            }
            return newState;
        }
        addState(OldState) {
            this.__undoStack.push(OldState);
            if (this.__redoStack.length > 0) {
                this.__redoStack = [];
            }
        }
        clear() {
            this.__redoStack.splice(0, this.__redoStack.length);
            this.__undoStack.splice(0, this.__undoStack.length);
        }
    }

    /* src\AppCanvas.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;

    function create_fragment$8(ctx) {
    	let current;

    	let canvas_props = {
    		ChartStruc: /*ChartStruc*/ ctx[3],
    		Background_dx: -3000,
    		Background_dy: -3000,
    		__HistoryChart: /*__HistoryChart*/ ctx[5],
    		left: /*left*/ ctx[0],
    		top: /*top*/ ctx[1]
    	};

    	const canvas = new Canvas({ props: canvas_props, $$inline: true });
    	/*canvas_binding*/ ctx[23](canvas);
    	canvas.$on("BackgroundMovement", /*handleBackGroundMovement*/ ctx[6]);
    	canvas.$on("wrongTypes", /*handleWrongTypes*/ ctx[2]);

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
    			if (dirty & /*ChartStruc*/ 8) canvas_changes.ChartStruc = /*ChartStruc*/ ctx[3];
    			if (dirty & /*left*/ 1) canvas_changes.left = /*left*/ ctx[0];
    			if (dirty & /*top*/ 2) canvas_changes.top = /*top*/ ctx[1];
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
    			/*canvas_binding*/ ctx[23](null);
    			destroy_component(canvas, detaching);
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
    	const dispatch = createEventDispatcher();
    	var fs = require("fs");
    	let ChartStruc = new Chart("NewProject");
    	let __HistoryChart = new ChartHistory();

    	//need to initialize vars -> it would not work if after loaded, the diagram was not moved
    	let Background_dxInitial = -3000;

    	let Background_dyInitial = -3000;
    	let Background_dx;
    	let Background_dy;
    	let SpawnX = -Background_dxInitial + 600;
    	let SpawnY = -Background_dxInitial + 600;

    	const handleBackGroundMovement = e => {
    		Background_dx = e.detail.Background_dx.Background_dx;
    		Background_dy = e.detail.Background_dy.Background_dy;
    		SpawnX = -Background_dx + 400;
    		SpawnY = -Background_dy + 400;
    	};

    	function saveAsToFile(filename, chart) {
    		var json = ChartStruc.toJSON();

    		fs.writeFile(filename, json, err => {
    			if (err) {
    				alert("An error ocurred creating the file ");

    				dispatch("error", {
    					message: "An error ocurred creating the file "
    				});
    			} else {
    				alert("File Saved Correctly");
    				let filenameSplited = filename.split(".");
    				let file = filenameSplited[0];
    				let ProjectName = file.split("/").pop();
    				let ProjectPath = filename;

    				dispatch("fileWasSavedCorrectly", {
    					ProjectName: { ProjectName },
    					ProjectPath: { ProjectPath }
    				});
    			}
    		});
    	}

    	function addXModule(ModuleToBeAdded) {
    		__HistoryChart.addState(ChartStruc.toJSON());
    		ModuleToBeAdded.setXPos(SpawnX);
    		ModuleToBeAdded.setYPos(SpawnY);
    		ModuleToBeAdded.adjustOwnProperties();
    		ChartStruc.findIdealModuleId(0);
    		ModuleToBeAdded.id = ChartStruc.nextModuleID;
    		ChartStruc.ModuleList.push(ModuleToBeAdded);
    		$$invalidate(3, ChartStruc);
    	}

    	function saveProject(filename) {
    		saveAsToFile(filename);
    	}

    	function trySaveProjectToFile() {
    		const { dialog } = require("electron").remote;
    		let filename = dialog.showSaveDialogSync();

    		if (filename === undefined) {
    			console.log("filename undefined");
    			return;
    		} else {
    			if (filename.split(".").pop() != "json") {
    				alert("Wrong file extension. Try .json");
    			} else {
    				saveAsToFile(filename);
    			}
    		}
    	}

    	function tryToLoadProject() {
    		const { dialog } = require("electron").remote;
    		let filename = dialog.showSaveDialogSync();

    		if (filename === undefined) {
    			console.log("filename undefined");
    			return;
    		} else {
    			let filenameSplited = filename.split(".");
    			let file = filenameSplited[0];
    			let extension = filenameSplited[1];

    			if (extension == "json") {
    				var path = require("path");
    				let filePath = filename;
    				let ProjectName = file.split("/").pop();
    				let ProjectPath = filename;
    				$$invalidate(3, ChartStruc = new Chart(file));

    				fs.readFile(filePath, function (err, data) {
    					if (!err) {
    						let json = JSON.parse(data);
    						let ModulesList = [];

    						for (let i = 0; i < json.Modules.length; i++) {
    							let inputlist = [];
    							let outputlist = [];

    							for (let j = 0; j < json.Modules[i].IO.Inputs.length; j++) {
    								let InputObject = new Port(true, json.Modules[i].IO.Inputs[j].PortType, json.Modules[i].IO.Inputs[j].VarName);
    								inputlist.push(InputObject);
    							}

    							for (let h = 0; h < json.Modules[i].IO.Outputs.length; h++) {
    								let OutputObject = new Port(false, json.Modules[i].IO.Outputs[h].PortType, json.Modules[i].IO.Outputs[h].VarName);
    								outputlist.push(OutputObject);
    							}

    							let FlowModuleObject = new Module(json.Modules[i].Id, json.Modules[i].Name, json.Modules[i].Coord.CoordX, json.Modules[i].Coord.CoordY);
    							FlowModuleObject.functionId = json.Modules[i].FunctionID;
    							FlowModuleObject.addOutputs(outputlist);
    							FlowModuleObject.addInputs(inputlist);
    							FlowModuleObject.setModuleWidth();
    							FlowModuleObject.setModuleHeight();
    							FlowModuleObject.setPortCoords();

    							if (json.Modules[i].Variables) {
    								FlowModuleObject.listVariables = json.Modules[i].Variables;
    							}

    							ModulesList.push(FlowModuleObject);
    							ChartStruc.addModule(FlowModuleObject);
    						}

    						for (let i = 0; i < json.Modules.length; i++) {

    							for (let j = 0; j < json.Modules[i].Connections.Inputs.length; j++) {
    								//correto
    								let InputObject = ModulesList[i].inputList[json.Modules[i].Connections.Inputs[j].InputPort];

    								let InputModule = ModulesList[i];
    								let OutputModule = ModulesList[json.Modules[i].Connections.Inputs[j].ModuleID];
    								let OutputObject = OutputModule.outputList[json.Modules[i].Connections.Inputs[j].ModulePort];
    								let connection = new Connection("connectionX", InputObject, true, InputModule);
    								connection.setConnectedPort(OutputObject, OutputModule);
    								connection.calculateCurve();
    								InputModule.addInputConnection(InputObject, OutputObject, OutputModule, connection);
    								OutputModule.addOutputConnection(OutputObject, InputObject, InputModule, connection);
    								ChartStruc.addFinalConnection(connection);
    							}
    						}

    						$$invalidate(3, ChartStruc);

    						//history
    						__HistoryChart.clear();

    						dispatch("fileWasLoadedCorrectly", {
    							ProjectName: { ProjectName },
    							ProjectPath: { ProjectPath }
    						});
    					} else {
    						console.log(err);
    					}
    				});
    			} else {
    				alert("Wrong file extension");
    			}
    		}
    	}

    	function newProject() {
    		$$invalidate(3, ChartStruc = new Chart("NewProject"));
    		__HistoryChart.clear();
    		dispatch("newProjectInitiated");
    	}

    	let myCanvas;
    	let { left } = $$props;
    	let { top } = $$props;

    	function redo() {
    		//console.log("before redo")
    		//console.log(__HistoryChart)
    		let newstate = __HistoryChart.redo(ChartStruc);

    		if (newstate) {
    			ChartStruc.loadJSON(newstate);

    			for (let moduleEntry of ChartStruc.ModuleList) {
    				moduleEntry.setPortCoords();
    			}

    			$$invalidate(3, ChartStruc);
    		}

    		$$invalidate(3, ChartStruc);
    	} //console.log("after redo")
    	//console.log(__HistoryChart)

    	function undo() {
    		//console.log("before undo")
    		//console.log(__HistoryChart)
    		let newstate = __HistoryChart.undo(ChartStruc);

    		if (newstate) {
    			ChartStruc.loadJSON(newstate);

    			for (let moduleEntry of ChartStruc.ModuleList) {
    				moduleEntry.setPortCoords();
    			}

    			$$invalidate(3, ChartStruc);
    		}

    		$$invalidate(3, ChartStruc);
    	} //console.log("after undo")
    	//console.log(__HistoryChart)

    	function handleWrongTypes() {
    		dispatch("wrongTypes");
    	}

    	const writable_props = ["left", "top"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<AppCanvas> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AppCanvas", $$slots, []);

    	function canvas_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, myCanvas = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("left" in $$props) $$invalidate(0, left = $$props.left);
    		if ("top" in $$props) $$invalidate(1, top = $$props.top);
    	};

    	$$self.$capture_state = () => ({
    		Canvas,
    		Module,
    		Port,
    		Connection,
    		Chart,
    		Button,
    		createEventDispatcher,
    		ChartHistory,
    		dispatch,
    		fs,
    		ChartStruc,
    		__HistoryChart,
    		Background_dxInitial,
    		Background_dyInitial,
    		Background_dx,
    		Background_dy,
    		SpawnX,
    		SpawnY,
    		handleBackGroundMovement,
    		saveAsToFile,
    		addXModule,
    		saveProject,
    		trySaveProjectToFile,
    		tryToLoadProject,
    		newProject,
    		myCanvas,
    		left,
    		top,
    		redo,
    		undo,
    		handleWrongTypes
    	});

    	$$self.$inject_state = $$props => {
    		if ("fs" in $$props) fs = $$props.fs;
    		if ("ChartStruc" in $$props) $$invalidate(3, ChartStruc = $$props.ChartStruc);
    		if ("__HistoryChart" in $$props) $$invalidate(5, __HistoryChart = $$props.__HistoryChart);
    		if ("Background_dxInitial" in $$props) Background_dxInitial = $$props.Background_dxInitial;
    		if ("Background_dyInitial" in $$props) Background_dyInitial = $$props.Background_dyInitial;
    		if ("Background_dx" in $$props) Background_dx = $$props.Background_dx;
    		if ("Background_dy" in $$props) Background_dy = $$props.Background_dy;
    		if ("SpawnX" in $$props) SpawnX = $$props.SpawnX;
    		if ("SpawnY" in $$props) SpawnY = $$props.SpawnY;
    		if ("myCanvas" in $$props) $$invalidate(4, myCanvas = $$props.myCanvas);
    		if ("left" in $$props) $$invalidate(0, left = $$props.left);
    		if ("top" in $$props) $$invalidate(1, top = $$props.top);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		left,
    		top,
    		handleWrongTypes,
    		ChartStruc,
    		myCanvas,
    		__HistoryChart,
    		handleBackGroundMovement,
    		addXModule,
    		saveProject,
    		trySaveProjectToFile,
    		tryToLoadProject,
    		newProject,
    		redo,
    		undo,
    		Background_dx,
    		Background_dy,
    		SpawnX,
    		SpawnY,
    		dispatch,
    		fs,
    		Background_dxInitial,
    		Background_dyInitial,
    		saveAsToFile,
    		canvas_binding
    	];
    }

    class AppCanvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			addXModule: 7,
    			saveProject: 8,
    			trySaveProjectToFile: 9,
    			tryToLoadProject: 10,
    			newProject: 11,
    			left: 0,
    			top: 1,
    			redo: 12,
    			undo: 13,
    			handleWrongTypes: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppCanvas",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*left*/ ctx[0] === undefined && !("left" in props)) {
    			console_1.warn("<AppCanvas> was created without expected prop 'left'");
    		}

    		if (/*top*/ ctx[1] === undefined && !("top" in props)) {
    			console_1.warn("<AppCanvas> was created without expected prop 'top'");
    		}
    	}

    	get addXModule() {
    		return this.$$.ctx[7];
    	}

    	set addXModule(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get saveProject() {
    		return this.$$.ctx[8];
    	}

    	set saveProject(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get trySaveProjectToFile() {
    		return this.$$.ctx[9];
    	}

    	set trySaveProjectToFile(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tryToLoadProject() {
    		return this.$$.ctx[10];
    	}

    	set tryToLoadProject(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get newProject() {
    		return this.$$.ctx[11];
    	}

    	set newProject(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get left() {
    		throw new Error("<AppCanvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set left(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get top() {
    		throw new Error("<AppCanvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set top(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redo() {
    		return this.$$.ctx[12];
    	}

    	set redo(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get undo() {
    		return this.$$.ctx[13];
    	}

    	set undo(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleWrongTypes() {
    		return this.$$.ctx[2];
    	}

    	set handleWrongTypes(value) {
    		throw new Error("<AppCanvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    /* src\Modal.svelte generated by Svelte v3.22.2 */
    const file$8 = "src\\Modal.svelte";

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
    			p0.textContent = "It's goal is to develop software able to provide an intuitive and interactive Interface for users that require usage of data flow programming without having extensive programming knowledge.";
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
    			add_location(h1, file$8, 5, 12, 169);
    			add_location(h4, file$8, 6, 12, 203);
    			add_location(h20, file$8, 7, 12, 272);
    			add_location(p0, file$8, 8, 12, 371);
    			add_location(h21, file$8, 9, 12, 581);
    			add_location(h30, file$8, 10, 12, 615);
    			add_location(p1, file$8, 11, 20, 659);
    			add_location(p2, file$8, 12, 20, 729);
    			add_location(h31, file$8, 13, 12, 786);
    			add_location(p3, file$8, 14, 20, 828);
    			add_location(p4, file$8, 15, 20, 894);
    			add_location(h22, file$8, 17, 12, 940);
    			add_location(p5, file$8, 18, 16, 981);
    			add_location(p6, file$8, 19, 16, 1042);
    			add_location(h23, file$8, 21, 12, 1127);
    			add_location(p7, file$8, 22, 16, 1168);
    			add_location(p8, file$8, 23, 16, 1226);
    			add_location(p9, file$8, 24, 16, 1285);
    			attr_dev(main, "class", "svelte-ya6fjw");
    			add_location(main, file$8, 5, 6, 163);
    			attr_dev(div0, "class", "modal-container svelte-ya6fjw");
    			add_location(div0, file$8, 4, 4, 126);
    			attr_dev(div1, "class", "modal-overlay svelte-ya6fjw");
    			attr_dev(div1, "data-close", "");
    			add_location(div1, file$8, 3, 2, 23);
    			add_location(div2, file$8, 1, 0, 12);
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

    function create_fragment$9(ctx) {
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { show: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get show() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\ModalIntro.svelte generated by Svelte v3.22.2 */
    const file$9 = "src\\ModalIntro.svelte";

    // (1:0) {#if show}
    function create_if_block$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let main;
    	let h1;
    	let t1;
    	let h3;
    	let t3;
    	let p0;
    	let t5;
    	let p1;
    	let t7;
    	let p2;
    	let t9;
    	let p3;
    	let t11;
    	let p4;
    	let t13;
    	let h2;
    	let t15;
    	let p5;
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
    			h1.textContent = "Inner Workings of ComputeFlow";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "This is an aplication that aims to represent data flows and allgorithms in a flow programming paradigm.";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "In the SideBar there is 2 types of modules: variables (modules with only outputs) and functions that may process multiple entries and output one or more results";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Both this modules can be dragged into the chart, creating an execution graph that will be compiled in the JULIA runtime";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "It's also possible to find the \"Load Project\" section in the SideBar, where its located all graphs stored in JSON files under the same directory.";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "In the NavBar there is the possiblity to clean the chart by selecting \"New Project\", selecting \"Save Project\" will save the graph presented on the chart into a JSON file and the \"Save Project as\" will allow to define the name of the project.";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "There is also a Undo/Redo functionality allowing the user to access a previous chart state";
    			t13 = space();
    			h2 = element("h2");
    			h2.textContent = "Note(for more advanced users)";
    			t15 = space();
    			p5 = element("p");
    			p5.textContent = "All modules(both variables and functions) presented in the SideBar are defined in the \"ModuleTemplates\" JSON file, wich can be editted to add more modules into the interface, in a way that meets the user needs.";
    			add_location(h1, file$9, 5, 12, 169);
    			add_location(h3, file$9, 7, 12, 248);
    			add_location(p0, file$9, 9, 16, 399);
    			add_location(p1, file$9, 11, 16, 586);
    			add_location(p2, file$9, 13, 16, 752);
    			add_location(p3, file$9, 15, 16, 924);
    			add_location(p4, file$9, 16, 16, 1190);
    			add_location(h2, file$9, 18, 12, 1324);
    			add_location(p5, file$9, 19, 16, 1383);
    			attr_dev(main, "class", "svelte-ya6fjw");
    			add_location(main, file$9, 5, 6, 163);
    			attr_dev(div0, "class", "modal-container svelte-ya6fjw");
    			add_location(div0, file$9, 4, 4, 126);
    			attr_dev(div1, "class", "modal-overlay svelte-ya6fjw");
    			attr_dev(div1, "data-close", "");
    			add_location(div1, file$9, 3, 2, 23);
    			add_location(div2, file$9, 1, 0, 12);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, main);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h3);
    			append_dev(main, t3);
    			append_dev(main, p0);
    			append_dev(main, t5);
    			append_dev(main, p1);
    			append_dev(main, t7);
    			append_dev(main, p2);
    			append_dev(main, t9);
    			append_dev(main, p3);
    			append_dev(main, t11);
    			append_dev(main, p4);
    			append_dev(main, t13);
    			append_dev(main, h2);
    			append_dev(main, t15);
    			append_dev(main, p5);
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(1:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	function overlay_click(e) {
    		if ("close" in e.target.dataset) $$invalidate(0, show = false);
    	}

    	let { show = false } = $$props;
    	const writable_props = ["show"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalIntro> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ModalIntro", $$slots, []);

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

    class ModalIntro extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { show: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalIntro",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get show() {
    		throw new Error("<ModalIntro>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<ModalIntro>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    /* src\Navbar.svelte generated by Svelte v3.22.2 */
    const file$a = "src\\Navbar.svelte";

    function create_fragment$b(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let updating_show;
    	let t5;
    	let updating_show_1;
    	let current;

    	const button0 = new Button({
    			props: { name: "New Flow" },
    			$$inline: true
    		});

    	button0.$on("click", /*newProject*/ ctx[2]);

    	const button1 = new Button({
    			props: { name: "Load Flow" },
    			$$inline: true
    		});

    	button1.$on("click", /*TryToLoadProject*/ ctx[4]);

    	const button2 = new Button({
    			props: { name: "Save as" },
    			$$inline: true
    		});

    	button2.$on("click", /*TryToSaveProject*/ ctx[3]);

    	const button3 = new Button({
    			props: { name: "How it works" },
    			$$inline: true
    		});

    	button3.$on("click", /*click_handler*/ ctx[6]);
    	const button4 = new Button({ props: { name: "About" }, $$inline: true });
    	button4.$on("click", /*click_handler_1*/ ctx[7]);

    	function modal_show_binding(value) {
    		/*modal_show_binding*/ ctx[8].call(null, value);
    	}

    	let modal_props = {};

    	if (/*modal_show*/ ctx[0] !== void 0) {
    		modal_props.show = /*modal_show*/ ctx[0];
    	}

    	const modal = new Modal({ props: modal_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal, "show", modal_show_binding));

    	function modalintro_show_binding(value) {
    		/*modalintro_show_binding*/ ctx[9].call(null, value);
    	}

    	let modalintro_props = {};

    	if (/*modalHowitWorks_show*/ ctx[1] !== void 0) {
    		modalintro_props.show = /*modalHowitWorks_show*/ ctx[1];
    	}

    	const modalintro = new ModalIntro({ props: modalintro_props, $$inline: true });
    	binding_callbacks.push(() => bind(modalintro, "show", modalintro_show_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button0.$$.fragment);
    			t0 = space();
    			create_component(button1.$$.fragment);
    			t1 = space();
    			create_component(button2.$$.fragment);
    			t2 = space();
    			create_component(button3.$$.fragment);
    			t3 = space();
    			create_component(button4.$$.fragment);
    			t4 = space();
    			create_component(modal.$$.fragment);
    			t5 = space();
    			create_component(modalintro.$$.fragment);
    			add_location(div, file$a, 18, 0, 583);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button0, div, null);
    			append_dev(div, t0);
    			mount_component(button1, div, null);
    			append_dev(div, t1);
    			mount_component(button2, div, null);
    			append_dev(div, t2);
    			mount_component(button3, div, null);
    			append_dev(div, t3);
    			mount_component(button4, div, null);
    			insert_dev(target, t4, anchor);
    			mount_component(modal, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(modalintro, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const button2_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button2_changes.$$scope = { dirty, ctx };
    			}

    			button2.$set(button2_changes);
    			const button3_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button3_changes.$$scope = { dirty, ctx };
    			}

    			button3.$set(button3_changes);
    			const button4_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button4_changes.$$scope = { dirty, ctx };
    			}

    			button4.$set(button4_changes);
    			const modal_changes = {};

    			if (!updating_show && dirty & /*modal_show*/ 1) {
    				updating_show = true;
    				modal_changes.show = /*modal_show*/ ctx[0];
    				add_flush_callback(() => updating_show = false);
    			}

    			modal.$set(modal_changes);
    			const modalintro_changes = {};

    			if (!updating_show_1 && dirty & /*modalHowitWorks_show*/ 2) {
    				updating_show_1 = true;
    				modalintro_changes.show = /*modalHowitWorks_show*/ ctx[1];
    				add_flush_callback(() => updating_show_1 = false);
    			}

    			modalintro.$set(modalintro_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			transition_in(button2.$$.fragment, local);
    			transition_in(button3.$$.fragment, local);
    			transition_in(button4.$$.fragment, local);
    			transition_in(modal.$$.fragment, local);
    			transition_in(modalintro.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			transition_out(button3.$$.fragment, local);
    			transition_out(button4.$$.fragment, local);
    			transition_out(modal.$$.fragment, local);
    			transition_out(modalintro.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button0);
    			destroy_component(button1);
    			destroy_component(button2);
    			destroy_component(button3);
    			destroy_component(button4);
    			if (detaching) detach_dev(t4);
    			destroy_component(modal, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(modalintro, detaching);
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
    	let modalHowitWorks_show = false;

    	const newProject = e => {
    		dispatch("NewProject");
    	};

    	const TryToSaveProject = e => {
    		dispatch("TrytoSaveProject");
    	};

    	const TryToLoadProject = e => {
    		dispatch("TryToLoadProject");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", $$slots, []);

    	const click_handler = () => {
    		$$invalidate(1, modalHowitWorks_show = true);
    	};

    	const click_handler_1 = () => {
    		$$invalidate(0, modal_show = true);
    	};

    	function modal_show_binding(value) {
    		modal_show = value;
    		$$invalidate(0, modal_show);
    	}

    	function modalintro_show_binding(value) {
    		modalHowitWorks_show = value;
    		$$invalidate(1, modalHowitWorks_show);
    	}

    	$$self.$capture_state = () => ({
    		Modal,
    		ModalIntro,
    		Button,
    		createEventDispatcher,
    		dispatch,
    		TemplateModule,
    		TemplatePort,
    		modal_show,
    		modalHowitWorks_show,
    		newProject,
    		TryToSaveProject,
    		TryToLoadProject
    	});

    	$$self.$inject_state = $$props => {
    		if ("modal_show" in $$props) $$invalidate(0, modal_show = $$props.modal_show);
    		if ("modalHowitWorks_show" in $$props) $$invalidate(1, modalHowitWorks_show = $$props.modalHowitWorks_show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		modal_show,
    		modalHowitWorks_show,
    		newProject,
    		TryToSaveProject,
    		TryToLoadProject,
    		dispatch,
    		click_handler,
    		click_handler_1,
    		modal_show_binding,
    		modalintro_show_binding
    	];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src\AddModuleBar.svelte generated by Svelte v3.22.2 */

    const { console: console_1$1 } = globals;
    const file$b = "src\\AddModuleBar.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (71:0) {:else}
    function create_else_block_1(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "No templates for Variables";
    			attr_dev(h4, "class", "svelte-1sg1c9b");
    			add_location(h4, file$b, 71, 4, 3230);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(71:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (66:0) {#if ModuleVarList.length!=0}
    function create_if_block_1(ctx) {
    	let h4;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*ModuleVarList*/ ctx[0];
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
    			h4 = element("h4");
    			h4.textContent = "Variables";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h4, "class", "svelte-1sg1c9b");
    			add_location(h4, file$b, 66, 4, 3056);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ModuleVarList, sendModuleInfo*/ 5) {
    				each_value_1 = /*ModuleVarList*/ ctx[0];
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
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(66:0) {#if ModuleVarList.length!=0}",
    		ctx
    	});

    	return block;
    }

    // (68:4) {#each ModuleVarList as variable}
    function create_each_block_1$2(ctx) {
    	let current;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[8](/*variable*/ ctx[10], ...args);
    	}

    	const button = new Button({
    			props: { name: /*variable*/ ctx[10].name },
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
    			if (dirty & /*ModuleVarList*/ 1) button_changes.name = /*variable*/ ctx[10].name;
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
    		source: "(68:4) {#each ModuleVarList as variable}",
    		ctx
    	});

    	return block;
    }

    // (79:0) {:else}
    function create_else_block(ctx) {
    	let h4;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			h4.textContent = "No templates for Functions";
    			attr_dev(h4, "class", "svelte-1sg1c9b");
    			add_location(h4, file$b, 79, 4, 3493);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(79:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (74:0) {#if ModuleFunctionList.length!=0}
    function create_if_block$2(ctx) {
    	let h4;
    	let t1;
    	let each_1_anchor;
    	let current;
    	let each_value = /*ModuleFunctionList*/ ctx[1];
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
    			h4 = element("h4");
    			h4.textContent = "Functions";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(h4, "class", "svelte-1sg1c9b");
    			add_location(h4, file$b, 74, 4, 3314);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*ModuleFunctionList, sendModuleInfo*/ 6) {
    				each_value = /*ModuleFunctionList*/ ctx[1];
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
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(74:0) {#if ModuleFunctionList.length!=0}",
    		ctx
    	});

    	return block;
    }

    // (76:4) {#each ModuleFunctionList as variable}
    function create_each_block$2(ctx) {
    	let current;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[9](/*variable*/ ctx[10], ...args);
    	}

    	const button = new Button({
    			props: { name: /*variable*/ ctx[10].name },
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
    			if (dirty & /*ModuleFunctionList*/ 2) button_changes.name = /*variable*/ ctx[10].name;
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
    		source: "(76:4) {#each ModuleFunctionList as variable}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let current_block_type_index;
    	let if_block0;
    	let t;
    	let current_block_type_index_1;
    	let if_block1;
    	let if_block1_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*ModuleVarList*/ ctx[0].length != 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	const if_block_creators_1 = [create_if_block$2, create_else_block];
    	const if_blocks_1 = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*ModuleFunctionList*/ ctx[1].length != 0) return 0;
    		return 1;
    	}

    	current_block_type_index_1 = select_block_type_1(ctx);
    	if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);

    	const block = {
    		c: function create() {
    			if_block0.c();
    			t = space();
    			if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t, anchor);
    			if_blocks_1[current_block_type_index_1].m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(t.parentNode, t);
    			}

    			let previous_block_index_1 = current_block_type_index_1;
    			current_block_type_index_1 = select_block_type_1(ctx);

    			if (current_block_type_index_1 === previous_block_index_1) {
    				if_blocks_1[current_block_type_index_1].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks_1[previous_block_index_1], 1, 1, () => {
    					if_blocks_1[previous_block_index_1] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks_1[current_block_type_index_1];

    				if (!if_block1) {
    					if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t);
    			if_blocks_1[current_block_type_index_1].d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
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

    function instance$c($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let ModulesTemplatesList = [];
    	let ModuleVarList = [];
    	let ModuleFunctionList = [];

    	function sendModuleInfo(ModuleTemplate) {
    		dispatch("AddModule", { module: ModuleTemplate });
    	}

    	//read Templates for the Modules --> inside public dr
    	var fs = require("fs");

    	var path = require("path");
    	var filePath = path.join(__dirname, "ModulesTemplates.json");

    	onMount(async () => {
    		fs.readFile(filePath, function (err, data) {
    			if (!err) {
    				let json = JSON.parse(data);
    				let i;

    				for (i = 0; i < json.Templates.Variables.length; i++) {
    					let tempVar = new TemplateModule(json.Templates.Variables[i].Name);

    					//como é var so vai ter outputs
    					let j;

    					for (j = 0; j < json.Templates.Variables[i].IO.Outputs.length; j++) {
    						let tempPort = new TemplatePort(false, json.Templates.Variables[i].IO.Outputs[j].PortType, json.Templates.Variables[i].IO.Outputs[j].VarName);
    						tempVar.listOutputs.push(tempPort);
    					}

    					if (json.Templates.Variables[i].Variables) {
    						tempVar.listVariables = json.Templates.Variables[i].Variables;
    					}

    					ModuleVarList.push(tempVar);
    				}

    				for (i = 0; i < json.Templates.Functions.length; i++) {
    					let tempVar = new TemplateModule(json.Templates.Functions[i].Name);

    					//como é function vai ter inputs e outputs
    					let j;

    					for (j = 0; j < json.Templates.Functions[i].IO.Inputs.length; j++) {
    						let tempPort = new TemplatePort(true, json.Templates.Functions[i].IO.Inputs[j].PortType, json.Templates.Functions[i].IO.Inputs[j].VarName);
    						tempVar.listInputs.push(tempPort);
    					}

    					let h;

    					for (h = 0; h < json.Templates.Functions[i].IO.Outputs.length; h++) {
    						let tempPort = new TemplatePort(false, json.Templates.Functions[i].IO.Outputs[h].PortType, json.Templates.Functions[i].IO.Outputs[h].VarName);
    						tempVar.listOutputs.push(tempPort);
    					}

    					tempVar.functionId = json.Templates.Functions[i].FunctionID;

    					if (json.Templates.Functions[i].Variables) {
    						tempVar.listVariables = json.Templates.Functions[i].Variables;
    					}

    					ModuleFunctionList.push(tempVar);
    				}

    				$$invalidate(0, ModuleVarList);
    				$$invalidate(1, ModuleFunctionList);
    			} else {
    				console.log(err);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<AddModuleBar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AddModuleBar", $$slots, []);
    	const click_handler = (variable, e) => sendModuleInfo(variable);
    	const click_handler_1 = (variable, e) => sendModuleInfo(variable);

    	$$self.$capture_state = () => ({
    		fade,
    		TemplateModule,
    		TemplatePort,
    		createEventDispatcher,
    		dispatch,
    		Button,
    		onMount,
    		ModulesTemplatesList,
    		ModuleVarList,
    		ModuleFunctionList,
    		sendModuleInfo,
    		fs,
    		path,
    		filePath
    	});

    	$$self.$inject_state = $$props => {
    		if ("ModulesTemplatesList" in $$props) ModulesTemplatesList = $$props.ModulesTemplatesList;
    		if ("ModuleVarList" in $$props) $$invalidate(0, ModuleVarList = $$props.ModuleVarList);
    		if ("ModuleFunctionList" in $$props) $$invalidate(1, ModuleFunctionList = $$props.ModuleFunctionList);
    		if ("fs" in $$props) fs = $$props.fs;
    		if ("path" in $$props) path = $$props.path;
    		if ("filePath" in $$props) filePath = $$props.filePath;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
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

    class AddModuleBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AddModuleBar",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src\ButtonRedoUndo.svelte generated by Svelte v3.22.2 */

    const file$c = "src\\ButtonRedoUndo.svelte";

    function create_fragment$d(ctx) {
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
    			attr_dev(button, "class", "btn btn-info svelte-19851mm");
    			add_location(button, file$c, 2, 0, 52);
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ButtonRedoUndo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ButtonRedoUndo", $$slots, ['default']);

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots, click_handler];
    }

    class ButtonRedoUndo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ButtonRedoUndo",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* node_modules\svelte-icons\components\IconBase.svelte generated by Svelte v3.22.2 */

    const file$d = "node_modules\\svelte-icons\\components\\IconBase.svelte";

    // (18:2) {#if title}
    function create_if_block$3(ctx) {
    	let title_1;
    	let t;

    	const block = {
    		c: function create() {
    			title_1 = svg_element("title");
    			t = text(/*title*/ ctx[0]);
    			add_location(title_1, file$d, 18, 4, 298);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, title_1, anchor);
    			append_dev(title_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data_dev(t, /*title*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(title_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(18:2) {#if title}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let svg;
    	let if_block_anchor;
    	let current;
    	let if_block = /*title*/ ctx[0] && create_if_block$3(ctx);
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			if (default_slot) default_slot.c();
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", /*viewBox*/ ctx[1]);
    			attr_dev(svg, "class", "svelte-c8tyih");
    			add_location(svg, file$d, 16, 0, 229);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			if (if_block) if_block.m(svg, null);
    			append_dev(svg, if_block_anchor);

    			if (default_slot) {
    				default_slot.m(svg, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*title*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(svg, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    				}
    			}

    			if (!current || dirty & /*viewBox*/ 2) {
    				attr_dev(svg, "viewBox", /*viewBox*/ ctx[1]);
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
    			if (detaching) detach_dev(svg);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { title = null } = $$props;
    	let { viewBox } = $$props;
    	const writable_props = ["title", "viewBox"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<IconBase> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("IconBase", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("viewBox" in $$props) $$invalidate(1, viewBox = $$props.viewBox);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ title, viewBox });

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("viewBox" in $$props) $$invalidate(1, viewBox = $$props.viewBox);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, viewBox, $$scope, $$slots];
    }

    class IconBase extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { title: 0, viewBox: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IconBase",
    			options,
    			id: create_fragment$e.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*viewBox*/ ctx[1] === undefined && !("viewBox" in props)) {
    			console.warn("<IconBase> was created without expected prop 'viewBox'");
    		}
    	}

    	get title() {
    		throw new Error("<IconBase>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<IconBase>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewBox() {
    		throw new Error("<IconBase>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewBox(value) {
    		throw new Error("<IconBase>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-icons\fa\FaReply.svelte generated by Svelte v3.22.2 */
    const file$e = "node_modules\\svelte-icons\\fa\\FaReply.svelte";

    // (4:8) <IconBase viewBox="0 0 512 512" {...$$props}>
    function create_default_slot(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M8.309 189.836L184.313 37.851C199.719 24.546 224 35.347 224 56.015v80.053c160.629 1.839 288 34.032 288 186.258 0 61.441-39.581 122.309-83.333 154.132-13.653 9.931-33.111-2.533-28.077-18.631 45.344-145.012-21.507-183.51-176.59-185.742V360c0 20.7-24.3 31.453-39.687 18.164l-176.004-152c-11.071-9.562-11.086-26.753 0-36.328z");
    			add_location(path, file$e, 4, 10, 153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(4:8) <IconBase viewBox=\\\"0 0 512 512\\\" {...$$props}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$f(ctx) {
    	let current;
    	const iconbase_spread_levels = [{ viewBox: "0 0 512 512" }, /*$$props*/ ctx[0]];

    	let iconbase_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
    		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
    	}

    	const iconbase = new IconBase({ props: iconbase_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iconbase.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(iconbase, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const iconbase_changes = (dirty & /*$$props*/ 1)
    			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
    			: {};

    			if (dirty & /*$$scope*/ 2) {
    				iconbase_changes.$$scope = { dirty, ctx };
    			}

    			iconbase.$set(iconbase_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iconbase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iconbase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iconbase, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FaReply", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ IconBase });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class FaReply extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FaReply",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* node_modules\svelte-icons\fa\FaShare.svelte generated by Svelte v3.22.2 */
    const file$f = "node_modules\\svelte-icons\\fa\\FaShare.svelte";

    // (4:8) <IconBase viewBox="0 0 512 512" {...$$props}>
    function create_default_slot$1(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M503.691 189.836L327.687 37.851C312.281 24.546 288 35.347 288 56.015v80.053C127.371 137.907 0 170.1 0 322.326c0 61.441 39.581 122.309 83.333 154.132 13.653 9.931 33.111-2.533 28.077-18.631C66.066 312.814 132.917 274.316 288 272.085V360c0 20.7 24.3 31.453 39.687 18.164l176.004-152c11.071-9.562 11.086-26.753 0-36.328z");
    			add_location(path, file$f, 4, 10, 153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(4:8) <IconBase viewBox=\\\"0 0 512 512\\\" {...$$props}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$g(ctx) {
    	let current;
    	const iconbase_spread_levels = [{ viewBox: "0 0 512 512" }, /*$$props*/ ctx[0]];

    	let iconbase_props = {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
    		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
    	}

    	const iconbase = new IconBase({ props: iconbase_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iconbase.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(iconbase, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const iconbase_changes = (dirty & /*$$props*/ 1)
    			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
    			: {};

    			if (dirty & /*$$scope*/ 2) {
    				iconbase_changes.$$scope = { dirty, ctx };
    			}

    			iconbase.$set(iconbase_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iconbase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iconbase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iconbase, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FaShare", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ IconBase });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class FaShare extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FaShare",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* node_modules\svelte-icons\fa\FaSave.svelte generated by Svelte v3.22.2 */
    const file$g = "node_modules\\svelte-icons\\fa\\FaSave.svelte";

    // (4:8) <IconBase viewBox="0 0 448 512" {...$$props}>
    function create_default_slot$2(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z");
    			add_location(path, file$g, 4, 10, 153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(4:8) <IconBase viewBox=\\\"0 0 448 512\\\" {...$$props}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$h(ctx) {
    	let current;
    	const iconbase_spread_levels = [{ viewBox: "0 0 448 512" }, /*$$props*/ ctx[0]];

    	let iconbase_props = {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
    		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
    	}

    	const iconbase = new IconBase({ props: iconbase_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iconbase.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(iconbase, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const iconbase_changes = (dirty & /*$$props*/ 1)
    			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
    			: {};

    			if (dirty & /*$$scope*/ 2) {
    				iconbase_changes.$$scope = { dirty, ctx };
    			}

    			iconbase.$set(iconbase_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iconbase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iconbase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iconbase, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FaSave", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ IconBase });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class FaSave extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FaSave",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src\AppRedoUndoSave.svelte generated by Svelte v3.22.2 */
    const file$h = "src\\AppRedoUndoSave.svelte";

    // (29:4) <ButtonRedoUndo on:click={Undo}>
    function create_default_slot_2(ctx) {
    	let current;
    	const goarrowleft = new FaReply({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(goarrowleft.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(goarrowleft, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(goarrowleft.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(goarrowleft.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(goarrowleft, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(29:4) <ButtonRedoUndo on:click={Undo}>",
    		ctx
    	});

    	return block;
    }

    // (32:4) <ButtonRedoUndo on:click={Redo}>
    function create_default_slot_1(ctx) {
    	let current;
    	const goarrowright = new FaShare({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(goarrowright.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(goarrowright, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(goarrowright.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(goarrowright.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(goarrowright, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(32:4) <ButtonRedoUndo on:click={Redo}>",
    		ctx
    	});

    	return block;
    }

    // (35:4) <ButtonRedoUndo on:click={saveProject}>
    function create_default_slot$3(ctx) {
    	let current;
    	const saveicon = new FaSave({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(saveicon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(saveicon, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(saveicon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(saveicon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(saveicon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(35:4) <ButtonRedoUndo on:click={saveProject}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$i(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;

    	const buttonredoundo0 = new ButtonRedoUndo({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	buttonredoundo0.$on("click", /*Undo*/ ctx[0]);

    	const buttonredoundo1 = new ButtonRedoUndo({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	buttonredoundo1.$on("click", /*Redo*/ ctx[1]);

    	const buttonredoundo2 = new ButtonRedoUndo({
    			props: {
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	buttonredoundo2.$on("click", /*saveProject*/ ctx[2]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(buttonredoundo0.$$.fragment);
    			t0 = space();
    			create_component(buttonredoundo1.$$.fragment);
    			t1 = space();
    			create_component(buttonredoundo2.$$.fragment);
    			add_location(div, file$h, 27, 0, 834);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(buttonredoundo0, div, null);
    			append_dev(div, t0);
    			mount_component(buttonredoundo1, div, null);
    			append_dev(div, t1);
    			mount_component(buttonredoundo2, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const buttonredoundo0_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				buttonredoundo0_changes.$$scope = { dirty, ctx };
    			}

    			buttonredoundo0.$set(buttonredoundo0_changes);
    			const buttonredoundo1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				buttonredoundo1_changes.$$scope = { dirty, ctx };
    			}

    			buttonredoundo1.$set(buttonredoundo1_changes);
    			const buttonredoundo2_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				buttonredoundo2_changes.$$scope = { dirty, ctx };
    			}

    			buttonredoundo2.$set(buttonredoundo2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buttonredoundo0.$$.fragment, local);
    			transition_in(buttonredoundo1.$$.fragment, local);
    			transition_in(buttonredoundo2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttonredoundo0.$$.fragment, local);
    			transition_out(buttonredoundo1.$$.fragment, local);
    			transition_out(buttonredoundo2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(buttonredoundo0);
    			destroy_component(buttonredoundo1);
    			destroy_component(buttonredoundo2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { ProjectName } = $$props;
    	let { ProjectPath } = $$props;

    	const Undo = e => {
    		dispatch("Undo");
    	};

    	const Redo = e => {
    		dispatch("Redo");
    	};

    	const saveProject = e => {
    		if (!ProjectPath) {
    			dispatch("ProjectNameNotDefined", { message: "Project name not defined" });
    		} else {
    			dispatch("SaveProject", { name: ProjectName });
    		}
    	};

    	const writable_props = ["ProjectName", "ProjectPath"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AppRedoUndoSave> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("AppRedoUndoSave", $$slots, []);

    	$$self.$set = $$props => {
    		if ("ProjectName" in $$props) $$invalidate(3, ProjectName = $$props.ProjectName);
    		if ("ProjectPath" in $$props) $$invalidate(4, ProjectPath = $$props.ProjectPath);
    	};

    	$$self.$capture_state = () => ({
    		ButtonRedoUndo,
    		createEventDispatcher,
    		GoArrowLeft: FaReply,
    		GoArrowRight: FaShare,
    		SaveIcon: FaSave,
    		dispatch,
    		ProjectName,
    		ProjectPath,
    		Undo,
    		Redo,
    		saveProject
    	});

    	$$self.$inject_state = $$props => {
    		if ("ProjectName" in $$props) $$invalidate(3, ProjectName = $$props.ProjectName);
    		if ("ProjectPath" in $$props) $$invalidate(4, ProjectPath = $$props.ProjectPath);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [Undo, Redo, saveProject, ProjectName, ProjectPath];
    }

    class AppRedoUndoSave extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, { ProjectName: 3, ProjectPath: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppRedoUndoSave",
    			options,
    			id: create_fragment$i.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ProjectName*/ ctx[3] === undefined && !("ProjectName" in props)) {
    			console.warn("<AppRedoUndoSave> was created without expected prop 'ProjectName'");
    		}

    		if (/*ProjectPath*/ ctx[4] === undefined && !("ProjectPath" in props)) {
    			console.warn("<AppRedoUndoSave> was created without expected prop 'ProjectPath'");
    		}
    	}

    	get ProjectName() {
    		throw new Error("<AppRedoUndoSave>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ProjectName(value) {
    		throw new Error("<AppRedoUndoSave>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ProjectPath() {
    		throw new Error("<AppRedoUndoSave>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ProjectPath(value) {
    		throw new Error("<AppRedoUndoSave>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-icons\fa\FaSmile.svelte generated by Svelte v3.22.2 */
    const file$i = "node_modules\\svelte-icons\\fa\\FaSmile.svelte";

    // (4:8) <IconBase viewBox="0 0 496 512" {...$$props}>
    function create_default_slot$4(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm80 168c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm-160 0c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm194.8 170.2C334.3 380.4 292.5 400 248 400s-86.3-19.6-114.8-53.8c-13.6-16.3 11-36.7 24.6-20.5 22.4 26.9 55.2 42.2 90.2 42.2s67.8-15.4 90.2-42.2c13.4-16.2 38.1 4.2 24.6 20.5z");
    			add_location(path, file$i, 4, 10, 153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(4:8) <IconBase viewBox=\\\"0 0 496 512\\\" {...$$props}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$j(ctx) {
    	let current;
    	const iconbase_spread_levels = [{ viewBox: "0 0 496 512" }, /*$$props*/ ctx[0]];

    	let iconbase_props = {
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
    		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
    	}

    	const iconbase = new IconBase({ props: iconbase_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iconbase.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(iconbase, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const iconbase_changes = (dirty & /*$$props*/ 1)
    			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
    			: {};

    			if (dirty & /*$$scope*/ 2) {
    				iconbase_changes.$$scope = { dirty, ctx };
    			}

    			iconbase.$set(iconbase_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iconbase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iconbase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iconbase, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FaSmile", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ IconBase });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class FaSmile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FaSmile",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* node_modules\svelte-icons\fa\FaSmileWink.svelte generated by Svelte v3.22.2 */
    const file$j = "node_modules\\svelte-icons\\fa\\FaSmileWink.svelte";

    // (4:8) <IconBase viewBox="0 0 496 512" {...$$props}>
    function create_default_slot$5(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M0 256c0 137 111 248 248 248s248-111 248-248S385 8 248 8 0 119 0 256zm200-48c0 17.7-14.3 32-32 32s-32-14.3-32-32 14.3-32 32-32 32 14.3 32 32zm158.5 16.5c-14.8-13.2-46.2-13.2-61 0L288 233c-8.3 7.4-21.6.4-19.8-10.8 4-25.2 34.2-42.1 59.9-42.1S384 197 388 222.2c1.7 11.1-11.4 18.3-19.8 10.8l-9.7-8.5zM157.8 325.8C180.2 352.7 213 368 248 368s67.8-15.4 90.2-42.2c13.6-16.2 38.1 4.2 24.6 20.5C334.3 380.4 292.5 400 248 400s-86.3-19.6-114.8-53.8c-13.5-16.3 11.2-36.7 24.6-20.4z");
    			add_location(path, file$j, 4, 10, 153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(4:8) <IconBase viewBox=\\\"0 0 496 512\\\" {...$$props}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$k(ctx) {
    	let current;
    	const iconbase_spread_levels = [{ viewBox: "0 0 496 512" }, /*$$props*/ ctx[0]];

    	let iconbase_props = {
    		$$slots: { default: [create_default_slot$5] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
    		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
    	}

    	const iconbase = new IconBase({ props: iconbase_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iconbase.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(iconbase, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const iconbase_changes = (dirty & /*$$props*/ 1)
    			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
    			: {};

    			if (dirty & /*$$scope*/ 2) {
    				iconbase_changes.$$scope = { dirty, ctx };
    			}

    			iconbase.$set(iconbase_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iconbase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iconbase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iconbase, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FaSmileWink", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ IconBase });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class FaSmileWink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FaSmileWink",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* node_modules\svelte-icons\fa\FaSadTear.svelte generated by Svelte v3.22.2 */
    const file$k = "node_modules\\svelte-icons\\fa\\FaSadTear.svelte";

    // (4:8) <IconBase viewBox="0 0 496 512" {...$$props}>
    function create_default_slot$6(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "d", "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm80 168c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zM152 416c-26.5 0-48-21-48-47 0-20 28.5-60.4 41.6-77.8 3.2-4.3 9.6-4.3 12.8 0C171.5 308.6 200 349 200 369c0 26-21.5 47-48 47zm16-176c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm170.2 154.2C315.8 367.4 282.9 352 248 352c-21.2 0-21.2-32 0-32 44.4 0 86.3 19.6 114.7 53.8 13.8 16.4-11.2 36.5-24.5 20.4z");
    			add_location(path, file$k, 4, 10, 153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$6.name,
    		type: "slot",
    		source: "(4:8) <IconBase viewBox=\\\"0 0 496 512\\\" {...$$props}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$l(ctx) {
    	let current;
    	const iconbase_spread_levels = [{ viewBox: "0 0 496 512" }, /*$$props*/ ctx[0]];

    	let iconbase_props = {
    		$$slots: { default: [create_default_slot$6] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
    		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
    	}

    	const iconbase = new IconBase({ props: iconbase_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iconbase.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(iconbase, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const iconbase_changes = (dirty & /*$$props*/ 1)
    			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
    			: {};

    			if (dirty & /*$$scope*/ 2) {
    				iconbase_changes.$$scope = { dirty, ctx };
    			}

    			iconbase.$set(iconbase_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iconbase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iconbase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iconbase, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("FaSadTear", $$slots, []);

    	$$self.$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    	};

    	$$self.$capture_state = () => ({ IconBase });

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), $$new_props));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$props = exclude_internal_props($$props);
    	return [$$props];
    }

    class FaSadTear extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FaSadTear",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src\ModalWrongTypes.svelte generated by Svelte v3.22.2 */
    const file$l = "src\\ModalWrongTypes.svelte";

    // (18:0) {#if show}
    function create_if_block$4(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let main;
    	let h40;
    	let t1;
    	let div0;
    	let t2;
    	let h41;
    	let div2_transition;
    	let current;
    	let dispose;
    	const tipemoji = new FaSmileWink({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			main = element("main");
    			h40 = element("h4");
    			h40.textContent = "Hello there!!!";
    			t1 = space();
    			div0 = element("div");
    			create_component(tipemoji.$$.fragment);
    			t2 = space();
    			h41 = element("h4");
    			h41.textContent = "I heard that you're trying to make a connection! There are several port types, but it is only possible to connect between similar port types!";
    			attr_dev(h40, "class", "welcoming svelte-ut6r4h");
    			add_location(h40, file$l, 22, 12, 677);
    			attr_dev(div0, "class", "emoji svelte-ut6r4h");
    			add_location(div0, file$l, 23, 12, 732);
    			attr_dev(h41, "class", "messageIntro svelte-ut6r4h");
    			add_location(h41, file$l, 24, 12, 782);
    			attr_dev(main, "class", "grid-container svelte-ut6r4h");
    			add_location(main, file$l, 21, 10, 634);
    			attr_dev(div1, "class", "modal-container svelte-ut6r4h");
    			add_location(div1, file$l, 20, 8, 593);
    			attr_dev(div2, "class", "modal-overlay svelte-ut6r4h");
    			attr_dev(div2, "data-close", "");
    			add_location(div2, file$l, 19, 6, 486);
    			add_location(div3, file$l, 18, 4, 473);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, main);
    			append_dev(main, h40);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			mount_component(tipemoji, div0, null);
    			append_dev(main, t2);
    			append_dev(main, h41);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div2, "click", /*overlay_click*/ ctx[1], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tipemoji.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tipemoji.$$.fragment, local);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(tipemoji);
    			if (detaching && div2_transition) div2_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(18:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$m(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block$4(ctx);

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
    					if_block = create_if_block$4(ctx);
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
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props, $$invalidate) {
    	function overlay_click(e) {
    		if ("close" in e.target.dataset) $$invalidate(0, show = false);
    	}

    	let { show = false } = $$props;
    	const writable_props = ["show"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalWrongTypes> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ModalWrongTypes", $$slots, []);

    	$$self.$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		GoodEmoji: FaSmile,
    		TipEmoji: FaSmileWink,
    		BadEmoji: FaSadTear,
    		overlay_click,
    		show
    	});

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show, overlay_click];
    }

    class ModalWrongTypes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, { show: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalWrongTypes",
    			options,
    			id: create_fragment$m.name
    		});
    	}

    	get show() {
    		throw new Error("<ModalWrongTypes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<ModalWrongTypes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\ModalAlert.svelte generated by Svelte v3.22.2 */
    const file$m = "src\\ModalAlert.svelte";

    // (20:0) {#if show}
    function create_if_block$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_if_block_2, create_if_block_3, create_if_block_4];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*message*/ ctx[1] == "Project Name not defined") return 0;
    		if (/*message*/ ctx[1] == "Port types are different") return 1;
    		if (/*error*/ ctx[2] == true) return 2;
    		if (/*error*/ ctx[2] == false) return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
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
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(20:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (58:25) 
    function create_if_block_4(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let main;
    	let h1;
    	let t1;
    	let h4;
    	let t2;
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
    			h1.textContent = "ola";
    			t1 = space();
    			h4 = element("h4");
    			t2 = text(/*message*/ ctx[1]);
    			add_location(h1, file$m, 62, 12, 2396);
    			add_location(h4, file$m, 63, 12, 2422);
    			attr_dev(main, "class", "svelte-ut6r4h");
    			add_location(main, file$m, 61, 10, 2376);
    			attr_dev(div0, "class", "modal-container svelte-ut6r4h");
    			add_location(div0, file$m, 60, 8, 2335);
    			attr_dev(div1, "class", "modal-overlay svelte-ut6r4h");
    			attr_dev(div1, "data-close", "");
    			add_location(div1, file$m, 59, 6, 2228);
    			add_location(div2, file$m, 58, 4, 2215);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, main);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h4);
    			append_dev(h4, t2);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*overlay_click*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*message*/ 2) set_data_dev(t2, /*message*/ ctx[1]);
    		},
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(58:25) ",
    		ctx
    	});

    	return block;
    }

    // (45:24) 
    function create_if_block_3(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let main;
    	let h40;
    	let t1;
    	let div0;
    	let t2;
    	let h41;
    	let t4;
    	let h42;
    	let t5;
    	let div2_transition;
    	let current;
    	let dispose;
    	const bademoji = new FaSadTear({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			main = element("main");
    			h40 = element("h4");
    			h40.textContent = "Hello there...";
    			t1 = space();
    			div0 = element("div");
    			create_component(bademoji.$$.fragment);
    			t2 = space();
    			h41 = element("h4");
    			h41.textContent = "Something went wrong unexpectedly...";
    			t4 = space();
    			h42 = element("h4");
    			t5 = text(/*message*/ ctx[1]);
    			attr_dev(h40, "class", "welcoming svelte-ut6r4h");
    			add_location(h40, file$m, 49, 12, 1902);
    			attr_dev(div0, "class", "emoji svelte-ut6r4h");
    			add_location(div0, file$m, 50, 12, 1957);
    			attr_dev(h41, "class", "messageIntro svelte-ut6r4h");
    			add_location(h41, file$m, 51, 12, 2007);
    			attr_dev(h42, "class", "message svelte-ut6r4h");
    			add_location(h42, file$m, 52, 12, 2087);
    			attr_dev(main, "class", "grid-container svelte-ut6r4h");
    			add_location(main, file$m, 48, 10, 1859);
    			attr_dev(div1, "class", "modal-container svelte-ut6r4h");
    			add_location(div1, file$m, 47, 8, 1818);
    			attr_dev(div2, "class", "modal-overlay svelte-ut6r4h");
    			attr_dev(div2, "data-close", "");
    			add_location(div2, file$m, 46, 6, 1711);
    			add_location(div3, file$m, 45, 4, 1698);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, main);
    			append_dev(main, h40);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			mount_component(bademoji, div0, null);
    			append_dev(main, t2);
    			append_dev(main, h41);
    			append_dev(main, t4);
    			append_dev(main, h42);
    			append_dev(h42, t5);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div2, "click", /*overlay_click*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*message*/ 2) set_data_dev(t5, /*message*/ ctx[1]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(bademoji.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(bademoji.$$.fragment, local);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(bademoji);
    			if (detaching && div2_transition) div2_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(45:24) ",
    		ctx
    	});

    	return block;
    }

    // (33:48) 
    function create_if_block_2(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let main;
    	let h40;
    	let t1;
    	let div0;
    	let t2;
    	let h41;
    	let div2_transition;
    	let current;
    	let dispose;
    	const tipemoji = new FaSmileWink({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			main = element("main");
    			h40 = element("h4");
    			h40.textContent = "Hello there!!!";
    			t1 = space();
    			div0 = element("div");
    			create_component(tipemoji.$$.fragment);
    			t2 = space();
    			h41 = element("h4");
    			h41.textContent = "I heard that you're trying to make a connection! There are several port types, but it is only possible to connect between similar port types!";
    			attr_dev(h40, "class", "welcoming svelte-ut6r4h");
    			add_location(h40, file$m, 37, 12, 1329);
    			attr_dev(div0, "class", "emoji svelte-ut6r4h");
    			add_location(div0, file$m, 38, 12, 1384);
    			attr_dev(h41, "class", "messageIntro svelte-ut6r4h");
    			add_location(h41, file$m, 39, 12, 1434);
    			attr_dev(main, "class", "grid-container svelte-ut6r4h");
    			add_location(main, file$m, 36, 10, 1286);
    			attr_dev(div1, "class", "modal-container svelte-ut6r4h");
    			add_location(div1, file$m, 35, 8, 1245);
    			attr_dev(div2, "class", "modal-overlay svelte-ut6r4h");
    			attr_dev(div2, "data-close", "");
    			add_location(div2, file$m, 34, 6, 1138);
    			add_location(div3, file$m, 33, 4, 1125);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, main);
    			append_dev(main, h40);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			mount_component(tipemoji, div0, null);
    			append_dev(main, t2);
    			append_dev(main, h41);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div2, "click", /*overlay_click*/ ctx[3], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tipemoji.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tipemoji.$$.fragment, local);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(tipemoji);
    			if (detaching && div2_transition) div2_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(33:48) ",
    		ctx
    	});

    	return block;
    }

    // (21:2) {#if message=="Project Name not defined"}
    function create_if_block_1$1(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let main;
    	let h40;
    	let t1;
    	let div0;
    	let t2;
    	let h41;
    	let div2_transition;
    	let current;
    	let dispose;
    	const tipemoji = new FaSmileWink({ $$inline: true });

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			main = element("main");
    			h40 = element("h4");
    			h40.textContent = "Hello there!!!";
    			t1 = space();
    			div0 = element("div");
    			create_component(tipemoji.$$.fragment);
    			t2 = space();
    			h41 = element("h4");
    			h41.textContent = "I heard that you tried to save a file... There is no Project currently opened. Try \"Save as\" first.";
    			attr_dev(h40, "class", "welcoming svelte-ut6r4h");
    			add_location(h40, file$m, 25, 14, 772);
    			attr_dev(div0, "class", "emoji svelte-ut6r4h");
    			add_location(div0, file$m, 26, 14, 829);
    			attr_dev(h41, "class", "messageIntro svelte-ut6r4h");
    			add_location(h41, file$m, 27, 12, 879);
    			attr_dev(main, "class", "grid-container svelte-ut6r4h");
    			add_location(main, file$m, 24, 10, 727);
    			attr_dev(div1, "class", "modal-container svelte-ut6r4h");
    			add_location(div1, file$m, 23, 8, 686);
    			attr_dev(div2, "class", "modal-overlay svelte-ut6r4h");
    			attr_dev(div2, "data-close", "");
    			add_location(div2, file$m, 22, 6, 579);
    			add_location(div3, file$m, 21, 4, 566);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, main);
    			append_dev(main, h40);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			mount_component(tipemoji, div0, null);
    			append_dev(main, t2);
    			append_dev(main, h41);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div2, "click", /*overlay_click*/ ctx[3], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tipemoji.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tipemoji.$$.fragment, local);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 150 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(tipemoji);
    			if (detaching && div2_transition) div2_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(21:2) {#if message==\\\"Project Name not defined\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block$5(ctx);

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
    					if_block = create_if_block$5(ctx);
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
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$n($$self, $$props, $$invalidate) {
    	function overlay_click(e) {
    		if ("close" in e.target.dataset) $$invalidate(0, show = false);
    	}

    	let { show = false } = $$props;
    	let { message } = $$props;
    	let { error } = $$props;
    	const writable_props = ["show", "message", "error"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModalAlert> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ModalAlert", $$slots, []);

    	$$self.$set = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("message" in $$props) $$invalidate(1, message = $$props.message);
    		if ("error" in $$props) $$invalidate(2, error = $$props.error);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		GoodEmoji: FaSmile,
    		TipEmoji: FaSmileWink,
    		BadEmoji: FaSadTear,
    		overlay_click,
    		show,
    		message,
    		error
    	});

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("message" in $$props) $$invalidate(1, message = $$props.message);
    		if ("error" in $$props) $$invalidate(2, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show, message, error, overlay_click];
    }

    class ModalAlert extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$n, create_fragment$n, safe_not_equal, { show: 0, message: 1, error: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModalAlert",
    			options,
    			id: create_fragment$n.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*message*/ ctx[1] === undefined && !("message" in props)) {
    			console.warn("<ModalAlert> was created without expected prop 'message'");
    		}

    		if (/*error*/ ctx[2] === undefined && !("error" in props)) {
    			console.warn("<ModalAlert> was created without expected prop 'error'");
    		}
    	}

    	get show() {
    		throw new Error("<ModalAlert>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show(value) {
    		throw new Error("<ModalAlert>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get message() {
    		throw new Error("<ModalAlert>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<ModalAlert>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get error() {
    		throw new Error("<ModalAlert>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set error(value) {
    		throw new Error("<ModalAlert>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.22.2 */
    const file$n = "src\\App.svelte";

    function create_fragment$o(ctx) {
    	let div7;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let t3;
    	let div4;
    	let t4;
    	let div5;
    	let t5;
    	let div6;
    	let t6;
    	let updating_show;
    	let current;

    	const navbar = new Navbar({
    			props: { ProjectName: /*ProjectName*/ ctx[1] },
    			$$inline: true
    		});

    	navbar.$on("NewProject", /*handleNewProject*/ ctx[12]);
    	navbar.$on("AddModule", /*handleAddModule*/ ctx[11]);
    	navbar.$on("TrytoSaveProject", /*handleTrytoSaveProject*/ ctx[16]);
    	navbar.$on("TryToLoadProject", /*handleTryToLoadProject*/ ctx[17]);

    	const appredoundosave = new AppRedoUndoSave({
    			props: {
    				ProjectName: /*ProjectName*/ ctx[1],
    				ProjectPath: /*ProjectPath*/ ctx[2]
    			},
    			$$inline: true
    		});

    	appredoundosave.$on("SaveProject", /*handleSaveProject*/ ctx[10]);
    	appredoundosave.$on("ProjectNameNotDefined", /*handleProjectNameNotDefined*/ ctx[15]);
    	appredoundosave.$on("Redo", /*handleRedo*/ ctx[14]);
    	appredoundosave.$on("Undo", /*handleUndo*/ ctx[13]);
    	const addmodulebar = new AddModuleBar({ $$inline: true });
    	addmodulebar.$on("AddModule", /*handleAddModule*/ ctx[11]);

    	let appcanvas_props = {
    		left: /*left*/ ctx[8],
    		top: /*top*/ ctx[7],
    		ProjectName: /*ProjectName*/ ctx[1]
    	};

    	const appcanvas = new AppCanvas({ props: appcanvas_props, $$inline: true });
    	/*appcanvas_binding*/ ctx[29](appcanvas);
    	appcanvas.$on("fileWasLoadedCorrectly", /*handleFileWasLoadedCorrectly*/ ctx[19]);
    	appcanvas.$on("fileWasSavedCorrectly", /*handleFileWasLoadedCorrectly*/ ctx[19]);
    	appcanvas.$on("newProjectInitiated", /*handleNewProjectInitiated*/ ctx[18]);
    	appcanvas.$on("wrongTypes", /*handleWrongTypes*/ ctx[9]);

    	function modalwrongtypes_show_binding(value) {
    		/*modalwrongtypes_show_binding*/ ctx[31].call(null, value);
    	}

    	let modalwrongtypes_props = {};

    	if (/*ModalWrongTypesshow*/ ctx[0] !== void 0) {
    		modalwrongtypes_props.show = /*ModalWrongTypesshow*/ ctx[0];
    	}

    	const modalwrongtypes = new ModalWrongTypes({
    			props: modalwrongtypes_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(modalwrongtypes, "show", modalwrongtypes_show_binding));

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "ComputeFlow";
    			t1 = space();
    			div2 = element("div");
    			create_component(navbar.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			div4 = element("div");
    			create_component(appredoundosave.$$.fragment);
    			t4 = space();
    			div5 = element("div");
    			create_component(addmodulebar.$$.fragment);
    			t5 = space();
    			div6 = element("div");
    			create_component(appcanvas.$$.fragment);
    			t6 = space();
    			create_component(modalwrongtypes.$$.fragment);
    			attr_dev(h2, "class", "svelte-1f19yrf");
    			add_location(h2, file$n, 78, 12, 2944);
    			set_style(div0, "float", "left");
    			set_style(div0, "padding-left", "50px");
    			attr_dev(div0, "class", "svelte-1f19yrf");
    			add_location(div0, file$n, 77, 8, 2885);
    			attr_dev(div1, "class", "grid-item title svelte-1f19yrf");
    			add_location(div1, file$n, 76, 4, 2825);
    			attr_dev(div2, "class", "grid-item navbar svelte-1f19yrf");
    			add_location(div2, file$n, 81, 4, 3000);
    			attr_dev(div3, "class", "grid-item zoom svelte-1f19yrf");
    			add_location(div3, file$n, 89, 4, 3335);
    			attr_dev(div4, "class", "grid-item redoundo svelte-1f19yrf");
    			add_location(div4, file$n, 91, 4, 3381);
    			attr_dev(div5, "class", "grid-item AddModule svelte-1f19yrf");
    			add_location(div5, file$n, 100, 4, 3723);
    			attr_dev(div6, "class", "grid-item canvas svelte-1f19yrf");
    			add_location(div6, file$n, 107, 4, 3890);
    			attr_dev(div7, "class", "grid-container svelte-1f19yrf");
    			add_location(div7, file$n, 75, 0, 2791);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			/*div1_binding*/ ctx[26](div1);
    			append_dev(div7, t1);
    			append_dev(div7, div2);
    			mount_component(navbar, div2, null);
    			/*div2_binding*/ ctx[27](div2);
    			append_dev(div7, t2);
    			append_dev(div7, div3);
    			append_dev(div7, t3);
    			append_dev(div7, div4);
    			mount_component(appredoundosave, div4, null);
    			append_dev(div7, t4);
    			append_dev(div7, div5);
    			mount_component(addmodulebar, div5, null);
    			/*div5_binding*/ ctx[28](div5);
    			append_dev(div7, t5);
    			append_dev(div7, div6);
    			mount_component(appcanvas, div6, null);
    			/*div6_binding*/ ctx[30](div6);
    			insert_dev(target, t6, anchor);
    			mount_component(modalwrongtypes, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const navbar_changes = {};
    			if (dirty[0] & /*ProjectName*/ 2) navbar_changes.ProjectName = /*ProjectName*/ ctx[1];
    			navbar.$set(navbar_changes);
    			const appredoundosave_changes = {};
    			if (dirty[0] & /*ProjectName*/ 2) appredoundosave_changes.ProjectName = /*ProjectName*/ ctx[1];
    			if (dirty[0] & /*ProjectPath*/ 4) appredoundosave_changes.ProjectPath = /*ProjectPath*/ ctx[2];
    			appredoundosave.$set(appredoundosave_changes);
    			const appcanvas_changes = {};
    			if (dirty[0] & /*left*/ 256) appcanvas_changes.left = /*left*/ ctx[8];
    			if (dirty[0] & /*top*/ 128) appcanvas_changes.top = /*top*/ ctx[7];
    			if (dirty[0] & /*ProjectName*/ 2) appcanvas_changes.ProjectName = /*ProjectName*/ ctx[1];
    			appcanvas.$set(appcanvas_changes);
    			const modalwrongtypes_changes = {};

    			if (!updating_show && dirty[0] & /*ModalWrongTypesshow*/ 1) {
    				updating_show = true;
    				modalwrongtypes_changes.show = /*ModalWrongTypesshow*/ ctx[0];
    				add_flush_callback(() => updating_show = false);
    			}

    			modalwrongtypes.$set(modalwrongtypes_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(appredoundosave.$$.fragment, local);
    			transition_in(addmodulebar.$$.fragment, local);
    			transition_in(appcanvas.$$.fragment, local);
    			transition_in(modalwrongtypes.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(appredoundosave.$$.fragment, local);
    			transition_out(addmodulebar.$$.fragment, local);
    			transition_out(appcanvas.$$.fragment, local);
    			transition_out(modalwrongtypes.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			/*div1_binding*/ ctx[26](null);
    			destroy_component(navbar);
    			/*div2_binding*/ ctx[27](null);
    			destroy_component(appredoundosave);
    			destroy_component(addmodulebar);
    			/*div5_binding*/ ctx[28](null);
    			/*appcanvas_binding*/ ctx[29](null);
    			destroy_component(appcanvas);
    			/*div6_binding*/ ctx[30](null);
    			if (detaching) detach_dev(t6);
    			destroy_component(modalwrongtypes, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let ModalWrongTypesshow = false;

    	const handleWrongTypes = e => {
    		$$invalidate(0, ModalWrongTypesshow = true);
    	};

    	var fs = require("fs");
    	var dir = "../MyFlowProjects";
    	let ProjectName;
    	let ProjectPath;
    	let myAppCanvas;
    	let myLoadProjectBar;
    	let myNavBar;
    	let myAddModule;
    	let canvasArea;
    	let ModalAlertshow = false;
    	let ModalAlertError = false;
    	let Alertmessage;

    	const handleSaveProject = e => {
    		myAppCanvas.saveProject(ProjectPath);
    	};

    	const handleAddModule = e => {
    		let TemplateModule = e.detail.module;
    		let ModuleToBeAdded = new Module(TemplateModule.name);

    		for (let i = 0; i < TemplateModule.listInputs.length; i++) {
    			let PortToBeAdded = new Port(TemplateModule.listInputs[i].isInput, TemplateModule.listInputs[i].varType, TemplateModule.listInputs[i].varName);
    			ModuleToBeAdded.inputList.push(PortToBeAdded);
    		}

    		for (let i = 0; i < TemplateModule.listOutputs.length; i++) {
    			let PortToBeAdded = new Port(TemplateModule.listOutputs[i].isInput, TemplateModule.listOutputs[i].varType, TemplateModule.listOutputs[i].varName);
    			ModuleToBeAdded.outputList.push(PortToBeAdded);
    		}

    		ModuleToBeAdded.functionId = TemplateModule.functionId;
    		ModuleToBeAdded.name = TemplateModule.name;
    		ModuleToBeAdded.listVariables = TemplateModule.listVariables;
    		myAppCanvas.addXModule(ModuleToBeAdded);
    	};

    	const handleNewProject = e => {
    		myAppCanvas.newProject();
    	};

    	const handleUndo = e => {
    		myAppCanvas.undo();
    	};

    	const handleRedo = e => {
    		myAppCanvas.redo();
    	};

    	const handleProjectNameNotDefined = e => {
    		myAppCanvas.trySaveProjectToFile();
    	};

    	const handleTrytoSaveProject = e => {
    		myAppCanvas.trySaveProjectToFile();
    	};

    	const handleTryToLoadProject = e => {
    		myAppCanvas.tryToLoadProject();
    	};

    	const handleNewProjectInitiated = e => {
    		$$invalidate(1, ProjectName = undefined);
    		$$invalidate(2, ProjectPath = undefined);
    	};

    	const handleFileWasLoadedCorrectly = e => {
    		$$invalidate(1, ProjectName = e.detail.ProjectName.ProjectName);
    		$$invalidate(2, ProjectPath = e.detail.ProjectPath.ProjectPath);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, myNavBar = $$value);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(4, myNavBar = $$value);
    		});
    	}

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, myAddModule = $$value);
    		});
    	}

    	function appcanvas_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, myAppCanvas = $$value);
    		});
    	}

    	function div6_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(6, canvasArea = $$value);
    		});
    	}

    	function modalwrongtypes_show_binding(value) {
    		ModalWrongTypesshow = value;
    		$$invalidate(0, ModalWrongTypesshow);
    	}

    	$$self.$capture_state = () => ({
    		AppCanvas,
    		onMount,
    		Module,
    		Port,
    		Connection,
    		Chart,
    		Button,
    		Navbar,
    		AddModuleBar,
    		AppRedoUndoSave,
    		ChartHistory,
    		ModalWrongTypes,
    		ModalAlert,
    		ModalWrongTypesshow,
    		handleWrongTypes,
    		fs,
    		dir,
    		ProjectName,
    		ProjectPath,
    		myAppCanvas,
    		myLoadProjectBar,
    		myNavBar,
    		myAddModule,
    		canvasArea,
    		ModalAlertshow,
    		ModalAlertError,
    		Alertmessage,
    		handleSaveProject,
    		handleAddModule,
    		handleNewProject,
    		handleUndo,
    		handleRedo,
    		handleProjectNameNotDefined,
    		handleTrytoSaveProject,
    		handleTryToLoadProject,
    		handleNewProjectInitiated,
    		handleFileWasLoadedCorrectly,
    		top,
    		left
    	});

    	$$self.$inject_state = $$props => {
    		if ("ModalWrongTypesshow" in $$props) $$invalidate(0, ModalWrongTypesshow = $$props.ModalWrongTypesshow);
    		if ("fs" in $$props) fs = $$props.fs;
    		if ("dir" in $$props) dir = $$props.dir;
    		if ("ProjectName" in $$props) $$invalidate(1, ProjectName = $$props.ProjectName);
    		if ("ProjectPath" in $$props) $$invalidate(2, ProjectPath = $$props.ProjectPath);
    		if ("myAppCanvas" in $$props) $$invalidate(3, myAppCanvas = $$props.myAppCanvas);
    		if ("myLoadProjectBar" in $$props) myLoadProjectBar = $$props.myLoadProjectBar;
    		if ("myNavBar" in $$props) $$invalidate(4, myNavBar = $$props.myNavBar);
    		if ("myAddModule" in $$props) $$invalidate(5, myAddModule = $$props.myAddModule);
    		if ("canvasArea" in $$props) $$invalidate(6, canvasArea = $$props.canvasArea);
    		if ("ModalAlertshow" in $$props) ModalAlertshow = $$props.ModalAlertshow;
    		if ("ModalAlertError" in $$props) ModalAlertError = $$props.ModalAlertError;
    		if ("Alertmessage" in $$props) Alertmessage = $$props.Alertmessage;
    		if ("top" in $$props) $$invalidate(7, top = $$props.top);
    		if ("left" in $$props) $$invalidate(8, left = $$props.left);
    	};

    	let top;
    	let left;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*myNavBar*/ 16) {
    			//needed to know the size of the navbar
    			 $$invalidate(7, top = myNavBar ? myNavBar.getBoundingClientRect().bottom : 0);
    		}

    		if ($$self.$$.dirty[0] & /*myAddModule*/ 32) {
    			 $$invalidate(8, left = myAddModule
    			? myAddModule.getBoundingClientRect().right
    			: 0);
    		}
    	};

    	return [
    		ModalWrongTypesshow,
    		ProjectName,
    		ProjectPath,
    		myAppCanvas,
    		myNavBar,
    		myAddModule,
    		canvasArea,
    		top,
    		left,
    		handleWrongTypes,
    		handleSaveProject,
    		handleAddModule,
    		handleNewProject,
    		handleUndo,
    		handleRedo,
    		handleProjectNameNotDefined,
    		handleTrytoSaveProject,
    		handleTryToLoadProject,
    		handleNewProjectInitiated,
    		handleFileWasLoadedCorrectly,
    		fs,
    		dir,
    		myLoadProjectBar,
    		ModalAlertshow,
    		ModalAlertError,
    		Alertmessage,
    		div1_binding,
    		div2_binding,
    		div5_binding,
    		appcanvas_binding,
    		div6_binding,
    		modalwrongtypes_show_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$o, create_fragment$o, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$o.name
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
