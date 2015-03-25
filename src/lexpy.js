var lexpy = (function () {
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
			"NEXT_NO_OP_PREFIX",
			"START_STRING",
			"STRING_TRIPLE",
			"START_COMMENT",
			"BRACKET",
			"BRACKET_CLOSE",
		], "IGNORE"); //}
		var flags = descriptor.flags;
		descriptor.define_types({
			"INVALID": 0,
			"KEYWORD": 0,
			"IDENTIFIER": flags.NEXT_NO_OP_PREFIX,
			"NUMBER": flags.NEXT_NO_OP_PREFIX,
			"STRING": flags.NEXT_NO_OP_PREFIX,
			"OPERATOR": 0,
			"DECORATOR": 0,
			"WHITESPACE": flags.IGNORE,
			"COMMENT": flags.IGNORE,
		});
		var keywords = {
			"and": 0,
			"as": 0,
			"assert": 0,
			"break": 0,
			"class": 0,
			"continue": 0,
			"def": 0,
			"del": 0,
			"elif": 0,
			"else": 0,
			"except": 0,
			"finally": 0,
			"for": 0,
			"from": 0,
			"global": 0,
			"if": 0,
			"import": 0,
			"in": 0,
			"is": 0,
			"lambda": 0,
			"nonlocal": 0,
			"not": 0,
			"or": 0,
			"pass": 0,
			"raise": 0,
			"return": 0,
			"try": 0,
			"while": 0,
			"with": 0,
			"yield": 0,
		};
		var operators = lex.tree({
			">>=": 0,
			">>": 0,
			">=": 0,
			">": 0,

			"<<=": 0,
			"<<": 0,
			"<=": 0,
			"<": 0,
			"<>": 0,

			"==": 0,
			"=": 0,

			"!=": 0,

			"&=": 0,
			"&": 0,

			"|=": 0,
			"|": 0,

			"+=": 0,
			"+": 0,

			"-=": 0,
			"-": 0,

			"**=": 0,
			"**": 0,
			"*=": 0,
			"*": 0,

			"//=": 0,
			"//": 0,
			"/=": 0,
			"/": 0,

			"%=": 0,
			"%": 0,

			"^=": 0,
			"^": 0,

			"~": 0,
			":": 0,
			";": 0,
			",": 0,
			".": flags.NEXT_IS_MEMBER | flags.NEXT_NO_OP_PREFIX,
			"...": 0,

			"\\": 0,

			"(": flags.BRACKET,
			"[": flags.BRACKET,
			"{": flags.BRACKET,
			")": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NO_OP_PREFIX,
			"]": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NO_OP_PREFIX,
			"}": flags.BRACKET | flags.BRACKET_CLOSE,

			"#": flags.START_COMMENT,
			"\"": flags.START_STRING,
			"\"\"\"": flags.START_STRING | flags.STRING_TRIPLE,
			"\'": flags.START_STRING,
			"\'\'\'": flags.START_STRING | flags.STRING_TRIPLE,
		});

		// Matching logic
		var re_comment = /[^\r\n\u2028\u2029]*/g,
			re_newlines_search = /[\r\n\u2028\u2029]/,
			re_newlines_split = /[\n\u2028\u2029]|\r\n?/g;

		var match_string = function (t_info) {
			// Match to end of string
			var escaped = false,
				p = t_info[2],
				p_max = this.text.length,
				quote = this.text[this.pos],
				quote_count = 0,
				quote_length = ((t_info[1] & this.descriptor.flags.STRING_TRIPLE) !== 0) ? 3 : 1,
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
						if (++quote_count >= quote_length) {
							++p;
							break;
						}
					}
					else {
						quote_count = 0;
						if (c === "\\") {
							escaped = true;
						}
						else if (this.descriptor.string_contains_newline(c) && quote_length === 1) {
							break;
						}
					}
				}
			}

			t_info[0] = this.descriptor.STRING;
			t_info[2] = p;
		};
		var match_comment = function (t_info) {
			// Check which type
			var p = t_info[2],
				re = re_comment,
				m;

			// Match the comment
			re.lastIndex = p;
			m = re.exec(this.text);

			// Create the token
			t_info[0] = this.descriptor.COMMENT;
			t_info[2] = m.index + m[0].length;
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
				lex.check_regex("[\\w]+"), // word
				function (flags, p) {
					var token_type = this.descriptor.IDENTIFIER,
						word = this.text.substr(this.pos, p - this.pos);

					if ((this.previous.flags & this.descriptor.flags.NEXT_IS_MEMBER) !== 0) {
						// Member
						flags |= this.descriptor.flags.MEMBER;
					}

					// Check if keyword
					if (Object.prototype.hasOwnProperty.call(keywords, word)) {
						token_type = this.descriptor.KEYWORD;
						flags |= keywords[word];
					}

					return this.create_token(token_type, flags, p);
				},
			],
			[
				lex.check_regex("@[\\w]+"), // decorator
				lex.create_token(descriptor.DECORATOR),
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

					return this.create_token(t_info[0], t_info[1], t_info[2]);
				},
			],
			[
				lex.check_regex("[^\\s\\w@" + lex.regex_escape(lex.to_regex_class(operators)) + "]+"), // invalid
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


