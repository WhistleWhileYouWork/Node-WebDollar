import {NodesList} from './../../node/lists/nodes-list';
import {GeoHelper} from './../../node/lists/geolocation-lists/geo-helpers/geo-helper';
import NetworkMapStypeLight from './styles/network-map-style-light';

class NetworkMap {

    /*
        markers = []
     */

    constructor(){

        console.log("NetworkMap constructor");

        this.markers = [];

        let iconBase = 'https://maps.google.com/mapfiles/kml/shapes/';
        this.icons = {

            general: {
                icon: 'http://maps.google.com/mapfiles/ms/micons/red.png',
            },
            myself: {
                icon: 'http://pic2.iranshao.com/emoji/qq/4.gif',
            },
            fullNodeServer: {
                icon: 'http://icons.iconarchive.com/icons/blackvariant/button-ui-system-apps/16/Terminal-icon.png',
            },
            webPeer: {
                icon: 'http://icons.iconarchive.com/icons/dtafalonso/android-lollipop/16/Browser-icon.png',
            },
            clientSocket: {
                icon: 'http://icons.iconarchive.com/icons/simplefly/simple-green/16/plug-electricity-icon.png',
            }
        };

    }

    createMap(id, style){

        if (typeof style === 'undefined')
            style  = NetworkMapStypeLight.style;

        let map = new google.maps.Map(document.getElementById(id), {
            zoom: 2,
            center:  {lat: 0, lng: 0},
            mapTypeId: 'roadmap',
            styles: style,
        });

        window.map = map;

        return map;
    }

    async initialize(map){

        if (typeof google === 'undefined' || typeof google.maps === 'undefined'){
            alert('GOOGLE MAPS LIBRARY IS NOT REGISTERED');
            return false;
        }

        NodesList.registerEvent("connected", {type: ["all"]}, async (err, nodeListObject) => {

            let geoLocation = await nodeListObject.socket.node.sckAddress.getGeoLocation();

            //console.log("geoLocation",geoLocation);

            this._addMarker(map, geoLocation, nodeListObject.socket);

        } );

        NodesList.registerEvent("disconnected", {type: ["all"]}, async (err, nodeListObject) => {

            //deleting the marker

            let markerIndex = this._findMarkerIndexBySocket(nodeListObject.socket);

            if (markerIndex !== -1) {

                this.markers[markerIndex].setMap(null);

                if (typeof this.markers[markerIndex].curveMarker !== 'undefined')  this.markers[markerIndex].curveMarker.setMap(null);
                if (typeof this.markers[markerIndex].linePoly !== 'undefined')  this.markers[markerIndex].linePoly.setMap(null);
                if (typeof this.markers[markerIndex].infoWindow !== 'undefined') this.markers[markerIndex].infoWindow.setMap(null);

                this.markers.splice(markerIndex, 1);
            }

        });

        await this._showMyself(map);
    }

    _getInfoWindowContent(geoLocation, socket){

        return (
            '<div id="content">'+
                '<div id="siteNotice">'+
                '</div>'+
                    '<h1 class="firstHeading" style="padding-bottom: 0">'+(socket === 'myself' ? 'YOU' : socket.node.sckAddress.toString() )+'</h1>'+
                    '<h2 class="secondHeading">'+(socket === 'myself' ? '' : socket.node.type + ' : '+socket.node.index)+'</h2>'+
                    '<div id="bodyContent">'+
                        '<p>Connected to <b>'+geoLocation.city||''+', '+geoLocation.country||''+'</b> <br/>'+
                            geoLocation.isp + '<br/> <br/>'+
                            (geoLocation.lat||'undefined') + '    '+ (geoLocation.lng||'undefined')+ '<br/>'+
                        '</p>'+
                '</div>'+
            '</div>');
    }

    _findMarkerIndexBySocket(socket){

        for (let i=0; i< this.markers.length; i++ )
            if (this.markers[i].socket === socket)
                return i;

        return -1;

    }

    _addMarker(map, geoLocation, socket){

        if (typeof google === 'undefined' || typeof google.maps === 'undefined'){
            alert('GOOGLE MAPS LIBRARY IS NOT REGISTERED');
            return false;
        }

        console.log("marker ", google.maps.Marker, map)

        let position = {lat: geoLocation.lat||0, lng: geoLocation.lng||0};

        let feature = '';

        if (socket === 'myself') feature = 'myself';
        else
        if (socket !== null)
            switch (socket.node.type){
                case 'client': feature = 'fullNodeServer'; break;
                case 'server' : feature = 'clientSocket'; break;
                case 'webpeer' : feature = 'webPeer'; break;
            }

        let marker = new google.maps.Marker({
            position: position,
            map: map,
            clickable: true,
            icon: (this.icons.hasOwnProperty(feature) ? this.icons[feature].icon : this.icons['general']),
        });

        let infoWindow = new google.maps.InfoWindow({
            content: this._getInfoWindowContent(geoLocation, socket)
        });

        marker.addListener('click', function() {
            infoWindow.open(map, marker);
        });

        marker.socket = socket;
        marker.infoWindow = infoWindow;

        this.markers.push(marker);

        this._createConnectionsArcs(false, map);

    }

    async _showMyself(map){
        let geoLocation = await GeoHelper.getLocationFromAddress('', true);

        this._addMarker(map, geoLocation, 'myself');
    }

    initializePolylines(map){


        this._createConnectionsArcs(false, map);
        google.maps.event.addListener(map, 'projection_changed', () => {this._createConnectionsArcs(true, map) });
        google.maps.event.addListener(map, 'zoom_changed', () => {this._createConnectionsArcs(true, map)});

        // google.maps.event.addListener(markerP1, 'position_changed', updateCurveMarker);
    }

    _createConnectionsArcs(update, map, showOldArcs) {

        if (typeof showOldArcs === 'undefined') showOldArcs = false;

        /*
            TUTORIAL - BASED ON http://jsfiddle.net/medmunds/sd10up9t/
         */

        let markerMyself = null;
        for (let i=0; i<this.markers.length; i++)
            if (this.markers[i].socket === "myself"){
                markerMyself = this.markers[i];
                break;
            }

        if (markerMyself === null) {
            console.log("NetworkMap: No Marker Myself");
            return false;
        }


        let  projection = map.getProjection();

        if (!projection){
            console.log("NetworkMap - PROJECT is not defined");
            return false;
        }

        let pos1 = markerMyself.getPosition(); // latlng
        let p1 = projection.fromLatLngToPoint(pos1); // xy

        let Point = google.maps.Point;

        const curvature = 0.2; // how curvy to make the arc

        for (let i=0; i<this.markers.length; i++)
            if (this.markers[i] !== markerMyself){
                let marker = this.markers[i];

                let pos2 = marker.getPosition();
                let lineColor = 'black';

                switch (marker.socket.node.type){
                    case 'client': lineColor = 'red'; break;
                    case 'server' : lineColor = 'red'; break;
                    case 'webpeer' : lineColor = 'blue'; break;
                }

                if (showOldArcs){

                    let p2 = projection.fromLatLngToPoint(pos2);

                    // Calculate the arc.
                    // To simplify the math, these points
                    // are all relative to p1:
                    let e = new Point(p2.x - p1.x, p2.y - p1.y), // endpoint (p2 relative to p1)
                        m = new Point(e.x / 2, e.y / 2), // midpoint
                        o = new Point(e.y, -e.x), // orthogonal
                        c = new Point( // curve control point
                            m.x + curvature * o.x,
                            m.y + curvature * o.y);

                    let pathDef = 'M 0,0 ' +
                        'q ' + c.x + ',' + c.y + ' ' + e.x + ',' + e.y;

                    let zoom = map.getZoom(),
                        scale = Math.max( 1 / (Math.pow(2, -zoom)), 0.1);

                    let symbol = {
                        path: pathDef,
                        scale: scale,
                        strokeWeight: 2,
                        fillColor: 'none'
                    };

                    if (!marker.curveMarker)
                        marker.curveMarker = new google.maps.Marker({
                            position: pos1,
                            clickable: false,
                            icon: symbol,
                            zIndex: 0, // behind the other markers
                            map: map
                        });
                    else

                        marker.curveMarker.setOptions({
                            position: pos1,
                            icon: symbol,
                        });

                    //line polyline
                } else if (update === false) {

                    let polyPath = [
                        {lat: pos1.lat(), lng: pos1.lng()},
                        {lat: pos2.lat(), lng: pos2.lng()},
                    ];

                    if (!marker.linePoly) { //creating for the first time a linePoly

                        marker.linePoly = new google.maps.Polyline({
                            path: polyPath,
                            geodesic: true,
                            strokeColor: lineColor,
                            strokeOpacity: 1.0,
                            strokeWeight: 2
                        });

                        marker.linePoly.setMap(map);

                    } else

                        marker.linePoly.setOptions({
                            position: polyPath,
                        });

                }


            }

    }


}

exports.NetworkMap =  new NetworkMap();