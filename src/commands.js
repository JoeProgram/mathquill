/***************************
 * Commands and Operators and Environments.
 *
 * A Command in LaTex is defined by \<command>{arg1}{arg2}...
 *   a good example is fractions, where one-half is:
 *
 * \frac{1}{2}
 *
 * An environment works like tags in html, in that it opens and closes,
 *   and uses the information between the start and the end.
 *   A good example is the 3 by 3 identity matrix:
 *
 * \begin{array}{ccc}
 *    1 & 0 & 0 \\
 *    0 & 1 & 0 \\
 *     0 & 0 & 1
 * \end{array}
 **************************/

var CharCmds = {}, LatexCmds = {}, LatexEnvirons = {}; //single character commands, LaTeX commands, LaTeX environments

function proto(parent, child) { //shorthand for prototyping
  child.prototype = parent.prototype;
  return child;
}

function SupSub(cmd, html, text, replacedFragment) {
  MathCommand.call(this, cmd, [ html ], [ text ], replacedFragment);
}
_ = SupSub.prototype = new MathCommand;
_.latex = function() {
  var latex = this.firstChild.latex();
  if (latex.length === 1)
    return this.cmd + latex;
  else
    return this.cmd + '{' + (latex || ' ') + '}';
};
_.redraw = function() {
  this.respace();
  if (this.next)
    this.next.respace();
  if (this.prev)
    this.prev.respace();
};
_.respace = function() {
  if (
    this.prev.cmd === '\\int ' || (
      this.prev instanceof SupSub && this.prev.cmd != this.cmd &&
      this.prev.prev && this.prev.prev.cmd === '\\int '
    )
  ) {
    if (!this.limit) {
      this.limit = true;
      this.jQ.addClass('limit');
    }
  }
  else {
    if (this.limit) {
      this.limit = false;
      this.jQ.removeClass('limit');
    }
  }

  if (this.respaced = this.prev instanceof SupSub && this.prev.cmd != this.cmd && !this.prev.respaced) {
    if (this.limit && this.cmd === '_') {
      this.jQ.css({
        left: -.25-this.prev.jQ.outerWidth()/+this.jQ.css('fontSize').slice(0,-2)+'em',
        marginRight: .1-Math.min(this.jQ.outerWidth(), this.prev.jQ.outerWidth())/+this.jQ.css('fontSize').slice(0,-2)+'em' //1px adjustment very important!
      });
    }
    else {
      this.jQ.css({
        left: -this.prev.jQ.outerWidth()/+this.jQ.css('fontSize').slice(0,-2)+'em',
        marginRight: .1-Math.min(this.jQ.outerWidth(), this.prev.jQ.outerWidth())/+this.jQ.css('fontSize').slice(0,-2)+'em' //1px adjustment very important!
      });
    }
  }
  else if (this.limit && this.cmd === '_') {
    this.jQ.css({
      left: '-.25em',
      marginRight: ''
    });
  }
  else {
    this.jQ.css({
      left: '',
      marginRight: ''
    });
  }

  return this;
};

LatexCmds.subscript = LatexCmds._ = proto(SupSub, function(replacedFragment) {
  SupSub.call(this, '_', '<sub></sub>', '_', replacedFragment);
});

LatexCmds.superscript =
LatexCmds.supscript =
LatexCmds['^'] = proto(SupSub, function(replacedFragment) {
  SupSub.call(this, '^', '<sup></sup>', '**', replacedFragment);
});

function Fraction(replacedFragment) {
  MathCommand.call(this, '\\frac', undefined, undefined, replacedFragment);
  this.jQ.append('<span style="width:0">&nbsp;</span>');
}
_ = Fraction.prototype = new MathCommand;
_.html_template = [
  '<span class="fraction"></span>',
  '<span class="numerator"></span>',
  '<span class="denominator"></span>'
];
_.text_template = ['(', '/', ')'];

LatexCmds.frac = LatexCmds.fraction = Fraction;

function LiveFraction() {
  Fraction.apply(this, arguments);
}
_ = LiveFraction.prototype = new Fraction;
_.placeCursor = function(cursor) {
  if (this.firstChild.isEmpty()) {
    var prev = this.prev;
    while (prev &&
      !(
        prev instanceof BinaryOperator ||
        prev instanceof TextBlock ||
        prev instanceof BigSymbol
      ) //lookbehind for operator
    )
      prev = prev.prev;

    if (prev instanceof BigSymbol && prev.next instanceof SupSub) {
      prev = prev.next;
      if (prev.next instanceof SupSub && prev.next.cmd != prev.cmd)
        prev = prev.next;
    }

    if (prev !== this.prev) {
      var newBlock = new MathFragment(this.parent, prev, this).blockify();
      newBlock.jQ = this.firstChild.jQ.empty().removeClass('empty').append(newBlock.jQ).data(jQueryDataKey, { block: newBlock });
      newBlock.next = this.lastChild;
      newBlock.parent = this;
      this.firstChild = this.lastChild.prev = newBlock;
    }
  }
  cursor.appendTo(this.lastChild);
};

CharCmds['/'] = LiveFraction;

function SquareRoot(replacedFragment) {
  MathCommand.call(this, '\\sqrt', undefined, undefined, replacedFragment);
}
_ = SquareRoot.prototype = new MathCommand;
_.html_template = [
  '<span><span class="sqrt-prefix">&radic;</span></span>',
  '<span class="sqrt-stem"></span>'
];
_.text_template = ['sqrt(', ')'];
_.redraw = function() {
  var block = this.lastChild.jQ, height = block.outerHeight(true);
  block.css({
    borderTopWidth: height/28+1 // NOTE: Formula will need to change if our font isn't Symbola
  }).prev().css({
    fontSize: .9*height/+block.css('fontSize').slice(0,-2)+'em'
  });
};

LatexCmds.sqrt = LatexCmds['√'] = SquareRoot;

function NthRoot(replacedFragment) {
  SquareRoot.call(this, replacedFragment);
  this.jQ = this.firstChild.jQ.detach().add(this.jQ);
}
_ = NthRoot.prototype = new SquareRoot;
_.html_template = [
  '<span><span class="sqrt-prefix">&radic;</span></span>',
  '<sup class="nthroot"></sup>',
  '<span class="sqrt-stem"></span>'
];
_.text_template = ['sqrt[', '](', ')'];
_.latex = function() {
  return '\\sqrt['+this.firstChild.latex()+']{'+this.lastChild.latex()+'}';
};

LatexCmds.nthroot = NthRoot;

// Round/Square/Curly/Angle Brackets (aka Parens/Brackets/Braces)
function Bracket(open, close, cmd, end, replacedFragment) {
  MathCommand.call(this, '\\left'+cmd,
    ['<span><span class="paren">'+open+'</span><span></span><span class="paren">'+close+'</span></span>'],
    [open, close],
    replacedFragment);
  this.end = '\\right'+end;
}
_ = Bracket.prototype = new MathCommand;
_.initBlocks = function(replacedFragment) {
  this.firstChild = this.lastChild =
    (replacedFragment && replacedFragment.blockify()) || new MathBlock;
  this.firstChild.parent = this;
  this.firstChild.jQ = this.jQ.children(':eq(1)')
    .data(jQueryDataKey, {block: this.firstChild})
    .append(this.firstChild.jQ);
};
_.latex = function() {
  return this.cmd + this.firstChild.latex() + this.end;
};
_.redraw = function() {
  var block = this.firstChild.jQ;
  block.prev().add(block.next()).css('fontSize', block.outerHeight()/(+block.css('fontSize').slice(0,-2)*1.02)+'em');
};

LatexCmds.lbrace = CharCmds['{'] = proto(Bracket, function(replacedFragment) {
  Bracket.call(this, '{', '}', '\\{', '\\}', replacedFragment);
});
LatexCmds.langle = LatexCmds.lang = proto(Bracket, function(replacedFragment) {
  Bracket.call(this,'&lang;','&rang;','\\langle ','\\rangle ',replacedFragment);
});

// Closing bracket matching opening bracket above
function CloseBracket(open, close, cmd, end, replacedFragment) {
  Bracket.apply(this, arguments);
}
_ = CloseBracket.prototype = new Bracket;
_.placeCursor = function(cursor) {
  //if I'm at the end of my parent who is a matching open-paren, and I was not passed
  //  a selection fragment, get rid of me and put cursor after my parent
  if (!this.next && this.parent.parent && this.parent.parent.end === this.end && this.firstChild.isEmpty())
    cursor.backspace().insertAfter(this.parent.parent);
  else
    this.firstChild.blur();
};

LatexCmds.rbrace = CharCmds['}'] = proto(CloseBracket, function(replacedFragment) {
  CloseBracket.call(this, '{','}','\\{','\\}',replacedFragment);
});
LatexCmds.rangle = LatexCmds.rang = proto(CloseBracket, function(replacedFragment) {
  CloseBracket.call(this,'&lang;','&rang;','\\langle ','\\rangle ',replacedFragment);
});

function Paren(open, close, replacedFragment) {
  Bracket.call(this, open, close, open, close, replacedFragment);
}
Paren.prototype = Bracket.prototype;

LatexCmds.lparen = CharCmds['('] = proto(Paren, function(replacedFragment) {
  Paren.call(this, '(', ')', replacedFragment);
});
LatexCmds.lbrack = LatexCmds.lbracket = CharCmds['['] = proto(Paren, function(replacedFragment) {
  Paren.call(this, '[', ']', replacedFragment);
});

function CloseParen(open, close, replacedFragment) {
  CloseBracket.call(this, open, close, open, close, replacedFragment);
}
CloseParen.prototype = CloseBracket.prototype;

LatexCmds.rparen = CharCmds[')'] = proto(CloseParen, function(replacedFragment) {
  CloseParen.call(this, '(', ')', replacedFragment);
});
LatexCmds.rbrack = LatexCmds.rbracket = CharCmds[']'] = proto(CloseParen, function(replacedFragment) {
  CloseParen.call(this, '[', ']', replacedFragment);
});

function Pipes(replacedFragment) {
  Paren.call(this, '|', '|', replacedFragment);
}
_ = Pipes.prototype = new Paren;
_.placeCursor = function(cursor) {
  if (!this.next && this.parent.parent && this.parent.parent.end === this.end && this.firstChild.isEmpty())
    cursor.backspace().insertAfter(this.parent.parent);
  else
    cursor.appendTo(this.firstChild);
};

LatexCmds.lpipe = LatexCmds.rpipe = CharCmds['|'] = Pipes;

function TextBlock(replacedText) {
  if (replacedText instanceof MathFragment)
    this.replacedText = replacedText.remove().jQ.text();
  else if (typeof replacedText === 'string')
    this.replacedText = replacedText;

  MathCommand.call(this, '\\text');
}
_ = TextBlock.prototype = new MathCommand;
_.html_template = ['<span class="text"></span>'];
_.text_template = ['"', '"'];
_.initBlocks = function() {
  this.firstChild =
  this.lastChild =
  this.jQ.data(jQueryDataKey).block = new InnerTextBlock;

  this.firstChild.parent = this;
  this.firstChild.jQ = this.jQ.append(this.firstChild.jQ);
};
_.placeCursor = function(cursor) {
  (this.cursor = cursor).appendTo(this.firstChild);

  if (this.replacedText)
    for (var i = 0; i < this.replacedText.length; i += 1)
      this.write(this.replacedText.charAt(i));
};
_.write = function(ch) {
  this.cursor.insertNew(new VanillaSymbol(ch));
};
_.keydown = function(e) {
  //backspace and delete and ends of block don't unwrap
  if (!this.cursor.selection &&
    (
      (e.which === 8 && !this.cursor.prev) ||
      (e.which === 46 && !this.cursor.next)
    )
  ) {
    if (this.isEmpty())
      this.cursor.insertAfter(this);
    return false;
  }
  return this.parent.keydown(e);
};
_.textInput = function(ch) {
  this.cursor.deleteSelection();
  if (ch !== '$')
    this.write(ch);
  else if (this.isEmpty())
    this.cursor.insertAfter(this).backspace().insertNew(new VanillaSymbol('\\$','$'));
  else if (!this.cursor.next)
    this.cursor.insertAfter(this);
  else if (!this.cursor.prev)
    this.cursor.insertBefore(this);
  else { //split apart
    var next = new TextBlock(new MathFragment(this.firstChild, this.cursor.prev));
    next.placeCursor = function(cursor) // ********** REMOVEME HACK **********
    {
      this.prev = 0;
      delete this.placeCursor;
      this.placeCursor(cursor);
    };
    next.firstChild.focus = function(){ return this; };
    this.cursor.insertAfter(this).insertNew(next);
    next.prev = this;
    this.cursor.insertBefore(next);
    delete next.firstChild.focus;
  }
};
function InnerTextBlock(){}
_ = InnerTextBlock.prototype = new MathBlock;
_.blur = function() {
  this.jQ.removeClass('hasCursor');
  if (this.isEmpty()) {
    var textblock = this.parent, cursor = textblock.cursor;
    if (cursor.parent === this)
      this.jQ.addClass('empty');
    else {
      cursor.hide();
      textblock.remove();
      if (cursor.next === textblock)
        cursor.next = textblock.next;
      else if (cursor.prev === textblock)
        cursor.prev = textblock.prev;

      cursor.show().redraw();
    }
  }
  return this;
};
_.focus = function() {
  MathBlock.prototype.focus.call(this);

  var textblock = this.parent;
  if (textblock.next instanceof TextBlock) {
    var innerblock = this,
      cursor = textblock.cursor,
      next = textblock.next.firstChild;

    next.eachChild(function(child){
      child.parent = innerblock;
      child.jQ.appendTo(innerblock.jQ);
    });

    if (this.lastChild)
      this.lastChild.next = next.firstChild;
    else
      this.firstChild = next.firstChild;

    next.firstChild.prev = this.lastChild;
    this.lastChild = next.lastChild;

    next.parent.remove();

    if (cursor.prev)
      cursor.insertAfter(cursor.prev);
    else
      cursor.prependTo(this);

    cursor.redraw();
  }
  else if (textblock.prev instanceof TextBlock) {
    var cursor = textblock.cursor;
    if (cursor.prev)
      textblock.prev.firstChild.focus();
    else
      cursor.appendTo(textblock.prev.firstChild);
  }
  return this;
};

LatexCmds.text = CharCmds.$ = TextBlock;

// input box to type a variety of LaTeX commands beginning with a backslash
function LatexCommandInput(replacedFragment) {
  MathCommand.call(this, '\\');
  if (replacedFragment) {
    this.replacedFragment = replacedFragment.detach();
    this.isEmpty = function(){ return false; };
  }
}
_ = LatexCommandInput.prototype = new MathCommand;
_.html_template = ['<span class="latex-command-input"></span>'];
_.text_template = ['\\'];
_.placeCursor = function(cursor) {
  this.cursor = cursor.appendTo(this.firstChild);
  if (this.replacedFragment)
    this.jQ =
      this.jQ.add(this.replacedFragment.jQ.addClass('blur').bind(
        'mousedown mousemove',
        function(e) {
          $(e.target = this.nextSibling).trigger(e);
          return false;
        }
      ).insertBefore(this.jQ));
};
_.latex = function() {
  return '\\' + this.firstChild.latex() + ' ';
};
_.keydown = function(e) {
  if (e.which === 9 || e.which === 13) { //tab or enter
    this.renderCommand();
    return false;
  }
  return this.parent.keydown(e);
};
_.textInput = function(ch) {
  if (ch.match(/[a-z]/i)) {
    this.cursor.deleteSelection();
    this.cursor.insertNew(new VanillaSymbol(ch));
    return;
  }
  this.renderCommand();
  if (ch === ' ' || (ch === '\\' && this.firstChild.isEmpty()))
    return;

  this.cursor.parent.textInput(ch);
};
_.renderCommand = function() {
  this.jQ = this.jQ.last();
  this.remove();
  if (this.next)
    this.cursor.insertBefore(this.next);
  else
    this.cursor.appendTo(this.parent);

  var latex = this.firstChild.latex(), cmd;
  if (latex) {
    if (cmd = LatexCmds[latex])
      cmd = new cmd(this.replacedFragment, latex);
    else if (cmd = LatexEnvirons[latex])
      cmd = new cmd(this.replacedFragment, latex);      
    else {
      cmd = new TextBlock(latex);
      cmd.firstChild.focus = function(){ delete this.focus; return this; };
      this.cursor.insertNew(cmd).insertAfter(cmd);
      if (this.replacedFragment)
        this.replacedFragment.remove();

      return;
    }
  }
  else
    cmd = new VanillaSymbol('\\backslash ','\\');

  this.cursor.insertNew(cmd);
  if (cmd instanceof Symbol && this.replacedFragment)
    this.replacedFragment.remove();
};

CharCmds['\\'] = LatexCommandInput;
  
function Binomial(replacedFragment) {
  MathCommand.call(this, '\\binom', undefined, undefined, replacedFragment);
  this.jQ.wrapInner('<span class="array"></span>').prepend('<span class="paren">(</span>').append('<span class="paren">)</span>');
}
_ = Binomial.prototype = new MathCommand;
_.html_template =
  ['<span></span>', '<span></span>', '<span></span>'];
_.text_template = ['choose(',',',')'];
_.redraw = function() {
  this.jQ.children(':first').add(this.jQ.children(':last'))
    .css('fontSize',
      this.jQ.outerHeight()/(+this.jQ.css('fontSize').slice(0,-2)*.9+2)+'em'
    );
};

LatexCmds.binom = LatexCmds.binomial = Binomial;

function Choose() {
  Binomial.apply(this, arguments);
}
_ = Choose.prototype = new Binomial;
_.placeCursor = LiveFraction.prototype.placeCursor;

LatexCmds.choose = Choose;

/*********************
A Vector is a 1-Dimensional Vertical Array
**********************/

function Vector(replacedFragment) {
  MathCommand.call(this, '\\vector', undefined, undefined, replacedFragment);
}
_ = Vector.prototype = new MathCommand;
_.html_template = ['<span class="array"></span>', '<span></span>'];
_.latex = function() {
  return '\\begin{matrix}' + this.foldChildren([], function(latex, child) {
    latex.push(child.latex());
    return latex;
  }).join('\\\\') + '\\end{matrix}';
};
_.text = function() {
  return '[' + this.foldChildren([], function(latex, child) {
    text.push(child.text());
    return text;
  }).join() + ']';
}
_.placeCursor = function(cursor) {
  this.cursor = cursor.appendTo(this.firstChild);
};
_.keydown = function(e) {
  var currentBlock = this.cursor.parent;

  if (currentBlock.parent === this) {
    if (e.which === 13) { //enter
      var newBlock = new MathBlock;
      newBlock.parent = this;
      newBlock.jQ = $('<span></span>')
        .data(jQueryDataKey, {block: newBlock})
        .insertAfter(currentBlock.jQ);
      if (currentBlock.next)
        currentBlock.next.prev = newBlock;
      else
        this.lastChild = newBlock;

      newBlock.next = currentBlock.next;
      currentBlock.next = newBlock;
      newBlock.prev = currentBlock;
      this.cursor.appendTo(newBlock).redraw();
      return false;
    }
    else if (e.which === 9 && !e.shiftKey && !currentBlock.next) { //tab

      if (currentBlock.isEmpty()) {
        if (currentBlock.prev) {
          this.cursor.insertAfter(this);
          delete currentBlock.prev.next;
          this.lastChild = currentBlock.prev;
          currentBlock.jQ.remove();
          this.cursor.redraw();
          return false;
        }
        else
          return this.parent.keydown(e);
      }

      var newBlock = new MathBlock;
      newBlock.parent = this;
      newBlock.jQ = $('<span></span>').data(jQueryDataKey, {block: newBlock}).appendTo(this.jQ);
      this.lastChild = newBlock;
      currentBlock.next = newBlock;
      newBlock.prev = currentBlock;
      this.cursor.appendTo(newBlock).redraw();
      return false;
    }
    else if (e.which === 8) { //backspace
      if (currentBlock.isEmpty()) {
        if (currentBlock.prev) {
          this.cursor.appendTo(currentBlock.prev)
          currentBlock.prev.next = currentBlock.next;
        }
        else {
          this.cursor.insertBefore(this);
          this.firstChild = currentBlock.next;
        }

        if (currentBlock.next)
          currentBlock.next.prev = currentBlock.prev;
        else
          this.lastChild = currentBlock.prev;

        currentBlock.jQ.remove();
        if (this.isEmpty())
          this.cursor.deleteForward();
        else
          this.cursor.redraw();

        return false;
      }
      else if (!this.cursor.prev)
        return false;
    }
  }
  return this.parent.keydown(e);
};

LatexCmds.vector = Vector;

/****************************
 Array support for MathQuill

 We use ArrayCmd rather than Array,
 as Array is a data type in javascript
*****************************/
function ArrayCmd(replacedFragment, latex) {

  MathCommand.call(this, '\\array', undefined, undefined, replacedFragment);
  this.hasCursor = false;
  this.data = this.parseLatex(latex);

}
_ = ArrayCmd.prototype = new MathCommand;
_.html_template = ['<span class="matrix"></span>', '<span></span>'];
_.parseLatex = function( latex ) {

  //split the latex and determine the basic info about it
  var match = /\\begin{array}{((c|l|r)*)}(.+?)\\end{array}/.exec( latex );
  var tokens = match[3].split(/ \\\\ /g);
  var number_of_columns = match[1].length;

  // break up the individual rows
  var data = [];
  var height = 0;
  for( var i = 0; i < tokens.length; i++ ){
    var row_tokens = tokens[i].split(/ & /g);
    data.push( row_tokens );
    height = Math.max( height, row_tokens.length );
  }

  // we invert the 2d matrix, since LaTeX is in rows,
  // but we display in columns
  var result = [];
  for( var i = 0; i < data.length; i++){
    for( var j = 0; j < height ; j++ ){
      while( result.length <= j ){
        result.push([]);
      }
      result[j][i] = data[i][j];
    }  
  }

  return result;
}
_.latex = function() {

  var result = [];
  var columns = ""

  // count the number of columns and store it
  this.eachChild( function( columnBlock ){
    columns += "c"
  });
  columns = "{" + columns + "}"

  for( var i = 0; i < this.getHeight(); i++){
    var data = [];
    this.eachChild( function( columnBlock ){
      data.push( this.getCellByPosition(i, columnBlock ).latex() );
    });
    result.push( data.join(' & ') )
  }

  return '\\begin{matrix}' + columns + " " + result.join(' \\\\ ') + ' \\end{matrix}';
};
_.text = function() {
  return '[' + this.foldChildren([], function(latex, child) {
    text.push(child.text());
    return text;
  }).join() + ']';
}
_.placeCursor = function(cursor) {

  this.cursor = cursor.appendTo(this.firstChild);

  // If this is the very first time place cursor is called,
  // call it on the child column too
  if( ! this.hasCursor ){
    this.hasCursor = true;
    for( var i = 0; i < this.data.length; i++ ){

      if( i == 0 ){
        this.cursor.appendTo(this.firstChild).redraw();
        this.cursor.insertNew( new ArrayColumn( null, this.data[i])).redraw();
      } else {
        this.addColumn( this.data[i] );
      }
    }
  }
};

// adds a new Column
_.addColumn = function( data ){

  if( data == undefined){
    data = [""];
  }

//  this.cursor.appendTo( this.lastChild );
  var columnBlock = this.lastChild;
  var newBlock = new MathBlock;
  newBlock.parent = this;
  newBlock.jQ = $('<span class="test" ></span>').data(jQueryDataKey, {block: newBlock}).appendTo(this.jQ);
  this.lastChild = newBlock;
  columnBlock.next = newBlock;
  newBlock.prev = columnBlock;

  this.cursor.appendTo(newBlock);    
  this.cursor.insertNew( new ArrayColumn( null, data ) ).redraw();

};
_.keydown = function(e) {

  var currentBlock = this.cursor.parent;

  // Sometimes we'll get the cell block,
  // Sometimes we'll get the column block
  // So we standardize to the column block
  var columnBlock = currentBlock
  while( columnBlock.parent != this ){
    columnBlock = columnBlock.parent;
  }

  // Check to see if we should intercept the keypress
  if (e.which === 13) { //enter
    return this.enterDown( e, currentBlock, columnBlock );
  }
  if (e.which === 9 && !e.shiftKey) { //tab
    return this.tabDown( e, currentBlock, columnBlock );
  }
  else if (e.which === 8) { //backspace
    return this.backspaceDown( e, currentBlock, columnBlock );
  }
  else if (e.which == 37){ //left arrow key
    return this.leftDown( e, currentBlock, columnBlock );
  }
  else if (e.which == 39){ //right arrow key
    return this.rightDown( e, currentBlock, columnBlock );
  }

  return this.parent.keydown(e);
};
_.enterDown = function( e, currentBlock, columnBlock ){
  
  // check to make sure that we have a cell as our currentBlock,
  // and not a column
  if( currentBlock != columnBlock ){

    if( this.isCellOnBottomRow( currentBlock ) ){

      // if we're on the bottom row,
      // we add a new row
      // and then set the cursor to the first cell
      this.eachChild( function(block){
        block.firstChild.addCell();
      });
      this.cursor.appendTo(columnBlock.parent.firstChild.firstChild.lastChild).redraw();

    }else{

      // If we're not at the bottom of the matrix,
      // we move the cursor down to the first cell of the next row
      // like the way excel does it
      var position = this.getCellPosition( currentBlock );
      this.cursor.appendTo(this.getCellByPosition( position + 1, columnBlock.parent.firstChild)).redraw();
    }
  }

}
_.tabDown = function( e, currentBlock, columnBlock ){

    // If we're on the end of the array
    if (columnBlock.next == 0){

      // If we press tab in the last column and its empty,
      // delete it, and exit the matrix
      if( columnBlock.firstChild.isEmpty() ){

        if (columnBlock.prev) {
          this.cursor.insertAfter(this);
          delete columnBlock.prev.next;
          this.lastChild = columnBlock.prev;
          columnBlock.jQ.remove();
          this.cursor.redraw();
          return false;
        }

      // If the column has any text in it, we want to create a new column
      }else{
        this.addColumn();  
      }
    
    // if there is a column to the right of this one, give that one focus
    }else{

        // if the column is highlighted, we don't have a specific cell highlighted
        // so we just move to the top cell of the next column
        if( currentBlock == columnBlock ){
          this.cursor.appendTo(currentBlock.next.firstChild.firstChild).redraw();        
        }else{
          var position = this.getCellPosition( currentBlock );
          this.cursor.appendTo(this.getCellByPosition( position, columnBlock.next )).redraw();
        }
    }

    return false;
};
_.leftDown = function( e, currentBlock, columnBlock ){
  
  // check to make sure we're in a cell and not a column
  if( currentBlock != columnBlock ){
    if( !this.cursor.prev ){
      return this.moveLeft( currentBlock );
    }
  }

  return this.parent.keydown(e);
}
_.moveLeft = function( cell ){

  if( cell != this.lastChild  ){
    this.cursor.insertBefore(this);
  }

  var position = this.getCellPosition( cell );
  var new_cell = this.getCellByPosition( position, cell.parent.parent.prev );
  this.cursor.appendTo(new_cell).redraw();

  return false;
}
_.rightDown = function( e, currentBlock, columnBlock ){
  // check to make sure we're in a cell and not a column

  if( currentBlock != columnBlock ){
    if(!this.cursor.next ){
      return this.moveRight( currentBlock );
    }
  }

  return this.parent.keydown(e);
}
_.moveRight = function( cell ){

    if( cell != this.lastChild  ){
      this.cursor.insertAfter(this);
    }

    var position = this.getCellPosition( cell );
    var new_cell = this.getCellByPosition( position, cell.parent.parent.next );
    this.cursor.prependTo(new_cell).redraw()
    
    return false;  
}

/*
  Given a cell, determine how far down its column it is
*/
_.getCellPosition = function( cellBlock ){

   var position = 0;
   var scanner = cellBlock.parent.firstChild;

   while( scanner != cellBlock ){
     position += 1;
     scanner = scanner.next;
   }

   return position;
}
/*
  Given a column block and a position, find the cell at that position
*/
_.getCellByPosition = function( position, columnBlock){
  
  var counter = position;
  var scanner = columnBlock.firstChild.firstChild;

  while( counter > 0 && scanner.next ){
    counter -= 1;
    scanner = scanner.next;
  }

  return scanner;

}
/*
 Returns how many rows are in the matrix
*/
_.getHeight = function(){
  var counter = 0;

  this.firstChild.firstChild.eachChild( function( child){
    counter += 1;
  });

  return counter
}

/*
 Is the provided cell on the bottom row of the array?
*/
_.isCellOnBottomRow = function( cellBlock ){
  return this.getCellPosition( cellBlock ) + 1 == this.getHeight();
}
_.backspaceDown = function( e, currentBlock ){
    if (currentBlock.isEmpty()) {
      if (currentBlock.prev) {
        this.cursor.appendTo(currentBlock.prev)
        currentBlock.prev.next = currentBlock.next;
      }
      else {
        this.cursor.insertBefore(this);
        this.firstChild = currentBlock.next;
      }

      if (currentBlock.next)
        currentBlock.next.prev = currentBlock.prev;
      else
        this.lastChild = currentBlock.prev;

      currentBlock.jQ.remove();
      if (this.isEmpty())
        this.cursor.deleteForward();
      else
        this.cursor.redraw();

      return false;
    }
    else if (!this.cursor.prev)
      return false;
    return this.parent.keydown(e);
};

LatexEnvirons.array = ArrayCmd;

/****************************
 Array Column is a customized version of Array used internally in an Array
 There is one Array Column object for each Column in an Array.

 We don't add ArrayColumn to any Latex dictionary, since it should only be used internally
*****************************/

function ArrayColumn(replacedFragment, latexList) {

  MathCommand.call(this, '\\arrayColumn', undefined, undefined, replacedFragment);

  this.hasCursor = false;
  this.latexList = latexList || [""];
}
_ = ArrayColumn.prototype = new MathCommand;
_.html_template = ['<span class="array"></span>', '<span></span>'];
_.latex = $.noop() // ArrayColumn is not setup to create latex.  Call latex() of ArrayCmd instead
_.text = function() {
  return '[' + this.foldChildren([], function(latex, child) {
    text.push(child.text());
    return text;
  }).join() + ']';
}
_.placeCursor = function(cursor) {
  this.cursor = cursor.appendTo(this.firstChild);

  if( !this.hasCursor ){
    this.hasCursor = true;
    this.setFromLatex();
  }
};
_.setFromLatex = function(){
  for( var i = 0; i < this.latexList.length; i++ ){
    if( i == 0 ){
      this.setCellFromLatex( this.firstChild, this.latexList[i] );
    } else {
      this.addCell( this.latexList[i]);
    }
  }
}
_.keydown = function(e) {

  var currentBlock = this.cursor.parent;

  if (currentBlock.parent === this) {
    if (e.which === 8) { //backspace
      return this.backspaceDown( e, currentBlock );
    }
  }
  return this.parent.keydown(e);
};
_.addCell = function( latex ){

    currentBlock = this.lastChild;

    var newBlock = new MathBlock;
    newBlock.parent = this;
    newBlock.jQ = $('<span></span>')
      .data(jQueryDataKey, {block: newBlock})
      .insertAfter(currentBlock.jQ);

    // Manage the link structure of the new Block
    this.lastChild = newBlock;
    currentBlock.next = newBlock;
    newBlock.prev = currentBlock;

    this.setCellFromLatex( newBlock, latex );

    return false; 
};
_.setCellFromLatex = function( cellBlock, latex ){

  this.cursor.appendTo(cellBlock);
  this.cursor.writeLatex( latex ).redraw();
  
}
_.backspaceDown = function( e, currentBlock ){
    if (currentBlock.isEmpty()) {
      if (currentBlock.prev) {
        this.cursor.appendTo(currentBlock.prev)
        currentBlock.prev.next = currentBlock.next;
      }
      else {
        this.cursor.insertBefore(this);
        this.firstChild = currentBlock.next;
      }

      if (currentBlock.next)
        currentBlock.next.prev = currentBlock.prev;
      else
        this.lastChild = currentBlock.prev;

      currentBlock.jQ.remove();
      if (this.isEmpty())
        this.cursor.deleteForward();
      else
        this.cursor.redraw();

      return false;
    }
    else if (!this.cursor.prev)
      return false;
    return this.parent.keydown(e);
};

LatexCmds.editable = proto(RootMathCommand, function() {
  MathCommand.call(this, '\\editable');
  createRoot(this.jQ, this.firstChild, false, true);
  var cursor;
  this.placeCursor = function(c) { cursor = c.appendTo(this.firstChild); };
  this.firstChild.blur = function() {
    if (cursor.prev !== this.parent) return; //when cursor is inserted after editable, append own cursor FIXME HACK
    delete this.blur;
    this.cursor.appendTo(this);
    MathBlock.prototype.blur.call(this);
  };
  this.text = function(){ return this.firstChild.text(); };
});