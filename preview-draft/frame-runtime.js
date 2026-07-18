(function () {
  'use strict';
  const de = 'modulepreload',
    fe = function (e) {
      return '/' + e;
    },
    pe = {},
    J = function (t, r, u) {
      let o = Promise.resolve();
      function i(d) {
        const c = new Event('vite:preloadError', { cancelable: !0 });
        if (((c.payload = d), window.dispatchEvent(c), !c.defaultPrevented))
          throw d;
      }
      return o.then((d) => {
        for (const c of d || []) c.status === 'rejected' && i(c.reason);
        return t().catch(i);
      });
    },
    V = ['light', 'dark', 'system'];
  function Y(e) {
    if (e === null || typeof e != 'object') return !1;
    const t = e.__frame_init;
    return t !== null && typeof t == 'object';
  }
  function Q(e) {
    return e !== null && typeof e == 'object' && e.__frame_size_poke === !0;
  }
  function X(e) {
    if (e === null || typeof e != 'object') return !1;
    const t = e.__frame_theme;
    if (t === null || typeof t != 'object') return !1;
    const r = t.theme;
    return typeof r == 'string' && V.includes(r);
  }
  function Z(e) {
    try {
      typeof reportError == 'function'
        ? reportError(e)
        : setTimeout(() => {
            throw e;
          }, 0);
    } catch {}
  }
  function D(e) {
    if (window === top || (e.type === 'auxclick' && e.button !== 1)) return;
    const t = e.composedPath ? e.composedPath() : [e.target];
    let r = null;
    for (let d = 0; d < t.length; d++) {
      const c = t[d];
      if (c && c.matches && c.matches('a[href],area[href]')) {
        r = c;
        break;
      }
    }
    if (
      (!r &&
        e.target &&
        e.target.closest &&
        (r = e.target.closest('a[href],area[href]')),
      !r)
    )
      return;
    const u = r.getAttribute('href');
    if (!u) return;
    let o, i;
    try {
      ((o = new URL(u, document.baseURI)),
        (i = new URL(document.baseURI).origin));
    } catch {
      return;
    }
    (o.protocol === 'http:' || o.protocol === 'https:') &&
      o.origin !== i &&
      (e.preventDefault(),
      parent.postMessage({ __frame_nav: !0, url: o.href }, '*'));
  }
  const U = {};
  function T(e) {
    if (window === top) return;
    const t = Date.now();
    t - (U[e] || 0) < 500 ||
      ((U[e] = t), parent.postMessage({ __frame_engaged: !0, kind: e }, '*'));
  }
  const ee = 2e3,
    F = ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'];
  let H = 0;
  function te(e) {
    e.isTrusted && (H = Date.now());
  }
  function ne() {
    (addEventListener('click', D, !0), addEventListener('auxclick', D, !0));
  }
  function re() {
    for (let e = 0; e < F.length; e++)
      addEventListener(F[e], te, { capture: !0, passive: !0 });
    (addEventListener(
      'scroll',
      (e) => {
        e.isTrusted && Date.now() - H < ee && T('scroll');
      },
      { capture: !0, passive: !0 },
    ),
      addEventListener(
        'pointermove',
        (e) => {
          e.isTrusted && T('pointer');
        },
        { capture: !0, passive: !0 },
      ),
      addEventListener(
        'click',
        (e) => {
          e.isTrusted && T('click');
        },
        { capture: !0, passive: !0 },
      ));
  }
  function oe(e, t, r) {
    const u = [...t.values()].filter((o) =>
      o.targets.some((i) => i.startsWith(e + '.')),
    );
    return {
      wrap(o, i) {
        const d = `${e}.${o}`,
          c = u.filter((s) => s.targets.includes(d));
        return c.length === 0
          ? (...s) => {
              try {
                return i(...s);
              } catch (p) {
                return Promise.reject(p);
              }
            }
          : (...s) => {
              let p = s;
              for (const a of c) {
                const l = a.module.parameters;
                if (l)
                  try {
                    p = l(p);
                  } catch {
                    return Promise.reject({
                      code: 'transform_error',
                      id: a.id,
                      scope: e,
                      message: 'parameters transform failed',
                    });
                  }
              }
              let g;
              try {
                g = i(...p);
              } catch (a) {
                g = Promise.reject(a);
              }
              return g.then(
                (a) => {
                  for (let l = c.length - 1; l >= 0; l--) {
                    const m = c[l],
                      f = m.module.returns;
                    if (f)
                      try {
                        a = f(a);
                      } catch {
                        return (r({ id: m.id, scope: e, leg: 'returns' }), a);
                      }
                  }
                  return a;
                },
                (a) => {
                  for (let l = c.length - 1; l >= 0; l--) {
                    const m = c[l],
                      f = m.module.throws;
                    if (f)
                      try {
                        a = f(a);
                      } catch {
                        return (
                          r({ id: m.id, scope: e, leg: 'throws' }),
                          Promise.reject(a)
                        );
                      }
                  }
                  return Promise.reject(a);
                },
              );
            };
      },
    };
  }
  function se(e, t, r, u = () => {}) {
    const o = new Set(e.changes ?? []),
      i = new Map();
    for (const d of o) {
      const c = t[d];
      c && i.set(d, c);
    }
    return {
      contract: e.contract,
      changes: o,
      flags: new Set(e.flags ?? []),
      capabilities: e.capabilities ?? {},
      capBudgets: e.capBudgets ?? {},
      transforms: i,
      shellOrigin: r.shellOrigin,
      mount: r.mount,
      pipe: (d) => oe(d, i, u),
    };
  }
  (function () {
    const e = Object.defineProperty,
      t = globalThis,
      r = [
        'RTCPeerConnection',
        'webkitRTCPeerConnection',
        'RTCDataChannel',
        'RTCIceCandidate',
        'RTCSessionDescription',
        'RTCRtpSender',
        'RTCRtpReceiver',
      ];
    let u = 0;
    for (let o = 0; o < r.length; o++) {
      const i = r[o];
      try {
        e(t, i, { value: void 0, writable: !1, configurable: !1 });
      } catch {
        try {
          delete t[i];
        } catch {}
        try {
          e(t, i, { value: void 0, writable: !1, configurable: !0 });
        } catch {}
      }
      typeof t[i] == 'function' && u++;
    }
    if (u && window !== top)
      try {
        parent.postMessage({ __frame_rtc_lockdown_failed: u }, '*');
      } catch {}
  })();
  const ie = 1e4,
    ae = Object.freeze([
      ...(window.__FRAME_PREAMBLE?.origins ?? [
        'https://claude.ai',
        'https://preview.claude.ai',
      ]),
    ]);
  function ce(e) {
    for (const t of ae)
      if (t.endsWith(':*'))
        try {
          const r = new URL(e);
          if (`${r.protocol}//${r.hostname}:*` === t) return !0;
        } catch {}
      else if (e === t) return !0;
    return !1;
  }
  const j = Object.freeze({ ...window.__FRAME_PREAMBLE?.capabilities }),
    k = window.__FRAME_PREAMBLE?.transforms,
    C = window.__FRAME_PREAMBLE?.comments,
    N = window.__FRAME_PREAMBLE?.translate,
    O = /^[\w.-]+\.js$/,
    le = /^[a-z][a-z0-9_-]{0,63}$/;
  let W = null,
    P = null;
  function I(e, t, r) {
    try {
      Object.defineProperty(e, t, {
        value: r,
        writable: !1,
        configurable: !1,
        enumerable: !0,
      });
    } catch {
      try {
        Object.defineProperty(e, t, {
          value: r,
          writable: !1,
          configurable: !0,
          enumerable: !0,
        });
      } catch {}
    }
  }
  let $ = !1;
  function x(e) {
    const t = document.documentElement;
    e === 'light' || e === 'dark'
      ? ((t.dataset.theme = e), (t.style.colorScheme = e), ($ = !0))
      : $ && (delete t.dataset.theme, (t.style.colorScheme = ''), ($ = !1));
  }
  const M = { mcp: { watchTool: { handlerArg: 3 } } },
    S = new Map();
  function ue(e, t) {
    const r = S.get(e);
    if (!r) return;
    (Object.assign(r.impl, t),
      (r.impl.__settled = () =>
        Promise.reject({
          code: 'capability_removed',
          message: `${e}: method not in this runtime`,
        })));
    const u = r.queue;
    r.queue = [];
    for (const o of u) {
      const i = t[o.method];
      if (i)
        if (M[e]?.[o.method])
          try {
            o.resolve(i(...o.args));
          } catch {
            A(o, M[e][o.method].handlerArg, {
              code: 'transform_error',
              message: `${e}.${o.method} rejected its arguments`,
            });
          }
        else i(...o.args).then(o.resolve, o.reject);
      else {
        const d = {
            code: 'capability_removed',
            message: `${e}.${o.method} is not in this runtime`,
          },
          c = M[e]?.[o.method];
        if (c) {
          A(o, c.handlerArg, d);
          continue;
        }
        o.reject(d);
      }
    }
  }
  function q(e, t) {
    const r = S.get(e);
    if (!r) return;
    r.impl.__settled = () => Promise.reject(t);
    const u = r.queue;
    r.queue = [];
    for (const o of u) {
      const i = M[e]?.[o.method];
      if (i) {
        A(o, i.handlerArg, t);
        continue;
      }
      o.reject(t);
    }
  }
  function A(e, t, r) {
    if (e.syncState?.dead) return;
    const u = e.args[t];
    typeof u == 'function' &&
      queueMicrotask(() => {
        if (!e.syncState?.dead)
          try {
            u({ type: 'error', error: r });
          } catch (o) {
            Z(o);
          }
      });
  }
  const z = Object.getOwnPropertyDescriptor(window, 'claude');
  if (window !== top && !(z && z.writable === !1)) {
    (ne(), re());
    const e = z?.value ?? {};
    I(window, 'claude', e);
    const t = (s) => {
      const p = { impl: Object.create(null), queue: [] };
      S.set(s, p);
      const g = new Proxy(p.impl, {
        get: (a, l) => {
          if (
            typeof l != 'string' ||
            l === 'then' ||
            l === 'toJSON' ||
            l === 'valueOf'
          )
            return;
          if (l === 'toString') return Object.prototype.toString;
          const m = M[s]?.[l];
          return m
            ? (...f) => {
                if (typeof f[m.handlerArg] != 'function')
                  throw new TypeError(`${s}.${l} requires a handler function`);
                const b = a[l];
                if (b) return b(...f);
                if (a.__settled) {
                  const w = { dead: !1 },
                    v = { args: [...f], syncState: w };
                  return (
                    a.__settled().catch((R) => A(v, m.handlerArg, R)),
                    () => {
                      w.dead = !0;
                    }
                  );
                }
                let h = null;
                const _ = { dead: !1 };
                return (
                  p.queue.push({
                    method: l,
                    args: f,
                    resolve: (w) => {
                      ((h = typeof w == 'function' ? w : null),
                        _.dead && h?.());
                    },
                    reject: () => {},
                    syncState: _,
                  }),
                  () => {
                    ((_.dead = !0), h?.());
                  }
                );
              }
            : (...f) => {
                const b = a[l] ?? a.__settled;
                return b
                  ? b(...f)
                  : new Promise((h, _) => {
                      p.queue.push({
                        method: l,
                        args: f,
                        resolve: h,
                        reject: _,
                      });
                    });
              };
        },
        set: () => !1,
      });
      I(e, s, g);
    };
    for (const s of Object.keys(j)) {
      if (e[s] !== void 0) {
        I(e, s, e[s]);
        continue;
      }
      t(s);
    }
    let r = null,
      u = null,
      o = 0;
    const i = (s) => {
      s.source !== parent ||
        !ce(s.origin) ||
        (Y(s.data) &&
          ((r = s.data.__frame_init),
          (P = s.origin),
          removeEventListener('message', i),
          clearTimeout(o),
          u?.()));
    };
    (addEventListener('message', i),
      parent.postMessage({ __frame_connect: !0 }, '*'));
    const d = new Promise((s) => {
        ((u = s),
          (o = setTimeout(() => {
            (removeEventListener('message', i), s());
          }, ie)));
      }),
      c =
        document.readyState === 'loading'
          ? new Promise((s) =>
              document.addEventListener('DOMContentLoaded', () => s(), {
                once: !0,
              }),
            )
          : Promise.resolve();
    d.then(async () => {
      if (!r || !P) {
        for (const n of S.keys())
          q(n, {
            code: 'not_granted',
            message:
              'frame initialization did not arrive - capability unavailable',
          });
        return;
      }
      x(r.theme);
      const s = P;
      let p = !1,
        g = !1;
      addEventListener('message', (n) => {
        if (n.source !== parent || n.origin !== s) return;
        X(n.data) && x(n.data.__frame_theme.theme);
        const y = n.data?.__fc_mode;
        y &&
          typeof y == 'object' &&
          !p &&
          C &&
          O.test(C) &&
          ((p = !0),
          a(C)
            .then((B) => B.install?.(s, y.on === !0))
            .catch(() => {}));
        const E = n.data?.__ft_cmd;
        E &&
          typeof E == 'object' &&
          !g &&
          N &&
          O.test(N) &&
          ((g = !0),
          a(N)
            .then((B) => B.install?.(s, E))
            .catch(() => {}));
      });
      const a = (n) => J(() => import('/_runtime/' + n), void 0),
        l = Object.keys(r.capabilities ?? {});
      for (const n of l)
        Object.hasOwn(j, n) ||
          (le.test(n) &&
            e[n] === void 0 &&
            (t(n),
            q(n, {
              code: 'capability_disabled',
              message: 'capability not in this runtime generation',
            })));
      const m = l
          .filter((n) => Object.hasOwn(j, n))
          .map((n) => [n, j[n]])
          .filter((n) => typeof n[1] == 'string' && O.test(n[1])),
        [f, ...b] = await Promise.allSettled([
          k && O.test(k) ? a(k) : Promise.resolve({}),
          ...m.map(([, n]) => a(n)),
        ]),
        h = P;
      W = se(
        r,
        (f.status === 'fulfilled' && f.value?.TRANSFORMS) || {},
        { shellOrigin: h, mount: ue },
        (n) => parent.postMessage({ __frame_cap_telemetry: n }, h),
      );
      const _ = (n) =>
          parent.postMessage(
            { __frame_cap_telemetry: { kind: 'cap-load-error', cap: n } },
            h,
          ),
        w = W;
      b.forEach((n, y) => {
        const E = m[y][0];
        if (n.status !== 'fulfilled') {
          _(E);
          return;
        }
        try {
          n.value?.install?.(w);
        } catch {
          _(E);
        }
      });
      for (const [n, y] of S)
        (y.queue.length === 0 && Object.keys(y.impl).length > 0) ||
          q(n, {
            code: l.includes(n) ? 'capability_disabled' : 'not_granted',
            message: 'capability not available in this session',
          });
      (await c, parent.postMessage({ __frame_ready: !0 }, P));
      let v = -1,
        R = 0;
      const K = () => {
          R = 0;
          const n = Math.max(
            document.documentElement.scrollHeight,
            document.body ? document.body.scrollHeight : 0,
          );
          n !== v &&
            ((v = n), parent.postMessage({ __frame_size: !0, h: n }, h));
        },
        L = () => {
          R || (R = setTimeout(K, 200));
        },
        G = new ResizeObserver(L);
      (G.observe(document.documentElement),
        document.body && G.observe(document.body),
        document.addEventListener('load', L, !0),
        document.fonts?.ready.then(L, () => {}),
        addEventListener('beforeprint', () => {
          ((v = -1), K());
        }),
        L(),
        addEventListener('message', (n) => {
          n.source !== parent ||
            n.origin !== h ||
            (Q(n.data) && ((v = -1), L()));
        }));
    });
  }
})();
