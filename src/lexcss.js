var lexcss = (function () {
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
			"AT_RULE",
			"SELECTOR",
			"PROPERTY",
			"PROPERTY_VALUE",
			"VALUE",
			"N_EXPRESSION",
			"SELECTOR_ATTRIBUTE",
			"SELECTOR_ATTRIBUTE_OPERATOR",
			"SELECTOR_ATTRIBUTE_VALUE",
		], "IGNORE"); //}
		var flags = descriptor.flags;
		descriptor.define_types({
			"INVALID": 0, // generic
			"WHITESPACE": 0,
			"COMMENT": flags.IGNORE,
			"STRING": 0,
			"WORD": 0,
			"OPERATOR": 0,

			"AT_RULE": 0, // at-rules

			"SEL_TAG": 0, // selectors
			"SEL_CLASS": 0,
			"SEL_ID": 0,
			"SEL_PSEUDO_CLASS": 0,
			"SEL_PSEUDO_ELEMENT": 0,
			"SEL_N_EXPRESSION": 0,

			"NUMBER": 0, // values
			"COLOR": 0,
		});

		// Matching logic
		var re_comment = /\*\/|$/g,
			re_newlines_search = /[\r\n\u2028\u2029]/,
			re_newlines_split = /[\n\u2028\u2029]|\r\n?/g;

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
		var match_comment = function (p) {
			// Match the comment
			var re = re_comment,
				m;

			re.lastIndex = p;
			m = re.exec(this.text);

			// Create the token
			return m.index + m[0].length;
		};

		// Constructor
		descriptor.on_new = function () {
			this.end_state_char = null;
			this.at_rule_state_pre = this.state;
			this.bracket_states = [];
		};

		// Checks/states
		descriptor.define_state_names([
			"SELECTOR",
			"GENERIC",
			"ATTRIBUTE_EXPRESSION",
			"ATTRIBUTE_OPERATOR",
			"ATTRIBUTE_VALUE",
			"N_EXPRESSION",
			"AT_RULE",
			"PROPERTY",
			"PROPERTY_SEPARATOR",
			"PROPERTY_VALUE",
		]);
		var states = descriptor.states;

		var check_whitespace, check_comment, check_at_rule, check_end_square_bracket, check_close_brace, check_string;
		descriptor.define_state([ //{ state 0: selectors
			check_whitespace = [
				lex.check_regex("\\s+"), // whitespace
				lex.create_token(descriptor.WHITESPACE),
			],
			check_comment = [
				lex.check_regex("/\\*"), // comment
				function (flags, p) {
					p = match_comment.call(this, p);
					return this.create_token(this.descriptor.COMMENT, flags, p);
				},
			],
			check_at_rule = [
				lex.check_regex("@[\\w\\-]+"), // at-rule
				function (flags, p) {
					this.at_rule_state_pre = this.state;
					this.state = this.descriptor.states.AT_RULE;
					return this.create_token(descriptor.AT_RULE, flags, p);
				},
			],
			check_close_brace = [
				lex.check_string("}"), // end sequence
				function (flags, p) {
					this.state = (this.bracket_states.length > 0) ? this.bracket_states.pop() : this.descriptor.states.SELECTOR;
					return this.create_token(this.descriptor.OPERATOR, flags, p);
				},
			],
			[
				lex.check_string("{"), // properties
				function (flags, p) {
					var t = this.create_token(this.descriptor.OPERATOR, flags, p);
					this.bracket_states.push(this.state);
					this.state = this.descriptor.states.PROPERTY;
					return t;
				},
			],
			[
				lex.check_regex("\\*|[\\w\\-]+|[\\.:#][\\w\\-]+|::[\\w\\-]+"), // selector
				function (flags, p) {
					var token_type = this.descriptor.SEL_TAG;
					if (this.text[this.pos] === ".") {
						token_type = this.descriptor.SEL_CLASS;
					}
					else if (this.text[this.pos] === "#") {
						token_type = this.descriptor.SEL_ID;
					}
					else if (this.text[this.pos] === ":") {
						if (this.text[this.pos + 1] === ":") {
							token_type = this.descriptor.SEL_PSEUDO_ELEMENT;
						}
						else {
							token_type = this.descriptor.SEL_PSEUDO_CLASS;
						}
					}
					return this.create_token(token_type, flags, p);
				},
			],
			[
				lex.check_string("("), // ( operator
				function (flags, p) {
					var t = null;
					if (this.previous === this.previous_actual && this.previous.type === this.descriptor.SEL_PSEUDO_CLASS) {
						if (this.previous.text === ":not") {
							t = this.create_token(descriptor.OPERATOR, flags, p);
							this.end_state_char = ")";
						}
						else if ([ ":nth-child" , ":nth-last-child" , ":nth-of-type" , ":nth-last-of-type" ].indexOf(this.previous.text) >= 0) {
							t = this.create_token(descriptor.OPERATOR, flags, p);
							this.state = this.descriptor.states.N_EXPRESSION;
						}
						else { // if (this.previous.text === ":lang") {
							t = this.create_token(descriptor.OPERATOR, flags, p);
							this.state = this.descriptor.states.GENERIC;
							this.end_state_char = ")";
						}
					}
					return t;
				},
			],
			[
				lex.check_string(")"), // ) operator
				function (flags, p) {
					if (this.end_state_char === this.text.substr(this.pos, p - this.pos)) {
						this.end_state_char = null;
						return this.create_token(this.descriptor.OPERATOR, flags, p);
					}
					return null;
				},
			],
			[
				lex.check_string("["), // [ operator
				lex.create_token_change_state(descriptor.OPERATOR, states.ATTRIBUTE_EXPRESSION),
			],
			[
				lex.check_regex("[,~>\\+]"), // operator
				lex.create_token(descriptor.OPERATOR),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.SELECTOR); //}
		descriptor.define_state([ //{ state 1: generic
			check_whitespace,
			check_comment,
			check_string = [
				lex.check_regex("['\"]"), // string
				function (flags, p) {
					p = match_string.call(this, p);
					return this.create_token(this.descriptor.STRING, flags, p);
				},
			],
			[
				lex.check_regex("[\\w\\-]+"), // word
				lex.create_token(descriptor.WORD),
			],
			[
				function (p) {
					return (this.text[p] !== this.end_state_char) ? null : [ 0 , p + 1 ];
				},
				lex.create_token_change_state(descriptor.OPERATOR, states.SELECTOR),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.SELECTOR); //}
		descriptor.define_state([ //{ state 2: attribute expression
			check_whitespace,
			check_comment,
			check_end_square_bracket = [
				lex.check_string("]"), // ] operator
				lex.create_token_change_state_before(descriptor.OPERATOR, states.SELECTOR),
			],
			[
				lex.check_regex("[\\w\\-]+"), // attribute name
				lex.create_token_change_state(descriptor.WORD, states.ATTRIBUTE_OPERATOR),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.SELECTOR | flags.SELECTOR_ATTRIBUTE); //}
		descriptor.define_state([ //{ state 3: attribute operator
			check_whitespace,
			check_comment,
			check_end_square_bracket,
			[
				lex.check_regex("[~\\$\\|\\*\\^]?="), // operator
				lex.create_token_change_state(descriptor.OPERATOR, states.ATTRIBUTE_VALUE),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.SELECTOR | flags.SELECTOR_ATTRIBUTE_OPERATOR); //}
		descriptor.define_state([ //{ state 4: attribute values
			check_whitespace,
			check_comment,
			check_end_square_bracket,
			check_string,
			[
				lex.check_regex("[\\w\\-]+"), // value
				lex.create_token(descriptor.WORD),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.SELECTOR | flags.SELECTOR_ATTRIBUTE_VALUE); //}
		descriptor.define_state([ //{ state 5: n-expressions
			check_whitespace,
			check_comment,
			[
				lex.check_string(")"), // ) operator
				lex.create_token_change_state_before(descriptor.OPERATOR, states.SELECTOR),
			],
			[
				lex.check_regex("(even|odd)|(?:([+-]?\\d+)|([+-]))?n(?:\\s*([+-])\\s*(\\d+))?|([+-]?\\d+)", "i"), // n expression
				lex.create_token(descriptor.SEL_N_EXPRESSION),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.N_EXPRESSION); //}
		descriptor.define_state([ //{ state 6: at-rule
			check_whitespace,
			check_comment,
			check_close_brace,
			check_string,
			[
				lex.check_string(";"), // end sequence
				function (flags, p) {
					this.state = this.at_rule_state_pre;
					return this.create_token(this.descriptor.OPERATOR, flags, p);
				},
			],
			[
				lex.check_string("{"), // end sequence
				function (flags, p) {
					var t = this.create_token(this.descriptor.OPERATOR, flags, p);
					this.bracket_states.push(this.at_rule_state_pre);
					this.state = this.descriptor.states.SELECTOR;
					return t;
				},
			],
			[
				lex.check_regex("[\\w\\-]+"), // word
				lex.create_token(descriptor.WORD),
			],
			[
				lex.check_regex("[:\\(\\)]"), // operators
				lex.create_token(descriptor.OPERATOR),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.AT_RULE); //}
		descriptor.define_state([ //{ state 7: properties
			check_whitespace,
			check_comment,
			check_close_brace,
			check_at_rule,
			[
				lex.check_regex("[\\w\\-]+"), // word
				lex.create_token_change_state(descriptor.WORD, states.PROPERTY_SEPARATOR),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.PROPERTY); //}
		descriptor.define_state([ //{ state 8: property separator
			check_whitespace,
			check_comment,
			check_close_brace,
			[
				lex.check_string(":"), // : operator
				lex.create_token_change_state(descriptor.OPERATOR, states.PROPERTY_VALUE),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.PROPERTY); //}
		descriptor.define_state([ //{ state 9: property values
			check_whitespace,
			check_comment,
			check_close_brace,
			check_string,
			[
				lex.check_string(";"), // ; operator
				lex.create_token_change_state(descriptor.OPERATOR, states.PROPERTY),
			],
			[
				lex.check_regex("#(?:[0-9a-fA-F]+)"), // color
				lex.create_token(descriptor.COLOR),
			],
			[
				lex.check_regex("[+-]?(?:[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|\\.[0-9]+(?:[eE][+-]?[0-9]+)?)"), // number
				lex.create_token(descriptor.NUMBER),
			],
			[
				lex.check_regex("[\\w\\-]+"), // word
				lex.create_token(descriptor.WORD),
			],
			[
				lex.check_regex("[\\(\\),/%!]"), // operator
				lex.create_token(descriptor.OPERATOR),
			],
			[
				lex.check_null(), // invalid
				lex.create_token(descriptor.INVALID),
			],
		], flags.PROPERTY_VALUE); //}

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


