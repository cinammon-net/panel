/*
 * Cinammon FX: lo mismo en el panel, la web principal, la tienda y el webmail (copias idénticas).
 *  1. Botón de ojo en todos los campos de contraseña para verla u ocultarla.
 *  2. Animaciones: los bloques de cada página entran suavemente al cargar y al bajar con el scroll.
 * Sin dependencias. Respeta "reducir movimiento" del sistema. Los estilos van en cinammon-fx.css.
 */
(function () {
	if (typeof window === 'undefined' || window.__cinammonFx) return;
	window.__cinammonFx = true;

	const svg = (paths) =>
		`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
	const EYE = svg('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>');
	const EYE_OFF = svg(
		'<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
	);

	/* ------------------------------------------------------------ contraseñas */

	const fields = new Set();

	function place(input, btn) {
		const visible = input.offsetParent !== null && input.offsetWidth > 0;
		btn.style.display = visible ? '' : 'none';
		if (!visible) return;
		const size = 30;
		btn.style.top = input.offsetTop + (input.offsetHeight - size) / 2 + 'px';
		btn.style.left = input.offsetLeft + input.offsetWidth - size - 6 + 'px';
	}

	function setShown(input, btn, shown) {
		input.type = shown ? 'text' : 'password';
		btn.innerHTML = shown ? EYE_OFF : EYE;
		btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
		btn.setAttribute('aria-label', shown ? 'Ocultar contraseña' : 'Mostrar contraseña');
		btn.title = btn.getAttribute('aria-label');
	}

	function enhance(input) {
		if (input.dataset.cfxPw || input.dataset.reveal === 'off') return;
		const parent = input.parentElement;
		if (!parent) return;
		// Campos que ya traen su propio botón de ojo.
		if ([...parent.children].some((c) => c !== input && c.tagName === 'BUTTON' && !c.classList.contains('cfx-eye') && c.querySelector('svg'))) return;
		input.dataset.cfxPw = '1';
		if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
		const pr = parseFloat(getComputedStyle(input).paddingRight) || 0;
		if (pr < 40) input.style.paddingRight = '40px';

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'cfx-eye';
		btn.tabIndex = 0;
		setShown(input, btn, false);
		btn.addEventListener('mousedown', (e) => e.preventDefault()); // no quita el foco del campo
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const pos = input.selectionStart;
			setShown(input, btn, input.type === 'password');
			input.focus();
			try {
				if (pos != null) input.setSelectionRange(pos, pos);
			} catch {
				/* algunos tipos no admiten selección */
			}
		});
		input.insertAdjacentElement('afterend', btn);
		// Al enviar el formulario vuelve a ocultarse (el navegador no la guarda como texto).
		input.form?.addEventListener('submit', () => setShown(input, btn, false));
		fields.add([input, btn]);
		place(input, btn);
		if ('ResizeObserver' in window) new ResizeObserver(() => place(input, btn)).observe(input);
	}

	function scanPasswords(root) {
		(root.querySelectorAll ? root : document).querySelectorAll('input[type="password"]').forEach(enhance);
		for (const pair of fields) {
			const [input, btn] = pair;
			if (!input.isConnected || !btn.isConnected) {
				btn.remove();
				fields.delete(pair);
			} else place(input, btn);
		}
	}

	/* ------------------------------------------------------------ animaciones */

	const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const seen = new WeakSet();
	let io = null;
	let batch = 0;

	function show(el) {
		el.style.setProperty('--cfx-d', Math.min(batch++ * 70, 420) + 'ms');
		el.classList.remove('cfx-wait');
		el.classList.add('cfx-in');
		el.addEventListener('animationend', () => el.classList.remove('cfx-in'), { once: true });
		clearTimeout(show.t);
		show.t = setTimeout(() => (batch = 0), 120);
	}

	const skip = (el) => {
		if (seen.has(el) || el.matches('script,style,link,template,br,hr,[data-aos],[data-fx="off"],.cfx-eye')) return true;
		if (el.closest('[data-aos],[data-fx="off"],[role="dialog"],[role="menu"],[role="listbox"]')) return true;
		if (el.querySelector('[data-aos]')) return true;
		const cs = getComputedStyle(el);
		return cs.display === 'none' || cs.position === 'fixed' || cs.position === 'sticky' || el.offsetHeight < 8;
	};

	/** Bloques de una página: baja por los envoltorios y los contenedores altos; las rejillas animan cada tarjeta. */
	function blocks(root, depth = 0, out = []) {
		let kids = [...root.children];
		for (let d = 0; d < 5 && kids.length === 1; d++) kids = [...kids[0].children];
		const vh = window.innerHeight;
		for (const k of kids) {
			if (out.length > 40) break;
			if (k.matches('header,nav,footer,aside')) continue;
			const cs = getComputedStyle(k);
			const isGrid = cs.display === 'grid' || (cs.display === 'flex' && cs.flexWrap === 'wrap');
			if (isGrid && k.children.length > 1 && k.children.length <= 24) out.push(...k.children);
			else if (depth < 3 && k.children.length > 1 && k.offsetHeight > vh * 0.9) blocks(k, depth + 1, out);
			else out.push(k);
		}
		return out;
	}

	function roots() {
		const list = [...document.querySelectorAll('[data-fx-root]')];
		if (list.length) return list;
		const main = document.querySelectorAll('main');
		if (main.length) return [...main];
		const app = document.getElementById('app');
		return app ? [app] : [document.body];
	}

	function scanAnimations() {
		if (reduce) return 1;
		let n = 0;
		const vh = window.innerHeight;
		for (const root of roots()) {
			for (const el of blocks(root)) {
				if (skip(el)) continue;
				seen.add(el);
				n++;
				const r = el.getBoundingClientRect();
				if (r.top < vh * 0.95 || !io) show(el);
				else {
					el.classList.add('cfx-wait');
					io.observe(el);
				}
			}
		}
		return n;
	}

	if (!reduce && 'IntersectionObserver' in window) {
		io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					io.unobserve(e.target);
					show(e.target);
				}
			},
			{ rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
		);
	}

	// Saltos de scroll (enlaces a una sección, botón "subir"...): lo que ya quedó por encima de la pantalla
	// no llega a cruzarse con ella, así que se muestra igualmente.
	let scrollQueued = false;
	window.addEventListener(
		'scroll',
		() => {
			if (scrollQueued) return;
			scrollQueued = true;
			setTimeout(() => {
				scrollQueued = false;
				const vh = window.innerHeight;
				document.querySelectorAll('.cfx-wait').forEach((el) => {
					if (el.getBoundingClientRect().top < vh) {
						io?.unobserve(el);
						show(el);
					}
				});
			}, 150);
		},
		{ passive: true, capture: true },
	);

	/* ------------------------------------------------------------ arranque */

	let lastUrl = '';
	let queued = false;
	let tries = 0;
	let tryUrl = '';

	function tick() {
		queued = false;
		scanPasswords(document);
		// Animaciones al cargar y al cambiar de página (Inertia, el webmail...), no en cada repintado.
		// Si la página aún no se ha pintado, se vuelve a intentar con el siguiente cambio.
		if (location.href !== tryUrl) {
			tryUrl = location.href;
			tries = 0;
		}
		if (location.href !== lastUrl && tries < 30) {
			tries++;
			const url = location.href;
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					if (scanAnimations() > 0) {
						lastUrl = url;
						tries = 0;
					}
				}),
			);
		}
	}

	function schedule() {
		if (queued) return;
		queued = true;
		requestAnimationFrame(tick);
	}

	function start() {
		document.documentElement.classList.add('cfx');
		new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
		window.addEventListener('resize', () => scanPasswords(document));
		document.addEventListener('inertia:navigate', () => {
			lastUrl = '';
			tries = 0;
			schedule();
		});
		// La primera página de Inertia/React tarda un momento en pintarse.
		setTimeout(schedule, 60);
		schedule();
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
	else start();
})();
