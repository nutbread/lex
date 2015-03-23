# Libaries
import re;



# Generator function
def gen(lex):
	# Language descriptor
	descriptor = lex.Descriptor([
		"IGNORE",
		"MEMBER",
		"NEXT_IS_MEMBER",
		"NEXT_NO_OP_PREFIX",
		"START_STRING",
		"STRING_TRIPLE",
		"START_COMMENT",
		"BRACKET",
		"BRACKET_CLOSE",
	], "IGNORE");
	flags = descriptor.flags;
	descriptor.define_types({
		"INVALID": 0,
		"KEYWORD": 0,
		"IDENTIFIER": flags.NEXT_NO_OP_PREFIX,
		"NUMBER": flags.NEXT_NO_OP_PREFIX,
		"STRING": flags.NEXT_NO_OP_PREFIX,
		"OPERATOR": 0,
		"WHITESPACE": flags.IGNORE,
		"COMMENT": flags.IGNORE,
	});
	keywords = {
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
	operators = lex.tree({
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
				if (c == "\r" and p + 1 < p_max and self.text[p + 1] == "\n"):
					p += 1;
			else:
				if (c == quote):
					quote_count += 1;
					if (quote_count >= quote_length):
						p += 1;
						break;
				else:
					quote_count = 0;
					if (c == "\\"):
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

		# Bracket tracking
		if ((flags & self.descriptor.flags.BRACKET) != 0):
			self.bracket_track((flags & self.descriptor.flags.BRACKET_CLOSE) == 0);

		return self.create_token(t_info[0], t_info[1], t_info[2]);

	# Create descriptor
	descriptor.define_state([ # state 0 checks
		[
			lex.check_regex("\\s+"), # whitespace
			lex.create_token(descriptor.WHITESPACE),
		],
		[
			lex.check_regex("[+-]?(?:0[xX](?:[0-9a-fA-F]+)|[0-9]+(?:\\.[0-9]*)?(?:[eE][+-]?[0-9]+)?|\\.[0-9]+(?:[eE][+-]?[0-9]+)?)"), # number
			create_token_number,
		],
		[
			lex.check_regex("[\\w\\$]+"), # word
			create_token_word,
		],
		[
			lex.check_tree(operators), # operator
			create_token_operator,
		],
		[
			lex.check_regex("[^\\s\\w\\$" + re.escape(lex.to_regex_class(operators)) + "]+"), # invalid
			lex.create_token(descriptor.INVALID),
		],
	]);

	# Additional functions
	def string_contains_newline(text):
		return re_newlines_search.search(text) is not None;

	def string_splitlines(text):
		return re_newlines_split.split(text);

	setattr(descriptor, "string_contains_newline", string_contains_newline);
	setattr(descriptor, "string_splitlines", string_splitlines);

	# Complete
	return descriptor;


