var moment = require("moment"),
	socketio = require("socket.io");

var io = socketio(1360);

var Showstopper = {
	cueList: m.prop([]),
	active: null,
	ticker: null
}

Showstopper.serializeCues = function() {
	return Showstopper.cueList().map(function(cue) {
		return {
			title: cue.title,
			source: cue.source,
			type: cue.mime
		}
	})
}

Showstopper.loadCues = function() {
	if (localStorage.cueList)
		Showstopper.cueList(JSON.parse(localStorage.cueList).cues.map(function(sc) {
			return new Cue(sc.title, sc.source, sc.type)
		}));
}

Showstopper.update = function() {
	var sz = Showstopper.serializeCues();

	localStorage.cueList = JSON.stringify({ cues: sz });
	io.emit("cues", { cues: sz });
}

var Ticks = {};

Ticks.toString = function(time) {
	if (!time) time = 0;

	return moment(0).milliseconds(time).format("m:ss:SS");
}

Ticks.timeOf = function(cue, cb) {
	if (cue.type == "slideshow") {
		cb(null);
		return;
	}

	var ele = document.createElement(cue.type);
	ele.src = "file:///" + cue.source;

	ele.addEventListener("durationchange", function() {
		cb(ele.duration * 1000);
	});
}

var Cue = function(title, source, type) {
	this.title = title;
	this.source = source;
	this.type = type.split("/")[0];
	this.mime = type;
	this.duration = 0;
	this.elapsed = 0;
	this.active = false;;
	this.selected = false;

	var self = this;
	Ticks.timeOf(this, function(d) {
		self.duration = d;

		m.redraw();
	});
}

Cue.prototype.advance = function() {
	if (Showstopper.active)
		Showstopper.active.reset()

	this.active = true;
	Showstopper.active = this;

	io.emit("activate", { i: Showstopper.cueList().indexOf(this) });

	if (!Showstopper.ticker)
		Showstopper.ticker = setInterval(function() {
			if (Showstopper.active)
				Showstopper.active.tick()

			m.redraw()
		}, 10);

	// activate this cue
	require("electron").remote.require("./shared.js").show(this);
}

Cue.prototype.tick = function() {
	if (!this.duration) return; // if null duration, it's infinite - never tick

	// update elapsed
	this.elapsed += 10;

	if (this.elapsed >= this.duration)
		this.next()
}

Cue.prototype.reset = function() {
	this.elapsed = 0;
	this.active = false;

	io.emit("deactivate", { i: Showstopper.cueList().indexOf(this) });

	Showstopper.active = null;

	require("electron").remote.require("./shared.js").stop();
}

Cue.prototype.next = function() {
	this.reset()

	// perform "Next Action"
}

Cue.prototype.getClass = function() {
	if (this.active)
		return "active";
	else if (this.selected)
		return "selected"
}

Cue.prototype.select = function() {
	var self = this;

	return function(e) {
		e.stopPropagation();

		Showstopper.cueList().forEach(function(c) {
			c.selected = false;
		});

		self.selected = true;
		e.target.focus();

		m.redraw();
	}
}

Cue.prototype.go = function() {
	var self = this;

	return function(e) {
		e.stopPropagation()

		console.log(e);

		if (e.code == "Space")
			self.advance()
		else if (e.code == "Escape")
			self.reset();
		else if (e.code == "Delete") {
			Showstopper.cueList().splice(Showstopper.cueList().indexOf(self), 1);
			Showstopper.update();
		}
	}
}

Cue.deselect = function() {
	return function(e) {
		Showstopper.cueList().forEach(function(c) {
			c.selected = false;
		});

		m.redraw();
	}
}

var WindowComponent = {
	"active": null,
	"view": function(ctrl) {
		if (!WindowComponent.active) return m(".modal-dummy");

		return m(".modal", {
			onclick: function(e) {
				WindowComponent.active = null;

				m.redraw();
			}
		}, [
			m(".window", {
				onclick: function(e) {
					e.stopPropagation();
				}
			}, WindowComponent.active)
		])
	}
}

var Windows = {};
var WindowSystem = function(win) {
	this.window = win;
}

WindowSystem.prototype.mount = function() {
	WindowComponent.active = m.component(this.window);

	m.redraw();
}

WindowSystem.prototype.close = function() {
	WindowComponent.active = null;

	m.redraw();
}

WindowSystem.open = function(win) {
	return function() {
		(new WindowSystem(win)).mount();
	}
}

Windows.NewCue = function() {
	return {
		"view": function() {
			return m(".drop-area", {
				ondragenter: function(e) {
					this.classList.add("hover");
				},
				ondragleave: function(e) {
					this.classList.remove("hover");
				},
				ondragover: function(e) {
					e.preventDefault();

					this.classList.add("hover");

					e.dataTransfer.dropEffect = "all";
				},
				ondrop: function(e) {
					this.classList.remove("hover");
					if (e.dataTransfer.files.length < 1) return;

					e.preventDefault();

					[].forEach.call(e.dataTransfer.files, function(file) {
						Showstopper.cueList().push(new Cue(file.name, file.path, file.type));
						Showstopper.update();

						//e.preventDefault();
						m.redraw();
					});

					WindowComponent.active = null;
				}
			}, [
				m("div", [
					m("i.fa fa-file-o fa-4x"),
					m("h3", "Drop a file here to add a cue.")
				])
			])
		}
	};
}

Windows.SlideshowCue = function() {
	return {
		"view": function() {
			return m(".drop-area", {
				ondragenter: function(e) {
					this.classList.add("hover");
				},
				ondragleave: function(e) {
					this.classList.remove("hover");
				},
				ondragover: function(e) {
					e.preventDefault();

					this.classList.add("hover");

					e.dataTransfer.dropEffect = "all";
				},
				ondrop: function(e) {
					this.classList.remove("hover");
					if (e.dataTransfer.files.length < 1) return;

					e.preventDefault();

					var sources = [].map.call(e.dataTransfer.files, function(file) {
						return file.path;
					});

					Showstopper.cueList().push(new Cue("Slideshow", sources, "slideshow"));
					Showstopper.update();

					m.redraw();

					WindowComponent.active = null;
				}
			}, [
				m("div", [
					m("i.fa fa-file-o fa-4x"),
					m("h3", "Drop image files here to add a slideshow.")
				])
			])
		}
	};
}

/*
var DropArea = {
	"view": function() {
		return m(".drop-area", {
			ondragenter: function(e) {
				this.classList.add("hover");
			},
			ondragleave: function(e) {
				this.classList.remove("hover");
			},
			ondragover: function(e) {
				e.preventDefault();

				e.dataTransfer.dropEffect = "all";
			},
			ondrop: function(e) {
				console.log("pls");

				this.classList.remove("hover");

				console.log(e.dataTransfer.files);

				e.preventDefault();
			}
		}, [
			m("div", [
				m("i.fa fa-file-o fa-4x"),
				m("h3", "Drop a file here to add a cue.")
			])
		])
	}
}
*/

var ShowCueList = {
	"controller": function() {
		// get current list of cues here
		return {
			cues: Showstopper.cueList
		}
	},
	"view": function(ctrl) {
		return m(".cue-list", [
			m("h3", "Cues"),
			m("table.cues", [
				m("thead", [
					m("tr", [
						m("th.small", "#"),
						m("th.wide", "Cue Name"),
						m("th", "Elapsed"),
						m("th", "Duration")
					])
				]),
				m("tbody", [
					ctrl.cues().map(function(cue, i) {
						return m("tr.cue", { className: cue.getClass(), onclick: cue.select(), onkeydown: cue.go(), tabindex: 0 }, [
							m("td", i),
							m("td", m("b", cue.title)),
							m("td", m("b", Ticks.toString(cue.elapsed))),
							m("td", m("b", Ticks.toString(cue.duration)))
						])
					})
				])
			])
		])
	}
}

var ShowController = {
	"controller": function() {
		var rem = require("electron").remote;

		return {
			remote: m.prop(rem)
		}
	},
	"view": function(ctrl) {
		return m(".page", { onclick: Cue.deselect() }, [
			m.component(WindowComponent),
			m(".tools", [
				m("p", "Showoff"),
				m("a", { onclick: WindowSystem.open(Windows.NewCue()) }, m("i.fa fa-plus"), "Add Media Cue"),
				m("a", { onclick: WindowSystem.open(Windows.SlideshowCue()) }, m("i.fa fa-arrow-right"), "Add Slideshow Cue"),
				m("a", {
					onclick: function() {
						ctrl.remote().require("./main.js").createDisplaySurface();
					}
				}, m("i.fa fa-external-link"), "Open Display Surface"),
				m("a.right", {
					onclick: function() {
						ctrl.remote().app.quit()
					}
				}, m("i.fa fa-times"), "Exit")
			]),
			m.component(ShowCueList)
		]);
	}
}

window.addEventListener("load", function() {
	Showstopper.loadCues();

	m.mount(document.body, ShowController);
});

io.on("connection", function(socket) {
	socket.emit("cues", { cues: Showstopper.serializeCues() });

	if (Showstopper.active)
		socket.emit("activate", { i: Showstopper.cueList().indexOf(Showstopper.active) });

	socket.on("advance", function(data) {
		var cue = Showstopper.cueList()[data.i];

		if (cue)
			cue.advance()
	});

	socket.on("stop all", function(data) {
		if (Showstopper.active)
			Showstopper.active.reset();
	});
});