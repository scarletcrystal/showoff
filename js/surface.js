var remote = require("electron").remote;

var Animation = function(start, end, property, duration) {
	this.start = start;
	this.end = end;
	this.property = property;
	this.duration = duration;
}

Animation.prototype.easeInOutSine = function(t) {
	var b = this.start,
		c = this.end - this.start,
		d = this.duration

	return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
}

Animation.prototype.animate = function(ele, cb) {
	var self = this;
	var speed = 50;

	var t = 0;
	function step() {
		ele.style[self.property] = self.easeInOutSine(t);

		t += speed;

		if (t < self.duration + speed)
			window.requestAnimationFrame(step);
		else if (cb)
			cb();
	}

	window.requestAnimationFrame(step);
}

var SlideshowTimeout;

var fadeOut = new Animation(1, 0, "opacity", 4000);
var fadeIn = new Animation(0, 1, "opacity", 4000);

var FullComp = {
	"view": function() {
		var cue = remote.require("./shared.js").Current;

		if (!cue) {
			clearInterval(SlideshowTimeout);
			SlideshowTimeout = null;
			return m(".display");
		}

		if (cue.type == "slideshow") {
			var show = cue.source;

			if (SlideshowTimeout)
				clearInterval(SlideshowTimeout);

			SlideshowTimeout = setInterval(function() {
				var ele = document.querySelector(".slideshow");

				fadeOut.animate(ele, function() {
					show.push(show.shift());
					ele.src = show[0];
					fadeIn.animate(ele);
				});
			}, 10000);

			return m(".display", [
				m("img.slideshow", { src: show[0] })
			])
		} else {
			return m(".display", [
				m(cue.type, { src: cue.source, type: cue.mime, autoplay: true })
			]);
		}
	}
}

var PromptComp = {
	"view": function() {
		return m(".prompt", [
			m(".centre", [
				m("i.fa fa-arrows-alt fa-4x"),
				m("p", "Drag this window onto your display screen, then click this button:"),
				m("a.btn", {
					onclick: function(e) {
						remote.getCurrentWindow().setFullScreen(true);

						m.redraw();
					}
				}, "Fullscreen")
			])
		])
	}
}

var Main = {
	"view": function() {
		var full = remote.getCurrentWindow().isFullScreen();

		return m(".surface", m.component(full ? FullComp : PromptComp))
	}
}

window.addEventListener("load", function() {
	m.mount(document.body, Main);
});