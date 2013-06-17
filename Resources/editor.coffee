#members
@input = $('#input')
@html = $('html')
@debugDiv = $('#debug')
@editor = ace.edit "input"
@output = ace.edit "output"
@timer = null
dialogIsOpen = false
dialog = $("<table id='dialog'></table>")
@path = null
@file = null

#functions
trim = (str)->str.replace(/(^\s+|\s+$)/,'')


compile = (updateTitle = true) ->
	try
		compiled = CoffeeScript.compile(@editor.getSession().getValue(), bare:on)
		@output.getSession().setValue(compiled)
		@debugDiv.html "-"
		if updateTitle and !document.title.match /^\*/
			document.title = "* #{document.title}"
	catch error
		msg = error.message
		@debugDiv.html("<span style='color:red'>#{msg}</span>")
		# line = msg.match(/line ([0-9]+)/)
		# if line isnt null and line.length > 0
			


sendReq = (data,method,callback)->
	$.ajax({
		type:method,
		url:"http://localhost:8000/"
		data:data
		timeout:3000
		success:(data, text)->
			# @output.getSession().setValue data.toString()
			#if data isnt null then debug "#{data.toString()}:#{text}"
			if callback? then callback data
		error:(data, err)->
			debug "REQUEST ERROR:#{data.status},#{data.statusText}"

	})


error = (msg) ->
    if typeof msg is 'object'
        for key,val of msg
            error "\t#{key}=#{val}"
    else
        @debugDiv.html "#{@debugDiv.html()}<br/>\n#<span style='color:red'>#{msg}</span>"
        # serverLog msg
        @debugDiv.scrollTop @debugDiv[0].scrollHeight


debug = (msg) ->
	if typeof msg is 'object'
		for key,val of msg
			debug "\t#{key}=#{val}"
	else
		@debugDiv.html "#{@debugDiv.html()}<br/>\n#{msg}"
	# serverLog msg
	@debugDiv.scrollTop @debugDiv[0].scrollHeight


jQuery.fn.center = ->
    @css("position","absolute")
    @css("top", ( $(window).height() - this.height() ) / 2+$(window).scrollTop() + "px")
    @css("left", ( $(window).width() - this.width() ) / 2+$(window).scrollLeft() + "px")
    return this;


closeDialog = ->
	if dialogIsOpen
		dialog.empty()
		dialog.remove()
		dialogIsOpen = false


showOpenDialog = (p, callback) ->
	Ti.UI.openFileChooserDialog ((files)-> callback files[0]),
		multiple: false
		path: p
		types: ['coffee']


showSaveDialog = (p, f, callback) ->
    Ti.UI.openSaveAsDialog ((files)-> callback files[0]),
        multiple: false
        path: p
        defaultFile: f
        types: ['coffee']

save = (@file) ->
    debug "saving #{@file}"
    @path = file.substring(0,file.lastIndexOf('/'))
    @fn = file.substring(file.lastIndexOf('/')+1)
    document.title = "* "+fn
    
    # Saves the file
    fs = Ti.Filesystem.getFileStream file
    fs.open Ti.Filesystem.MODE_WRITE
    if not fs.writeLine @editor.getSession().getValue()
        error "Error saving file"
        return
    fs.close()
    
    # Saves its JS counterpart
    jsFile = @file.replace(/\.coffee$/, '') + '.js'
    fs = Ti.Filesystem.getFileStream jsFile
    fs.open Ti.Filesystem.MODE_WRITE
    if not fs.writeLine @output.getSession().getValue()
        error "Error saving JS file"
        return
    fs.close()
    
    document.title = @file
    
    return
		
open = (file) ->
    fs = Ti.Filesystem.getFileStream file
    fs.open()
    
    strs = []
    while s = fs.readLine()
        strs.push s.toString()
        
    @editor.getSession().setValue(strs.join '\n')
    compile false

    sep = Ti.Filesystem.getSeparator()
    @file = file
    @path = file.substring(0,file.lastIndexOf(sep))
    @fn = file.substring(file.lastIndexOf(sep)+1)
    document.title = file
    
    return

close = ->
    return
		

isBetweenDoubleQuotes = ->
	pos = editor.getCursorPosition()
	line = editor.getSession().getLine(pos.row)
	i = line.indexOf('"')
	j = line.lastIndexOf('"')
	if i>-1 and j>-1 and i<pos.column<=j
		between = true
	else between = false

	return between

isBetweenAnyQuotes = ->
	pos = editor.getCursorPosition()
	line = editor.getSession().getLine(pos.row)
	i = line.indexOf('"')
	j = line.lastIndexOf('"')
	if i is -1 and j is -1
		i = line.indexOf("'")
		j = line.lastIndexOf("'")
	if i>-1 and j>-1 and i<pos.column<=j
		between = true
	else between = false

	return between


surroundSelection = (before, after) ->
	s = editor.getSelectionRange()
	start = s.start
	end = s.end
	selection = editor.selection
	pos = selection.getCursor()
	selection.clearSelection()
	selection.moveCursorToPosition end
	editor.insert after
	selection.moveCursorToPosition start
	editor.insert before
	# if start.column isnt end.column
	start.column = start.column+before.length
	end.column = end.column+before.length
	pos.column = pos.column+before.length
	if pos.column is start.column
		selection.setSelectionRange(start:start,end:end)
	else
		selection.setSelectionRange(end:end,start:start)
        
        
        
checkCommandLine = ->
    args = Ti.API.getApplication().getArguments()
    files = (f for f in args[1..] when not /^-.*/.test f)
    open files[0] if files.length
checkCommandLine()


#main 
@editor.getSession().on 'change', ->
	if @timer?
		clearTimeout @timer
		@timer = null
	@timer = setTimeout ( ->compile() ), 500
	
@output.getSession().on 'change', ->
	o = $("#output .ace_scroller")
	setTimeout ( -> o.scrollLeft 0 ), 500
	

@html.bind 'keypress keydown', (e) =>
	code = if e.keyCode then e.keyCode else e.which
	if code is 27 and dialogIsOpen
		closeDialog()
	if e.metaKey || e.ctrlKey
		switch code
			when 69 #E - debugging
				debug ""
			when 78 #N - new
				window.open "http://localhost:8000?file=none"

			when 79 #O
				showOpenDialog(@path, open)

			when 83 #S
				if @file? and !e.shiftKey
					save(@file)
				else
					showSaveDialog(@path, @file, save)

			when 87 #W - close tab
				close()
				return
				
			when 191 #/
				e.preventDefault()
				e.stopPropagation()
			
				s = editor.getSelectionRange()
				start = s.start
				end = s.end
				selection = editor.selection
				pos = selection.getCursor()
				
				commenting = []
				for i in [start.row..end.row]
					selection.moveCursorToPosition(row:i,column:0)
					selection.clearSelection()
					if editor.getSession().getLine(i).charAt(0) is '#'
						commenting[i] = false
						editor.removeRight()
					else
						commenting[i] = true
						editor.insert "#"
				
				if commenting[pos.row] then pos.column++ else pos.column--
				if commenting[start.row] and start.column isnt 0 then start.column++ else start.column--
				if commenting[end.row] then end.column++ else end.column--


				if pos.row is start.row
					debug "move to start:#{pos.row}"
					selection.moveCursorToPosition(pos)
					selection.setSelectionRange(start:end,end:start)
				else
					debug "move to end:#{pos.row}"
					selection.moveCursorToPosition(pos)
					selection.setSelectionRange(start:start,end:end)

			else return

		e.preventDefault()
		e.stopPropagation()
		# debug code
		# return false


@input.bind 'keydown', (e) ->
	code = if e.keyCode then e.keyCode else e.which
	if code is 27 and dialogIsOpen
		closeDialog()
	if !e.metaKey and !e.ctrlKey and !e.altKey
		debug code
		if e.shiftKey
			switch code
				when 51 # #
					if isBetweenDoubleQuotes()
						e.preventDefault()
						e.stopPropagation()
						surroundSelection '#{','}'
					else return
				when 57 # (
					if !isBetweenAnyQuotes()
						e.preventDefault()
						e.stopPropagation()
						surroundSelection '(',')'
					else return
				when 219 # {
					if !isBetweenAnyQuotes()
						e.preventDefault()
						e.stopPropagation()
						surroundSelection '{','}'
					else return
				else return
		else
			switch code
				when 219 # [
					if !isBetweenAnyQuotes()
						e.preventDefault()
						e.stopPropagation()
						surroundSelection '[',']'
					else return





#@editor.setTheme "ace/theme/twilight"

CoffeeMode = require("ace/mode/coffee").Mode
@editor.getSession().setMode(new CoffeeMode())

JavaScriptMode = require("ace/mode/javascript").Mode
@output.getSession().setMode(new JavaScriptMode())
@output.setReadOnly true

@editor.focus()

if @editor.getSession().getValue()?
	compile()

