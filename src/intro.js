/**
* Usage:
* $(thing).mathquill();
* turns thing into a live editable math thingy.
* AMAZORZ.
*
* Note: turning into a live editable math thingmajiggie works, but
* any LaTeX math in it won't be rendered.
*
*/

jQuery.fn.mathquill = (function($){ //takes in the jQuery function as an argument

//Note: the following must be on line 14 for publish.sh to work
//$('head').append('<link rel="stylesheet" type="text/css" href="http://laughinghan.github.com/mathquill/mathquill.css">');

var todo = function(){ alert('BLAM!\n\nAHHHHHH!\n\n"Oh god, oh god, I\'ve never seen so much blood!"\n\nYeah, that doesn\'t fully work yet.'); };
