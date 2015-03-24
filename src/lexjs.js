var lexjs = (function () {
	"use strict";

	// Basic environment derection; can be hardcoded if the environment is known
	var module = (function (module) {
		try {
			if (window) return {};
		}
		catch (e) {}

		return module;
	})(this);



	// Generator function
	module.gen = function (lex) {

		// Language descriptor
		var descriptor = new lex.Descriptor([ //{
			"IGNORE",
			"MEMBER",
			"NEXT_IS_MEMBER",
			"NEXT_NOT_REGEX",
			"NEXT_NOT_REGEX_CHECK",
			"NEXT_NO_OP_PREFIX",
			"START_REGEX",
			"START_STRING",
			"START_COMMENT",
			"BRACKET",
			"BRACKET_CLOSE",
			"FUTURE",
			"STRICT_REQUIRED",
		], "IGNORE"); //}
		var flags = descriptor.flags;
		descriptor.define_types({
			"INVALID": flags.NEXT_NOT_REGEX,
			"KEYWORD": 0,
			"IDENTIFIER": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
			"NUMBER": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
			"STRING": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
			"REGEX": flags.NEXT_NO_OP_PREFIX | flags.NEXT_NOT_REGEX,
			"OPERATOR": 0,
			"WHITESPACE": flags.IGNORE,
			"COMMENT": flags.IGNORE,
		});
		var keywords = {
			"break":      flags.NEXT_NOT_REGEX,
			"case":       0,
			"class":      flags.NEXT_NOT_REGEX,
			"catch":      flags.NEXT_NOT_REGEX,
			"const":      flags.NEXT_NOT_REGEX,
			"continue":   flags.NEXT_NOT_REGEX,
			"debugger":   flags.NEXT_NOT_REGEX,
			"default":    flags.NEXT_NOT_REGEX,
			"delete":     0,
			"do":         0,
			"else":       0,
			"export":     flags.NEXT_NOT_REGEX,
			"extends":    flags.NEXT_NOT_REGEX,
			"finally":    flags.NEXT_NOT_REGEX,
			"for":        flags.NEXT_NOT_REGEX,
			"function":   flags.NEXT_NOT_REGEX,
			"if":         flags.NEXT_NOT_REGEX,
			"import":     flags.NEXT_NOT_REGEX,
			"in":         0,
			"instanceof": 0,
			"let":        flags.NEXT_NOT_REGEX,
			"new":        0,
			"return":     0,
			"super":      flags.NEXT_NOT_REGEX,
			"switch":     flags.NEXT_NOT_REGEX,
			"this":       flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
			"throw":      0,
			"try":        flags.NEXT_NOT_REGEX,
			"typeof":     0,
			"var":        flags.NEXT_NOT_REGEX,
			"void":       0,
			"while":      flags.NEXT_NOT_REGEX,
			"with":       flags.NEXT_NOT_REGEX,
			"yield":      0,

			"await": flags.NEXT_NOT_REGEX | flags.FUTURE,
			"enum":  flags.NEXT_NOT_REGEX | flags.FUTURE,

			"implements": flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
			"interface":  flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
			"public":     flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
			"private":    flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
			"package":    flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
			"protected":  flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,
			"static":     flags.NEXT_NOT_REGEX | flags.FUTURE | flags.STRICT_REQUIRED,

			// "abstract":     flags.NEXT_NOT_REGEX | flags.PAST,
			// "boolean":      flags.NEXT_NOT_REGEX | flags.PAST,
			// "byte":         flags.NEXT_NOT_REGEX | flags.PAST,
			// "char":         flags.NEXT_NOT_REGEX | flags.PAST,
			// "double":       flags.NEXT_NOT_REGEX | flags.PAST,
			// "final":        flags.NEXT_NOT_REGEX | flags.PAST,
			// "float":        flags.NEXT_NOT_REGEX | flags.PAST,
			// "goto":         flags.NEXT_NOT_REGEX | flags.PAST,
			// "int":          flags.NEXT_NOT_REGEX | flags.PAST,
			// "long":         flags.NEXT_NOT_REGEX | flags.PAST,
			// "native":       flags.NEXT_NOT_REGEX | flags.PAST,
			// "short":        flags.NEXT_NOT_REGEX | flags.PAST,
			// "synchronized": flags.NEXT_NOT_REGEX | flags.PAST,
			// "transient":    flags.NEXT_NOT_REGEX | flags.PAST,
			// "volatile":     flags.NEXT_NOT_REGEX | flags.PAST,

			"null":  flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
			"true":  flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
			"false": flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		};
		var operators = lex.tree({
			">>>": 0,
			">>=": 0,
			">>": 0,
			">=": 0,
			">": 0,

			"<<=": 0,
			"<<": 0,
			"<=": 0,
			"<": 0,

			"===": 0,
			"==": 0,
			"=": 0,

			"!==": 0,
			"!=": 0,
			"!": 0,

			"&&": 0,
			"&=": 0,
			"&": 0,

			"||": 0,
			"|=": 0,
			"|": 0,

			"++": 0 | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
			"+=": 0,
			"+": 0,

			"--": 0 | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
			"-=": 0,
			"-": 0,

			"*=": 0,
			"*": 0,

			"/=": flags.START_REGEX,
			"/": flags.START_REGEX,

			"%=": 0,
			"%": 0,

			"^=": 0,
			"^": 0,

			"~": 0,
			"?": 0,
			":": 0,
			";": 0,
			",": 0,
			".": flags.NEXT_IS_MEMBER | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,

			"(": flags.BRACKET,
			"[": flags.BRACKET,
			"{": flags.BRACKET,
			")": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NOT_REGEX | flags.NEXT_NOT_REGEX_CHECK | flags.NEXT_NO_OP_PREFIX,
			"]": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
			"}": flags.BRACKET | flags.BRACKET_CLOSE,

			"//": flags.START_COMMENT,
			"/*": flags.START_COMMENT,
			"\"": flags.START_STRING,
			"\'": flags.START_STRING,
		});

		// Matching logic
		var re_comment = /[^\r\n\u2028\u2029]*/g,
			re_comment_multi = /[\s\S]*?(?:\*\/|$)/g,
			re_regex_flags = /[a-z]*/g,
			re_newlines_search = /[\r\n\u2028\u2029]/,
			re_newlines_split = /[\n\u2028\u2029]|\r\n?/g;

		var match_string = function (t_info) {
			// Match to end of string
			var escaped = false,
				p = t_info[2],
				p_max = this.text.length,
				quote = this.text[this.pos],
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
					if (c === quote) {
						++p;
						break;
					}
					else if (c === "\\") {
						escaped = true;
					}
					else if (this.descriptor.string_contains_newline(c)) {
						break;
					}
				}
			}

			t_info[0] = this.descriptor.STRING;
			t_info[2] = p;
		};
		var match_comment = function (t_info) {
			// Check which type
			var p = t_info[2],
				re = (this.text.substr(this.pos, p - this.pos) === "//") ? re_comment : re_comment_multi,
				m;

			// Match the comment
			re.lastIndex = p;
			m = re.exec(this.text);

			// Create the token
			t_info[0] = this.descriptor.COMMENT;
			t_info[2] = m.index + m[0].length;
		};
		var match_regex = function (t_info) {
			// Check if regex is allowed
			if ((this.previous.flags & this.descriptor.flags.NEXT_NOT_REGEX) !== 0 && ((this.previous.flags & this.descriptor.flags.NEXT_NOT_REGEX_CHECK) === 0 || !check_if_regex_valid.call(this))) {
				return;
			}

			// Match the regex
			var escaped = false,
				bracketed = false,
				p = t_info[2],
				p_max = this.text.length,
				c, m;

			for (; p < p_max; ++p) {
				c = this.text[p];
				if (escaped) {
					if (this.descriptor.string_contains_newline(c)) {
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
					else if (this.descriptor.string_contains_newline(c)) {
						break;
					}
				}
			}

			// Create the token
			t_info[0] = this.descriptor.REGEX;
			t_info[2] = p;
		};
		var check_if_regex_valid = function () {
			// Check for an if, for, or while statement
			if (this.brackets.length > 0) {
				var b = this.brackets[this.brackets.length - 1],
					t;

				if (b.token_id === this.token_id - 1 && !b.opener) {
					t = b.other.before;
					if (t.type === this.descriptor.KEYWORD && [ "if" , "for" , "while" ].indexOf(t.text) >= 0) {
						// Probably valid
						return true;
					}
				}
			}

			// Invalid
			return false;
		};

		// Checks/states
		descriptor.define_state_names([ "DEFAULT" ]);
		descriptor.define_state([ //{ state 0
			[
				lex.check_regex("\\s+"), // whitespace
				lex.create_token(descriptor.WHITESPACE),
			],
			[
				lex.check_regex("[+-]?(?:0[xX](?:[0-9a-fA-F]+)|[0-9]+(?:\\.[0-9]*)?(?:[eE][+-]?[0-9]+)?|\\.[0-9]+(?:[eE][+-]?[0-9]+)?)"), // number
				function (flags, p) {
					if ((this.previous.flags & this.descriptor.flags.NEXT_NO_OP_PREFIX) === 0 || this.match_tree(operators, this.pos, this.pos + 1) === null) {
						return this.create_token(descriptor.NUMBER, flags, p);
					}
					return null;
				},
			],
			[
				lex.check_regex("[\\w\\$]+"), // word
				function (flags, p) {
					var token_type = this.descriptor.IDENTIFIER,
						word;

					if ((this.previous.flags & this.descriptor.flags.NEXT_IS_MEMBER) !== 0) {
						// Member
						flags |= this.descriptor.flags.MEMBER;
					}
					else {
						// Check if keyword
						word = this.text.substr(this.pos, p - this.pos);
						if (Object.prototype.hasOwnProperty.call(keywords, word)) {
							token_type = this.descriptor.KEYWORD;
							flags |= keywords[word];
						}
					}

					return this.create_token(token_type, flags, p);
				},
			],
			[
				lex.check_tree(operators), // operator
				function (flags, p) {
					var t_info = [ this.descriptor.OPERATOR , flags , p ];

					if ((flags & this.descriptor.flags.START_STRING) !== 0) {
						// String
						match_string.call(this, t_info);
					}
					else if ((flags & this.descriptor.flags.START_COMMENT) !== 0) {
						// Comment
						match_comment.call(this, t_info);
					}
					else if ((flags & this.descriptor.flags.START_REGEX) !== 0) {
						// Regex
						match_regex.call(this, t_info);
					}

					// Bracket tracking
					if ((flags & this.descriptor.flags.BRACKET) !== 0) {
						this.bracket_track((flags & this.descriptor.flags.BRACKET_CLOSE) === 0);
					}

					return this.create_token(t_info[0], t_info[1], t_info[2]);
				},
			],
			[
				lex.check_regex("[^\\s\\w\\$" + lex.regex_escape(lex.to_regex_class(operators)) + "]+"), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], 0); //}

		// Additional functions
		descriptor.string_contains_newline = function (text) {
			return re_newlines_search.test(text);
		};
		descriptor.string_splitlines = function (text) {
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

		// Complete
		return descriptor;

	};



	// Complete
	return module;

}).call(this);


