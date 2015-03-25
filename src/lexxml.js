var lexxml = (function () {
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
			"TAG",
			"DECLARATION_TAG",
			"PERCENT_TAG",
			"QUESTION_TAG",
			"SUB_DECLARATION",
			"RAW_HTML_DATA",
		], "IGNORE"); //}
		var flags = descriptor.flags;
		descriptor.define_types({
			"COMMENT": 0,
			"CDATA": 0,
			"TEXT": 0,
			"RAW_DATA": 0,

			"TAG_OPEN": 0,
			"TAG_CLOSE": 0,
			"TAG_NAME": 0,

			"ATTRIBUTE": 0,
			"ATTRIBUTE_WHITESPACE": 0,
			"ATTRIBUTE_OPERATOR": 0,
			"ATTRIBUTE_STRING": 0,
		});

		// Matching logic
		var re_comment = /-->/g,
			re_cdata = /\]\]>/g,
			re_newlines_search = /[\r\n\u2028\u2029]/,
			re_newlines_split = /[\n\u2028\u2029]|\r\n?/g,
			re_bracket_open = /</g,
			re_bracket_open_or_sub_close = /[<\]]/g,
			re_bracket_open_char = /(\/|[a-zA-Z_\?%!])?/g;

		var match_string = function (p) {
			// Match to end of string
			var escaped = false,
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

			return p;
		};
		var match_generic = function (p, match_regex) {
			// Match
			match_regex.lastIndex = p;
			var m = match_regex.exec(this.text);

			// Create the token
			return (m === null) ? this.text.length : m.index + m[0].length;
		};

		// Raw data terminator state
		var RawDataTerminator = function (match_string, match_regex, match_token_type, match_token_flags, resume_state, resume_extra_flags, resume_tag) {
			this.match_string = match_string;
			this.match_regex = match_regex;
			this.match_token_type = match_token_type;
			this.match_token_flags = match_token_flags;
			this.resume_state = resume_state;
			this.resume_extra_flags = resume_extra_flags;
			this.resume_tag = resume_tag;
		};

		// Constructor
		descriptor.on_new = function () {
			this.tags = []; // < <? <% <! [
			this.html = false;
			this.raw_data_terminator = null;
		};

		// Checks/states
		descriptor.define_state_names([ //{
			"DEFAULT",
			"TAG_NAME",
			"TAG_NAME_QUESTION",
			"TAG_NAME_DECLARATION",
			"ATTRIBUTES",
			"ATTRIBUTES_QUESTION",
			"ATTRIBUTES_DECLARATION",
			"RAW_DATA",
		]); //}
		var states = descriptor.states;

		var create_token_tag_name_fn = function (token_type, next_state) {
			return function (flags, p) {
				this.tags[this.tags.length - 1][3] = this.text.substr(this.pos, p - this.pos);

				var t = this.create_token(token_type, flags, p);
				this.state = next_state;
				return t;
			};
		};
		var create_token_open_tag_fn = function (token_type, next_state, next_state_flags) {
			return function (flags, p) {
				this.tags.push([ this.state , this.extra_flags , this.text.substr(this.pos, p - this.pos) , null ]);
				this.state = next_state;
				this.extra_flags = next_state_flags;
				return this.create_token(token_type, flags, p);
			};
		};
		var create_token_close_tag_fn = function (token_type, html_check) {
			return function (flags, p) {
				var t = this.create_token(token_type, flags, p),
					ts = this.tags.pop(),
					tsn;

				this.state = ts[0];
				this.extra_flags = ts[1];

				if (html_check && this.html && ts[2] === "<" && ts[3] !== null && [ "script" , "style" , "textarea" ].indexOf((tsn = ts[3].toLowerCase())) >= 0) {
					// Raw mode
					setup_raw_data_opener.call(this,
						"</" + tsn, "i", // match_regex
						"</", // match_string
						this.descriptor.TAG_OPEN, // match_token_type
						this.descriptor.flags.TAG, // match_token_flags
						this.descriptor.states.TAG_NAME, // resume_state
						this.descriptor.flags.TAG, // resume_extra_flags
						[ this.state , this.extra_flags , null , null ], // resume_tag
						this.descriptor.flags.RAW_HTML_DATA // flags
					);
				}

				return t;
			};
		};
		var create_token_raw_data_opener_fn = function (closing_tag, token_type, tag_type_flag) {
			return function (flags, p) {
				setup_raw_data_opener.call(this,
					closing_tag, "", // match_regex
					closing_tag, // match_string
					this.descriptor.TAG_CLOSE, // match_token_type
					tag_type_flag, // match_token_flags
					this.state, // resume_state
					this.extra_flags, // resume_extra_flags
					null, // resume_tag
					tag_type_flag // flags
				);

				return this.create_token(token_type, flags, p);
			};
		};

		var setup_raw_data_opener = function (match_regex, match_regex_flags, match_string, match_token_type, match_token_flags, resume_state, resume_extra_flags, resume_tag, flags) {
			this.raw_data_terminator = new RawDataTerminator(
				match_string,
				new RegExp("[\\s\\S]*?(?=" + lex.regex_escape(match_regex) + ")", "g" + match_regex_flags),
				match_token_type,
				match_token_flags,
				resume_state,
				resume_extra_flags,
				resume_tag
			);

			this.state = this.descriptor.states.RAW_DATA;
			this.extra_flags = flags;
		};

		var check_string;

		descriptor.define_state([ //{ state 0: outside of tags
			[
				lex.check_regex("</(?=[a-zA-Z_])"),
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME, flags.TAG),
			],
			[
				lex.check_string("</"),
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.ATTRIBUTES, flags.TAG),
			],
			[
				lex.check_regex("<(?=[a-zA-Z_])"),
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME, flags.TAG),
			],
			[
				function (p) { // search for tag opening
					var p_max = this.text.length,
						re = ((this.extra_flags & this.descriptor.flags.SUB_DECLARATION) !== 0) ? re_bracket_open_or_sub_close : re_bracket_open,
						re2 = re_bracket_open_char,
						m;

					re.lastIndex = p;
					while ((m = re.exec(this.text)) !== null) {
						if (re.lastIndex >= p_max) break; // end of string

						// Check for match
						if (m[0] === "]") {
							// Match
							p_max = m.index;
							break;
						}

						re2.lastIndex = re.lastIndex;
						if (re2.exec(this.text)[1] !== undefined) {
							// Match
							p_max = m.index;
							break;
						}
					}

					// End of string
					return (p_max > p) ? [ 0 , p_max ] : null;
				},
				lex.create_token(descriptor.TEXT),
			],
			[
				lex.check_regex("<\\?(?=[a-zA-Z_])"),
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME_QUESTION, flags.QUESTION_TAG),
			],
			[
				lex.check_string("<!--"),
				function (flags, p) {
					p = match_generic.call(this, p, re_comment);
					return this.create_token(descriptor.COMMENT, flags, p);
				},
			],
			[
				lex.check_string("<![CDATA["),
				function (flags, p) {
					p = match_generic.call(this, p, re_cdata);
					return this.create_token(descriptor.CDATA, flags, p);
				},
			],
			[
				lex.check_regex("<!(?=[a-zA-Z_])"),
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME_DECLARATION, flags.DECLARATION_TAG),
			],
			[
				lex.check_string("<!"),
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.ATTRIBUTES_DECLARATION, flags.DECLARATION_TAG),
			],
			[
				lex.check_string("<?"),
				create_token_raw_data_opener_fn("?>", descriptor.TAG_OPEN, flags.QUESTION_TAG),
			],
			[
				lex.check_string("<%"),
				create_token_raw_data_opener_fn("%>", descriptor.TAG_OPEN, flags.PERCENT_TAG),
			],
			[
				lex.check_string("]"),
				create_token_close_tag_fn(descriptor.TAG_CLOSE, false),
			],
			null, // this state should never be reached; will throw an exception if it happens
		], 0); //}
		descriptor.define_state([ //{ state 1: tag name
			[
				lex.check_regex("[a-zA-Z_]+"),
				create_token_tag_name_fn(descriptor.TAG_NAME, states.ATTRIBUTES),
			],
		], 0); //}
		descriptor.define_state([ //{ state 2: question tag name
			[
				lex.check_regex("[a-zA-Z_]+"),
				create_token_tag_name_fn(descriptor.TAG_NAME, states.ATTRIBUTES_QUESTION),
			],
		], 0); //}
		descriptor.define_state([ //{ state 3: declaration tag name
			[
				lex.check_regex("[a-zA-Z_]+"),
				create_token_tag_name_fn(descriptor.TAG_NAME, states.ATTRIBUTES_DECLARATION),
			],
		], 0); //}
		descriptor.define_state([ //{ state 4: attributes
			[
				lex.check_string(">"), // closing tag
				create_token_close_tag_fn(descriptor.TAG_CLOSE, true),
			],
			[
				lex.check_string("/>"), // closing tag
				create_token_close_tag_fn(descriptor.TAG_CLOSE, false),
			],
			check_string = [
				lex.check_regex("['\"]"), // string
				function (flags, p) {
					p = match_string.call(this, p);
					return this.create_token(descriptor.ATTRIBUTE_STRING, flags, p);
				},
			],
			[
				lex.check_regex("[\\w\\-]+?(?=/?>|[^\\w\\-]|$)"), // word
				lex.create_token(descriptor.ATTRIBUTE),
			],
			[
				lex.check_regex("[^'\"\\w\\s]+?(?=/?>|['\"\\w\\s]|$)"), // operator
				lex.create_token(descriptor.ATTRIBUTE_OPERATOR),
			],
			[
				lex.check_regex("[\\s]+?(?=/?>|[^\\s]|$)"), // whitespace
				lex.create_token(descriptor.ATTRIBUTE_WHITESPACE),
			],
		], 0); //}
		descriptor.define_state([ //{ state 5: question attributes
			[
				lex.check_string("?>"), // closing tag
				create_token_close_tag_fn(descriptor.TAG_CLOSE, false),
			],
			check_string,
			[
				lex.check_regex("[\\w\\-]+?(?=\\?>|[^\\w\\-]|$)"), // word
				lex.create_token(descriptor.ATTRIBUTE),
			],
			[
				lex.check_regex("[^'\"\\w\\s]+?(?=\\?>|['\"\\w\\s]|$)"), // operator
				lex.create_token(descriptor.ATTRIBUTE_OPERATOR),
			],
			[
				lex.check_regex("[\\s]+?(?=\\?>|[^\\s]|$)"), // whitespace
				lex.create_token(descriptor.ATTRIBUTE_WHITESPACE),
			],
		], 0); //}
		descriptor.define_state([ //{ state 6: declaration attributes
			[
				lex.check_string(">"), // closing tag
				create_token_close_tag_fn(descriptor.TAG_CLOSE, false),
			],
			[
				lex.check_string("["), // sub-declarations tag
				create_token_open_tag_fn(descriptor.TAG_OPEN, states.DEFAULT, flags.SUB_DECLARATION),
			],
			check_string,
			[
				lex.check_regex("[^'\"\\s]+?(?=[>\\[]|['\"\\s]|$)"), // word
				lex.create_token(descriptor.ATTRIBUTE),
			],
			[
				lex.check_regex("[\\s]+?(?=[>\\[]|[^\\s]|$)"), // whitespace
				lex.create_token(descriptor.ATTRIBUTE_WHITESPACE),
			],
		], 0); //}
		descriptor.define_state([ //{ state 7: raw data
			[
				function (p) {
					var start = p,
						re = this.raw_data_terminator.match_regex,
						m;

					re.lastIndex = p;
					m = re.exec(this.text);

					p = (m === null) ? this.text.length : m.index + m[0].length;

					return (p > start) ? [ 0 , p ] : null;
				},
				lex.create_token(descriptor.RAW_DATA),
			],
			[
				function (p) {
					return [ 0 , p + this.raw_data_terminator.match_string.length ];
				},
				function (flags, p) {
					var rdt = this.raw_data_terminator;
					this.raw_data_terminator = null;

					this.state = rdt.resume_state;
					this.extra_flags = rdt.resume_extra_flags;

					if (rdt.resume_tag !== null) {
						this.tags.push(rdt.resume_tag);
					}

					return this.create_token(rdt.match_token_type, flags | rdt.match_token_flags, p);
				},
			],
			null, // invalid
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


