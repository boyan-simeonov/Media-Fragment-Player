var MediaFragments = (function(window) {
  
  //  "use strict";  
  
  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fun /*, thisp */) {
      "use strict";
      if (this === void 0 || this === null) {
        throw new TypeError();
      }
      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== "function") {
        throw new TypeError();
      }
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in t) {
          fun.call(thisp, t[i], i, t);
        }
      }
    };
  }
  
  // '&' is the only primary separator for key-value pairs
  var SEPARATOR = '&';  
  
  // report errors?
  var VERBOSE = false;
  
  var logWarning = function(message) {
    if (VERBOSE) {
      console.log('Media Fragments URI Parsing Warning: ' + message);
    }
  }
  
  // the currently supported media fragments dimensions are: t, xywh, track, chapter
  // allows for O(1) checks for existence of valid keys
  var dimensions = {
    t: function(value) {          
      var components = value.split(',');
      var start = components[0]? components[0] : '';
      var end = components[1]? components[1] : '';
      
      var nptSeconds = /^((npt\:)?\d+(\.\d+)?)?$/;
      var nptHoursMinutesSeconds = /^((npt\:)?((\d+)\:)?(\d\d)\:(\d\d)(\.\d+)?)?$/;
      var smpte = /^(\d\:\d\d\:\d\d(\:\d\d(\.\d\d)?)?)?$/;
      // regexp adapted from http://delete.me.uk/2005/03/iso8601.html
      var wallClock = /^((\d{4})(-(\d{2})(-(\d{2})(T(\d{2})\:(\d{2})(\:(\d{2})(\.(\d+))?)?(Z|(([-\+])(\d{2})\:(\d{2})))?)?)?)?)?$/;

      if ((nptSeconds.test(start) || nptHoursMinutesSeconds.test(start)) &&
          (nptSeconds.test(end) || nptHoursMinutesSeconds.test(end))) {
        if (start && end) {
          // converts hh:mm:ss.ms to ss.ms
          function convertHoursMinutesSecondsToSeconds(time) {
            var hours =
                parseInt(time.replace(nptHoursMinutesSeconds, '$4'), 10);
            if (isNaN(hours)) {
              hours = 0;
            }    
            var minutes =
                parseInt(time.replace(nptHoursMinutesSeconds, '$5'), 10);
            if (isNaN(minutes)) {
              minutes = 0;
            }                
            var seconds =
                parseInt(time.replace(nptHoursMinutesSeconds, '$6'), 10);
            if (isNaN(seconds)) {
              seconds = 0;
            }                
            var milliseconds = time.replace(nptHoursMinutesSeconds, '$7');            
            var result =
                ((hours * 3600) + (minutes * 60) + (seconds)).toString() +
                milliseconds;                
            return result;            
          }
          if (nptHoursMinutesSeconds.test(start)) {
            start = convertHoursMinutesSecondsToSeconds(start);
          }
          if (nptHoursMinutesSeconds.test(end)) {
            end = convertHoursMinutesSecondsToSeconds(end);
          }   
          if (parseFloat(start) < parseFloat(end)) {    
            return {
              value: value,
              unit: 'npt',
              start: start,
              end: end
            };
          } else {
            logWarning('Please ensure that start < end.');                
            return false;
          }
        } else {
          return {
            value: value,
            unit: 'npt',
            start: start,
            end: end
          };
        }
      }
      var prefix = start.replace(/^(smpte(-25|-30|-30-drop)?).*/, '$1');
      start = start.replace(/^smpte(-25|-30|-30-drop)?\:/, '');      
      if ((smpte.test(start)) && (smpte.test(end))) {            
        if (start && end) {
          if (true /* ToDo: add check to ensure that start < end */) {    
            return {
              value: value,
              unit: prefix,
              start: start,
              end: end
            };            
          } else {
            logWarning('Please ensure that start < end.');                                
            return false;
          }
        } else {
          return {
            value: value,
            unit: prefix,
            start: start,
            end: end
          };          
        }
      }
      start = start.replace('clock:', '');
      if ((wallClock.test(start)) && (wallClock.test(end))) {
        // last condition is to ensure ISO 8601 date conformance.
        if (start && end && !isNaN(Date.parse('2009-07-26T11:19:01Z'))) {
          // if both start and end are given, then the start must be before
          // the end
          if (Date.parse(start) <= Date.parse(end)) {            
            return {
              value: value,
              unit: 'clock',
              start: start,
              end: end
            };            
          } else {
            logWarning('Please ensure that start < end.');                                
            return false;
          }
        } else {
          return {
            value: value,
            unit: 'clock',
            start: start,
            end: end
          };          
        }
      }
      logWarning('Invalid time dimension.');                          
      return false;
    },
    xywh: function(value) {
      // "pixel:" is optional
      var pixelCoordinates = /^(pixel\:)?\d+,\d+,\d+,\d+$/;
      // "percent:" is obligatory
      var percentSelection = /^percent\:\d+,\d+,\d+,\d+$/;
      
      var values = value.replace(/(pixel|percent)\:/, '').split(','); 
      var x = values[0];
      var y = values[1];
      var w = values[2];
      var h = values[3];                              
      if (pixelCoordinates.test(value)) {             
        return {
          value: value,
          unit: 'pixel',          
          x: x,
          y: y,
          w: w,
          h: h
        };
      } else if (percentSelection.test(value)) {
        /**
         * checks for valid percent selections
         */
        var checkPercentSelection = (function checkPercentSelection(
            x, y, w, h) {
          if (!((0 <= x) && (x <= 100))) { 
            logWarning('Please ensure that 0 <= x <= 100.');                
            return false;
          }
          if (!((0 <= y) && (y <= 100))) { 
            logWarning('Please ensure that 0 <= y <= 100.');                
            return false;
          }
          if (!((0 <= w) && (w <= 100))) { 
            logWarning('Please ensure that 0 <= w <= 100.');                
            return false;
          }
          if (!((0 <= h) && (h <= 100))) { 
            logWarning('Please ensure that 0 <= h <= 100.');                
            return false;
          }            
          return true;            
        });        
        if (checkPercentSelection(x, y, w, h)) {
          return {
            value: value,
            unit: 'percent',          
            x: x,
            y: y,
            w: w,
            h: h
          };
        }
        logWarning('Invalid percent selection.');                
        return false;
      } else {
        logWarning('Invalid spatial dimension.');                
        return false;
      }
    },
    track: function(value) {
      return {
        value: value,
        name: value
      };
    },
    chapter: function(value) {          
      return {
        value: value,
        chapter: value
      };
    }
  }      
  
  /**
   * splits an octet string into allowed key-value pairs
   */
  var splitKeyValuePairs = function(octetString) {
    var keyValues = {};
    var keyValuePairs = octetString.split(SEPARATOR);    
    keyValuePairs.forEach(function(keyValuePair) {      
      // the key part is up to the first(!) occurrence of '=', further '='-s
      // form part of the value
      var position = keyValuePair.indexOf('=');
      if (position < 1) {
        return;
      } 
      var components = [
          keyValuePair.substring(0, position),
          keyValuePair.substring(position + 1)];
      // we require a value for each key
      if (!components[1]) {
        return;
      }
      // the key name needs to be decoded
      var key = decodeURIComponent(components[0]);
      // only allow keys that are currently supported media fragments dimensions
      var dimensionChecker = dimensions[key];
      // the value needs to be decoded
      var value = decodeURIComponent(components[1]);
      if (dimensionChecker) {
        value = dimensionChecker(value);
      } else {
        // we had a key that is not part of media fragments
        return;
      }
      if (!value) {
        return;
      }                        
      // keys may appear more than once, thus store all values in an array
      if (!keyValues[key]) {
        keyValues[key] = [];
      }
      keyValues[key].push(value);
    });
    return keyValues;
  }  
  
  return {
    parseMediaFragmentsUri: function(opt_uri) {    
      var uri = opt_uri? opt_uri : window.location.href;
      // retrieve the query part of the URI    
      var indexOfHash = uri.indexOf('#');
      var indexOfQuestionMark = uri.indexOf('?');
      var end = (indexOfHash !== -1? indexOfHash : uri.length);
      var query = indexOfQuestionMark !== -1?
          uri.substring(indexOfQuestionMark + 1, end) : '';
      // retrieve the hash part of the URI
      var hash = indexOfHash !== -1? uri.substring(indexOfHash + 1) : '';
      var queryValues = splitKeyValuePairs(query);
      var hashValues = splitKeyValuePairs(hash);
      return {
        query: queryValues,
        hash: hashValues,
        toString: function() {
          var buildString = function(name, thing) {
            var s = '\n[' + name + ']:\n';
            if(!Object.keys) Object.keys = function(o){            
              if (o !== Object(o)) {
                throw new TypeError('Object.keys called on non-object');
              }
              var ret = [], p;
              for (p in o) {
                if (Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
              }
              return ret;
            }            
            Object.keys(thing).forEach(function(key) {
              s += '  * ' + key + ':\n';
              thing[key].forEach(function(value) {
                s += '    [\n';
                Object.keys(value).forEach(function(valueKey) {
                  s += '      - ' + valueKey + ': ' + value[valueKey] + '\n';
                });
                s += '   ]\n';
              }); 
            });
            return s;
          }
          var string =
              buildString('Query', queryValues) +
              buildString('Hash', hashValues);
          return string; 
        }      
      };
    }
  }
})(window)