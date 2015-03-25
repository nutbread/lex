# Libaries
import re;



# Generator function
def gen(lex):
	# Language descriptor
	descriptor = lex.Descriptor([
		u"IGNORE",
		u"TAG",
		u"DECLARATION_TAG",
		u"PERCENT_TAG",
		u"QUESTION_TAG",
		u"SUB_DECLARATION",
		u"RAW_HTML_DATA",
	], u"IGNORE");
	flags = descriptor.flags;
	descriptor.define_types({
		u"COMMENT": 0,
		u"CDATA": 0,
		u"TEXT": 0,
		u"RAW_DATA": 0,

		u"TAG_OPEN": 0,
		u"TAG_CLOSE": 0,
		u"TAG_NAME": 0,

		u"ATTRIBUTE": 0,
		u"ATTRIBUTE_WHITESPACE": 0,
		u"ATTRIBUTE_OPERATOR": 0,
		u"ATTRIBUTE_STRING": 0,
	});

	# Matching logic
	re_comment = re.compile(u"-->");
	re_cdata = re.compile(u"\\]\\]>");
	re_newlines_search = re.compile(u"[\\r\\n\u2028\u2029]");
	re_newlines_split = re.compile(u"[\\n\u2028\u2029]|\\r\\n?");
	re_bracket_open = re.compile(u"<");
	re_bracket_open_or_sub_close = re.compile(u"[<\\]]");
	re_bracket_open_char = re.compile(u"/|[\\w\\-\\?%!]");

	def match_string(self, p):
		# Match to end of string
		escaped = False;
		p_max = len(self.text);
		quote = self.text[self.pos]

		while (p < p_max):
			c = self.text[p];
			if (escaped):
				escaped = False;
				if (c == u"\r" and p + 1 < p_max and self.text[p + 1] == u"\n"):
					p += 1;
			else:
				if (c == quote):
					p += 1;
					break;
				elif (c == u"\\"):
					escaped = True;
				elif (string_contains_newline(c)):
					break;

			p += 1;

		return p;

	def match_generic(self, p, match_regex):
		# Match the comment
		m = match_regex.search(self.text, p);
		if (m is None):
			return len(self.text);
		return m.end();

	# Raw data terminator state
	class RawDataTerminator(object):
		def __init__(self, match_string, match_regex, match_token_type, match_token_flags, resume_state, resume_extra_flags, resume_tag):
			self.match_string = match_string;
			self.match_regex = match_regex;
			self.match_token_type = match_token_type;
			self.match_token_flags = match_token_flags;
			self.resume_state = resume_state;
			self.resume_extra_flags = resume_extra_flags;
			self.resume_tag = resume_tag;

	# Constructor
	def on_new(self):
		self.tags = []; # < <? <% <! [
		self.html = False;
		self.raw_data_terminator = None;
	descriptor.on_new = on_new;

	# Checks/states
	descriptor.define_state_names([
		u"DEFAULT",
		u"TAG_NAME",
		u"TAG_NAME_QUESTION",
		u"TAG_NAME_DECLARATION",
		u"ATTRIBUTES",
		u"ATTRIBUTES_QUESTION",
		u"ATTRIBUTES_DECLARATION",
		u"RAW_DATA",
	]);
	states = descriptor.states;

	def __create_token_tag_name(self, flags, p, token_type, next_state):
		self.tags[-1][3] = self.text[self.pos : p];

		t = self.create_token(token_type, flags, p);
		self.state = next_state;
		return t;
	def create_token_tag_name_fn(token_type, next_state):
		return (lambda self,f,p: __create_token_tag_name(self, f, p, token_type, next_state));

	def __create_token_open_tag(self, flags, p, token_type, next_state, next_state_flags):
		self.tags.append([ self.state , self.extra_flags , self.text[self.pos : p] , None ]);
		self.state = next_state;
		self.extra_flags = next_state_flags;
		return self.create_token(token_type, flags, p);
	def create_token_open_tag_fn(token_type, next_state, next_state_flags):
		return (lambda self,f,p: __create_token_open_tag(self, f, p, token_type, next_state, next_state_flags));

	def __create_token_close_tag(self, flags, p, token_type, html_check):
		t = self.create_token(token_type, flags, p);
		ts = self.tags.pop();

		self.state = ts[0];
		self.extra_flags = ts[1];

		if (html_check and self.html and ts[2] == u"<" and ts[3] is not None):
			tsn = ts[3].lower();
			if (tsn in [ u"script" , u"style" , u"textarea" ]):
				# Raw mode
				setup_raw_data_opener(self,
					u"</" + tsn, re.I, # match_regex
					u"</", # match_string
					self.descriptor.TAG_OPEN, # match_token_type
					self.descriptor.flags.TAG, # match_token_flags
					self.descriptor.states.TAG_NAME, # resume_state
					self.descriptor.flags.TAG, # resume_extra_flags
					[ self.state , self.extra_flags , None , None ], # resume_tag
					self.descriptor.flags.RAW_HTML_DATA # flags
				);

		return t;
	def create_token_close_tag_fn(token_type, html_check):
		return (lambda self,f,p: __create_token_close_tag(self, f, p, token_type, html_check));

	def __create_token_raw_data_opener(self, flags, p, closing_tag, token_type, tag_type_flag):
		setup_raw_data_opener(self,
			closing_tag, 0, # match_regex
			closing_tag, # match_string
			self.descriptor.TAG_CLOSE, # match_token_type
			tag_type_flag, # match_token_flags
			self.state, # resume_state
			self.extra_flags, # resume_extra_flags
			None, # resume_tag
			tag_type_flag # flags
		);

		return self.create_token(token_type, flags, p);
	def create_token_raw_data_opener_fn(closing_tag, token_type, tag_type_flag):
		return (lambda self,f,p: __create_token_raw_data_opener(self, f, p, closing_tag, token_type, tag_type_flag));

	def setup_raw_data_opener(self, match_regex, match_regex_flags, match_string, match_token_type, match_token_flags, resume_state, resume_extra_flags, resume_tag, flags):
		self.raw_data_terminator = RawDataTerminator(
			match_string,
			re.compile(u"[\\s\\S]*?(?=" + re.escape(match_regex) + u")", match_regex_flags),
			match_token_type,
			match_token_flags,
			resume_state,
			resume_extra_flags,
			resume_tag
		);

		self.state = self.descriptor.states.RAW_DATA;
		self.extra_flags = flags;


	def check_is_text(self, p):
		start = p;
		p_max = len(self.text);
		re_pattern = re_bracket_open;
		if ((self.extra_flags & self.descriptor.flags.SUB_DECLARATION) != 0):
			re_pattern = re_bracket_open_or_sub_close;

		while (True):
			m = re_pattern.search(self.text, p);
			if (m is None): break;

			p = m.end();
			if (p >= p_max): break; # end of string

			# Check for match
			if (m.group(0) == u"]" or re_bracket_open_char.match(self.text, p) is not None):
				# Match
				p_max = m.start();
				break;

		# End of string
		if (p_max > start):
			return [ 0 , p_max ];
		return None;

	def check_is_raw_data(self, p):
		start = p;
		m = self.raw_data_terminator.match_regex.match(self.text, p);

		if (m is None):
			p = len(self.text);
		else:
			p = m.end();

		if (p > start):
			return [ 0 , p ];
		return None;

	def check_is_raw_data_terminator(self, p):
		return [ 0 , p + len(self.raw_data_terminator.match_string) ];


	def create_token_comment(self, flags, p):
		p = match_generic(self, p, re_comment);
		return self.create_token(descriptor.COMMENT, flags, p);

	def create_token_cdata(self, flags, p):
		p = match_generic(self, p, re_cdata);
		return self.create_token(descriptor.CDATA, flags, p);

	def create_token_string(self, flags, p):
		p = match_string(self, p);
		return self.create_token(descriptor.ATTRIBUTE_STRING, flags, p);

	def create_token_raw_data_terminator(self, flags, p):
		rdt = self.raw_data_terminator;
		self.raw_data_terminator = None;

		self.state = rdt.resume_state;
		self.extra_flags = rdt.resume_extra_flags;

		if (rdt.resume_tag is not None):
			self.tags.append(rdt.resume_tag);

		return self.create_token(rdt.match_token_type, flags | rdt.match_token_flags, p);


	check_string = [
		lex.check_regex(u"['\"]"), # string
		create_token_string,
	];


	descriptor.define_state([ # state 0: outside of tags
		[
			lex.check_regex(u"</(?=[a-zA-Z_])"),
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME, flags.TAG),
		],
		[
			lex.check_string(u"</"),
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.ATTRIBUTES, flags.TAG),
		],
		[
			lex.check_regex(u"<(?=[a-zA-Z_])"),
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME, flags.TAG),
		],
		[
			check_is_text,
			lex.create_token(descriptor.TEXT),
		],
		[
			lex.check_regex(u"<\\?(?=[a-zA-Z_])"),
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME_QUESTION, flags.QUESTION_TAG),
		],
		[
			lex.check_string(u"<!--"),
			create_token_comment,
		],
		[
			lex.check_string(u"<![CDATA["),
			create_token_cdata,
		],
		[
			lex.check_regex(u"<!(?=[a-zA-Z_])"),
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.TAG_NAME_DECLARATION, flags.DECLARATION_TAG),
		],
		[
			lex.check_string(u"<!"),
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.ATTRIBUTES_DECLARATION, flags.DECLARATION_TAG),
		],
		[
			lex.check_string(u"<?"),
			create_token_raw_data_opener_fn(u"?>", descriptor.TAG_OPEN, flags.QUESTION_TAG),
		],
		[
			lex.check_string(u"<%"),
			create_token_raw_data_opener_fn(u"%>", descriptor.TAG_OPEN, flags.PERCENT_TAG),
		],
		[
			lex.check_string(u"]"),
			create_token_close_tag_fn(descriptor.TAG_CLOSE, False),
		],
		None, # self state should never be reached; will throw an exception if it happens
	], 0);
	descriptor.define_state([ # state 1: tag name
		[
			lex.check_regex(u"[a-zA-Z_]+"),
			create_token_tag_name_fn(descriptor.TAG_NAME, states.ATTRIBUTES),
		],
	], 0);
	descriptor.define_state([ # state 2: question tag name
		[
			lex.check_regex(u"[a-zA-Z_]+"),
			create_token_tag_name_fn(descriptor.TAG_NAME, states.ATTRIBUTES_QUESTION),
		],
	], 0);
	descriptor.define_state([ # state 3: declaration tag name
		[
			lex.check_regex(u"[a-zA-Z_]+"),
			create_token_tag_name_fn(descriptor.TAG_NAME, states.ATTRIBUTES_DECLARATION),
		],
	], 0);
	descriptor.define_state([ # state 4: attributes
		[
			lex.check_string(u">"), # closing tag
			create_token_close_tag_fn(descriptor.TAG_CLOSE, True),
		],
		[
			lex.check_string(u"/>"), # closing tag
			create_token_close_tag_fn(descriptor.TAG_CLOSE, False),
		],
		check_string,
		[
			lex.check_regex(u"[\\w\\-]+?(?=/?>|[^\\w\\-]|$)"), # word
			lex.create_token(descriptor.ATTRIBUTE),
		],
		[
			lex.check_regex(u"[^'\"\\w\\s]+?(?=/?>|['\"\\w\\s]|$)"), # operator
			lex.create_token(descriptor.ATTRIBUTE_OPERATOR),
		],
		[
			lex.check_regex(u"[\\s]+?(?=/?>|[^\\s]|$)"), # whitespace
			lex.create_token(descriptor.ATTRIBUTE_WHITESPACE),
		],
	], 0);
	descriptor.define_state([ # state 5: question attributes
		[
			lex.check_string(u"?>"), # closing tag
			create_token_close_tag_fn(descriptor.TAG_CLOSE, False),
		],
		check_string,
		[
			lex.check_regex(u"[\\w\\-]+?(?=\\?>|[^\\w\\-]|$)"), # word
			lex.create_token(descriptor.ATTRIBUTE),
		],
		[
			lex.check_regex(u"[^'\"\\w\\s]+?(?=\\?>|['\"\\w\\s]|$)"), # operator
			lex.create_token(descriptor.ATTRIBUTE_OPERATOR),
		],
		[
			lex.check_regex(u"[\\s]+?(?=\\?>|[^\\s]|$)"), # whitespace
			lex.create_token(descriptor.ATTRIBUTE_WHITESPACE),
		],
	], 0);
	descriptor.define_state([ # state 6: declaration attributes
		[
			lex.check_string(u">"), # closing tag
			create_token_close_tag_fn(descriptor.TAG_CLOSE, False),
		],
		[
			lex.check_string(u"["), # sub-declarations tag
			create_token_open_tag_fn(descriptor.TAG_OPEN, states.DEFAULT, flags.SUB_DECLARATION),
		],
		check_string,
		[
			lex.check_regex(u"[^'\"\\s]+?(?=[>\\[]|['\"\\s]|$)"), # word
			lex.create_token(descriptor.ATTRIBUTE),
		],
		[
			lex.check_regex(u"[\\s]+?(?=[>\\[]|[^\\s]|$)"), # whitespace
			lex.create_token(descriptor.ATTRIBUTE_WHITESPACE),
		],
	], 0);
	descriptor.define_state([ # state 7: raw data
		[
			check_is_raw_data,
			lex.create_token(descriptor.RAW_DATA),
		],
		[
			check_is_raw_data_terminator,
			create_token_raw_data_terminator,
		],
		None, # invalid
	], 0);


	# Additional functions
	def string_contains_newline(text):
		return re_newlines_search.search(text) is not None;

	def string_splitlines(text):
		return re_newlines_split.split(text);

	setattr(descriptor, u"string_contains_newline", string_contains_newline);
	setattr(descriptor, u"string_splitlines", string_splitlines);

	# Complete
	return descriptor;


