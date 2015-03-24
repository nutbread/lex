# Libaries
import re;



# Generator function
def gen(lex):
	# Language descriptor
	descriptor = lex.Descriptor([
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
	], "IGNORE");
	flags = descriptor.flags;
	descriptor.define_types({
		"INVALID": 0, # generic
		"WHITESPACE": 0,
		"COMMENT": flags.IGNORE,
		"STRING": 0,
		"WORD": 0,
		"OPERATOR": 0,

		"AT_RULE": 0, # at-rules

		"SEL_TAG": 0, # selectors
		"SEL_CLASS": 0,
		"SEL_ID": 0,
		"SEL_PSEUDO_CLASS": 0,
		"SEL_PSEUDO_ELEMENT": 0,
		"SEL_N_EXPRESSION": 0,

		"NUMBER": 0, # values
		"COLOR": 0,
	});

	# Matching logic
	re_comment = re.compile(u".*?(?:\\*/|$)", re.DOTALL);
	re_newlines_search = re.compile(u"[\\r\\n\u2028\u2029]");
	re_newlines_split = re.compile(u"[\\n\u2028\u2029]|\\r\\n?");

	def match_string(self, p):
		# Match to end of string
		escaped = False;
		p_max = len(self.text);
		quote = self.text[self.pos]

		while (p < p_max):
			c = self.text[p];
			if (escaped):
				escaped = False;
				if (c == "\r" and p + 1 < p_max and self.text[p + 1] == "\n"):
					p += 1;
			else:
				if (c == quote):
					p += 1;
					break;
				elif (c == "\\"):
					escaped = True;
				elif (string_contains_newline(c)):
					break;

			p += 1;

		return p;

	def match_comment(self, p):
		# Match the comment
		re_pattern = re_comment;
		m = re_pattern.match(self.text, p);
		return m.end();

	# Constructor
	def on_new(self):
		self.end_state_char = None;
		self.at_rule_state_pre = self.state;
		self.bracket_states = [];
	descriptor.on_new = on_new;

	# Checks/states
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
	states = descriptor.states;

	def create_token_comment(self, flags, p):
		p = match_comment(self, p);
		return self.create_token(self.descriptor.COMMENT, flags, p);

	def create_token_open_brace(self, flags, p):
		t = self.create_token(self.descriptor.OPERATOR, flags, p);
		self.bracket_states.append(self.state);
		self.state = self.descriptor.states.PROPERTY;
		return t;

	def create_token_close_brace(self, flags, p):
		if (len(self.bracket_states) > 0):
			self.state = self.bracket_states.pop();
		else:
			self.state = self.descriptor.states.SELECTOR;
		return self.create_token(self.descriptor.OPERATOR, flags, p);

	def create_token_selector(self, flags, p):
		token_type = self.descriptor.SEL_TAG;
		if (self.text[self.pos] == "."):
			token_type = self.descriptor.SEL_CLASS;
		elif (self.text[self.pos] == "#"):
			token_type = self.descriptor.SEL_ID;
		elif (self.text[self.pos] == ":"):
			if (self.text[self.pos + 1] == ":"):
				token_type = self.descriptor.SEL_PSEUDO_ELEMENT;
			else:
				token_type = self.descriptor.SEL_PSEUDO_CLASS;

		return self.create_token(token_type, flags, p);

	def create_token_pseudo_bracket_open(self, flags, p):
		t = None;
		if (self.previous is self.previous_actual and self.previous.type == self.descriptor.SEL_PSEUDO_CLASS):
			if (self.previous.text == ":not"):
				t = self.create_token(descriptor.OPERATOR, flags, p);
				self.end_state_char = ")";
			elif (self.previous.text in [ ":nth-child" , ":nth-last-child" , ":nth-of-type" , ":nth-last-of-type" ]):
				t = self.create_token(descriptor.OPERATOR, flags, p);
				self.state = self.descriptor.states.N_EXPRESSION;
			else: # if (self.previous.text == ":lang"):
				t = self.create_token(descriptor.OPERATOR, flags, p);
				self.state = self.descriptor.states.GENERIC;
				self.end_state_char = ")";

		return t;

	def create_token_pseudo_bracket_close(self, flags, p):
		if (self.end_state_char == self.text.substr(self.pos, p - self.pos)):
			self.end_state_char = None;
			return self.create_token(self.descriptor.OPERATOR, flags, p);
		return None;

	def create_token_at_rule(self, flags, p):
		self.at_rule_state_pre = self.state;
		self.state = self.descriptor.states.AT_RULE;
		return self.create_token(descriptor.AT_RULE, flags, p);

	def create_token_string(self, flags, p):
		p = match_string(self, p);
		return self.create_token(self.descriptor.STRING, flags, p);

	def create_token_at_rule_semicolon(self, flags, p):
		self.state = self.at_rule_state_pre;
		return self.create_token(self.descriptor.OPERATOR, flags, p);

	def create_token_at_rule_bracket_open(self, flags, p):
		t = self.create_token(self.descriptor.OPERATOR, flags, p);
		self.bracket_states.append(self.at_rule_state_pre);
		self.state = self.descriptor.states.SELECTOR;
		return t;


	def check_is_end_state_char(self, p):
		if (self.text[p] != self.end_state_char):
			return None;
		return [ 0 , p + 1 ];


	check_whitespace = [
		lex.check_regex(u"\\s+"), # whitespace
		lex.create_token(descriptor.WHITESPACE),
	];
	check_comment = [
		lex.check_regex(u"/\\*"), # comment
		create_token_comment,
	];
	check_at_rule = [
		lex.check_regex(u"@[\\w\\-]+"), # at-rule
		create_token_at_rule,
	];
	check_close_brace = [
		lex.check_string(u"}"), # end sequence
		create_token_close_brace,
	];
	check_string = [
		lex.check_regex(u"['\"]"), # string
		create_token_string,
	];
	check_end_square_bracket = [
		lex.check_string(u"]"), # ] operator
		lex.create_token_change_state_before(descriptor.OPERATOR, states.SELECTOR),
	];

	descriptor.define_state([ # state 0: selectors
		check_whitespace,
		check_comment,
		check_at_rule,
		check_close_brace,
		[
			lex.check_string(u"{"), # properties
			create_token_open_brace,
		],
		[
			lex.check_regex(u"\\*|[\\w\\-]+|[\\.:#][\\w\\-]+|::[\\w\\-]+"), # selector
			create_token_selector,
		],
		[
			lex.check_string(u"("), # ( operator
			create_token_pseudo_bracket_open,
		],
		[
			lex.check_string(u")"), # ) operator
			create_token_pseudo_bracket_close,
		],
		[
			lex.check_string(u"["), # [ operator
			lex.create_token_change_state(descriptor.OPERATOR, states.ATTRIBUTE_EXPRESSION),
		],
		[
			lex.check_regex(u"[,~>\\+]"), # operator
			lex.create_token(descriptor.OPERATOR),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.SELECTOR);
	descriptor.define_state([ # state 1: generic
		check_whitespace,
		check_comment,
		check_string,
		[
			lex.check_regex(u"[\\w\\-]+"), # word
			lex.create_token(descriptor.WORD),
		],
		[
			check_is_end_state_char,
			lex.create_token_change_state(descriptor.OPERATOR, states.SELECTOR),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.SELECTOR);
	descriptor.define_state([ # state 2: attribute expression
		check_whitespace,
		check_comment,
		check_end_square_bracket,
		[
			lex.check_regex(u"[\\w\\-]+"), # attribute name
			lex.create_token_change_state(descriptor.WORD, states.ATTRIBUTE_OPERATOR),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.SELECTOR | flags.SELECTOR_ATTRIBUTE);
	descriptor.define_state([ # state 3: attribute operator
		check_whitespace,
		check_comment,
		check_end_square_bracket,
		[
			lex.check_regex(u"[~\\$\\|\\*\\^]?="), # operator
			lex.create_token_change_state(descriptor.OPERATOR, states.ATTRIBUTE_VALUE),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.SELECTOR | flags.SELECTOR_ATTRIBUTE_OPERATOR);
	descriptor.define_state([ # state 4: attribute values
		check_whitespace,
		check_comment,
		check_end_square_bracket,
		check_string,
		[
			lex.check_regex(u"[\\w\\-]+"), # value
			lex.create_token(descriptor.WORD),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.SELECTOR | flags.SELECTOR_ATTRIBUTE_VALUE);
	descriptor.define_state([ # state 5: n-expressions
		check_whitespace,
		check_comment,
		[
			lex.check_string(u")"), # ) operator
			lex.create_token_change_state_before(descriptor.OPERATOR, states.SELECTOR),
		],
		[
			lex.check_regex(u"(even|odd)|(?:([+-]?\\d+)|([+-]))?n(?:\\s*([+-])\\s*(\\d+))?|([+-]?\\d+)", re.I), # n expression
			lex.create_token(descriptor.SEL_N_EXPRESSION),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.N_EXPRESSION);
	descriptor.define_state([ # state 6: at-rule
		check_whitespace,
		check_comment,
		check_close_brace,
		check_string,
		[
			lex.check_string(u";"), # end sequence
			create_token_at_rule_semicolon,
		],
		[
			lex.check_string(u"{"), # end sequence
			create_token_at_rule_bracket_open,
		],
		[
			lex.check_regex(u"[\\w\\-]+"), # word
			lex.create_token(descriptor.WORD),
		],
		[
			lex.check_regex(u"[:\\(\\)]"), # operators
			lex.create_token(descriptor.OPERATOR),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.AT_RULE);
	descriptor.define_state([ # state 7: properties
		check_whitespace,
		check_comment,
		check_close_brace,
		check_at_rule,
		[
			lex.check_regex(u"[\\w\\-]+"), # word
			lex.create_token_change_state(descriptor.WORD, states.PROPERTY_SEPARATOR),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.PROPERTY);
	descriptor.define_state([ # state 8: property separator
		check_whitespace,
		check_comment,
		check_close_brace,
		[
			lex.check_string(u":"), # : operator
			lex.create_token_change_state(descriptor.OPERATOR, states.PROPERTY_VALUE),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.PROPERTY);
	descriptor.define_state([ # state 9: property values
		check_whitespace,
		check_comment,
		check_close_brace,
		check_string,
		[
			lex.check_string(u";"), # ; operator
			lex.create_token_change_state(descriptor.OPERATOR, states.PROPERTY),
		],
		[
			lex.check_regex(u"#(?:[0-9a-fA-F]+)"), # color
			lex.create_token(descriptor.COLOR),
		],
		[
			lex.check_regex(u"[+-]?(?:[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|\\.[0-9]+(?:[eE][+-]?[0-9]+)?)"), # number
			lex.create_token(descriptor.NUMBER),
		],
		[
			lex.check_regex(u"[\\w\\-]+"), # word
			lex.create_token(descriptor.WORD),
		],
		[
			lex.check_regex(u"[\\(\\),/%!]"), # operator
			lex.create_token(descriptor.OPERATOR),
		],
		[
			lex.check_null(), # invalid
			lex.create_token(descriptor.INVALID),
		],
	], flags.PROPERTY_VALUE);

	# Additional functions
	def string_contains_newline(text):
		return re_newlines_search.search(text) is not None;

	def string_splitlines(text):
		return re_newlines_split.split(text);

	setattr(descriptor, "string_contains_newline", string_contains_newline);
	setattr(descriptor, "string_splitlines", string_splitlines);

	# Complete
	return descriptor;



