var highlighter = (function () {
	"use strict";

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

	var format_default = function (lexer, token, node_class, text, line_pos) {
		return '<span class="' + node_class + '" title="' + xml_escape(lexer.repr_token(token), true) + '">' + xml_escape(text) + '</span>';
	};
	var format_tabbed = function (lexer, token, node_class, text, line_pos) {
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

		return '<span class="' + node_class + '" title="' + xml_escape(lexer.repr_token(token), true) + '">' + t + '</span>';
	};
	var format_string = function(lexer, token, node_class, text, line_pos) {
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

		return '<span class="' + node_class + '" title="' + xml_escape(lexer.repr_token(token), true) + '">' + t + '</span>';
	};
	var format_regex = function(lexer, token, node_class, text, line_pos) {
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

		return '<span class="' + node_class + '" title="' + xml_escape(lexer.repr_token(token), true) + '">' + t + '</span>';
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
					formatter = format_tabbed;
					node_class = "code_whitespace";
				}
				else if (t.type === lex_d.COMMENT) {
					split = true;
					formatter = format_tabbed;
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
						line += formatter.call(this, lexer, t, node_class, text[i], line_pos);
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
					formatter = format_tabbed;
					node_class = "code_whitespace";
				}
				else if (t.type === lex_d.COMMENT) {
					split = true;
					formatter = format_tabbed;
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
						line += formatter.call(this, lexer, t, node_class, text[i], line_pos);
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
		lexcss: function (lex, lex_d, input) {
			var lexer = new lex.Lexer(lex_d, input),
				source = '',
				line = '',
				line_pos = 0,
				prev_token = lexer.previous,
				next_token = lexer.get_token(),
				i, t, split, formatter, node_class, text, cls_target;

			while ((t = next_token) !== null) {
				next_token = lexer.get_token();

				text = t.text;
				split = false;
				formatter = format_default;
				node_class = "";

				if (t.type === lex_d.SEL_TAG) {
					node_class = "code_css_tag";
				}
				else if (t.type === lex_d.SEL_CLASS) {
					node_class = "code_css_class";
				}
				else if (t.type === lex_d.SEL_ID) {
					node_class = "code_css_id";
				}
				else if (t.type === lex_d.SEL_PSEUDO_CLASS) {
					node_class = "code_css_pseudo_class";
				}
				else if (t.type === lex_d.SEL_PSEUDO_ELEMENT) {
					node_class = "code_css_pseudo_element";
				}
				else if (t.type === lex_d.SEL_N_EXPRESSION) {
					node_class = "code_css_n_expression";
				}
				else if (t.type === lex_d.WORD) {
					if (prev_token.type === lex_d.NUMBER && [ "em", "ex", "px", "cm", "mm", "in", "pt", "pc", "ch", "rem", "vw", "vh", "vmin", "vmax", "s", "deg" ].indexOf(text) >= 0) {
						node_class = "code_css_number_suffix";
					}
					else if ((t.flags & lex_d.flags.PROPERTY) !== 0) {
						node_class = "code_css_property";
					}
					else if ((t.flags & lex_d.flags.AT_RULE) !== 0) {
						node_class = "code_css_at_word";
					}
					else if ((t.flags & lex_d.flags.SELECTOR_ATTRIBUTE) !== 0) {
						node_class = "code_css_attr";
					}
					else if ((t.flags & lex_d.flags.SELECTOR_ATTRIBUTE_VALUE) !== 0) {
						node_class = "code_css_attr_value";
					}
					else if (text === "important" && prev_token.type === lex_d.OPERATOR && prev_token.text === "!") {
						node_class = "code_css_important";
					}
					else {
						node_class = "code_css_word";
					}
				}
				else if (t.type === lex_d.AT_RULE) {
					node_class = "code_css_at_rule";
				}
				else if (t.type === lex_d.NUMBER) {
					node_class = "code_css_number";
				}
				else if (t.type === lex_d.COLOR) {
					node_class = "code_css_color";
				}
				else if (t.type === lex_d.STRING) {
					split = true;
					formatter = format_string;
					if ((t.flags & lex_d.flags.AT_RULE) !== 0) {
						node_class = "code_css_at_string";
					}
					else if ((t.flags & lex_d.flags.SELECTOR_ATTRIBUTE_VALUE) !== 0) {
						node_class = "code_css_attr_value_string";
					}
					else {
						node_class = "code_css_string";
					}
				}
				else if (t.type === lex_d.OPERATOR) {
					if (prev_token.type === lex_d.NUMBER && text === "%") {
						node_class = "code_css_number_suffix";
					}
					else if ((t.flags & lex_d.flags.AT_RULE) !== 0) {
						node_class = "code_css_at_operator";
					}
					else if ([ "{", "}", "(", ")", "[", "]", ":", ";" ].indexOf(text) >= 0) {
						node_class = "code_css_punct";
					}
					else {
						node_class = "code_css_operator";
					}
				}
				else if (t.type === lex_d.WHITESPACE) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_css_whitespace";
				}
				else if (t.type === lex_d.COMMENT) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_css_comment";
				}
				else { // if (t.type === lex_d.INVALID) {
					split = true;
					node_class = "code_css_invalid";
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
						line += formatter.call(this, lexer, t, node_class, text[i], line_pos);
						line_pos += text[i].length;
					}
				}

				// Next
				prev_token = t;
			}

			source += complete_line(line, line_pos);
			return source;
		},
		lexxml: function (lex, lex_d, input, params) {
			var lexer = new lex.Lexer(lex_d, input),
				source = '',
				line = '',
				line_pos = 0,
				prev_token_not_ws = lexer.previous,
				prev2_token_not_ws = lexer.previous,
				i, t, split, formatter, node_class, text;

			if (params === "html") lexer.html = true;

			while ((t = lexer.get_token()) !== null) {
				text = t.text;
				split = false;
				formatter = format_default;
				node_class = "";

				if (t.type === lex_d.COMMENT) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_xml_comment";
				}
				else if (t.type === lex_d.CDATA) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_xml_cdata";
				}
				else if (t.type === lex_d.RAW_DATA) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_xml_raw_data";
				}
				else if (t.type === lex_d.TAG_OPEN) {
					if ((t.flags & lex_d.flags.DECLARATION_TAG) !== 0) {
						node_class = "code_xml_dtag_open";
					}
					else if ((t.flags & lex_d.flags.SUB_DECLARATION) !== 0) {
						node_class = "code_xml_sdtag_open";
					}
					else if ((t.flags & lex_d.flags.QUESTION_TAG) !== 0) {
						node_class = "code_xml_qtag_open";
					}
					else if ((t.flags & lex_d.flags.PERCENT_TAG) !== 0) {
						node_class = "code_xml_ptag_open";
					}
					else {
						node_class = "code_xml_tag_open";
					}
				}
				else if (t.type === lex_d.TAG_CLOSE) {
					if ((t.flags & lex_d.flags.DECLARATION_TAG) !== 0) {
						node_class = "code_xml_dtag_close";
					}
					else if ((t.flags & lex_d.flags.SUB_DECLARATION) !== 0) {
						node_class = "code_xml_sdtag_close";
					}
					else if ((t.flags & lex_d.flags.QUESTION_TAG) !== 0) {
						node_class = "code_xml_qtag_close";
					}
					else if ((t.flags & lex_d.flags.PERCENT_TAG) !== 0) {
						node_class = "code_xml_ptag_close";
					}
					else {
						node_class = "code_xml_tag_close";
					}
				}
				else if (t.type === lex_d.TAG_NAME) {
					if ((t.flags & lex_d.flags.DECLARATION_TAG) !== 0) {
						node_class = "code_xml_dtag_name";
					}
					else {
						node_class = "code_xml_tag_name";
					}
				}
				else if (t.type === lex_d.ATTRIBUTE) {
					if ((t.flags & lex_d.flags.DECLARATION_TAG) !== 0) {
						node_class = "code_xml_dattr";
					}
					else {
						if (
							prev_token_not_ws.type === lex_d.ATTRIBUTE_OPERATOR && prev_token_not_ws.text === "=" && 
							prev2_token_not_ws.type === lex_d.ATTRIBUTE
						) {
							node_class = "code_xml_attr code_xml_attr_value";
						}
						else {
							node_class = "code_xml_attr";
						}
					}
				}
				else if (t.type === lex_d.ATTRIBUTE_WHITESPACE) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_xml_attr_whitespace";
				}
				else if (t.type === lex_d.ATTRIBUTE_OPERATOR) {
					node_class = "code_xml_attr_operator";
				}
				else if (t.type === lex_d.ATTRIBUTE_STRING) {
					split = true;
					if ((t.flags & lex_d.flags.DECLARATION_TAG) !== 0) {
						node_class = "code_xml_dattr_string";
					}
					else {
						if (
							prev_token_not_ws.type === lex_d.ATTRIBUTE_OPERATOR && prev_token_not_ws.text === "=" && 
							prev2_token_not_ws.type === lex_d.ATTRIBUTE
						) {
							node_class = "code_xml_attr_string code_xml_attr_value";
						}
						else {
							node_class = "code_xml_attr_string";
						}
					}
				}
				else { // if (t.type === lex_d.TEXT) {
					split = true;
					formatter = format_tabbed;
					node_class = "code_xml_text";
				}

				text = split ? lex_d.string_splitlines(text) : [ text ];
				for (i = 0; i < text.length; ++i) {
					if (i > 0) {
						source += complete_line(line, line_pos);
						line = '';
						line_pos = 0;
					}

					if (text[i].length > 0) {
						line += formatter.call(this, lexer, t, node_class, text[i], line_pos);
						line_pos += text[i].length;
					}
				}

				// Next
				if (t.type !== lex_d.ATTRIBUTE_WHITESPACE) {
					prev2_token_not_ws = prev_token_not_ws;
					prev_token_not_ws = t;
				}
			}

			source += complete_line(line, line_pos);
			return source;
		},
	};

})();


