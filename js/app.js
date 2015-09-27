//All MTA Select Bus Routes in NYC
var busRoutes = [
	{name: 'M15+ SBS', id: 'MTA NYCT_M15+'},
	{name: 'M60+ SBS', id: 'MTA NYCT_M60+'},
	{name: 'BX12+ SBS', id: 'MTA NYCT_BX12+'},
	{name: 'M34+ SBS', id: 'MTA NYCT_M34+'},
	{name: 'M34A+ SBS', id: 'MTA NYCT_M34A+'},
	{name: 'S79+ SBS', id: 'MTA NYCT_S79+'},
	{name: 'B44+ SBS', id: 'MTA NYCT_B44+'},
	{name: 'BX41+ SBS', id: 'MTA NYCT_BX41+'},
	{name: 'M86+ SBS', id: 'MTA NYCT_M86+'}
];

//Get all the stops via MTA API for a given route
function getStopsForRoute(route) {
	var self = this;
	var baseUrl = 'http://bustime.mta.info/api/where/stops-for-route/';
	var jsonAndKey = '.json?key=791cb5ed-0cd7-44af-96b0-91fa6d781095&includePolylines=false&version=2';

	$.ajax({
		dataType: "jsonp",
		url: baseUrl + route.id + jsonAndKey,
		success: populateStopsForRoute
	});
}

//Callback function for creating a stop based on the route stop results
function populateStopsForRoute(data) {
	var self = this;
	var routeId = data.data.entry.routeId;
	data.data.references.stops.forEach(function(stop) {
		stop.routeId = routeId;
		viewModel.stops.push(new Stop(stop));
	});
}

//Stop constructor function
function Stop(stopData) {
	var self = this;
	this.isInfoWindowOpen = false;
	this.stopId = stopData.id;
	this.routeId = stopData.routeId;
	this.stopName = stopData.name;

	//Place marker on google map
	this.marker = new google.maps.Marker({
		position: new google.maps.LatLng(stopData.lat,stopData.lon),
		map: map,
		title: stopData.name
	});

	//Add click event handler on marker to show Info Window displaying next scheduled arrivals
	this.marker.addListener('click', function() {
		var baseUrl = 'http://bustime.mta.info/api/where/arrivals-and-departures-for-stop/';
		var jsonAndKey = '.json?key=791cb5ed-0cd7-44af-96b0-91fa6d781095&minutesAfter=60';

		$.ajax({
			dataType: "jsonp",
			url: baseUrl + self.stopId + jsonAndKey,
			success: function(response) {
				var contentString = '<div id="content">' + '<h3>Scheduled Arrivals - ' + self.stopName +'</h3>';
				if(response.data.arrivalsAndDepartures.length) {
					var tableContent = '';
					response.data.arrivalsAndDepartures.forEach(function(scheduleItem) {
						tableContent = tableContent + '<tr><td>' + scheduleItem.routeShortName + ' - ' +
						moment(scheduleItem.scheduledArrivalTime).format('LLL') + '</td></tr>';
					});
				
					var contentString = contentString + '<table>' + tableContent + '</table>';
				} else {
					contentString = contentString + 'No scheduled arrivals within the hour';
				}

				contentString = contentString + '</div>';

				var infoWindow = new google.maps.InfoWindow({
					content: contentString
				});

				infoWindow.open(map, self.marker);
			}
		});
	});


}

//KnockoutJS View Model Constructor
var ViewModel = function() {
	var self = this;

	this.routes = ko.observableArray(busRoutes);
	this.stops = ko.observableArray();

	this.query = ko.observable('');

	this.query.subscribe(function(newValue) {
		var searchValue = newValue.toUpperCase();
		for(var i=0; i < self.routes().length; i++) {
			if(self.routes()[i].name.indexOf(searchValue) >= 0) {
				//Set arrayitem to be visible using Knockout property
				self.routes()[i]._destroy = false;
				
				//Set google maps markers visible for route match
				for(var j=0; j < self.stops().length; j++) {
					if(self.stops()[j].routeId === self.routes()[i].id) {
						self.stops()[j].marker.setVisible(true);
					}
				}
			
			} else {
				//Set arrayitem to not be visible using Knockout property
				self.routes()[i]._destroy = true;
				
				//Set google maps markers not visible as no route match
				for(var k=0; k < self.stops().length; k++) {
					if(self.stops()[k].routeId === self.routes()[i].id) {
						self.stops()[k].marker.setVisible(false);
					}
				}
			}
		}

		//Re-render autobinded UI elements after changing internal Knockout _destroy property
		self.routes.valueHasMutated();
	});

};

//Instantiate Knockout ViewModel
var viewModel = new ViewModel();

$(document).ready(function() {
    //Apply knockout view model bindings
    ko.applyBindings(viewModel);

    //Get stops for all NYC Select Bus Routes
    busRoutes.forEach(function(route) {
    	getStopsForRoute(route);
    })
});