// Declare the rendezvous namespace
var rv = {};

rv.options = {
	fitMembers: true,
	fitMarkers: true
};
rv.selectedLatLon = {};
rv.markers = [];
rv.members = [];
rv.currentMemberID = null;
rv.memberUpdateID = null;
rv.markerUpdateID = null;
rv.memberUpdateInterval = 10000;
// Data object for local GPS tracking
rv.gps = {
	lat: null,
	lng: null,
	updated: null,
	secondsSinceUpdated: 0, // Track time since last server update
	options: {
		updateInterval: 5, // Minimum number of seconds between location updates sent to server
		initialZoom: 16,
		firstZoom: true
	},
	sendLocationUpdate: function () {
		var lat = this.lat;
		var lng = this.lng;
		var updated = this.updated;
		if (lat === null || lng === null || updated === null) {
			return false;
		}
		//window.console.log('lat: ' + lat + ', lng: ' + lng + ', updated: ' + updated.toISOString());
		$.post("/rendezvous/v1/update/location", {
			lat: lat,
			lng: lng,
			//updated: updated.toISOString(),
			id: rv.identity.id,
			secret: rv.identity.secret
		},
		function (data) {
			if (data['success']) {
				window.console.log('location updated');
			} else {
				window.console.log(data['message']);
			}
			return false;
		},
				'json');
	}
};

rv.identity = {
	id: null,
	name: '',
	secret: null,
	timeOffset: 0
};

rv.map = L.map('map').setView([0, 0], 2);


L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
	id: 'mapbox.streets'
}).addTo(rv.map);

/*
 L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
 attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
 }).addTo(rv.map);
 */
rv.popup = L.popup();

//rv.spinner = new Spinner().spin($('#spinner'));

rv.icons = {
	greenIcon: new L.Icon({
		iconUrl: '/addon/rendezvous/view/js/images/marker-icon-2x-green.png',
		shadowUrl: '/addon/rendezvous/view/js/images/marker-shadow.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		shadowSize: [41, 41]
	})
};

rv.onMapClick = function (e) {
	rv.selectedLatLon = e.latlng;
	//window.console.log(e.latlng.toString());
	rv.popup
			.setLatLng(e.latlng)
			//.setContent("You clicked the map at " + e.latlng.toString())
			.setContent(
					$('#add-marker-button-wrapper').html()
					)
			.openOn(rv.map);

	$('.add-marker').on('click', rv.openNewMarkerDialog);
};

rv.map.on('click', rv.onMapClick);

$('.zoom-fit').on('click', function () {
	rv.options.fitMarkers = true;
	rv.options.fitMembers = true;
	rv.zoomToFitMembers();
});
//rv.myLocationMarker = new L.Marker([0,0]).bindPopup("<b>Me</b><br />Current position.");
rv.myLocationMarker = new L.CircleMarker([0, 0], {
	stroke: true,
	radius: 10,
	weight: 5,
	color: '#fff',
	opacity: 1,
	fillColor: '#f00',
	fillOpacity: 1
});
rv.gpsControl = new L.Control.Gps({
	marker: rv.myLocationMarker
});
rv.gpsControl.on('gpsactivated', function (timeout) {
	$('#gps-discovery').show();
});
rv.gpsControl.on('gpsdisabled', function () {
	$('#gps-discovery').hide();
});
rv.gpsControl.on('gpslocated', function (latlng, marker) {
	$('#gps-discovery').hide();
	if (rv.gps.updated !== null) {
		rv.gps.secondsSinceUpdated = rv.gps.secondsSinceUpdated + Math.ceil(((new Date()).getTime() - rv.gps.updated.getTime()) / 1000);
		//window.console.log('since updated: ' + Math.ceil(((new Date()).getTime()-rv.gps.updated.getTime())/1000) + ' sec');
		if (rv.gps.secondsSinceUpdated >= rv.gps.options.updateInterval) {

			rv.gps.secondsSinceUpdated = 0;
			rv.gps.sendLocationUpdate();
		}
	}
	rv.gps.lat = latlng.latlng.lat;
	rv.gps.lng = latlng.latlng.lng;
	rv.gps.updated = new Date();
	var date = rv.gps.updated.toLocaleDateString(); //.substring(0, 10)
	var time = rv.gps.updated.toLocaleTimeString(); //.substring(11, 16)
	rv.myLocationMarker.bindPopup('<center><b>' + rv.identity.name + '</b><br>' + date + ' ' + time + '<center>');
	if (rv.gps.options.firstZoom) {
		rv.gps.options.firstZoom = false;
		//rv.map.setView([rv.gps.lat, rv.gps.lng], rv.gps.options.initialZoom);
		rv.zoomToFitMembers();
	}
	//window.console.log('Location updated: (' + rv.gps.lat + ', ' + rv.gps.lng + ') at ' + rv.gps.updated.toString());
});
rv.map.addControl(rv.gpsControl);//inizialize control

L.control.scale().addTo(rv.map);

rv.getMarkers = function () {
	if (rv.newMarkerDialog.dialog("isOpen") || rv.editMarkerDialog.dialog("isOpen") || rv.isMarkerPopupOpen()) {
		return false;
	}
	$.post("/rendezvous/v1/get/markers", {
		group: rv.group.id
	},
	function (data) {
		if (data['success']) {
			var markers = data['markers'];
			if (markers.length !== Object.keys(rv.markers).length) {
				rv.options.fitMarkers = true;
			}
			for (var id in rv.markers) {
				rv.map.removeLayer(rv.markers[id].marker);
			}
			rv.markers = [];
			for (var i = 0; i < markers.length; i++) {
				var id = markers[i].id;
				var marker = L.marker([markers[i].lat, markers[i].lng], {icon: rv.icons.greenIcon});

				var name = markers[i].name;
				//window.console.log('marker: ' + JSON.stringify(markers[i]));
				var description = markers[i].description;
				rv.addMarkerToMap(marker, id);

				rv.markers[id] = {
					marker: marker,
					id: id,
					name: name,
					description: description
				};
			}

		} else {
			//alert('Error fetching markers');
			window.console.log(data['message']);
		}
		return false;
	},
			'json');

};

rv.addMarkerToMap = function (marker, id) {
	marker.addTo(rv.map)
			.bindPopup(function () {

				rv.currentMarkerID = id; // global tracker of currently selected marker ID
				return rv.markerMenu();
			}
			);

	marker.on('click', function () {
		//window.console.log('you clicked marker: ' + id);
		rv.currentMarkerID = id; // global tracker of currently selected marker ID
	});

};

rv.createMarker = function (e) {
	var name = $('#new-marker-name').val();
	var description = $('#new-marker-description').val();

	$.post("/rendezvous/v1/create/marker", {
		group: rv.group.id,
		name: name,
		description: description,
		created: (new Date()).toISOString(),
		lat: rv.selectedLatLon.lat,
		lng: rv.selectedLatLon.lng,
		secret: rv.identity.secret,
		mid: rv.identity.id
	},
	function (data) {
		if (data['success']) {
			var marker = L.marker([rv.selectedLatLon.lat, rv.selectedLatLon.lng], {icon: rv.icons.greenIcon});
			var id = data['id'];
			rv.addMarkerToMap(marker, id);
			rv.markers[id] = {
				marker: marker,
				id: id,
				name: name,
				description: description
			};
		} else {
			alert('Error creating marker');
			window.console.log(data['message']);
		}
		rv.newMarkerDialog.dialog('close');
		return false;
	},
			'json');


};

rv.guid = function (prefix) {
	return prefix + '-xxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}
rv.markerMenu = function () {
	setTimeout(function () {
		$('.edit-marker').on('click', rv.openEditMarkerDialog);
		$('.delete-marker').on('click', rv.deleteMarker);
	}, 300);
	var markerInfo = '';
//	for (var i = 0; i < rv.markers.length; i++) {
//		if(rv.markers[i].id === rv.currentMarkerID) {
//			markerInfo = '<b>' + rv.markers[i].name + '</b><br>' + rv.markers[i].description + '<br>';
//		}
//	}
	//window.console.log('currentMarkerID: ' + rv.currentMarkerID);
	if (rv.markers[rv.currentMarkerID]) {
		markerInfo = '<b>' + rv.markers[rv.currentMarkerID].name + '</b><br>' + rv.markers[rv.currentMarkerID].description + '<br>';
	}

	return markerInfo + $('#edit-marker-button-wrapper').html();
};
rv.openEditMarkerDialog = function (e) {
	var name = rv.markers[rv.currentMarkerID].name;
	var description = rv.markers[rv.currentMarkerID].description;
	$('#edit-marker-name').val(name);
	$('#edit-marker-description').val(description);

	rv.editMarkerDialog.dialog('open');
};
rv.openNewMarkerDialog = function (e) {
	rv.newMarkerDialog.dialog('open');
};

rv.deleteMarker = function (e) {
	//window.console.log('delete marker');
	var answer = confirm("Delete marker (" + rv.markers[rv.currentMarkerID].name + ") ?");
	if (!answer) {
		return false;
	}

	$.post("/rendezvous/v1/delete/marker", {
		group: rv.group.id,
		id: rv.currentMarkerID,
		mid: rv.identity.id,
		secret: rv.identity.secret
	},
	function (data) {
		if (data['success']) {
			rv.map.removeLayer(rv.markers[rv.currentMarkerID].marker);
		} else {
			alert('Error deleting marker');
			window.console.log(data['message']);
		}
		return false;
	},
			'json');


};

rv.getIdentity = function () {
	var identity = Cookies.getJSON('identity');
	var group = Cookies.getJSON('group');
	if (typeof (group) !== 'undefined' && group === rv.group.id && typeof (identity) !== 'undefined' && typeof (identity.id) !== 'undefined' && identity.id !== null) {
		rv.identity = identity;
		rv.getMembers();
		rv.getMarkers();
		if (rv.memberUpdateID === null) {
			rv.memberUpdateID = window.setInterval(rv.getMembers, rv.memberUpdateInterval);
		}
		if (rv.markerUpdateID === null) {
			rv.markerUpdateID = window.setInterval(rv.getMarkers, rv.memberUpdateInterval);
		}
		return true;
	} else {

		//var name = window.prompt("Please enter your name", rv.identity.name);
		if (rv.identity.name === null || rv.identity.name === '') {
			rv.newMemberDialog.dialog("open");
			return false;
		}
		$.post("/rendezvous/v1/get/identity", {group: rv.group.id, name: rv.identity.name, currentTime: (new Date()).toISOString()},
		function (data) {
			if (data['success']) {
				rv.identity.secret = data['secret'];
				rv.identity.id = data['id'];
				rv.identity.name = data['name'];
				rv.identity.timeOffset = parseFloat(data['timeOffset']);	// time offset in minutes

				Cookies.set('identity', rv.identity, {expires: 365, path: ''});
				Cookies.set('group', rv.group.id, {expires: 365, path: ''});

				rv.getMarkers();
				rv.getMembers();
				if (rv.memberUpdateID === null) {
					rv.memberUpdateID = window.setInterval(rv.getMembers, rv.memberUpdateInterval);
				}
				if (rv.markerUpdateID === null) {
					rv.markerUpdateID = window.setInterval(rv.getMarkers, rv.memberUpdateInterval);
				}
			} else {
				window.console.log(data['message']);
			}
			return false;
		},
				'json');
	}
};

rv.getMembers = function () {
	if (rv.identity.id === null || rv.identity.secret === null) {
		return false;
	}
	$.post("/rendezvous/v1/get/members", {group: rv.group.id},
	function (data) {
		if (data['success']) {
			var members = data['members'];
			//window.console.log('members: ' + JSON.stringify(members));
			if (members.length !== (Object.keys(rv.members).length + 1)) {
				rv.options.fitMembers = true;
			}
			for (var id in rv.members) {
				if (rv.members[id].marker !== null) {
					rv.map.removeLayer(rv.members[id].marker);
				}
			}
			rv.members = [];
			for (var i = 0; i < members.length; i++) {
				var updateTime = new Date(members[i].updated);
				updateTime.setMinutes(updateTime.getMinutes() - rv.identity.timeOffset);
				window.console.log('updateTime: '  + updateTime + ', ' + members[i].name);
				var mid = members[i].mid;
				// Skip the member if it is self
				if (mid !== rv.identity.id) {
					
					rv.members[mid] = {
						name: members[i].name,
						id: members[i].mid,
						lat: members[i].lat,
						lng: members[i].lng,
						updated: updateTime
					};
					var marker = null;
					if (members[i].lat !== null && members[i].lng !== null) {


						(function (mid) {
							var tDiff = Math.ceil(((new Date()).getTime() - rv.members[mid].updated.getTime()) / 60000);
							//window.console.log('now: '  + (new Date()).toISOString());
							//window.console.log('updated: '  + rv.members[mid].updated.toISOString());
							//window.console.log('tDiff: '  + tDiff);
							var tUnit = 'minutes';
							// TODO: This is a hack to handle times reported in the future, but there is a real solution to this problem.
							while (tDiff < 0) {
								tDiff = tDiff + 60;
							}
							if (tDiff > 120) {
								tDiff = Math.floor(tDiff / 60);
								tUnit = 'hours';
							}
							var fillColor = '#FFF';
							var color = '#FFF';
							if (tUnit === 'minutes' && tDiff > 14) {
								if (tDiff < 30) {
									fillColor = '#FFA600';
								} else {
									fillColor = '#C4C4C4';
									color = '#F00';
								}
							} else {
								if (tUnit === 'minutes') {
									fillColor = '#00F';
								} else {
									fillColor = '#C4C4C4';
									color = '#F00';
								}
							}
							marker = new L.CircleMarker([members[i].lat, members[i].lng], {
								radius: 10,
								weight: 5,
								color: color,
								opacity: 1,
								fillColor: fillColor,
								fillOpacity: 1
							});
							marker.addTo(rv.map)
									//.bindPopup('<b>' + rv.members[mid].name + '</b><br>' + rv.members[mid].updated.toLocaleDateString() + ' ' + rv.members[mid].updated.toLocaleTimeString());
									.bindPopup('<b>' + rv.members[mid].name + '</b><br>about ' + tDiff + ' ' + tUnit + ' ago');

							marker.on('click', function () {
								rv.currentMemberID = mid; // global tracker of currently selected member
							});
						})(mid);
					}

					rv.members[mid].marker = marker;

				}
			}
			rv.zoomToFitMembers();
		} else {
			window.console.log(data['message']);
		}
		return false;
	},
			'json');
};

rv.zoomToFitMembers = function () {
	var markers = [];
	if (rv.options.fitMembers === true) {
		rv.options.fitMembers = false;
		for (var id in rv.members) {
			if (rv.members[id].marker !== null) {
				markers.push(rv.members[id].marker);
			}
		}
		if (rv.gps.updated !== null) {
			markers.push(rv.myLocationMarker);
		}
	}
	if (rv.options.fitMarkers === true) {
		rv.options.fitMarkers = false;
		for (var id in rv.markers) {
			if (rv.markers[id].marker !== null) {
				markers.push(rv.markers[id].marker);
			}
		}
	}
	var group = null;
	//window.console.log('markers: ' + markers.length);
	//rv.zoomMarkers = markers;
	if (markers.length > 0) {
		group = new L.featureGroup(markers);
		if (group.getLayers().length > 0) {
			rv.map.fitBounds(group.getBounds());
		}
	}
	//if (rv.options.fitMarkers === true || rv.options.fitMembers === true) {

	//}
	group = null;
	markers = null;
	return true;
};

rv.editMarkerDialog = $("#edit-marker-form").dialog({
	autoOpen: false,
	height: 400,
	width: 350,
	modal: true,
	buttons: {
		"Save changes": function () {
			rv.editMarker();
		},
		Cancel: function () {
			rv.editMarkerDialog.dialog("close");
		}
	},
	close: function () {
		return false;
	}
});

rv.editMarkerDialog.find("form").on("submit", function (event) {
	event.preventDefault();
	rv.editMarker();
});


rv.newMarkerDialog = $("#new-marker-form").dialog({
	autoOpen: false,
	height: 400,
	width: 350,
	modal: true,
	buttons: {
		"Create marker": function () {
			$(".leaflet-popup-close-button")[0].click();
			rv.createMarker();
		},
		Cancel: function () {
			rv.newMarkerDialog.dialog("close");
		}
	},
	close: function () {
		return false;
	}
});

rv.newMarkerDialog.find("form").on("submit", function (event) {
	event.preventDefault();
	rv.createMarker();
});

rv.editMarker = function () {
	//window.console.log($('#marker-name').val());
	var name = $('#marker-name').val();
	var description = $('#marker-description').val();
	// TODO: send updated values to server
	return false;
};

rv.isMarkerPopupOpen = function () {
	var isOpen = false;
	for (var id in rv.markers) {
		isOpen = rv.markers[id].marker._popup.isOpen() || isOpen;
	}
	return isOpen;
};

rv.newMemberDialog = $("#new-member-form").dialog({
	autoOpen: false,
	height: 400,
	width: 350,
	modal: true,
	buttons: {
		"Join": function () {
			rv.identity.name = $('#new-member-name').val();
			rv.getIdentity();
			rv.newMemberDialog.dialog("close");
		},
		Cancel: function () {
			rv.newMemberDialog.dialog("close");
		}
	},
	close: function () {
		return false;
	}
});

rv.newMemberDialog.find("form").on("submit", function (event) {
	event.preventDefault();
	rv.identity.name = $('#new-member-name').val();
	rv.getIdentity();
	rv.newMemberDialog.dialog("close");
});

$(window).load(function () {
	$("#new-member-name").focus(function () {
		// Select input field contents
		this.select();
	});
	//rv.newMemberDialog.dialog("open");
	// Start the background updates by obtaining an identity and joining the group
	rv.getIdentity();

});
