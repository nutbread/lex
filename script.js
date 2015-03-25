(function () {
	"use strict";

	// Module for performing actions as soon as possible
	var on_ready = (function () {

		// Vars
		var callbacks = [],
			check_interval = null,
			check_interval_time = 250;

		// Check if ready and run callbacks
		var callback_check = function () {
			if (
				(document.readyState === "interactive" || document.readyState === "complete") &&
				callbacks !== null
			) {
				// Run callbacks
				var cbs = callbacks,
					cb_count = cbs.length,
					i;

				// Clear
				callbacks = null;

				for (i = 0; i < cb_count; ++i) {
					cbs[i].call(null);
				}

				// Clear events and checking interval
				window.removeEventListener("load", callback_check, false);
				window.removeEventListener("readystatechange", callback_check, false);

				if (check_interval !== null) {
					clearInterval(check_interval);
					check_interval = null;
				}

				// Okay
				return true;
			}

			// Not executed
			return false;
		};

		// Listen
		window.addEventListener("load", callback_check, false);
		window.addEventListener("readystatechange", callback_check, false);

		// Callback adding function
		return function (cb) {
			if (callbacks === null) {
				// Ready to execute
				cb.call(null);
			}
			else {
				// Delay
				callbacks.push(cb);

				// Set a check interval
				if (check_interval === null && callback_check() !== true) {
					check_interval = setInterval(callback_check, check_interval_time);
				}
			}
		};

	})();

	var restyle_noscript = function () {
		var nodes = document.querySelectorAll(".js_on,.js_off"),
			i = 0,
			len = nodes.length;
		for (; i < len; ++i) {
			nodes[i].classList.add("js");
		}
	};

	var script_load = (function () {

		var script_remove_event_listeners = function (state, okay) {
			// Remove event listeners
			this.removeEventListener("load", state.on_load, false);
			this.removeEventListener("error", state.on_error, false);
			this.removeEventListener("readystatechange", state.on_readystatechange, false);

			state.on_load = null;
			state.on_error = null;
			state.on_readystatechange = null;

			// Trigger
			if (state.callback) state.callback.call(null, okay, this);

			// Remove
			var par = this.parentNode;
			if (par) par.removeChild(this);
		};



		return function (url, callback) {
			var node = document.head || document.body,
				script, state;

			if (!node) {
				// Callback and done
				if (callback) callback.call(null, false, null);
				return false;
			}

			// Load state
			state = {
				on_load: null,
				on_error: null,
				on_readystatechange: null,
				callback: callback,
			};
			state.on_load = function () {
				script_remove_event_listeners.call(script, state, true);
			};
			state.on_error = function () {
				script_remove_event_listeners.call(script, state, false);
			};
			state.on_readystatechange = function (state) {
				if (script.readyState === "loaded" || script.readyState === "complete") {
					script_remove_event_listeners.call(script, state, true);
				}
			};

			// New script tag
			script = document.createElement("script");
			script.async = true;
			script.setAttribute("src", url);

			// Events
			script.addEventListener("load", state.on_load, false);
			script.addEventListener("error", state.on_error, false);
			script.addEventListener("readystatechange", state.on_readystatechange, false);

			// Add
			node.appendChild(script);

			// Done
			return true;
		};

	})();

	var load_demo = (function () {
		var target = null,
			scripts_loaded = {},
			hl_load_state = 0,
			lex_load_state = 0,
			lex = null,
			highlighter = null;

		var load_scripts = function (url, script, params) {
			var script_name = "src/" + script + ".js";

			// Already loaded
			if (script in scripts_loaded && scripts_loaded[script] !== null) return true;

			target = [ url , script , params ];

			// Load highlighter
			if (hl_load_state === 0) {
				hl_load_state = 1;
				script_load("highlighter.js", function () {
					hl_load_state = 2;
					highlighter = window.highlighter;
					load_scripts(target[0], target[1], target[2]);
				});
				return false;
			}
			if (hl_load_state !== 2) return false;

			// Load lex
			if (lex_load_state === 0) {
				lex_load_state = 1;
				script_load("src/lex.js", function () {
					lex_load_state = 2;
					lex = window.lex;
					load_scripts(target[0], target[1], target[2]);
				});
				return false;
			}
			if (lex_load_state !== 2) return false;

			// Already loading
			if (script in scripts_loaded) return false;

			// Load script
			scripts_loaded[script] = null;
			script_load(script_name, function () {
				var t = target;
				target = null;
				scripts_loaded[script] = window[script].gen(lex);
				load_demo(t[0], t[1], t[2]);
			});

			// Now loading
			return false;
		};

		var load_demo = function (url, script, params) {
			// Load the script
			if (!load_scripts(url, script, params)) return;

			// Validate
			var node = document.querySelector(".demo_code_inner"),
				xhr;

			if (node === null) return;

			// Create XHR
			try {
				xhr = new XMLHttpRequest();
				xhr.open("GET", url, true);
				xhr.responseType = "text";

				xhr.addEventListener("load", function () {
					if (xhr.status == 200) {
						var n;
						node.innerHTML = highlighter[script](lex, scripts_loaded[script], xhr.responseText, params);
						if ((n = document.querySelector(".demo_code")) !== null) {
							n.scrollLeft = 0;
							n.scrollTop = 0;
						}
					}
				}, false);

				// Send
				xhr.send();
			}
			catch (e) {
				if ((node = document.querySelector(".demo_code_placeholder")) !== null) {
					node.classList.add("demo_code_placeholder_error");
				}
			}
		};

		return load_demo;

	})();

	var on_demo_option_click = function (event) {
		if (event.which !== 1) return;

		var n, i;
		n = document.querySelectorAll(".demo_option.demo_option_selected");
		for (i = 0; i < n.length; ++i) {
			n[i].classList.remove("demo_option_selected");
		}

		this.classList.add("demo_option_selected");

		load_demo(this.getAttribute("data-target") || "", this.getAttribute("data-library") || "", this.getAttribute("data-params"));

		event.preventDefault();
		event.stopPropagation();
		return false;
	};



	// Execute
	on_ready(function () {
		// Noscript
		restyle_noscript();

		// Demo options
		var n, i;
		n = document.querySelectorAll(".demo_option");
		for (i = 0; i < n.length; ++i) {
			n[i].addEventListener("click", on_demo_option_click, false);
			if (n[i].classList.contains("demo_option_selected")) {
				load_demo(n[i].getAttribute("data-target") || "", n[i].getAttribute("data-library") || "", n[i].getAttribute("data-params"));
			}
		}
	});

})();


