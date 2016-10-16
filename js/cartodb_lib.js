var CartoDbLib = CartoDbLib || {};
var CartoDbLib = {

  map_centroid:    [40.692353,-73.921509],
  defaultZoom:     11,
  lastClickedLayer: null,
  locationScope:   "new_york",
  currentPinpoint: null,
  layerUrl: 'https://cwhong.carto.com/api/v2/viz/1d2402e0-933d-11e6-839f-0ee66e2c9693/viz.json',
  tableName: 'nyc_zoning',
  maptiks_tracking_code: '',

  initialize: function(){

    //reset filters
    $("#search_address").val(CartoDbLib.convertToPlainString($.address.parameter('address')));
    $(":checkbox").attr("checked", "checked");

    geocoder = new google.maps.Geocoder();

    // initiate leaflet map
    if (!CartoDbLib.map) {
      CartoDbLib.map = new L.Map('mapCanvas', { 
        center: CartoDbLib.map_centroid,
        zoom: CartoDbLib.defaultZoom,
        layers: CartoDbLib.basemap
      });

      //CartoDbLib.google = new L.Google('ROADMAP', {animate: false});
        
      CartoDbLib.satellite = L.tileLayer('https://{s}.tiles.mapbox.com/v3/datamade.k92mcmc8/{z}/{x}/{y}.png', {
        attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
        detectRetina: true,
        sa_id: 'satellite'
      });
        
      CartoDbLib.basemap = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
      }).addTo(CartoDbLib.map);

      CartoDbLib.baseMaps = {"Basemap": CartoDbLib.basemap, "Satellite": CartoDbLib.satellite};
      //CartoDbLib.map.addLayer(CartoDbLib.google);

      CartoDbLib.info = L.control({position: 'bottomleft'});
      CartoDbLib.coinfo = L.control({position: 'bottomleft'});
      CartoDbLib.spinfo = L.control({position: 'bottomleft'});

      CartoDbLib.info.onAdd = function (map) {
          this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
          this.update();
          return this._div;
      };

      CartoDbLib.coinfo.onAdd = function (map) {
          this._div = L.DomUtil.create('div', 'coinfo'); // create a div with a class "info"
          $(this._div).hide();
          return this._div;
      };
      CartoDbLib.spinfo.onAdd = function (map) {
          this._div = L.DomUtil.create('div', 'spinfo'); // create a div with a class "info"
          $(this._div).hide();
          return this._div;
      };

      // method that we will use to update the control based on feature properties passed
      CartoDbLib.info.update = function (props) {
      
        if (props) {
          var zone_info = CartoDbLib.getZoneInfo(props.zonedist);
          this._div.innerHTML = "<img src='/images/icons/" + zone_info.zone_icon + ".png' /> " + props.zonedist + " - " + zone_info.shortdescription;
        } else {
          this._div.innerHTML = 'Hover over an area';
        }
        $(this._div).show();
      };

      CartoDbLib.coinfo.update = function (props) {
        this._div.innerHTML = "<img src='/images/icons/commercial.png' /> Commercial Overlay: " + props.overlay;
        $(this._div).show();
      };

      CartoDbLib.spinfo.update = function (props) {
        console.log(props);
        this._div.innerHTML = "Special Purpose District: " + props.sdname;
        $(this._div).show();
      };

      CartoDbLib.info.clear = function(){
        $(this._div).hide();
      };

      CartoDbLib.coinfo.clear = function(){

 
        $(this._div).hide();
      };

      CartoDbLib.spinfo.clear = function(){

 
        $(this._div).hide();
      };

      CartoDbLib.info.addTo(CartoDbLib.map);
      CartoDbLib.coinfo.addTo(CartoDbLib.map);
      CartoDbLib.spinfo.addTo(CartoDbLib.map);

      var fields = "cartodb_id, zone_type, zone_class, ordinance_"


      cartodb.createLayer(CartoDbLib.map, CartoDbLib.layerUrl )
        .addTo(CartoDbLib.map)
        .done(function(layer) {
          CartoDbLib.zoninglayer = layer;
          var sublayer = layer.getSubLayer(0);
          sublayer.setInteraction(true);
          sublayer.on('featureOver', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','pointer');
            CartoDbLib.info.update(data);
          })
          sublayer.on('featureOut', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','inherit');
            CartoDbLib.info.clear();
          })
          sublayer.on('featureClick', function(e, latlng, pos, data){
            CartoDbLib.getOneZone(data['cartodb_id'], latlng);
          })


          // CartoDbLib.map.on('zoomstart', function(e){
          //   sublayer.hide();
          // })
          // google.maps.event.addListener(CartoDbLib.google._google, 'idle', function(e){
          //   sublayer.show();
          // })

          window.setTimeout(function(){
            if($.address.parameter('id')){
              CartoDbLib.getOneZone($.address.parameter('id'))
            }
          }, 500)

          CartoDbLib.drawLayerControl();

        }).error(function(e) {
          //console.log('ERROR')
          //console.log(e)
        }); 

        //add the Commercial Overlay Layer
        var layerStyle = $('#colayer-style').text();
        cartodb.createLayer(CartoDbLib.map, {
          user_name: 'cwhong',
          type: 'cartodb',
          sublayers: [{
            sql: "SELECT * FROM nyco",
            cartocss: layerStyle
          }]
        })
        //.addTo(CartoDbLib.map)
        .done(function(layer) {
          

          var sublayer = layer.getSubLayer(0);
          sublayer.setInteraction(true);
          sublayer.setInteractivity('cartodb_id,overlay');
          sublayer.on('featureOver', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','pointer');
            CartoDbLib.coinfo.update(data);
            console.log(data);
          });

          sublayer.on('featureOut', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','inherit');
            CartoDbLib.coinfo.clear();
          });

          CartoDbLib.colayer = layer;
          CartoDbLib.drawLayerControl();
        })

        //add the special purpose districts layer
        var layerStyle = $('#splayer-style').text();
        cartodb.createLayer(CartoDbLib.map, {
          user_name: 'cwhong',
          type: 'cartodb',
          sublayers: [{
            sql: "SELECT * FROM nysp",
            cartocss: layerStyle
          }]
        })
     
        .done(function(layer) {

          var sublayer = layer.getSubLayer(0);
          sublayer.setInteraction(true);
          sublayer.setInteractivity('cartodb_id,sdname');
          sublayer.on('featureOver', function(e, latlng, pos, data, subLayerIndex) {
            console.log('featureOver');
            $('#mapCanvas div').css('cursor','pointer');
            CartoDbLib.spinfo.update(data);
          });

          sublayer.on('featureOut', function(e, latlng, pos, data, subLayerIndex) {
            $('#mapCanvas div').css('cursor','inherit');
            CartoDbLib.coinfo.clear();
          });

          CartoDbLib.splayer = layer;
          CartoDbLib.drawLayerControl();
        })

        var layerStyle = $('#lhlayer-style').text();
        console.log(layerStyle);
        cartodb.createLayer(CartoDbLib.map, {
          user_name: 'cwhong',
          type: 'cartodb',
          sublayers: [{
            sql: "SELECT * FROM nylh",
            cartocss: layerStyle
          }]
        })
        //.addTo(CartoDbLib.map)
        .done(function(layer) {
          CartoDbLib.lhlayer = layer;
      
          CartoDbLib.drawLayerControl();
        })


      }

    CartoDbLib.doSearch();
  },

  drawLayerControl: function() {
    if(
      CartoDbLib.zoninglayer 
      && CartoDbLib.colayer
      && CartoDbLib.splayer
      && CartoDbLib.lhlayer
    ) {
      L.control.layers(CartoDbLib.baseMaps, {
        "Zoning Districts": CartoDbLib.zoninglayer,
        "Commerical Overlay Districts": CartoDbLib.colayer,
        "Special Purpose Districts": CartoDbLib.splayer,
        "Limited Height Districts": CartoDbLib.lhlayer
      }, { collapsed: false, autoZIndex: true }).addTo(CartoDbLib.map);
    }
  },

  getZoneInfo: function(zonedist) {
   
    //title = ZoningTable[zonedist].district_title;
    //description = ZoningTable[zone_class].juan_description;
    //zone_class_link = zone_class;
    //project_link = "";
    
     // console.log(zonedist);
     // console.log(ZoningTable[zonedist]);

     var z = ZoningTable[zonedist];
    return {
      'shortdescription': z.shortdescription,
      'description': z.description, 
      'url': z.url, 
      'zone_icon': CartoDbLib.getZoneIcon(zonedist)
      // 'project_link': project_link
    };
  },

  getZoneIcon: function(zonedist) {
    var zone_prefix = zonedist.substr(0,1);

    var zone_icon = '';
    switch(zone_prefix) {
      case 'C'   : zone_icon = 'commercial'; break;
      case 'M'   : zone_icon = 'industrial'; break;
      case 'R'   : zone_icon = 'residential'; break;
      case 'P' : zone_icon = 'parks-entertainment'; break;
    }

    return zone_icon;
  },

  getOneZone: function(cartodb_id, click_latlng){
    if (CartoDbLib.lastClickedLayer){
      CartoDbLib.map.removeLayer(CartoDbLib.lastClickedLayer);
    }
    $.address.parameter('id', cartodb_id);
    var sql = new cartodb.SQL({user: 'cwhong', format: 'geojson'});
    sql.execute('select * from ' + CartoDbLib.tableName + ' where cartodb_id = {{cartodb_id}}', {cartodb_id:cartodb_id})
    .done(function(data){
      var shape = data.features[0];
      CartoDbLib.lastClickedLayer = L.geoJson(shape);
      CartoDbLib.lastClickedLayer.addTo(CartoDbLib.map);
      CartoDbLib.lastClickedLayer.setStyle({weight: 3, fillOpacity: 0, opacity: 1, color: '#FFF'});
      CartoDbLib.map.fitBounds(CartoDbLib.lastClickedLayer.getBounds(), {maxZoom: 16});

      // show custom popup
      var props = shape.properties;
      console.log('props',props);
      var zone_info = CartoDbLib.getZoneInfo(props.zonedist);
      console.log(zone_info);
      var popup_content = "\
        <h4>\
          <img src='/images/icons/" + zone_info.zone_icon + ".png' />\
          <a href='/zone/" + zone_info.url + "/'>" + props.zonedist + "\
            <small>" + zone_info.shortdescription + "</small>\
          </a>\
        </h4>\
        <p><strong>What's here?</strong><br />\
        " + zone_info.description + "\
        <a href='" + zone_info.url + "'>Learn&nbsp;more&nbsp;»</a></p>\
        ";

      // if (zone_info.project_link != "")
      //   popup_content += "<p><a target='_blank' href='" + zone_info.project_link + "'>Read the full development plan for " + props.zone_class + "&nbsp;»</a></p>"

      if (click_latlng) {
        CartoDbLib.popup = L.popup()
        .setContent(popup_content)
        .setLatLng(click_latlng)
        .openOn(CartoDbLib.map);
      }
      else {
        CartoDbLib.lastClickedLayer.bindPopup(popup_content);
        CartoDbLib.lastClickedLayer.openPopup();
      }

    }).error(function(e){console.log(e)});
  },

  doSearch: function() {
    CartoDbLib.clearSearch();
    var address = $("#search_address").val();
    
    if (address != "") {
      if (address.toLowerCase().indexOf(CartoDbLib.locationScope) == -1)
        address = address + " " + CartoDbLib.locationScope;
      
      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          CartoDbLib.currentPinpoint = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
          $.address.parameter('address', encodeURIComponent(address));
          CartoDbLib.map.setView(new L.LatLng( CartoDbLib.currentPinpoint[0], CartoDbLib.currentPinpoint[1] ), 16)
          CartoDbLib.centerMark = new L.Marker(CartoDbLib.currentPinpoint, { icon: (new L.Icon({
            iconUrl: '/images/blue-pushpin.png',
            iconSize: [32, 32],
            iconAnchor: [10, 32]
          }))}).addTo(CartoDbLib.map);

          var sql = new cartodb.SQL({user: 'datamade', format: 'geojson'});
          sql.execute('select cartodb_id, the_geom from ' + CartoDbLib.tableName + ' where ST_Intersects( the_geom, ST_SetSRID(ST_POINT({{lng}}, {{lat}}) , 4326))', {lng:CartoDbLib.currentPinpoint[1], lat:CartoDbLib.currentPinpoint[0]})
          .done(function(data){
          
            CartoDbLib.getOneZone(data.features[0].properties.cartodb_id, CartoDbLib.currentPinpoint)
          }).error(function(e){console.log(e)});

          // CartoDbLib.drawCircle(CartoDbLib.currentPinpoint);
        } 
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      CartoDbLib.map.setView(new L.LatLng( CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1] ), CartoDbLib.defaultZoom)
    }
  },

  clearSearch: function(){
    if (CartoDbLib.lastClickedLayer) {
      CartoDbLib.map.removeLayer(CartoDbLib.lastClickedLayer);
    }
    if (CartoDbLib.centerMark)
      CartoDbLib.map.removeLayer( CartoDbLib.centerMark );
    if (CartoDbLib.circle)
      CartoDbLib.map.removeLayer( CartoDbLib.circle );

    CartoDbLib.map.setView(new L.LatLng( CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1] ), CartoDbLib.defaultZoom)
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;
    
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        CartoDbLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },
  
  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          CartoDbLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
    return decodeURIComponent(text);
  }
}