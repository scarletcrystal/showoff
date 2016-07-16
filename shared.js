let surface

exports.Current = null;

exports.show = function(cue) {
	exports.Current = cue;

	surface.webContents.executeJavaScript("m.redraw()");
}

exports.stop = function() {
	exports.Current = null;

	surface.webContents.executeJavaScript("m.redraw()");
}

exports.setSurface = function(s) {
	surface = s;
}