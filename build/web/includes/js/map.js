var globalMap;
var imagePath = '/Example/includes/images/';
var markerCluster;
function getMax(center, bounds, distance){
    var spherical = google.maps.geometry.spherical;
    var ne = new google.maps.LatLng(Math.max(bounds.getNorthEast().lat(), spherical.computeOffset(center, distance, 0).lat()), Math.max(bounds.getNorthEast().lng(), spherical.computeOffset(center, distance, 90).lng()));
    var sw = new google.maps.LatLng(Math.min(bounds.getSouthWest().lat(), spherical.computeOffset(center, distance, 180).lat()), Math.min(bounds.getSouthWest().lng(), spherical.computeOffset(center, distance, -90).lng()));
    var maxBounds = new google.maps.LatLngBounds(sw, ne);
    return maxBounds;
}

var sort_by = function(field, reverse, primer){

    var key = function (x) {
        return primer ? primer(x[field]) : x[field]
    };

    return function (a,b) {
        var A = key(a), B = key(b);
        return (A < B ? -1 : (A > B ? 1 : 0)) * [1,-1][+!!reverse];              
    }
}

function parseDouble(value){
    if(typeof value == "string") {
        value = value.match(/^-?\d*/)[0];
    }

    return !isNaN(parseInt(value)) ? value * 1 : NaN;
}

function followLink(lat, lng){
    globalMap.panTo(new google.maps.LatLng(lat, lng));
    globalMap.setZoom(12);
}

function refresh() {
    if (markerCluster){
        markerCluster.clearMarkers(); 
    }
    var infowindow = new google.maps.InfoWindow();
    var center = globalMap.getCenter();
    var bounds = globalMap.getBounds();
    var maxBounds = getMax(center, bounds, 1000);
        
    var filterString = new Array();
    var arrayCount = 0;
    var filters = document.getElementById("filters").getElementsByTagName("input");
    for (var m = 0; m < filters.length; m++){
        if(filters[m].type == "checkbox" && filters[m].checked == true){
            filterString[arrayCount] = filters[m].value;
            arrayCount++;
        }
    }
    $.post(
        "markers",
        {
            "north": maxBounds.getNorthEast().lat(),
            "east": maxBounds.getNorthEast().lng(),
            "south": maxBounds.getSouthWest().lat(),
            "west": maxBounds.getSouthWest().lng(),
            "centerLat": globalMap.getCenter().lat(),
            "centerLng": globalMap.getCenter().lng(),
            "filters[]": filterString
        },
        function(data){
            var markers = data.markers.sort(sort_by('dist', false, parseDouble));  
                
               
            var list = "";
            var markArray = [];
            var marker;
                
            for (var i = 0; i < markers.length; i++) {
                var dist = markers[i].dist.toString();
                var index = dist.indexOf(".")
                var distance;
                if (index != -1) {
                    distance = dist.substr(0, index);
                } else {
                    distance = dist + "";
                }
                    
                var num = i + 1;
                var lat = markers[i].location.latitude;
                var lng = markers[i].location.longitude;
                var content = "<div class=\"listItem\"><h2><a id=\"mapLink\" onclick=\"followLink("+lat+","+lng+")\" href=\"javascript:void(0)\"><img src=\""+imagePath + markers[i].serviceType + '.png'+"\"/>" + markers[i].name + "</a></h2><p>Approx. " + distance + " km away</p></div>";
                list = list +  content;
                var icon = imagePath + markers[i].serviceType + '.png';
                    
                marker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    icon: icon
                });
                var name = markers[i].name;
                var phone = markers[i].phone;
                google.maps.event.addListener(marker, 'click', (function(marker, lat, lng, name, phone) {
                    return function() {
                        var latlng = new google.maps.LatLng(lat, lng)
                        geocoder = new google.maps.Geocoder();
                        geocoder.geocode({
                            'latLng': latlng
                        }, function(results, status) {
                            if (status == google.maps.GeocoderStatus.OK) {
                                if (results[1]) {
                                    var content = "<p>" + name + "</p><p>Address: " + results[1].formatted_address + "</p><p>Phone: " + phone + "</p>";
                                    globalMap.panTo(latlng);
                                    infowindow.setContent(content);
                                    infowindow.open(globalMap, marker);
                                }
                            } 
                        });                            
                    }
                })(marker, lat, lng, name, phone));
                    
                markArray.push(marker);
            }
                
            markerCluster.addMarkers(markArray);
               
            if (i == 0){
                list = "There are no services near your location";
            }
            document.getElementById("list").innerHTML = list;
        },
        "json"
        )
}

function initialize() {
    var defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-10.4121, 113.0918),
        new google.maps.LatLng(-43.3840, 153.023036)
        );
        
    var mapOptions = {
        center: new google.maps.LatLng(-27.470280,153.023036),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        minZoom: 4
    };
    globalMap = new google.maps.Map(document.getElementById('map'), mapOptions);
    
    var options = {
        bounds: defaultBounds
    }    
    
    markerCluster = new MarkerClusterer(globalMap, {
        gridSize: 60,
        averageCenter: true
    });
       
    var input = document.getElementById('searchTextField');
    var autocomplete = new google.maps.places.Autocomplete(input, options);

    autocomplete.bindTo('bounds', globalMap);

    google.maps.event.addListener(autocomplete, 'place_changed', function() {
        var place = autocomplete.getPlace();
        if (place.geometry.viewport) {
            globalMap.fitBounds(place.geometry.viewport);
        } else {
            globalMap.setCenter(place.geometry.location);
            globalMap.setZoom(14);
        }
    });
    
    google.maps.event.addListener(globalMap, 'idle', function() {
        refresh();            
    });
    
}
google.maps.event.addDomListener(window, 'load', initialize);

$('input:checkbox').live('change', function(){
    refresh();
});
