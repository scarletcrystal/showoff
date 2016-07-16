var Controller = {
	"controller": function() {
		 var socket = io.connect("http://" + window.location.hostname + ":1360");

		 var ctrl = {
		 	socket: socket,
		 	cues: m.prop([]),
		 	active: null
		 }

		 socket.on("activate", function(data) {
		 	ctrl.active = data.i;

		 	m.redraw();
		 });

		 socket.on("deactivate", function(data) {
		 	ctrl.active = null;

		 	m.redraw();
		 })

		 socket.on("cues", function(data) {
		 	ctrl.cues(data.cues);

		 	m.redraw();
		 });

		 return ctrl;
	},
	"view": function(ctrl) {
		return m(".main", [
			m("h2", "Showoff Controller"),
			m(".cues", ctrl.cues().map(function(cue, i) {
				return m(".cue", { className: (ctrl.active == i ? "active" : "") }, m("a", {
					href: "#",
					onclick: function() {
						ctrl.socket.emit("advance", { i: i });
					}
				}, cue.title))
			})),
			m(".util", m("a", {
				href: "#",
				onclick: function() {
					ctrl.socket.emit("stop all");
				}
			}, m("i.fa fa-times"), "Stop All"))
		]);
	}
}

window.addEventListener("load", function() {
	m.mount(document.body, Controller);
})