# Libaries
import re;



# Generator function
def gen(lex):
	# Language descriptor
	descriptor = lex.Descriptor([
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
	], "IGNORE");
	flags = descriptor.flags;
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
	keywords = {
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

		# "abstract":     flags.NEXT_NOT_REGEX | flags.PAST,
		# "boolean":      flags.NEXT_NOT_REGEX | flags.PAST,
		# "byte":         flags.NEXT_NOT_REGEX | flags.PAST,
		# "char":         flags.NEXT_NOT_REGEX | flags.PAST,
		# "double":       flags.NEXT_NOT_REGEX | flags.PAST,
		# "final":        flags.NEXT_NOT_REGEX | flags.PAST,
		# "float":        flags.NEXT_NOT_REGEX | flags.PAST,
		# "goto":         flags.NEXT_NOT_REGEX | flags.PAST,
		# "int":          flags.NEXT_NOT_REGEX | flags.PAST,
		# "long":         flags.NEXT_NOT_REGEX | flags.PAST,
		# "native":       flags.NEXT_NOT_REGEX | flags.PAST,
		# "short":        flags.NEXT_NOT_REGEX | flags.PAST,
		# "synchronized": flags.NEXT_NOT_REGEX | flags.PAST,
		# "transient":    flags.NEXT_NOT_REGEX | flags.PAST,
		# "volatile":     flags.NEXT_NOT_REGEX | flags.PAST,

		"null":  flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		"true":  flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
		"false": flags.NEXT_NOT_REGEX | flags.NEXT_NO_OP_PREFIX,
	};
	operators = lex.tree({
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

	# Matching logic
	re_comment = re.compile(u"[^\\r\\n\u2028\u2029]*");
	re_comment_multi = re.compile(u".*?(?:\\*/|$)", re.DOTALL);
	re_regex_flags = re.compile(u"[a-z]*");
	re_newlines_search = re.compile(u"[\\r\\n\u2028\u2029]");
	re_newlines_split = re.compile(u"[\\n\u2028\u2029]|\\r\\n?");

	def match_string(self, t_info):
		# Match to end of string
		escaped = False;
		p = t_info[2];
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

		t_info[0] = self.descriptor.STRING;
		t_info[2] = p;

	def match_comment(self, t_info):
		# Check which type
		p = t_info[2];
		re_pattern = re_comment;
		if (self.text[self.pos : p] != "//"):
			re_pattern = re_comment_multi;

		# Match the comment
		m = re_pattern.match(self.text, p);

		# Create the token
		t_info[0] = self.descriptor.COMMENT;
		t_info[2] = m.end();

	def match_regex(self, t_info):
		# Check if regex is allowed
		if ((self.previous.flags & self.descriptor.flags.NEXT_NOT_REGEX) != 0 and ((self.previous.flags & self.descriptor.flags.NEXT_NOT_REGEX_CHECK) == 0 or not check_if_regex_valid(self))):
			return;

		# Match the regex
		escaped = False;
		bracketed = False;
		p = t_info[2];
		p_max = len(self.text);

		while (p < p_max):
			c = self.text[p];
			if (escaped):
				if (string_contains_newline(c)):
					break;
				escaped = False;
			else:
				if (c == "\\"):
					escaped = True;
				elif (c == "/"):
					if (not bracketed):
						# Match flags and end
						m = re_regex_flags.match(self.text, p + 1);
						p = m.end();
						break;
				elif (c == "["):
					bracketed = True;
				elif (c == "]"):
					bracketed = False;
				elif (string_contains_newline(c)):
					break;

			p += 1;

		# Create the token
		t_info[0] = self.descriptor.REGEX;
		t_info[2] = p;

	def check_if_regex_valid(self):
		# Check for an if, for, or while statement
		if (len(self.brackets) > 0):
			b = self.brackets[-1];

			if (b.token_id == self.token_id - 1 and not b.opener):
				t = b.other.before;
				if (t.type == self.descriptor.KEYWORD and t.text in [ "if" , "for" , "while" ]):
					# Probably valid
					return True;

		# Invalid
		return False;

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
		else:
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
		elif ((flags & self.descriptor.flags.START_REGEX) != 0):
			# Regex
			match_regex(self, t_info);

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


