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
			lex_loading = false,
			lex = null;

		var load_scripts = function (url, script) {
			var script_name = "src/" + script + ".js";

			// Already loaded
			if (script in scripts_loaded && scripts_loaded[script] !== null) return true;

			target = [ url , script ];

			// Load lex
			if (!lex_loading) {
				lex_loading = true;
				script_load("src/lex.js", function () {
					lex = window.lex;
					load_scripts(target[0], target[1]);
				});
				return false;
			}

			// Already loading
			if (script in scripts_loaded) return false;

			// Load script
			scripts_loaded[script] = null;
			script_load(script_name, function () {
				var t = target;
				target = null;
				scripts_loaded[script] = window[script].gen(lex);
				load_demo(t[0], t[1]);
			});

			// Now loading
			return false;
		};

		var load_demo = function (url, script) {
			// Load the script
			if (!load_scripts(url, script)) return;

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
						node.innerHTML = generator[script](lex, scripts_loaded[script], xhr.responseText);
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

	var generator = (function () {

		var re_xml_escape_char = /[<>&]/g,
			re_xml_escape_char_ext = /[<>&\"\']/g,
			xml_escape_chars = {
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				"\"": "&quot;",
				"'": "&apos;",
			};

		var xml_escape = function (text, all) {
			return text.replace(all ? re_xml_escape_char_ext : re_xml_escape_char, function (m) {
				return xml_escape_chars[m];
			});
		};

		var complete_line = function (line, line_pos) {
			if (line_pos === 0) {
				return '<div class="code_line code_line_empty"></div>';
			}
			return '<div class="code_line">' + line + '</div>';
		};

		var format_default = function (node_class, text, line_pos) {
			return '<span class="' + node_class + '">' + xml_escape(text) + '</span>';
		};
		var format_whitespace_or_comment = function (node_class, text, line_pos) {
			var t, i, tab_count;

			if (line_pos === 0 && (tab_count = /^\t*/.exec(text)[0].length) > 0) {
				t = '';
				for (i = 0; i < tab_count; ++i) {
					t += '<span class="code_tab">\t</span>';
				}
				t += xml_escape(text.substr(tab_count));
			}
			else {
				t = xml_escape(text);
			}

			return '<span class="' + node_class + '">' + t + '</span>';
		};
		var format_string = function(node_class, text, line_pos) {
			var re_escape_matcher = /\\(?:([4-7][0-7]?|[0-3][0-7]{0,2}|u[0-9a-fA-F]{0,4}|x[0-9a-fA-F]{0,2}|[\'\"\\bfnrtv]|$)|.)/g,
				t = '',
				start = 0,
				extra_class, m;

			while ((m = re_escape_matcher.exec(text)) !== null) {
				extra_class = (m[1] === undefined) ? " code_string_escape_invalid" : "";

				t += xml_escape(text.substr(start, m.index - start));
				t += '<span class="code_string_escape' + extra_class + '">' + xml_escape(m[0]) + '</span>';

				start = m.index + m[0].length;
			}

			t += xml_escape(text.substr(start));

			return '<span class="' + node_class + '">' + t + '</span>';
		};
		var format_regex = function(node_class, text, line_pos) {
			var re_escape_matcher = /\\(?:[4-7][0-7]?|[0-3][0-7]{0,2}|u[0-9a-fA-F]{4}?|x[0-9a-fA-F]{2}?|[\'\"\\bfnrtv]|.|$)/g,
				t = '',
				start = 0,
				m;

			while ((m = re_escape_matcher.exec(text)) !== null) {
				t += xml_escape(text.substr(start, m.index - start));
				t += '<span class="code_regex_escape">' + xml_escape(m[0]) + '</span>';

				start = m.index + m[0].length;
			}

			t += xml_escape(text.substr(start));

			return '<span class="' + node_class + '">' + t + '</span>';
		};

		return {
			lexjs: function (lex, lex_d, input) {
				var lexer = new lex.Lexer(lex_d, input),
					source = '',
					line = '',
					line_pos = 0,
					i, t, split, formatter, node_class, text;

				while ((t = lexer.get_token()) !== null) {
					text = t.text;
					split = false;
					formatter = format_default;
					node_class = "";

					if (t.type === lex_d.KEYWORD) {
						if ([ "true" , "false" , "null" ].indexOf(text) >= 0) {
							node_class = "code_literal";
						}
						else {
							node_class = (text === "this") ? "code_this" : "code_keyword";
						}
					}
					else if (t.type === lex_d.IDENTIFIER) {
						if ((t.flags & lex_d.flags.MEMBER) !== 0) {
							node_class = "code_member";
						}
						else if (text == "undefined") {
							node_class = "code_literal";
						}
						else {
							node_class = "code_identifier";
						}
					}
					else if (t.type === lex_d.NUMBER) {
						node_class = "code_number";
					}
					else if (t.type === lex_d.STRING) {
						split = true;
						formatter = format_string;
						node_class = (text[text.length - 1] === "'") ? "code_string_single" : "code_string_double";
					}
					else if (t.type === lex_d.REGEX) {
						formatter = format_regex;
						node_class = "code_regex";
					}
					else if (t.type === lex_d.OPERATOR) {
						if ((t.flags & lex_d.flags.BRACKET) !== 0) {
							node_class = "code_bracket";
						}
						else if ([ ":", ";", ",", ".", "?" ].indexOf(text) >= 0) {
							node_class = "code_punct";
						}
						else {
							node_class = "code_operator";
						}
					}
					else if (t.type === lex_d.WHITESPACE) {
						split = true;
						formatter = format_whitespace_or_comment;
						node_class = "code_whitespace";
					}
					else if (t.type === lex_d.COMMENT) {
						split = true;
						formatter = format_whitespace_or_comment;
						if (text.substr(0, 2) === "/*") {
							node_class = "code_comment_multi";
							if (text.substr(0, 3) === "/**") node_class += " code_comment_formal";
						}
						else {
							node_class = "code_comment";
							if (text.substr(0, 3) === "///") node_class += " code_comment_formal";
						}
					}
					else { // if (t.type === lex_d.INVALID) {
						split = true;
						node_class = "code_invalid";
					}

					text = split ? lex_d.string_splitlines(text) : [ text ];
					for (i = 0; i < text.length; ++i) {
						if (i > 0) {
							source += complete_line(line, line_pos);
							line = '';
							line_pos = 0;
						}

						if (text[i].length > 0) {
							line += formatter.call(this, node_class, text[i], line_pos);
							line_pos += text[i].length;
						}
					}
				}

				source += complete_line(line, line_pos);
				return source;
			},
			lexpy: function (lex, lex_d, input) {
				var lexer = new lex.Lexer(lex_d, input),
					source = '',
					line = '',
					line_pos = 0,
					next_token = lexer.get_token(),
					last_unignored_token = null,
					last_ignored_token = null,
					last_ignored_token_count = 0,
					i, t, split, formatter, node_class, text, cls_target;

				while ((t = next_token) !== null) {
					next_token = lexer.get_token();

					text = t.text;
					split = false;
					formatter = format_default;
					node_class = "";

					if (t.type === lex_d.KEYWORD) {
						node_class = "code_keyword";
					}
					else if (t.type === lex_d.IDENTIFIER) {
						node_class = "code_identifier";

						if (/^([ur]|ur)$/.test(text) && next_token !== null && next_token.type === lex_d.STRING) {
							node_class = "code_string_flags";
						}
						else if ([ "True" , "False" , "None" ].indexOf(text) >= 0) {
							node_class = "code_literal";
						}
						else if (text === "self") {
							node_class = "code_this";
						}
						else if ((t.flags & lex_d.flags.MEMBER) !== 0) {
							node_class = "code_member";
						}
						else if (last_unignored_token.type === lex_d.KEYWORD) {
							cls_target = null;

							if (last_unignored_token.text === "def") cls_target = "code_function_name";
							else if (last_unignored_token.text === "class") cls_target = "code_class_name";

							if (
								cls_target !== null &&
								last_ignored_token_count === 1 &&
								last_ignored_token.type === lex_d.WHITESPACE &&
								!lex_d.string_contains_newline(last_ignored_token.text)
							) {
								node_class = cls_target;
							}
						}
					}
					else if (t.type === lex_d.NUMBER) {
						node_class = "code_number";
					}
					else if (t.type === lex_d.STRING) {
						split = true;
						formatter = format_string;
						node_class = (text[text.length - 1] === "'") ? "code_string_single" : "code_string_double";
						if ((t.flags & lex_d.flags.STRING_TRIPLE) !== 0) {
							node_class += " code_string_triple";
						}
					}
					else if (t.type === lex_d.OPERATOR) {
						if ((t.flags & lex_d.flags.BRACKET) !== 0) {
							node_class = "code_bracket";
						}
						else if ([ ":", ";", ",", ".", "\\" ].indexOf(text) >= 0) {
							node_class = "code_punct";
						}
						else {
							node_class = "code_operator";
						}
					}
					else if (t.type === lex_d.WHITESPACE) {
						split = true;
						formatter = format_whitespace_or_comment;
						node_class = "code_whitespace";
					}
					else if (t.type === lex_d.COMMENT) {
						split = true;
						formatter = format_whitespace_or_comment;
						node_class = "code_comment";
					}
					else { // if (t.type === lex_d.INVALID) {
						split = true;
						node_class = "code_invalid";
					}

					// Format
					text = split ? lex_d.string_splitlines(text) : [ text ];
					for (i = 0; i < text.length; ++i) {
						if (i > 0) {
							source += complete_line(line, line_pos);
							line = '';
							line_pos = 0;
						}

						if (text[i].length > 0) {
							line += formatter.call(this, node_class, text[i], line_pos);
							line_pos += text[i].length;
						}
					}

					// Next
					if ((t.flags & lex_d.flags.IGNORE) === lex_d.flags.IGNORE) {
						last_ignored_token = t;
						++last_ignored_token_count;
					}
					else {
						last_unignored_token = t;
						last_ignored_token = null;
						last_ignored_token_count = 0;
					}
				}

				source += complete_line(line, line_pos);
				return source;
			},
		};

	})();

	var on_demo_option_click = function (event) {
		if (event.which !== 1) return;

		var n, i;
		n = document.querySelectorAll(".demo_option.demo_option_selected");
		for (i = 0; i < n.length; ++i) {
			n[i].classList.remove("demo_option_selected");
		}

		this.classList.add("demo_option_selected");

		load_demo(this.getAttribute("data-target") || "", this.getAttribute("data-library") || "");
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
				load_demo(n[i].getAttribute("data-target") || "", n[i].getAttribute("data-library") || "");
			}
		}
	});

})();


