var lexjs = (function () {
	"use strict";

	// Types
	var INVALID = 0, //{
		KEYWORD = 1,
		LITERAL = 2,
		IDENTIFIER = 3,
		NUMBER = 4,
		STRING = 5,
		REGEX = 6,
		OPERATOR = 7,
		WHITESPACE = 8,
		COMMENT = 9,
		// Flags
		FLAG_NONE = 0x0,
		FLAG_REGEX = 0x1,
		FLAG_STRING = 0x2,
		FLAG_COMMENT = 0x4,
		FLAG_BRACKET = 0x8,
		FLAG_BRACKET_CLOSE = 0x10,
		FLAG_MEMBER = 0x20,
		FLAG_NO_REGEX_AFTER = 0x40, // indicates regex expressions can not start after this token
		FLAG_NO_REGEX_AFTER_EXT = 0x80, // indicates that there could potentially be regex after under certain circumstances, additional checking required
		FLAG_STRICT_REQUIRED = 0x100, // not used yet, but has potential to be used
		FLAG_VERSION_FUTURE = 0x200,
		FLAG_VERSION_PAST = 0x400, // these will be skipped when converting to keywords
		FLAG_IGNORE = 0x800, // internally "ignore" certain characters such as whitespace and comments
		FLAG_NO_OP_PREFIX_AFTER = 0x1000, // indicates numeric values beginning with "operator" characters (+ or -) should not be matched
		FLAG_NEXT_IS_MEMBER = 0x2000,
		// Names
		token_type_names = [ //{
			"invalid",
			"keyword",
			"literal",
			"identifier",
			"number",
			"string",
			"regex",
			"operator",
			"whitespace",
			"comment",
		], //}
		token_flag_names = [ //{
			"NONE",
			"REGEX",
			"STRING",
			"COMMENT",
			"BRACKET",
			"BRACKET_CLOSE",
			"MEMBER",
			"NO_REGEX_AFTER",
			"NO_REGEX_AFTER_EXT",
			"STRICT_REQUIRED",
			"VERSION_FUTURE",
			"VERSION_PAST",
			"IGNORE",
			"NO_OP_PREFIX_AFTER",
		]; //}
	//}



	// String representation functions
	var token_type_to_string = function (token_type) {
		return token_type_names[token_type] || "";
	};
	var token_flags_to_string = function (flags) {
		if (flags === 0) {
			return token_flag_names[0];
		}

		var s = "",
			f = 0x1,
			i = 1;

		for (; i < token_flag_names.length; ++i) {
			if ((flags & f) !== 0) {
				if (s.length > 0) s += " | ";
				s += token_flag_names[i];
			}

			f <<= 1;
		}

		return s;
	};

	var escape_codes = {
		"\b": "\\b",
		"\f": "\\f",
		"\n": "\\n",
		"\r": "\\r",
		"\t": "\\t",
		"\\": "\\\\",
		"\"": "\\\"",
	};
	var repr_string = function (s) {
		return '"' + s.replace(/[\b\f\n\r\t\\\"]/g, function (m) { return escape_codes[m]; }) + '"';
	};



	// Regex escaping
	var regex_escape = function (text) {
		return text.replace(/[.*+?^${}()|[\]\\\-]/g, "\\$&");
	};



	// Private vars
	var operators = { //{
		">>>": FLAG_NONE,
		">>=": FLAG_NONE,
		">>": FLAG_NONE,
		">=": FLAG_NONE,
		">": FLAG_NONE,

		"<<=": FLAG_NONE,
		"<<": FLAG_NONE,
		"<=": FLAG_NONE,
		"<": FLAG_NONE,

		"===": FLAG_NONE,
		"==": FLAG_NONE,
		"=": FLAG_NONE,

		"!==": FLAG_NONE,
		"!=": FLAG_NONE,
		"!": FLAG_NONE,

		"&&": FLAG_NONE,
		"&=": FLAG_NONE,
		"&": FLAG_NONE,

		"||": FLAG_NONE,
		"|=": FLAG_NONE,
		"|": FLAG_NONE,

		"++": FLAG_NONE | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,
		"+=": FLAG_NONE,
		"+": FLAG_NONE,

		"--": FLAG_NONE | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,
		"-=": FLAG_NONE,
		"-": FLAG_NONE,

		"*=": FLAG_NONE,
		"*": FLAG_NONE,

		"/=": FLAG_REGEX,
		"/": FLAG_REGEX,

		"%=": FLAG_NONE,
		"%": FLAG_NONE,

		"^=": FLAG_NONE,
		"^": FLAG_NONE,

		"~": FLAG_NONE,
		"?": FLAG_NONE,
		":": FLAG_NONE,
		";": FLAG_NONE,
		",": FLAG_NONE,
		".": FLAG_NEXT_IS_MEMBER | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,

		"(": FLAG_BRACKET,
		"[": FLAG_BRACKET,
		"{": FLAG_BRACKET,
		")": FLAG_BRACKET | FLAG_BRACKET_CLOSE | FLAG_NO_REGEX_AFTER | FLAG_NO_REGEX_AFTER_EXT | FLAG_NO_OP_PREFIX_AFTER,
		"]": FLAG_BRACKET | FLAG_BRACKET_CLOSE | FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER,
		"}": FLAG_BRACKET | FLAG_BRACKET_CLOSE,

		"//": FLAG_COMMENT,
		"/*": FLAG_COMMENT,
		"\"": FLAG_STRING,
		"\'": FLAG_STRING,
	}; //}
	operators = (function (operators) {
		// Format operators to be easier/faster to use tree
		var ops_new = {},
			c, k, o, i, i_max;

		for (k in operators) {
			o = ops_new;
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
				o[c][0] = operators[k];
			}
			else {
				o[c] = [ operators[k] , null ];
			}
		}

		return ops_new;
	})(operators);

	var keywords = {
		// keyword: ( type , flags )
		"break":      [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"case":       [ KEYWORD , FLAG_NONE ],
		"class":      [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"catch":      [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"const":      [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"continue":   [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"debugger":   [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"default":    [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"delete":     [ KEYWORD , FLAG_NONE ],
		"do":         [ KEYWORD , FLAG_NONE ],
		"else":       [ KEYWORD , FLAG_NONE ],
		"export":     [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"extends":    [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"finally":    [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"for":        [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"function":   [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"if":         [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"import":     [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"in":         [ KEYWORD , FLAG_NONE ],
		"instanceof": [ KEYWORD , FLAG_NONE ],
		"let":        [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"new":        [ KEYWORD , FLAG_NONE ],
		"return":     [ KEYWORD , FLAG_NONE ],
		"super":      [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"switch":     [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"this":       [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ],
		"throw":      [ KEYWORD , FLAG_NONE ],
		"try":        [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"typeof":     [ KEYWORD , FLAG_NONE ],
		"var":        [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"void":       [ KEYWORD , FLAG_NONE ],
		"while":      [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"with":       [ KEYWORD , FLAG_NO_REGEX_AFTER ],
		"yield":      [ KEYWORD , FLAG_NONE ],

		"await": [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE ],
		"enum":  [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE ],

		"implements": [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],
		"interface":  [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],
		"public":     [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],
		"private":    [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],
		"package":    [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],
		"protected":  [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],
		"static":     [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_FUTURE | FLAG_STRICT_REQUIRED ],

		"abstract":     [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"boolean":      [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"byte":         [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"char":         [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"double":       [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"final":        [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"float":        [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"goto":         [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"int":          [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"long":         [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"native":       [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"short":        [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"synchronized": [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"transient":    [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],
		"volatile":     [ KEYWORD , FLAG_NO_REGEX_AFTER | FLAG_VERSION_PAST ],

		"null":  [ LITERAL , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ],
		"true":  [ LITERAL , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ],
		"false": [ LITERAL , FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER ],
	};

	var flags_default = [ //{
		FLAG_NO_REGEX_AFTER, // INVALID
		FLAG_NONE, // KEYWORD
		FLAG_NONE, // LITERAL
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, // IDENTIFIER
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, // NUMBER
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, // STRING
		FLAG_NO_REGEX_AFTER | FLAG_NO_OP_PREFIX_AFTER, // REGEX
		FLAG_NONE, // OPERATOR
		FLAG_IGNORE, // WHITESPACE
		FLAG_IGNORE, // COMMENT
	]; //}



	var re_whitespace = /(\s+)?/g,
		re_word = /([\w\$]+)?/g,
		re_number = /(([+-])?(?:(0[xX](?:[0-9a-fA-F]+))|([0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)|(\.[0-9]+(?:[eE][+-]?[0-9]+)?)))?/g,
		re_invalid = (function () {
			var s = "", k;
			for (k in operators) s += k;
			return new RegExp("([^\\s\\w\\$" + regex_escape(s) + "])?", "g");
		})(),
		re_newlines_search = /[\r\n\u2028\u2029]/,
		re_newlines_split = /[\n\u2028\u2029]|\r\n?/g,
		re_regex_flags = /[a-z]*/g,
		re_comment = /[^\r\n\u2028\u2029]*/g,
		re_comment_multi = /[\s\S]*?(?:\*\/|$)/g;



	// Private methods
	var create_token = function (token_type, flags, end) {
		var token = new Token(this.text.substr(this.pos, end - this.pos), token_type, flags_default[token_type] | flags);

		this.pos = end;

		if ((token.flags & FLAG_IGNORE) === 0) {
			this.last = token;
			++this.token_id;
		}

		return token;
	};
	var create_token_word = function (end) {
		var flags = FLAG_NONE,
			token_type = IDENTIFIER;

		if ((this.last.flags & FLAG_NEXT_IS_MEMBER) !== 0) {
			// Member
			flags |= FLAG_MEMBER;
		}
		else {
			// Check if keyword
			var word = this.text.substr(this.pos, end - this.pos),
				kw;

			if (Object.prototype.hasOwnProperty.call(keywords, word)) {
				kw = keywords[word];

				// Not a past feature
				if ((kw[1] & FLAG_VERSION_PAST) === 0) {
					token_type = kw[0];
					flags |= kw[1];
				}
			}
		}

		return create_token.call(this, token_type, flags, end);
	};
	var create_token_string = function (flags, quote, p, p_max) {
		// Match to end of string
		var escaped = false,
			c;

		for (; p < p_max; ++p) {
			c = this.text[p];
			if (escaped) {
				escaped = false;
				if (c === "\r" && p + 1 < p_max && this.text[p + 1] === "\n") {
					++p;
				}
			}
			else {
				if (c === "\\") {
					escaped = true;
				}
				else if (c === quote) {
					++p;
					break;
				}
				else if (re_newlines_search.test(c)) {
					break;
				}
			}

		}

		// Create the token
		return create_token.call(this, STRING, flags, p);
	};
	var create_token_comment = function (flags, opener, p) {
		// Check which type
		var re = (opener === "//") ? re_comment : re_comment_multi,
			m;

		// Match the comment
		re.lastIndex = p;
		m = re.exec(this.text);

		// Create the token
		return create_token.call(this, COMMENT, flags, m.index + m[0].length);
	};
	var create_token_regex = function (flags, p, p_max) {
		// Check if regex is allowed
		if ((this.last.flags & FLAG_NO_REGEX_AFTER) !== 0 && ((this.last.flags & FLAG_NO_REGEX_AFTER_EXT) === 0 || !check_if_regex_valid.call(this))) {
			return null;
		}

		// Match the regex
		var escaped = false,
			bracketed = false,
			c, m;

		for (; p < p_max; ++p) {
			c = this.text[p];
			if (escaped) {
				if (re_newlines_search.test(c)) {
					break;
				}
				escaped = false;
			}
			else {
				if (c === "\\") {
					escaped = true;
				}
				else if (c === "/") {
					if (!bracketed) {
						// Match flags and end
						re_regex_flags.lastIndex = p + 1;
						m = re_regex_flags.exec(this.text);
						p = m.index + m[0].length;
						break;
					}
				}
				else if (c === "[") {
					bracketed = true;
				}
				else if (c === "]") {
					bracketed = false;
				}
				else if (re_newlines_search.test(c)) {
					break;
				}
			}
		}

		// Create the token
		return create_token.call(this, REGEX, flags, p);
	};
	var check_if_regex_valid = function () {
		// Check for an if, for, or while statement
		// Additionally, if it's a while, make sure it's not a do-while
		if (this.brackets.length > 0) {
			var b = this.brackets[this.brackets.length - 1],
				t, text, tid_match;

			if (b.token_id === this.token_id - 1 && !b.opener) {
				b = b.other;
				t = b.before;
				if (t.type === KEYWORD) {
					text = t.text;
					if (text === "if" || text === "for" || text === "while") {
						// Probably valid
						return true;
					}
				}
			}
		}

		// Invalid
		return false;
	};
	var match_operator = function (p, p_max) {
		var value = null,
			ops = operators,
			c, flags;

		while (true) {
			c = this.text[p];
			if (!Object.prototype.hasOwnProperty.call(ops, c)) break;
			++p;

			flags = ops[c][0];
			if (flags !== null) {
				value = [ flags , p ];
			}

			ops = ops[c][1];
			if (ops === null || p >= p_max) break;
		}

		// Should return [ flags , end ], or null
		return value;
	};



	// Token class
	var Token = function (text, type, flags) {
		this.text = text;
		this.type = type;
		this.flags = flags;
	};
	Token.prototype = {
		constructor: Token,
		to_string: function () {
			return "Token(text=" + repr_string(this.text) + ", type=" + token_type_to_string(this.type) + ", flags=" + token_flags_to_string(this.flags) + ")";
		},
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
	var Lexer = function (text) {
		this.pos = 0;
		this.text = text;
		this.brackets = [];
		this.bracket_stack = [];
		this.last = new Token("", WHITESPACE, FLAG_NONE);
		this.token_id = 0;
	};
	Lexer.prototype = {
		constructor: Lexer,
		get_token: function () {
			var p = this.pos,
				p_max = this.text.length,
				flags = FLAG_NONE,
				m, b, end, re;

			if (p >= p_max) return null;

			// Whitespace
			(re = re_whitespace).lastIndex = p;
			if ((m = re.exec(this.text))[1] !== undefined) {
				return create_token.call(this, WHITESPACE, flags, m.index + m[0].length);
			}

			// Number
			(re = re_number).lastIndex = p;
			if ((m = re.exec(this.text))[1] !== undefined) {
				// Also check FLAG_NO_OP_PREFIX_AFTER on previous
				if ((this.last.flags & FLAG_NO_OP_PREFIX_AFTER) === 0 || match_operator.call(this, p, p + 1) === null) {
					return create_token.call(this, NUMBER, flags, m.index + m[0].length);
				}
			}

			// Identifier, keyword, etc
			(re = re_word).lastIndex = p;
			if ((m = re.exec(this.text))[1] !== undefined) {
				return create_token_word.call(this, m.index + m[0].length);
			}

			// Operator
			if ((m = match_operator.call(this, p, p_max)) !== null) {
				flags = m[0];
				end = m[1];

				if ((flags & FLAG_STRING) !== 0) {
					// String
					return create_token_string.call(this, flags, this.text.substr(p, end - p), end, p_max);
				}
				else if ((flags & FLAG_COMMENT) !== 0) {
					// Comment
					return create_token_comment.call(this, flags, this.text.substr(p, end - p), end);
				}
				else if ((flags & FLAG_REGEX) !== 0) {
					// Regex
					m = create_token_regex.call(this, flags, end, p_max);
					if (m !== null) return m;
				}

				if ((flags & FLAG_BRACKET) !== 0) {
					// Bracket matching
					if ((flags & FLAG_BRACKET_CLOSE) === 0) {
						b = new Bracket(this.last, this.token_id, this.brackets.length, true);
						this.brackets.push(b);

						this.bracket_stack.push(b);
					}
					else {
						if (this.bracket_stack.length > 0) {
							b = new Bracket(null, this.token_id, this.brackets.length, false);
							this.brackets.push(b);

							b.other = this.bracket_stack.pop();
							b.other.other = b;
						}
						// else: // syntax error
					}
				}

				return create_token.call(this, OPERATOR, flags, end);
			}

			// Invalid
			++p;
			while (p < p_max) {
				(re = re_invalid).lastIndex = p;
				if ((m = re.exec(this.text))[1] === undefined) break;
				p = m.index + m[0].length;
			}
			return create_token.call(this, INVALID, flags, p);

		},
	};
	Lexer.string_contains_newline = function (text) {
		return re_newlines_search.test(text);
	};
	Lexer.string_splitlines = function (text) {
		var parts = [],
			start = 0,
			m;

		re_newlines_split.lastIndex = 0;
		while ((m = re_newlines_split.exec(text)) !== null) {
			parts.push(text.substr(start, m.index - start));
			start = m.index + m[0].length;
		}

		parts.push(text.substr(start));

		return parts;
	};



	// Expose
	var lexjs = {
		Token: Token,
		Lexer: Lexer,
		token_type_to_string: token_type_to_string,
		token_flags_to_string: token_flags_to_string,
		INVALID: INVALID,
		KEYWORD: KEYWORD,
		LITERAL: LITERAL,
		IDENTIFIER: IDENTIFIER,
		NUMBER: NUMBER,
		STRING: STRING,
		REGEX: REGEX,
		OPERATOR: OPERATOR,
		WHITESPACE: WHITESPACE,
		COMMENT: COMMENT,
		FLAG_NONE: FLAG_NONE,
		FLAG_REGEX: FLAG_REGEX,
		FLAG_STRING: FLAG_STRING,
		FLAG_COMMENT: FLAG_COMMENT,
		FLAG_BRACKET: FLAG_BRACKET,
		FLAG_BRACKET_CLOSE: FLAG_BRACKET_CLOSE,
		FLAG_MEMBER: FLAG_MEMBER,
		FLAG_NO_REGEX_AFTER: FLAG_NO_REGEX_AFTER,
		FLAG_NO_REGEX_AFTER_EXT: FLAG_NO_REGEX_AFTER_EXT,
		FLAG_STRICT_REQUIRED: FLAG_STRICT_REQUIRED,
		FLAG_VERSION_FUTURE: FLAG_VERSION_FUTURE,
		FLAG_VERSION_PAST: FLAG_VERSION_PAST,
		FLAG_IGNORE: FLAG_IGNORE,
		FLAG_NO_OP_PREFIX_AFTER: FLAG_NO_OP_PREFIX_AFTER,
		FLAG_NEXT_IS_MEMBER: FLAG_NEXT_IS_MEMBER,
		token_type_names: token_type_names,
		token_flag_names: token_flag_names,
	};



	// Basic environment derection; can be hardcoded if the environment is known
	(function (module, source) {
		try { if (window) return; } catch (e) {}
		for (var k in source) module[k] = source[k]; // copy vars to node module
	})(this, lexjs);



	// Return methods
	return lexjs;

}).call(this);


