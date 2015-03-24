var i = 1, regex = 2, dont = function () {};
var x =  /regex+/*/regex+/*/regex+/*/regex+/*/regex/i;
var y = i/regex+/*/regex+/*/regex+/*/regex+/*/regex/i;
x = "" + x;
y = "" + y;

if (1)  /regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? x += "a" : x += "b";
if (1) i/regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? y += "a" : y += "b";

for (;0;)  /regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? x += "a" : x += "b";
for (;0;) i/regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? y += "a" : y += "b";

while (0)  /regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? x += "a" : x += "b";
while (0) i/regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? y += "a" : y += "b";

dont (0)  /regex+/*/regex+/*/regex+/*/regex+/*/regex/i ? x += "a" : x += "b";

alert(x);
alert(y);