# Libaries
import re;



# Generator function
def gen(lex):
	# Language descriptor
	descriptor = lex.Descriptor([
		u"IGNORE",
		u"MEMBER",
		u"NEXT_IS_MEMBER",
		u"NEXT_NO_OP_PREFIX",
		u"START_STRING",
		u"STRING_TRIPLE",
		u"START_COMMENT",
		u"BRACKET",
		u"BRACKET_CLOSE",
	], u"IGNORE");
	flags = descriptor.flags;
	descriptor.define_types({
		u"INVALID": 0,
		u"KEYWORD": 0,
		u"IDENTIFIER": flags.NEXT_NO_OP_PREFIX,
		u"NUMBER": flags.NEXT_NO_OP_PREFIX,
		u"STRING": flags.NEXT_NO_OP_PREFIX,
		u"OPERATOR": 0,
		u"DECORATOR": 0,
		u"WHITESPACE": flags.IGNORE,
		u"COMMENT": flags.IGNORE,
	});
	keywords = {
		u"and": 0,
		u"as": 0,
		u"assert": 0,
		u"break": 0,
		u"class": 0,
		u"continue": 0,
		u"def": 0,
		u"del": 0,
		u"elif": 0,
		u"else": 0,
		u"except": 0,
		u"finally": 0,
		u"for": 0,
		u"from": 0,
		u"global": 0,
		u"if": 0,
		u"import": 0,
		u"in": 0,
		u"is": 0,
		u"lambda": 0,
		u"nonlocal": 0,
		u"not": 0,
		u"or": 0,
		u"pass": 0,
		u"raise": 0,
		u"return": 0,
		u"try": 0,
		u"while": 0,
		u"with": 0,
		u"yield": 0,
	};
	operators = lex.tree({
		u">>=": 0,
		u">>": 0,
		u">=": 0,
		u">": 0,

		u"<<=": 0,
		u"<<": 0,
		u"<=": 0,
		u"<": 0,
		u"<>": 0,

		u"==": 0,
		u"=": 0,

		u"!=": 0,

		u"&=": 0,
		u"&": 0,

		u"|=": 0,
		u"|": 0,

		u"+=": 0,
		u"+": 0,

		u"-=": 0,
		u"-": 0,

		u"**=": 0,
		u"**": 0,
		u"*=": 0,
		u"*": 0,

		u"//=": 0,
		u"//": 0,
		u"/=": 0,
		u"/": 0,

		u"%=": 0,
		u"%": 0,

		u"^=": 0,
		u"^": 0,

		u"~": 0,
		u":": 0,
		u";": 0,
		u",": 0,
		u".": flags.NEXT_IS_MEMBER | flags.NEXT_NO_OP_PREFIX,
		u"...": 0,

		u"\\": 0,

		u"(": flags.BRACKET,
		u"[": flags.BRACKET,
		u"{": flags.BRACKET,
		u")": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NO_OP_PREFIX,
		u"]": flags.BRACKET | flags.BRACKET_CLOSE | flags.NEXT_NO_OP_PREFIX,
		u"}": flags.BRACKET | flags.BRACKET_CLOSE,

		u"#": flags.START_COMMENT,
		u"\"": flags.START_STRING,
		u"\"\"\"": flags.START_STRING | flags.STRING_TRIPLE,
		u"\'": flags.START_STRING,
		u"\'\'\'": flags.START_STRING | flags.STRING_TRIPLE,
	});

	# Matching logic
	re_comment = re.compile(u"[^\\r\\n\u2028\u2029]*");
	re_newlines_search = re.compile(u"[\\r\\n\u2028\u2029]");
	re_newlines_split = re.compile(u"[\\n\u2028\u2029]|\\r\\n?");

	def match_string(self, t_info):
		# Match to end of string
		escaped = False;
		p = t_info[2];
		p_max = len(self.text);
		quote = self.text[self.pos]
		quote_count = 0;
		quote_length = 1;
		if ((t_info[1] & self.descriptor.flags.STRING_TRIPLE) != 0): quote_length = 3;

		while (p < p_max):
			c = self.text[p];
			if (escaped):
				escaped = False;
				if (c == u"\r" and p + 1 < p_max and self.text[p + 1] == u"\n"):
					p += 1;
			else:
				if (c == quote):
					quote_count += 1;
					if (quote_count >= quote_length):
						p += 1;
						break;
				else:
					quote_count = 0;
					if (c == u"\\"):
						escaped = True;
					elif (string_contains_newline(c) and quote_length == 1):
						break;

			p += 1;

		t_info[0] = self.descriptor.STRING;
		t_info[2] = p;

	def match_comment(self, t_info):
		# Match the comment
		p = t_info[2];
		m = re_comment.match(self.text, p);

		# Create the token
		t_info[0] = self.descriptor.COMMENT;
		t_info[2] = m.end();

	# Token creation functions
	def create_token_number(self, flags, p):
		if ((self.previous.flags & self.descriptor.flags.NEXT_NO_OP_PREFIX) == 0 or self.match_tree(operators, self.pos, self.pos + 1) is None):
			return self.create_token(descriptor.NUMBER, flags, p);

		return None;

	def create_token_word(self, flags, p):
		token_type = self.descriptor.IDENTIFIER;

		if ((self.previous.flags & self.descriptor.flags.NEXT_IS_MEMBER) != 0):
			# Member
			flags |= self.descriptor.flags.MEMBER;

		# Check if keyword
		word = self.text[self.pos : p];
		if (word in keywords):
			token_type = self.descriptor.KEYWORD;
			flags |= keywords[word];

		return self.create_token(token_type, flags, p);

	def create_token_operator(self, flags, p):
		t_info = [ self.descriptor.OPERATOR , flags , p ];

		if ((flags & self.descriptor.flags.START_STRING) != 0):
			# String
			match_string(self, t_info);
		elif ((flags & self.descriptor.flags.START_COMMENT) != 0):
			# Comment
			match_comment(self, t_info);

		return self.create_token(t_info[0], t_info[1], t_info[2]);

	# Create descriptor
	descriptor.define_state_names([ u"DEFAULT" ]);
	descriptor.define_state([ # state 0
		[
			lex.check_regex(u"\\s+"), # whitespace
			lex.create_token(descriptor.WHITESPACE),
		],
		[
			lex.check_regex(u"[+-]?(?:0[xX](?:[0-9a-fA-F]+)|[0-9]+(?:\\.[0-9]*)?(?:[eE][+-]?[0-9]+)?|\\.[0-9]+(?:[eE][+-]?[0-9]+)?)"), # number
			create_token_number,
		],
		[
			lex.check_regex(u"[\\w]+"), # word
			create_token_word,
		],
		[
			lex.check_regex(u"@[\\w]+"), # decorator
			lex.create_token(descriptor.DECORATOR),
		],
		[
			lex.check_tree(operators), # operator
			create_token_operator,
		],
		[
			lex.check_regex(u"[^\\s\\w@" + re.escape(lex.to_regex_class(operators)) + u"]+"), # invalid
			lex.create_token(descriptor.INVALID),
		],
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


