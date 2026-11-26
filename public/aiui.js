(function (global) {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────────────────────
  const _config = {
    apiKey: '',
    model: 'claude-sonnet-4-6',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    provider: 'claude',   // 'claude' | 'groq'
    mode: 'direct',       // 'direct' | 'server'
    serverUrl: 'http://localhost:8000',
  };

  const PROVIDER_DEFAULTS = {
    claude: {
      apiUrl: 'https://api.anthropic.com/v1/messages',
      model:  'claude-sonnet-4-6',
    },
    groq: {
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model:  'llama-3.3-70b-versatile',
    },
  };

  // ── DIFF REGISTRY ─────────────────────────────────────────────────────────
  const _diff = [];
  let _diffSeq = 0;

  const DiffRegistry = {
    append(action, target, params, status, intent) {
      _diff.push({
        seq: ++_diffSeq,
        timestamp: new Date().toISOString(),
        action,
        target: target || null,
        params,
        status,
        intent: intent || '',
      });
    },
    get()     { return [..._diff]; },
    clear()   { _diff.length = 0; _diffSeq = 0; },
    last()    { return _diff[_diff.length - 1] || null; },
    export()  { return JSON.stringify(_diff, null, 2); },
  };

  // ── OVERLAY SYSTEM ────────────────────────────────────────────────────────
  // Highlights are applied DIRECTLY to the element (no overlay div) so
  // position is always exact regardless of scroll, transforms, or zoom.
  // Tooltips use absolute positioning anchored to the document, not viewport.

  const _highlighted = [];   // { el, origOutline, origBoxShadow, origTransition }
  const _tooltipEls  = [];   // actual tooltip divs to remove on clearAll

  const Overlay = {
    highlight(el, color = '#6366f1') {
      this._ensureKeyframes();
      // Save original styles so clearAll can restore
      _highlighted.push({
        el,
        origOutline:    el.style.outline,
        origBoxShadow:  el.style.boxShadow,
        origTransition: el.style.transition,
      });
      el.style.transition  = 'outline 0.15s, box-shadow 0.15s';
      el.style.outline     = `2px solid ${color}`;
      el.style.boxShadow   = `0 0 0 4px ${color}33, 0 0 12px ${color}55`;
      el.setAttribute('data-aiui-highlighted', '');
    },

    highlightGroup(groupId) {
      document.querySelectorAll(`[data-aiui-group="${groupId}"]`).forEach(el => {
        this.highlight(el);
      });
    },

    tooltip(el, text) {
      this._ensureKeyframes();
      // Use absolute positioning relative to document so scroll doesn't break it
      const rect   = el.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      const absTop  = rect.top  + scrollY;
      const absLeft = rect.left + scrollX;

      const div = document.createElement('div');
      div.setAttribute('data-aiui-tooltip', '');
      div.style.cssText = `
        position:absolute;
        top:${absTop - 40}px;
        left:${absLeft}px;
        background:#1e1b4b;color:#fff;font-size:12px;
        font-family:system-ui,sans-serif;padding:5px 11px;
        border-radius:6px;pointer-events:none;z-index:2147483647;
        max-width:260px;box-shadow:0 4px 14px #0005;white-space:nowrap;
        animation:aiui-fadein 0.15s ease;
      `;
      div.textContent = text;

      // arrow
      const arrow = document.createElement('div');
      arrow.style.cssText = `
        position:absolute;bottom:-5px;left:12px;
        width:10px;height:10px;background:#1e1b4b;
        transform:rotate(45deg);border-radius:1px;
      `;
      div.appendChild(arrow);
      document.body.appendChild(div);
      _tooltipEls.push(div);
    },

    clearAll() {
      // Remove tooltips
      document.querySelectorAll('[data-aiui-tooltip]').forEach(el => el.remove());
      _tooltipEls.length = 0;
      // Restore element styles
      _highlighted.forEach(({ el, origOutline, origBoxShadow, origTransition }) => {
        el.style.outline    = origOutline;
        el.style.boxShadow  = origBoxShadow;
        el.style.transition = origTransition;
        el.removeAttribute('data-aiui-highlighted');
      });
      _highlighted.length = 0;
    },

    _ensureKeyframes() {
      if (document.getElementById('aiui-kf')) return;
      const s = document.createElement('style');
      s.id = 'aiui-kf';
      s.textContent = `
        @keyframes aiui-pulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes aiui-fadein{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes aiui-shuffle{0%,100%{opacity:1}50%{opacity:.7}}
      `;
      document.head.appendChild(s);
    },
  };

  // ── ACTION REGISTRY ───────────────────────────────────────────────────────
  const _actions = {};

  const ActionRegistry = {
    register(name, fn) { _actions[name] = fn; },
    get(name)          { return _actions[name]; },
    list()             { return Object.keys(_actions); },

    async execute(action, target, params = {}, intent = '') {
      const handler = _actions[action];
      if (!handler) {
        DiffRegistry.append(action, target, params, 'error:unregistered', intent);
        throw new Error(`Action "${action}" is not registered`);
      }
      try {
        await handler(target, params);
        DiffRegistry.append(action, target, params, 'success', intent);
      } catch (err) {
        DiffRegistry.append(action, target, params, `error:${err.message}`, intent);
        throw err;
      }
    },
  };

  // ── ID REGISTRY (SCAN SNAPSHOT) ──────────────────────────────────────────
  const IdRegistry = {
    _version: 0,
    _ids: new Map(),

    beginScan() {
      this._version += 1;
      this._ids.clear();
      return this._version;
    },

    currentVersion() {
      return this._version;
    },

    add(meta) {
      this._ids.set(meta.id, meta);
    },

    resolve(target) {
      const meta = this._ids.get(target);
      if (!meta) return null;

      let el = document.querySelector(`[data-aiui-id="${CSS.escape(target)}"]`);
      if (!el && meta.domId) el = document.getElementById(meta.domId);
      if (!el && meta.selector) el = document.querySelector(meta.selector);
      if (!el) el = this._findByFingerprint(meta);

      if (el) {
        el.setAttribute('data-aiui-id', target);
        el.setAttribute('data-aiui-group', meta.groupId);
      }
      return el;
    },

    _findByFingerprint(meta) {
      const candidates = document.querySelectorAll(meta.tag);
      for (const node of candidates) {
        if (!isVisible(node)) continue;
        const label = getLabel(node);
        const aria = (node.getAttribute('aria-label') || '').trim();
        const name = (node.getAttribute('name') || '').trim();
        const placeholder = (node.getAttribute('placeholder') || '').trim();
        if (
          (meta.label && label === meta.label) ||
          (meta.ariaLabel && aria === meta.ariaLabel) ||
          (meta.name && name === meta.name) ||
          (meta.placeholder && placeholder === meta.placeholder)
        ) return node;
      }
      return null;
    },
  };

  // ── ELEMENT RESOLVER ──────────────────────────────────────────────────────
  function resolveEl(target) {
    return (
      IdRegistry.resolve(target) ||
      document.querySelector(`[data-aiui-id="${target}"]`) ||
      document.getElementById(target) ||
      document.querySelector(`[data-aiui-group="${target}"]`)
    );
  }

  // ── BUILT-IN ACTIONS ──────────────────────────────────────────────────────
  ActionRegistry.register('highlight', (target, { color } = {}) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    Overlay.highlight(el, color);
  });

  ActionRegistry.register('highlight_group', (target) => {
    Overlay.highlightGroup(target);
  });

  ActionRegistry.register('tooltip', (target, { text = '' } = {}) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    Overlay.tooltip(el, text);
  });

  ActionRegistry.register('fill', (target, { value = '' } = {}) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);

    const proto  = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._- ';
    const TOTAL_FRAMES = 18;
    const SETTLE_AT    = 12;  // frame at which characters start locking in

    return new Promise(resolve => {
      let frame = 0;
      // highlight the field during animation
      el.style.outline   = '2px solid #6366f1';
      el.style.boxShadow = '0 0 0 3px #6366f133';

      const tick = () => {
        if (frame >= TOTAL_FRAMES) {
          // final: set real value
          if (setter) setter.call(el, value); else el.value = value;
          el.dispatchEvent(new Event('input',  { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          // fade highlight out
          setTimeout(() => {
            el.style.outline   = '';
            el.style.boxShadow = '';
          }, 600);
          resolve();
          return;
        }

        // build a shuffled version of the target value
        const lockedChars = Math.floor(value.length * Math.max(0, (frame - SETTLE_AT) / (TOTAL_FRAMES - SETTLE_AT)));
        const shuffled = value.split('').map((ch, i) => {
          if (i < lockedChars) return ch;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('');

        if (setter) setter.call(el, shuffled); else el.value = shuffled;
        el.dispatchEvent(new Event('input', { bubbles: true }));

        frame++;
        setTimeout(tick, 40);
      };

      tick();
    });
  });

  ActionRegistry.register('click', (target) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    el.click();
  });

  ActionRegistry.register('redirect', (_, { url } = {}) => {
    if (!url) throw new Error('redirect requires a url param');
    window.location.href = url;
  });

  ActionRegistry.register('scroll_to', (target) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  ActionRegistry.register('clear', (target) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    el.value = '';
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  ActionRegistry.register('select', (target, { value } = {}) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    const opt = Array.from(el.options).find(o => o.value === value || o.text === value);
    if (!opt) throw new Error(`Option "${value}" not found in <select>`);
    el.value = opt.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  ActionRegistry.register('focus', (target) => {
    const el = resolveEl(target);
    if (!el) throw new Error(`Element not found: ${target}`);
    el.focus();
  });

  ActionRegistry.register('wait', (_, { ms = 500 } = {}) => {
    return new Promise(r => setTimeout(r, ms));
  });

  // ── DOM EXTRACTOR ─────────────────────────────────────────────────────────
  const INTERACTIVE = new Set(['button','input','textarea','select','a']);

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  function getLabel(el) {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return lbl.innerText.trim();
    }
    if (el.placeholder)               return el.placeholder;
    if (el.innerText?.trim())          return el.innerText.trim().slice(0, 80);
    if (el.title)                      return el.title;
    if (el.value && el.tagName === 'BUTTON') return el.value;
    return '';
  }

  function extractElement(el, groupId, counters) {
    const tag   = el.tagName.toLowerCase();
    const idx   = counters[tag] = (counters[tag] ?? 0);
    counters[tag]++;
    const id    = `${groupId}_${tag}_${idx}`;
    el.setAttribute('data-aiui-id', id);
    el.setAttribute('data-aiui-group', groupId);
    const label = getLabel(el);
    const domId = el.getAttribute('id') || '';
    IdRegistry.add({
      id,
      groupId,
      tag,
      domId,
      selector: domId ? `#${CSS.escape(domId)}` : '',
      label,
      ariaLabel: (el.getAttribute('aria-label') || '').trim(),
      name: (el.getAttribute('name') || '').trim(),
      placeholder: (el.getAttribute('placeholder') || '').trim(),
    });

    const entry = { id, type: tag, label };
    if (tag === 'input' || tag === 'textarea') {
      entry.value = el.value || '';
      if (el.placeholder) entry.placeholder = el.placeholder;
      if (el.type)        entry.inputType   = el.type;
    }
    if (tag === 'select') {
      entry.value   = el.value || '';
      entry.options = Array.from(el.options).map(o => ({
        value: o.value,
        label: o.text.trim(),
        selected: o.selected,
      }));
    }
    return entry;
  }

  function extractGroupElements(rootEl, groupId) {
    const counters = {};
    const elements = [];
    const walker   = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      const tag = node.tagName?.toLowerCase();
      const interactive =
        INTERACTIVE.has(tag) ||
        node.getAttribute('role') === 'button' ||
        (node.getAttribute('tabindex') !== null && node.getAttribute('tabindex') !== '-1');
      if (interactive && isVisible(node)) {
        elements.push(extractElement(node, groupId, counters));
      }
      node = walker.nextNode();
    }
    return elements;
  }

  function groupContextText(rootEl) {
    const parts = [];
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      const t = n.textContent.trim();
      if (t.length > 1) parts.push(t);
      n = walker.nextNode();
    }
    return parts.join(' ').replace(/\s+/g, ' ').slice(0, 300);
  }

  // ── ABSTRACT MAP BUILDER ──────────────────────────────────────────────────
  const GROUP_SELECTORS = [
    { sel: 'form',                                  type: 'form'          },
    { sel: '[role="navigation"],nav',               type: 'navigation'    },
    { sel: '[role="main"],main',                    type: 'main'          },
    { sel: '[role="banner"],header',                type: 'banner'        },
    { sel: '[role="complementary"],aside',          type: 'complementary' },
    { sel: 'section',                               type: 'section'       },
    { sel: 'article',                               type: 'article'       },
    { sel: 'footer',                                type: 'footer'        },
  ];

  let _pageMap = null;

  const MapBuilder = {
    build() {
      IdRegistry.beginScan();
      const groups    = [];
      const seen      = new Set();
      const slugCount = {};

      GROUP_SELECTORS.forEach(({ sel, type }) => {
        document.querySelectorAll(sel).forEach(rootEl => {
          if (seen.has(rootEl)) return;
          seen.add(rootEl);

          const heading  = rootEl.querySelector('h1,h2,h3,h4,legend,caption');
          const rawLabel = (
            heading?.innerText?.trim() ||
            rootEl.getAttribute('aria-label') ||
            rootEl.getAttribute('id') ||
            type
          );
          const slug = rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g,'').slice(0, 32);
          slugCount[slug] = (slugCount[slug] ?? 0);
          const suffix  = slugCount[slug] > 0 ? `_${slugCount[slug]}` : '';
          slugCount[slug]++;
          const groupId = `${type}_${slug}${suffix}`;

          const interactiveCount = rootEl.querySelectorAll(
            'button,input,textarea,select,a,[role="button"]'
          ).length;

          groups.push({
            group_id:      groupId,
            type,
            label:         rawLabel,
            summary:       groupContextText(rootEl).slice(0, 120),
            element_count: interactiveCount,
            _root:         rootEl,
          });
        });
      });

      const headingOutline = Array.from(document.querySelectorAll('h1,h2,h3'))
        .map(h => h.innerText.trim())
        .filter(Boolean)
        .slice(0, 10);

      _pageMap = {
        page: {
          title:           document.title,
          url:             location.href,
          heading_outline: headingOutline,
          groups:          groups.map(({ _root, ...rest }) => rest),
          scan_version:    IdRegistry.currentVersion(),
        },
        _roots: Object.fromEntries(groups.map(g => [g.group_id, g._root])),
      };

      return _pageMap;
    },

    get() { return _pageMap; },
  };

  // ── GROUP IR RESOLVER ─────────────────────────────────────────────────────
  const GroupResolver = {
    resolve(groupId) {
      if (!_pageMap) MapBuilder.build();
      const root = _pageMap._roots[groupId];
      if (!root) throw new Error(`Group not found: ${groupId}`);
      const meta = _pageMap.page.groups.find(g => g.group_id === groupId);
      return {
        group_id: groupId,
        type:     meta?.type || 'unknown',
        label:    meta?.label || groupId,
        context:  meta?.summary || '',
        elements: extractGroupElements(root, groupId),
      };
    },

    resolveMany(ids) {
      return ids.map(id => {
        try { return this.resolve(id); }
        catch { return null; }
      }).filter(Boolean);
    },

    resolveAll() {
      if (!_pageMap) MapBuilder.build();
      return this.resolveMany(_pageMap.page.groups.map(g => g.group_id));
    },
  };

  // ── LLM BRIDGE — DIRECT (Claude API) ─────────────────────────────────────
  async function callClaude(system, userMessage) {
    const res = await fetch(_config.apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key':                              _config.apiKey,
        'anthropic-version':                      '2023-06-01',
        'content-type':                           'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      _config.model,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude API ${res.status}: ${body}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // ── LLM BRIDGE — DIRECT (Groq API, OpenAI-compatible) ────────────────────
  async function callGroq(system, userMessage) {
    const res = await fetch(_config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${_config.apiKey}`,
        'content-type':  'application/json',
      },
      body: JSON.stringify({
        model: _config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0,
        max_tokens:  1024,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq API ${res.status}: ${body}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  function callLLM(system, userMessage) {
    return _config.provider === 'groq'
      ? callGroq(system, userMessage)
      : callClaude(system, userMessage);
  }

  // ── LLM BRIDGE — SERVER (LangGraph agent) ────────────────────────────────
  async function callServer(intent, pageMap, groupIRs) {
    const res = await fetch(`${_config.serverUrl}/run`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ intent, page_map: pageMap.page, group_irs: groupIRs }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Server error ${res.status}: ${body}`);
    }
    const data = await res.json();
    return { actions: data.actions || [], message: data.message || '' };
  }

  // ── MAIN BRIDGE ORCHESTRATOR ──────────────────────────────────────────────
  const LLMBridge = {
    // Returns { actions: [], message: '' }
    async run(intent, onStatus) {
      onStatus?.('Building page map…');
      const map = MapBuilder.build();

      if (_config.mode === 'server') {
        onStatus?.('Resolving all groups…');
        const allIRs = GroupResolver.resolveAll();
        onStatus?.('Sending to agent server…');
        const result = await callServer(intent, map, allIRs);
        result.scanVersion = map.page.scan_version;
        return result;
      }

      // ── direct two-phase LLM call ──
      if (!_config.apiKey) throw new Error('API key not set. Call window.aiUI.init({ apiKey })');

      const mapJson = JSON.stringify({ page: map.page }, null, 2);

      const phase1System = `You are an AI assistant that controls web UI interactions.
The current page abstract map is:
${mapJson}

The user will state their intent. You must identify which group_id(s) contain the relevant elements.
Respond with ONLY valid JSON: { "drill_into": ["group_id_1"] }
No explanation. No markdown. Just the JSON object.`;

      onStatus?.('Phase 1: reading page map…');
      const p1raw = await callLLM(phase1System, intent);
      let drillInto = [];
      try {
        const match = p1raw.match(/\{[\s\S]*\}/);
        drillInto = JSON.parse(match ? match[0] : p1raw).drill_into || [];
      } catch {
        drillInto = map.page.groups.slice(0, 1).map(g => g.group_id);
      }

      onStatus?.(`Phase 2: drilling into [${drillInto.join(', ')}]…`);
      const groupIRs = GroupResolver.resolveMany(drillInto);
      const groupJson = JSON.stringify(groupIRs, null, 2);
      const actionList = ActionRegistry.list().join(', ');

      const phase2System = `You are an AI assistant that controls web UI interactions.
User intent: "${intent}"

Group IR for relevant sections:
${groupJson}

Available actions: ${actionList}

If the intent requires UI actions, respond with ONLY a valid JSON object:
{ "actions": [...], "message": "short human-readable summary of what you did" }

If the intent is a question or non-actionable, respond with:
{ "actions": [], "message": "your answer here" }

No extra explanation outside the JSON.`;

      onStatus?.('Phase 2: generating actions…');
      const p2raw = await callLLM(phase2System, 'Respond now.');
      const match = p2raw.match(/\{[\s\S]*\}/);
      if (!match) return { actions: [], message: p2raw.trim(), scanVersion: map.page.scan_version };
      try {
        const parsed = JSON.parse(match[0]);
        return {
          actions: parsed.actions || [],
          message: parsed.message || '',
          scanVersion: map.page.scan_version,
        };
      } catch {
        return { actions: [], message: p2raw.trim(), scanVersion: map.page.scan_version };
      }
    },
  };

  // ── EXECUTOR ──────────────────────────────────────────────────────────────
  const Executor = {
    async runAll(actions, intent, scanVersion) {
      if (scanVersion && scanVersion !== IdRegistry.currentVersion()) {
        MapBuilder.build();
      }
      for (const { action, target, ...params } of actions) {
        await ActionRegistry.execute(action, target, params, intent);
        await new Promise(r => setTimeout(r, 180));
      }
    },
  };

  // ── FLOATING UI (shadow DOM isolated) ────────────────────────────────────
  const FloatingUI = {
    _host:   null,
    _shadow: null,
    _input:  null,
    _status: null,
    _chat:   null,
    _dbgGroups:  null,
    _dbgActions: null,

    init() {
      if (this._host) return;

      this._host = document.createElement('div');
      this._host.id = 'aiui-root';
      Object.assign(this._host.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        zIndex: '2147483647', fontFamily: 'system-ui,sans-serif',
      });

      this._shadow = this._host.attachShadow({ mode: 'open' });
      this._shadow.innerHTML = FloatingUI._html();
      document.body.appendChild(this._host);

      this._input      = this._shadow.getElementById('i');
      this._status     = this._shadow.getElementById('s');
      this._chat       = this._shadow.getElementById('chat');
      this._dbgGroups  = this._shadow.getElementById('dbg-groups');
      this._dbgActions = this._shadow.getElementById('dbg-actions');

      this._shadow.getElementById('btn').addEventListener('click', () => this._submit());
      this._input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._submit(); }
      });

      // minimize / close
      const body = this._shadow.getElementById('b');
      this._shadow.getElementById('min').addEventListener('click', () => {
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? '' : 'none';
        this._shadow.getElementById('min').textContent = hidden ? '–' : '+';
      });
      this._shadow.getElementById('cls').addEventListener('click', () => {
        this._host.style.display = 'none';
      });

      // debug toggle
      this._shadow.getElementById('dbg-toggle').addEventListener('click', () => {
        const panel = this._shadow.getElementById('dbg-panel');
        const open  = panel.style.display === 'none';
        panel.style.display = open ? '' : 'none';
        this._shadow.getElementById('dbg-toggle').textContent = open ? '▾ Debug' : '▸ Debug';
        if (open) this._refreshDebug();
      });

      // drag
      let drag = false, ox = 0, oy = 0;
      const hdr = this._shadow.getElementById('hdr');
      hdr.addEventListener('mousedown', e => {
        drag = true;
        const rect = this._host.getBoundingClientRect();
        ox = e.clientX - rect.left;
        oy = e.clientY - rect.top;
      });
      document.addEventListener('mousemove', e => {
        if (!drag) return;
        Object.assign(this._host.style, {
          left: `${e.clientX - ox}px`, top: `${e.clientY - oy}px`,
          right: 'auto', bottom: 'auto',
        });
      });
      document.addEventListener('mouseup', () => { drag = false; });
    },

    setStatus(text, type = 'info') {
      if (!this._status) return;
      const c = { info: '#6366f1', error: '#ef4444', success: '#10b981' };
      this._status.style.color = c[type] || c.info;
      this._status.textContent = text;
    },

    addMessage(role, text, meta = null) {
      if (!this._chat) return;
      const wrap = document.createElement('div');
      wrap.className = role === 'user' ? 'msg user' : 'msg agent';

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      wrap.appendChild(bubble);

      if (meta && meta.length > 0) {
        const badge = document.createElement('div');
        badge.className = 'actions-badge';
        badge.textContent = `${meta.length} action${meta.length > 1 ? 's' : ''} executed`;
        wrap.appendChild(badge);
      }

      this._chat.appendChild(wrap);
      this._chat.scrollTop = this._chat.scrollHeight;
    },

    _refreshDebug() {
      if (!this._dbgGroups || !this._dbgActions) return;

      // groups
      const map = _pageMap?.page;
      if (map && map.groups.length) {
        this._dbgGroups.innerHTML = map.groups.map(g =>
          `<div class="dbg-row">
            <span class="dbg-id">${g.group_id}</span>
            <span class="dbg-count">${g.element_count} el</span>
           </div>
           <div class="dbg-summary">${g.summary || ''}</div>`
        ).join('');
      } else {
        this._dbgGroups.textContent = 'No page map yet. Send a message first.';
      }

      // last actions
      const last = DiffRegistry.get().slice(-10);
      if (last.length) {
        this._dbgActions.innerHTML = last.map(d =>
          `<div class="dbg-row">
            <span class="dbg-id">${d.action}</span>
            <span class="dbg-count ${d.status === 'success' ? 'ok' : 'err'}">${d.status}</span>
           </div>
           <div class="dbg-summary">→ ${d.target || '—'}${d.params?.value ? ` = "${d.params.value}"` : ''}</div>`
        ).join('');
      } else {
        this._dbgActions.textContent = 'No actions yet.';
      }
    },

    async _submit() {
      const intent = this._input.value.trim();
      if (!intent) return;
      this.addMessage('user', intent);
      this._input.value = '';
      this._setLoading(true);
      Overlay.clearAll();

      try {
        const { actions, message, scanVersion } = await LLMBridge.run(intent, s => this.setStatus(s));

        if (actions.length > 0) {
          this.setStatus(`Executing ${actions.length} action(s)…`);
          await Executor.runAll(actions, intent, scanVersion);
          this.setStatus(`Done — ${actions.length} actions ran.`, 'success');
        } else {
          this.setStatus('Ready.', 'success');
        }

        this.addMessage('agent', message || (actions.length > 0 ? `Ran ${actions.length} action(s).` : 'Done.'), actions);

        // auto-refresh debug panel if open
        const dbgPanel = this._shadow.getElementById('dbg-panel');
        if (dbgPanel && dbgPanel.style.display !== 'none') this._refreshDebug();

      } catch (err) {
        this.setStatus(`Error: ${err.message}`, 'error');
        this.addMessage('agent', `Error: ${err.message}`);
      } finally {
        this._setLoading(false);
        this._input.focus();
      }
    },

    _setLoading(on) {
      this._input.disabled = on;
      this._shadow.getElementById('btn').disabled = on;
      if (on) {
        const typing = document.createElement('div');
        typing.className = 'msg agent typing';
        typing.id = 'typing-indicator';
        typing.innerHTML = '<div class="bubble">Thinking…</div>';
        this._chat.appendChild(typing);
        this._chat.scrollTop = this._chat.scrollHeight;
      } else {
        this._shadow.getElementById('typing-indicator')?.remove();
      }
    },

    open()   { if (this._host) this._host.style.display = ''; },
    close()  { if (this._host) this._host.style.display = 'none'; },
    toggle() { if (this._host) this._host.style.display = this._host.style.display === 'none' ? '' : 'none'; },

    _html: () => `
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  #p{width:360px;background:#fff;border-radius:14px;
     box-shadow:0 8px 32px #0003,0 2px 8px #0001;
     border:1px solid #e5e7eb;overflow:hidden;display:flex;flex-direction:column}

  /* header */
  #hdr{background:#1e1b4b;color:#fff;padding:10px 14px;
       display:flex;align-items:center;justify-content:space-between;
       cursor:move;user-select:none;flex-shrink:0}
  #hdr span{font-size:13px;font-weight:600;letter-spacing:.02em}
  .ctl{display:flex;gap:6px}
  .ctl button{background:#ffffff22;border:none;color:#fff;
              width:22px;height:22px;border-radius:4px;cursor:pointer;
              font-size:13px;display:flex;align-items:center;justify-content:center}
  .ctl button:hover{background:#ffffff44}

  /* body */
  #b{display:flex;flex-direction:column}

  /* chat */
  #chat{height:220px;overflow-y:auto;padding:10px 12px;display:flex;
        flex-direction:column;gap:8px;background:#f9fafb}
  .msg{display:flex;flex-direction:column;max-width:85%}
  .msg.user{align-self:flex-end;align-items:flex-end}
  .msg.agent{align-self:flex-start;align-items:flex-start}
  .bubble{padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.45;word-break:break-word}
  .msg.user .bubble{background:#6366f1;color:#fff;border-bottom-right-radius:3px}
  .msg.agent .bubble{background:#fff;color:#111827;border:1px solid #e5e7eb;border-bottom-left-radius:3px}
  .msg.typing .bubble{color:#9ca3af;font-style:italic}
  .actions-badge{font-size:11px;color:#10b981;margin-top:3px;padding-left:2px}

  /* input row */
  #input-area{padding:10px 12px;border-top:1px solid #f3f4f6;flex-shrink:0}
  #row{display:flex;gap:8px;align-items:center}
  #i{flex:1;border:1.5px solid #d1d5db;border-radius:8px;
     padding:8px 10px;font-size:13px;outline:none;color:#111827;
     transition:border-color .15s;font-family:inherit}
  #i:focus{border-color:#6366f1}
  #i:disabled{background:#f9fafb}
  #btn{background:#6366f1;color:#fff;border:none;border-radius:8px;
       width:36px;height:36px;cursor:pointer;font-size:17px;
       display:flex;align-items:center;justify-content:center;flex-shrink:0;
       transition:background .15s}
  #btn:hover{background:#4f46e5}
  #btn:disabled{background:#a5b4fc;cursor:not-allowed}
  #s{margin-top:6px;font-size:11px;color:#6366f1;min-height:14px}

  /* debug */
  #dbg-bar{padding:6px 12px;border-top:1px solid #f3f4f6;flex-shrink:0}
  #dbg-toggle{background:none;border:none;font-size:11px;color:#9ca3af;
              cursor:pointer;padding:0;font-family:inherit}
  #dbg-toggle:hover{color:#6366f1}
  #dbg-panel{padding:0 12px 10px;max-height:220px;overflow-y:auto}
  .dbg-section{margin-top:8px}
  .dbg-label{font-size:10px;font-weight:700;text-transform:uppercase;
             letter-spacing:.06em;color:#9ca3af;margin-bottom:4px}
  .dbg-row{display:flex;justify-content:space-between;align-items:center;
           margin-top:5px}
  .dbg-id{font-size:11px;font-family:monospace;color:#4f46e5;word-break:break-all}
  .dbg-count{font-size:10px;background:#f3f4f6;border-radius:4px;
             padding:1px 6px;color:#6b7280;white-space:nowrap;margin-left:6px;flex-shrink:0}
  .dbg-count.ok{background:#d1fae5;color:#065f46}
  .dbg-count.err{background:#fee2e2;color:#991b1b}
  .dbg-summary{font-size:11px;color:#9ca3af;padding-left:2px;margin-top:1px;
               white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
<div id="p">
  <div id="hdr">
    <span>✦ AI Assistant</span>
    <div class="ctl">
      <button id="min" title="Minimise">–</button>
      <button id="cls" title="Close">×</button>
    </div>
  </div>
  <div id="b">
    <div id="chat"></div>
    <div id="input-area">
      <div id="row">
        <input id="i" type="text" placeholder="Ask me anything or give me a task…" autocomplete="off"/>
        <button id="btn" title="Send">→</button>
      </div>
      <div id="s">Ready.</div>
    </div>
    <div id="dbg-bar">
      <button id="dbg-toggle">▸ Debug</button>
    </div>
    <div id="dbg-panel" style="display:none">
      <div class="dbg-section">
        <div class="dbg-label">Page Groups</div>
        <div id="dbg-groups" style="font-size:11px;color:#9ca3af">Send a message to scan.</div>
      </div>
      <div class="dbg-section">
        <div class="dbg-label">Last Actions</div>
        <div id="dbg-actions" style="font-size:11px;color:#9ca3af">No actions yet.</div>
      </div>
    </div>
  </div>
</div>`,
  };

  // ── PUBLIC API ────────────────────────────────────────────────────────────
  global.aiUI = {
    init({ apiKey, model, provider, mode, serverUrl } = {}) {
      if (provider) {
        _config.provider = provider;
        const defaults = PROVIDER_DEFAULTS[provider];
        if (defaults) {
          _config.apiUrl = defaults.apiUrl;
          _config.model  = model || defaults.model;
        }
      }
      if (apiKey)    _config.apiKey    = apiKey;
      if (model)     _config.model     = model;
      if (mode)      _config.mode      = mode;
      if (serverUrl) _config.serverUrl = serverUrl;
    },

    async run(intent) {
      FloatingUI.setStatus('Running…');
      Overlay.clearAll();
      try {
        const { actions, message, scanVersion } = await LLMBridge.run(intent, s => FloatingUI.setStatus(s));
        if (actions.length > 0) {
          FloatingUI.setStatus(`Executing ${actions.length} action(s)…`);
          await Executor.runAll(actions, intent, scanVersion);
          FloatingUI.setStatus('Done.', 'success');
        } else {
          FloatingUI.setStatus('Ready.', 'success');
        }
        return { actions, message, diff: DiffRegistry.last() };
      } catch (err) {
        FloatingUI.setStatus(`Error: ${err.message}`, 'error');
        throw err;
      }
    },

    rescan()        { return MapBuilder.build(); },
    getMap()        { return _pageMap?.page ?? null; },
    getGroupIR(id)  { return GroupResolver.resolve(id); },

    diff:     DiffRegistry,
    registry: ActionRegistry,
    overlay:  Overlay,

    open()   { FloatingUI.open(); },
    close()  { FloatingUI.close(); },
    toggle() { FloatingUI.toggle(); },
  };

  // auto-mount floating UI
  const mount = () => FloatingUI.init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

})(window);
