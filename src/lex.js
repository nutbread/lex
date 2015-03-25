var lex = (function () {
	"use strict";

	// Basic environment derection; can be hardcoded if the environment is known
	var lex = (function (module) {
		try {
			if (window) return {};
		}
		catch (e) {}

		return module;
	})(this);



	// Descriptor class
	var Descriptor = function (flags, flag_ignore) {
		this.flags = { "NONE": 0 };
		this.flag_names = [ "NONE" ];
		this.flag_ignore = -1;
		this.type_flags = [];
		this.type_names = [];
		this.states = {};
		this.state_names = null;
		this.state_checks = [];
		this.state_flags = [];
		this.on_new = null;

		var i, f;
		for (i = 0; i < flags.length; ++i) {
			f = flags[i];
			this.flags[f] = 1 << i;
			this.flag_names.push(f);
		}

		this.flag_ignore = this.flags[flag_ignore];
	};
	Descriptor.prototype = {
		constructor: Descriptor,
		define_types: function (types) {
			var i = 0,
				k;
			for (k in types) {
				this.type_flags.push(types[k]);
				this.type_names.push(k);
				this[k] = i++;
			}
		},
		define_state_names: function (state_names) {
			this.state_names = state_names;

			for (var i = 0; i < state_names.length; ++i) {
				this.states[state_names[i]] = i;;
			}
		},
		define_state: function (state, state_flags) {
			this.state_checks.push(state);
			this.state_flags.push(state_flags);
		},
		type_to_string: function (token_type) {
			return this.type_names[token_type] || "";
		},
		flags_to_string: function (flags) {
			if (flags === 0) {
				return this.flag_names[0];
			}

			var s = "",
				f = 0x1,
				i = 1;

			for (; i < this.flag_names.length; ++i) {
				if ((flags & f) !== 0) {
					if (s.length > 0) s += " | ";
					s += this.flag_names[i];
				}

				f <<= 1;
			}

			return s;
		},
		state_to_string: function (state) {
			return this.state_names[state] || "";
		},
	};



	// Token class
	var Token = function (text, type, flags, state) {
		this.text = text;
		this.type = type;
		this.flags = flags;
		this.state = state;
	};
	Token.dummy = function () {
		return new Token("", -1, 0, -1);
	};



	// Bracketed class
	var Bracket = function (before, tid, id, opener) {
		this.before = before;
		this.token_id = tid;
		this.id = id;
		this.opener = opener;
		this.other = null;
	};



	// Tokenizer class
	var Lexer = function (descriptor, text) {
		this.descriptor = descriptor;
		this.pos = 0;
		this.text = text;
		this.state = 0;
		this.brackets = [];
		this.bracket_stack = [];
		this.previous = Token.dummy();
		this.previous_actual = this.previous;
		this.token_id = 0;
		this.extra_flags = 0;

		if (descriptor.on_new !== null) {
			descriptor.on_new.call(this);
		}
	};
	Lexer.prototype = {
		constructor: Lexer,
		bracket_track: function (opener) {
			var b;

			// Bracket matching
			if (opener) {
				b = new Bracket(this.previous, this.token_id, this.brackets.length, true);
				this.brackets.push(b);

				this.bracket_stack.push(b);
			}
			else if (this.bracket_stack.length > 0) {
				b = new Bracket(null, this.token_id, this.brackets.length, false);
				this.brackets.push(b);

				b.other = this.bracket_stack.pop();
				b.other.other = b;
			}
			// else: // syntax error
		},
		create_token: function (token_type, flags, end) {
			var token = new Token(this.text.substr(this.pos, end - this.pos), token_type, this.descriptor.type_flags[token_type] | this.descriptor.state_flags[this.state] | this.extra_flags | flags, this.state);

			this.pos = end;

			if ((token.flags & this.descriptor.flag_ignore) !== this.descriptor.flag_ignore) {
				this.previous = token;
				++this.token_id;
			}

			this.previous_actual = token;
			return token;
		},
		repr_token: function (token) {
			return "Token(text=" + lex.repr_string(token.text) + ", type=" + this.descriptor.type_to_string(token.type) + ", flags=" + this.descriptor.flags_to_string(token.flags) + ", state=" + this.descriptor.state_to_string(token.state) + ")";
		},
		match_tree: function (obj, p, p_max) {
			var value = null,
				o = obj,
				c, f;

			while (true) {
				c = this.text[p];
				if (!Object.prototype.hasOwnProperty.call(o, c)) break;
				++p;

				f = o[c][0];
				if (f !== null) {
					value = [ f , p ];
				}

				o = o[c][1];
				if (o === null || p >= p_max) break;
			}

			// Should return [ flags , end ], or null
			return value;
		},
		get_token: function () {
			// Complete?
			if (this.pos >= this.text.length) return null;

			var checks = this.descriptor.state_checks[this.state],
				p = this.pos,
				i = 0,
				i_max = checks.length - 1,
				flags = 0,
				t, c, m;

			// Check formations
			for (; i < i_max; ++i) {
				c = checks[i];
				if ((m = c[0].call(this, p)) !== null && (t = c[1].call(this, m[0], m[1])) !== null) {
					return t;
				}
			}

			// Default type
			++p;
			c = checks[i];
			if ((m = c[0].call(this, p)) !== null) {
				flags = m[0];
				p = m[1];
			}
			return c[1].call(this, flags, p);
		},
	};



	// Useful functions
	var string_repr_escapes = {
		"\b": "\\b",
		"\f": "\\f",
		"\n": "\\n",
		"\r": "\\r",
		"\t": "\\t",
		"\\": "\\\\",
		"\"": "\\\"",
	};
	lex.repr_string = function (s) {
		return '"' + s.replace(/[\b\f\n\r\t\\\"]/g, function (m) { return string_repr_escapes[m]; }) + '"';
	};
	lex.regex_escape = function (text) {
		return text.replace(/[.*+?^${}()|[\]\\\-]/g, "\\$&");
	};
	lex.tree = function (obj) {
		var obj_new = {},
			c, k, o, i, i_max;

		for (k in obj) {
			o = obj_new;
			i_max = k.length - 1;
			for (i = 0; i < i_max; ++i) {
				c = k[i];
				if (Object.prototype.hasOwnProperty.call(o, c)) {
					if (o[c][1] === null) {
						o[c][1] = {};
					}
				}
				else {
					o[c] = [ null , {} ];
				}
				o = o[c][1];
			}

			c = k[i];
			if (Object.prototype.hasOwnProperty.call(o, c)) {
				o[c][0] = obj[k];
			}
			else {
				o[c] = [ obj[k] , null ];
			}
		}

		return obj_new;
	};
	lex.check_regex = function (pattern, flags) {
		flags = (flags === undefined) ? "g" : flags + "g";

		var re = new RegExp("(" + pattern + ")?", flags);
		return function (p) {
			re.lastIndex = p;
			var m = re.exec(this.text);
			return (m[1] === undefined) ? null : [ 0 , m.index + m[0].length ];
		};
	};
	lex.check_string = function (text) {
		return function (p) {
			return (this.text.substr(p, text.length) !== text) ? null : [ 0 , p + text.length ];
		};
	};
	lex.check_tree = function (obj) {
		return function (p) {
			return this.match_tree(obj, p, this.text.length);
		};
	};
	var check_null_fn = function () {
		return null;
	};
	lex.check_null = function () {
		return check_null_fn;
	};
	lex.create_token = function (token_type) {
		return function (flags, p) {
			return this.create_token(token_type, flags, p);
		};
	};
	lex.create_token_change_state = function (token_type, state) {
		return function (flags, p) {
			var t = this.create_token(token_type, flags, p);
			this.state = state;
			return t;
		};
	};
	lex.create_token_change_state_before = function (token_type, state) {
		return function (flags, p) {
			this.state = state;
			return this.create_token(token_type, flags, p);
		};
	};
	lex.to_regex_class = function (obj) {
		var s = "",
			o = {},
			i, k;

		for (k in obj) {
			for (i = 0; i < k.length; ++i) {
				o[k[i]] = true;
			}
		}
		for (k in o) {
			s += k;
		}

		return s;
	};



	// Expose classes
	lex.Descriptor = Descriptor;
	lex.Token = Token;
	lex.Lexer = Lexer;



	// Return module
	return lex;

}).call(this);

