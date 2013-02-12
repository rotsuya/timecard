var timecard = (function() {
    /**
     * Day name.
     * @type {Object <string, Array>}
     * @const
     * @private
     * @enum {Array <string>}
     */
    var _DAY_NAME = {
        JP: ['<span class="sun">S</span>','M','T','W','T','F','<span class="sat">S</sat>']
    };

    /**
     * Locale
     * @type {String}
     * @private
     */
    var _locale = 'JP';

    /**
     * Timer of rewrite the clock.
     * @private
     */
    var _interval;

    /**
     * Datetime when app is run.
     * @type {Date}
     * @private
     */
    var _date = new Date();

    /**
     * If load() method is called yet or not. It is used not to call twice.
     * @type {Boolean}
     * @private
     */
    var _isLoaded = false;

    /**
     * How many month after today the current card is.
     * @type {Number}
     * @private
     */
    var _monthAfter = 0;

    /**
     * If the card is being dragged now or not.
     * @type {Boolean}
     * @private
     */
    var _isDragging = false;

    /**
     * If the card is sliding now or not.
     * @type {Boolean}
     * @private
     */
    var _isSliding = false;

    /**
     * Cache of local storage.
     * @type {Object}
     * @private
     */
    var _storage = {};

    /**
     * Dom elements that is used often.
     * @type {Object <string, Element>}
     * @private
     * @enum {Element}
     */
    var _elem = {
        cardContainer: document.getElementById('cardContainer'),
        cardWrapper: document.getElementById('cardWrapper'),
        card: document.getElementById('card'),
        date: document.getElementById('date'),
        time: document.getElementById('time'),
        clock: document.getElementById('clock'),
        arrive: document.getElementById('arrive'),
        leave: document.getElementById('leave'),
        installFirefoxApp: document.getElementById('installFirefoxApp')
    };

    /**
     * User Agent.
     * @type {String}
     * @private
     */
    var _ua = navigator.userAgent.toLowerCase();

    var _match = /(chrome)[ \/]([\w.]+)/.exec(_ua)
        || /(webkit)[ \/]([\w.]+)/.exec(_ua)
        || /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(_ua)
        || /(msie) ([\w.]+)/.exec(_ua)
        || _ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(_ua)
        || [];

    /**
     * The event's name of CSS animation end.
     * @type {String}
     * @private
     */
    var _animationFunction
        = (_match[1] === 'chrome' || _match[1] === 'webkit')
        ? 'webkitAnimationEnd'
        : 'animationend';

    /**
     * Platform.
     * @type {String}
     * @private
     */
    var _pf = navigator.platform.toLocaleLowerCase();

    /**
     * Is Firefox OS Simulator or not.
     * @type {Boolean}
     * @private
     */
    var _isFirefoxOs
        = (_ua.indexOf('firefox') !== -1)       // Firefox browser
        && (_ua.indexOf('mobile') !== -1)       // and mobile browser
        && (_ua.indexOf('android') === -1);     // and not android

    /**
     * Stamp the time.
     * @param {String} arriveOrLeave Which column to stamp in arrive or leave.
     * @return {Boolean}
     * @private Result which the time is stamped or not.
     */
    var _record = function(arriveOrLeave) {
        var date = new Date();

        if (typeof _storage.delay !== 'undefined') {
            date.setTime(date.getTime() + _storage.delay);
        }
        var datetime = _getDateString(date);
        var dateString = datetime.date;
        var timeString = datetime.time;

        if (typeof _storage[dateString] === 'undefined') {
            _storage[dateString] = {};
        }

        if (typeof _storage[dateString][arriveOrLeave] === 'string') {
            if (!confirm('Overwrite?')) {
                return false;
            }
        }

        _storage[dateString][arriveOrLeave] = timeString;
        localStorage['timecard.otsuya.co'] = JSON.stringify(_storage);
        return true;
    };

    /**
     * Get formatted datetime strings.
     *     Date format is YYYY/MM/DD and time format is HH:MM:SS. (Japanese Style)
     * @param date
     * @return {Object <string, string>}
     * @private
     */
    var _getDateString = function(date) {
        var dateString
            = date.getFullYear() + '/'
            + (date.getMonth() + 1 <= 9 ? '0' + '' : '') + (date.getMonth() + 1) + '/'
            + (date.getDate() <= 9 ? '0' + '' : '') + date.getDate();
        var timeString
            = (date.getHours() <= 9 ? '0' + '' : '') + date.getHours() + ':'
            + (date.getMinutes() <= 9 ? '0' + '' : '') + date.getMinutes() + ':'
            + (date.getSeconds() <= 9 ? '0' + '' : '') + date.getSeconds();
        return {date: dateString, time: timeString};
    };

    /**
     * Rewrite the clock.
     * @private
     */
    var _updateClock = function() {
        var date = new Date();

        if (typeof _storage.delay !== 'undefined') {
            date.setTime(date.getTime() + _storage.delay);
        }

        var dateString = _getDateString(date).date;
        var timeString = _getDateString(date).time;
        var delay = _storage.delay;

        _elem.date.innerHTML = dateString;
        _elem.time.innerHTML = timeString;
    };

    /**
     * Adjust time.
     * @private
     */
    var adjust = function() {
        JST.request(function(result){
            if (result.status === 'success') {
                var delay = Math.round(result.delaySec.average * 1000);
                _storage.adjustTime = (new Date()).getTime();
                _storage.delay = delay;
                localStorage['timecard.otsuya.co'] = JSON.stringify(_storage);
                _date.setTime(_date.getTime() + delay);
                _elem.clock.className = 'active';
            }
        });
    };

    /**
     * Write table of time card.
     * @param {number} monthAfter How many month after today the current card is.
     * @private
     */
    var _show = function(monthAfter) {
        var date = new Date(_date);
        date.setDate(1);
        date.setMonth(date.getMonth() + monthAfter + 1);
        date.setDate(date.getDate() - 1);
        var lastDate = _getDateString(date).date.split('/')[2];

        var html = '<table class="list-table"><thead>'
            + '<tr><th colspan="4">Year/Month<h2>'
            + _getDateString(date).date.split('/').splice(0,2).join('/')
            + '</h2></th></tr>'
            + '<tr><th class="date">Date</th><th class="day">Day</th>'
            + '<th class="arrive">Arrive</th><th class="leave">Leave</th></tr>'
            + '</thead><tbody>';
        var tmpDate = new Date();
        var timeString;
        for (var i = 1; i <= lastDate; i++) {
            date.setDate(i);
            html += '<tr><th>' + i + '</th><th>'
                + _DAY_NAME[_locale][date.getDay()]
                + '</th>' + '<td>';

            html += (_storage[_getDateString(date).date]
                && _storage[_getDateString(date).date].arrive)
                ? _storage[_getDateString(date).date].arrive : '&nbsp;';
            html += '</td><td>';
            html += (_storage[_getDateString(date).date]
                && _storage[_getDateString(date).date].leave)
                ? _storage[_getDateString(date).date].leave : '&nbsp;';
            html += '</td></tr>';
        }
        html += '</tbody></table>';
        document.getElementById('list').innerHTML = html;
    };

    /**
     * Initialize.
     */
    var load = function () {
        if (_isLoaded) {
            return;
        }

        _isLoaded = true;
        if (typeof localStorage['timecard.otsuya.co'] !== 'undefined') {
            _storage = JSON.parse(localStorage['timecard.otsuya.co']);
        } else {
            _storage = {
                adjustTime: undefined,
                delay: undefined
            };
        }
        if (typeof _storage.adjustTime === 'undefined'
            || _date.getTime() -  _storage.adjustTime > 7 * 24 * 60 * 60 * 1000) {
            if (navigator.onLine) {
                adjust();
            }
        } else {
            _date.setTime(_date.getTime() + _storage.delay );
        }
        _show(_monthAfter);
        _interval = setInterval(_updateClock, 1000);

        // Check Apps API.
        if (navigator.mozApps) {
            // Get App object.
            var checkIfInstalled = navigator.mozApps.getSelf();
            checkIfInstalled.addEventListener('success', function() {
                if (!checkIfInstalled.result) {
                    // Not installed.
                    _elem.installFirefoxApp.style.display = 'block';
                    _elem.installFirefoxApp.addEventListener('click', function() {
                        var url = location.href;

                        // If you want to enable Packaged App, uncomment these lines.

                        if (_isFirefoxOs && confirm('Do you install as “Packaged App”?')) {
                          var manifestUrl = url.substring(0, url.lastIndexOf('/')) + '/package.webapp';
                          var install = navigator.mozApps.installPackage(manifestUrl);
                        } else {
                            alert('Installing as “Hosted App”.');
                            var manifestUrl = url.substring(0, url.lastIndexOf('/')) + '/manifest.webapp';
                            var install = navigator.mozApps.install(manifestUrl);
                        }
                        install.addEventListener('success', function() {
                            alert('Installed successfully.');
                        }, false);
                        install.addEventListener('error', function() {
                            alert('Install failed. ' + install.error.name);
                        }, false);
                    }, false);
                }
            }, false);
            checkIfInstalled.addEventListener('error', function() {
                alert('Checking installation failed. :' + this.error.message);
            }, false);
        }
    };

    /**
     * Event handler of drag start.
     */
    var dragstart = function() {
        if (_isSliding) {
            _isDragging = false;
            return;
        }
        _isDragging = true;
    };

    /**
     * Event handler of dragging.
     * @param {Object} event Event object.
     */
    var drag = function(event) {
        if (!_isDragging) {
            return;
        }
        if (_isSliding) {
            _isDragging = false;
            return;
        }
        if (event.distance < 20) {
            return;
        }
        var direction;
        if (event.angle > -60 && event.angle < 60) {
            direction = 'backward';
        } else if (event.angle < -120 || event.angle > 120) {
            direction = 'forward';
        } else {
            return;
        }
        _monthAfter = _monthAfter + ((direction === 'forward') ? 1 : -1);
        _slide(direction);
    };

    /**
     * Slide the card.
     * @param {string} direction The direction which the card is slided to.
     *     It is 'forward' or 'backword'.
     * @param callback Callback function that is called when animation end.
     * @private
     */
    var _slide = function(direction, callback) {
        _isSliding = true;
        var html;
        _elem.cardWrapper.addEventListener(_animationFunction, function() {
            html = _show(_monthAfter);
            _elem.cardWrapper.removeEventListener(_animationFunction, arguments.callee);
            _elem.cardWrapper.addEventListener(_animationFunction, function() {
                _elem.cardWrapper.removeEventListener(_animationFunction, arguments.callee);
                _elem.cardWrapper.className = '';
                _isSliding = false;
            }, false);
            setTimeout(function() {
                _elem.cardWrapper.className = direction + '-2';
                if (callback) {
                    callback();
                }
            }, 100);
        }, false);
        _elem.cardWrapper.className = direction + '-1';
    };

    /**
     * Make the card return up.
     *     It is the event handler that is called when the card is slotted to the end of recorder.
     * @private
     */
    var _cardSlotEnd = function() {
        var className = this.className;
        if (className.indexOf('active-1') !== -1) {
            this.className = className.replace('active-1', 'active-2');
            _show(_monthAfter);
        }
        if (className.indexOf('active-2') !== -1) {
            this.className = className.replace('active-2', '');
        }
    };

    /**
     * The event handler that is called when the button of the recorder is pressed.
     */
    var buttonClick = function() {
        var arriveOrLeave = this.id;
        if (_monthAfter !== 0) {
            var direction = (_monthAfter > 0) ? 'backward' : 'forward';
            _monthAfter = 0;
            _slide(direction, function() {
                var result = _record(arriveOrLeave);
                if (!result) {
                    return;
                }
                _elem.card.className += ' active-1';
            });
            return;
        }
        var result = _record(arriveOrLeave);
        if (!result) {
            return;
        }
        _elem.card.className += ' active-1';
    };

    // Run first.

    // Set the height of #cardContainer .
    _elem.cardContainer.style.height
        = window.innerHeight - 47 + 'px';   // 46 + 1

    _elem.card.addEventListener(_animationFunction, _cardSlotEnd);

    window.addEventListener('unload', function() {
        clearInterval(_interval);
    }, false);

    _elem.arrive.addEventListener('click', buttonClick, false);
    _elem.leave.addEventListener('click', buttonClick, false);

    /**
     * Appcache is enabled or not.
     * @type {Boolean}
     * @private
     */
    var _isAppcached = !!(document.getElementsByTagName('html')[0].getAttribute('manifest'));

    if (_isAppcached) {
        if (!navigator.onLine) {
            // Check manually when turn online.
            window.addEventListener('online', function() {
                applicationCache.update();
                console.log('check update of appcache manually.');
            }, false);
        }
    }

    return {
        load: load,
        dragstart: dragstart,
        drag: drag,
        buttonClick: buttonClick,
        adjust: adjust
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    if (window.PhoneGap) {
        document.addEventListener('deviceready', function() {
            timecard.load();
        }, false);
    } else {
        timecard.load();
    }
}, false);

(function() {
    var hammer = new Hammer(document.getElementById('cardContainer'));
    hammer.option({
        prevent_default: true,
        swipe: false,
        transform: false,
        tap: false,
        tap_double: false,
        hold: false
    });
    hammer.ondragstart = timecard.dragstart;
    hammer.ondrag = timecard.drag;
})();

