// These are a few edge-case tests which actually seem to work in ie/chrome,
// but cause a syntax error in firefox
var dont = {},
	nothing = null;

(function () {
	// v1
	do
	nothing
	while (0) /regex/

	// v2
	do
	nothing
	while (0)
	/regex/


	// v3
	dont
	do
	nothing
	while (0) /regex/

	// v4
	dont
	do
	nothing
	while (0)
	/regex/


	// v5 (valid in firefox)
	dont.
	do
	nothing
	while (0) /regex/

	// v6 (valid in firefox)
	dont.
	do
	nothing
	while (0)
	/regex/
})();