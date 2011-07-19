/*********************************************************
 * The actual jQuery plugin and document ready handlers.
 ********************************************************/

//The publicy exposed method of jQuery.prototype, available (and meant to be
//called) on jQuery-wrapped HTML DOM elements.
$.fn.mathquill = function(cmd, latex) {
  switch (cmd) {
  case 'redraw':
    this.find(':not(:has(:first))')
      .data(jQueryDataKey).cmd.redraw();
    return this;
  case 'revert':
    return this.each(function() {
      var data = $(this).data(jQueryDataKey);
      if (data && data.revert)
        data.revert();
    });
  case 'latex':
    if (arguments.length > 1) {
      return this.each(function() {
        var data = $(this).data(jQueryDataKey);
        if (data && data.block && data.block.renderLatex)
          data.block.renderLatex(latex);
      });
    }

    var data = this.data(jQueryDataKey);
    return data && data.block && data.block.latex();
  case 'text':
    var data = this.data(jQueryDataKey);
    return data && data.block && data.block.text();
  case 'html':
    return this.html().replace(/<span class="?cursor( blink)?"?><\/span>/i, '')
      .replace(/<span class="?textarea"?><textarea><\/textarea><\/span>/i, '');

  // this case can take two extra arguments:
  // 'write', latex, keepFocus = false, moveCursor = false
  //    set keepFocus to True to keep the api call from blurring the mathquill box
  //    set moveCursor to True to have the api move the cursor into the command's firstChild
  case 'write':

      var keepFocus = arguments.length >= 3 ? arguments[2] : false // read in the keepFalse argument, or default to false
      var moveCursor = arguments.length >= 4 ? arguments[3] : false // read in the moveCursor argument, or default to false

      if (arguments.length > 1){
        return this.each(function() {
          var data = $(this).data(jQueryDataKey),
              block = data && data.block,
              cursor = block && block.cursor;

          if (cursor) {
            cursor.writeLatex(latex);
            if( !keepFocus ){
              cursor.hide();
              block.blur(); 
            } else if( moveCursor ){
              var child = cursor.prev.firstChild;
              while( child ){
              cursor.prependTo( child );
                child = cursor.next.firstChild;
              }
            }
          }
        });
      }
  default:
    var textbox = cmd === 'textbox',
      editable = textbox || cmd === 'editable',
      RootBlock = textbox ? RootTextBlock : RootMathBlock;
    return this.each(function() {
      createRoot($(this), new RootBlock, textbox, editable);
    });
  }
};

//on document ready, mathquill-ify all `<tag class="mathquill-*">latex</tag>`
//elements according to their CSS class.
$(function() {
  $('.mathquill-editable').mathquill('editable');
  $('.mathquill-textbox').mathquill('textbox');
  $('.mathquill-embedded-latex').mathquill();
});

