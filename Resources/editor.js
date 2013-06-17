var CoffeeMode, JavaScriptMode, checkCommandLine, close, closeDialog, compile, debug, dialog, dialogIsOpen, error, isBetweenAnyQuotes, isBetweenDoubleQuotes, open, save, sendReq, showOpenDialog, showSaveDialog, surroundSelection, trim;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
this.input = $('#input');
this.html = $('html');
this.debugDiv = $('#debug');
this.editor = ace.edit("input");
this.output = ace.edit("output");
this.timer = null;
dialogIsOpen = false;
dialog = $("<table id='dialog'></table>");
this.path = null;
this.file = null;
trim = function(str) {
  return str.replace(/(^\s+|\s+$)/, '');
};
compile = function(updateTitle) {
  var compiled, msg;
  if (updateTitle == null) {
    updateTitle = true;
  }
  try {
    compiled = CoffeeScript.compile(this.editor.getSession().getValue(), {
      bare: true
    });
    this.output.getSession().setValue(compiled);
    this.debugDiv.html("-");
    if (updateTitle && !document.title.match(/^\*/)) {
      return document.title = "* " + document.title;
    }
  } catch (error) {
    msg = error.message;
    return this.debugDiv.html("<span style='color:red'>" + msg + "</span>");
  }
};
sendReq = function(data, method, callback) {
  return $.ajax({
    type: method,
    url: "http://localhost:8000/",
    data: data,
    timeout: 3000,
    success: function(data, text) {
      if (callback != null) {
        return callback(data);
      }
    },
    error: function(data, err) {
      return debug("REQUEST ERROR:" + data.status + "," + data.statusText);
    }
  });
};
error = function(msg) {
  var key, val, _results;
  if (typeof msg === 'object') {
    _results = [];
    for (key in msg) {
      val = msg[key];
      _results.push(error("\t" + key + "=" + val));
    }
    return _results;
  } else {
    this.debugDiv.html("" + (this.debugDiv.html()) + "<br/>\n#<span style='color:red'>" + msg + "</span>");
    return this.debugDiv.scrollTop(this.debugDiv[0].scrollHeight);
  }
};
debug = function(msg) {
  var key, val;
  if (typeof msg === 'object') {
    for (key in msg) {
      val = msg[key];
      debug("\t" + key + "=" + val);
    }
  } else {
    this.debugDiv.html("" + (this.debugDiv.html()) + "<br/>\n" + msg);
  }
  return this.debugDiv.scrollTop(this.debugDiv[0].scrollHeight);
};
jQuery.fn.center = function() {
  this.css("position", "absolute");
  this.css("top", ($(window).height() - this.height()) / 2 + $(window).scrollTop() + "px");
  this.css("left", ($(window).width() - this.width()) / 2 + $(window).scrollLeft() + "px");
  return this;
};
closeDialog = function() {
  if (dialogIsOpen) {
    dialog.empty();
    dialog.remove();
    return dialogIsOpen = false;
  }
};
showOpenDialog = function(p, callback) {
  return Ti.UI.openFileChooserDialog((function(files) {
    return callback(files[0]);
  }), {
    multiple: false,
    path: p,
    types: ['coffee']
  });
};
showSaveDialog = function(p, f, callback) {
  return Ti.UI.openSaveAsDialog((function(files) {
    return callback(files[0]);
  }), {
    multiple: false,
    path: p,
    defaultFile: f,
    types: ['coffee']
  });
};
save = function(file) {
  var fs, jsFile;
  this.file = file;
  debug("saving " + this.file);
  this.path = file.substring(0, file.lastIndexOf('/'));
  this.fn = file.substring(file.lastIndexOf('/') + 1);
  document.title = "* " + fn;
  fs = Ti.Filesystem.getFileStream(file);
  fs.open(Ti.Filesystem.MODE_WRITE);
  if (!fs.writeLine(this.editor.getSession().getValue())) {
    error("Error saving file");
    return;
  }
  fs.close();
  jsFile = this.file.replace(/\.coffee$/, '') + '.js';
  fs = Ti.Filesystem.getFileStream(jsFile);
  fs.open(Ti.Filesystem.MODE_WRITE);
  if (!fs.writeLine(this.output.getSession().getValue())) {
    error("Error saving JS file");
    return;
  }
  fs.close();
  document.title = this.file;
};
open = function(file) {
  var fs, s, sep, strs;
  fs = Ti.Filesystem.getFileStream(file);
  fs.open();
  strs = [];
  while (s = fs.readLine()) {
    strs.push(s.toString());
  }
  this.editor.getSession().setValue(strs.join('\n'));
  compile(false);
  sep = Ti.Filesystem.getSeparator();
  this.file = file;
  this.path = file.substring(0, file.lastIndexOf(sep));
  this.fn = file.substring(file.lastIndexOf(sep) + 1);
  document.title = file;
};
close = function() {};
isBetweenDoubleQuotes = function() {
  var between, i, j, line, pos, _ref;
  pos = editor.getCursorPosition();
  line = editor.getSession().getLine(pos.row);
  i = line.indexOf('"');
  j = line.lastIndexOf('"');
  if (i > -1 && j > -1 && (i < (_ref = pos.column) && _ref <= j)) {
    between = true;
  } else {
    between = false;
  }
  return between;
};
isBetweenAnyQuotes = function() {
  var between, i, j, line, pos, _ref;
  pos = editor.getCursorPosition();
  line = editor.getSession().getLine(pos.row);
  i = line.indexOf('"');
  j = line.lastIndexOf('"');
  if (i === -1 && j === -1) {
    i = line.indexOf("'");
    j = line.lastIndexOf("'");
  }
  if (i > -1 && j > -1 && (i < (_ref = pos.column) && _ref <= j)) {
    between = true;
  } else {
    between = false;
  }
  return between;
};
surroundSelection = function(before, after) {
  var end, pos, s, selection, start;
  s = editor.getSelectionRange();
  start = s.start;
  end = s.end;
  selection = editor.selection;
  pos = selection.getCursor();
  selection.clearSelection();
  selection.moveCursorToPosition(end);
  editor.insert(after);
  selection.moveCursorToPosition(start);
  editor.insert(before);
  start.column = start.column + before.length;
  end.column = end.column + before.length;
  pos.column = pos.column + before.length;
  if (pos.column === start.column) {
    return selection.setSelectionRange({
      start: start,
      end: end
    });
  } else {
    return selection.setSelectionRange({
      end: end,
      start: start
    });
  }
};
checkCommandLine = function() {
  var args, f, files;
  args = Ti.API.getApplication().getArguments();
  files = (function() {
    var _i, _len, _ref, _results;
    _ref = args.slice(1);
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      if (!/^-.*/.test(f)) {
        _results.push(f);
      }
    }
    return _results;
  })();
  if (files.length) {
    return open(files[0]);
  }
};
checkCommandLine();
this.editor.getSession().on('change', function() {
  if (this.timer != null) {
    clearTimeout(this.timer);
    this.timer = null;
  }
  return this.timer = setTimeout((function() {
    return compile();
  }), 500);
});
this.output.getSession().on('change', function() {
  var o;
  o = $("#output .ace_scroller");
  return setTimeout((function() {
    return o.scrollLeft(0);
  }), 500);
});
this.html.bind('keypress keydown', __bind(function(e) {
  var code, commenting, end, i, pos, s, selection, start, _ref, _ref2;
  code = e.keyCode ? e.keyCode : e.which;
  if (code === 27 && dialogIsOpen) {
    closeDialog();
  }
  if (e.metaKey || e.ctrlKey) {
    switch (code) {
      case 69:
        debug("");
        break;
      case 78:
        window.open("http://localhost:8000?file=none");
        break;
      case 79:
        showOpenDialog(this.path, open);
        break;
      case 83:
        if ((this.file != null) && !e.shiftKey) {
          save(this.file);
        } else {
          showSaveDialog(this.path, this.file, save);
        }
        break;
      case 87:
        close();
        return;
      case 191:
        e.preventDefault();
        e.stopPropagation();
        s = editor.getSelectionRange();
        start = s.start;
        end = s.end;
        selection = editor.selection;
        pos = selection.getCursor();
        commenting = [];
        for (i = _ref = start.row, _ref2 = end.row; _ref <= _ref2 ? i <= _ref2 : i >= _ref2; _ref <= _ref2 ? i++ : i--) {
          selection.moveCursorToPosition({
            row: i,
            column: 0
          });
          selection.clearSelection();
          if (editor.getSession().getLine(i).charAt(0) === '#') {
            commenting[i] = false;
            editor.removeRight();
          } else {
            commenting[i] = true;
            editor.insert("#");
          }
        }
        if (commenting[pos.row]) {
          pos.column++;
        } else {
          pos.column--;
        }
        if (commenting[start.row] && start.column !== 0) {
          start.column++;
        } else {
          start.column--;
        }
        if (commenting[end.row]) {
          end.column++;
        } else {
          end.column--;
        }
        if (pos.row === start.row) {
          debug("move to start:" + pos.row);
          selection.moveCursorToPosition(pos);
          selection.setSelectionRange({
            start: end,
            end: start
          });
        } else {
          debug("move to end:" + pos.row);
          selection.moveCursorToPosition(pos);
          selection.setSelectionRange({
            start: start,
            end: end
          });
        }
        break;
      default:
        return;
    }
    e.preventDefault();
    return e.stopPropagation();
  }
}, this));
this.input.bind('keydown', function(e) {
  var code;
  code = e.keyCode ? e.keyCode : e.which;
  if (code === 27 && dialogIsOpen) {
    closeDialog();
  }
  if (!e.metaKey && !e.ctrlKey && !e.altKey) {
    debug(code);
    if (e.shiftKey) {
      switch (code) {
        case 51:
          if (isBetweenDoubleQuotes()) {
            e.preventDefault();
            e.stopPropagation();
            return surroundSelection('#{', '}');
          } else {
            ;
          }
          break;
        case 57:
          if (!isBetweenAnyQuotes()) {
            e.preventDefault();
            e.stopPropagation();
            return surroundSelection('(', ')');
          } else {
            ;
          }
          break;
        case 219:
          if (!isBetweenAnyQuotes()) {
            e.preventDefault();
            e.stopPropagation();
            return surroundSelection('{', '}');
          } else {
            ;
          }
          break;
      }
    } else {
      switch (code) {
        case 219:
          if (!isBetweenAnyQuotes()) {
            e.preventDefault();
            e.stopPropagation();
            return surroundSelection('[', ']');
          } else {
            ;
          }
      }
    }
  }
});
CoffeeMode = require("ace/mode/coffee").Mode;
this.editor.getSession().setMode(new CoffeeMode());
JavaScriptMode = require("ace/mode/javascript").Mode;
this.output.getSession().setMode(new JavaScriptMode());
this.output.setReadOnly(true);
this.editor.focus();
if (this.editor.getSession().getValue() != null) {
  compile();
}
