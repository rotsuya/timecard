var timecard = (function() {
    var VERSION = '1.0.0';
    var _SCHEMA_VERSION = '1.0.0';
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

    var _isTouch = (typeof window.ontouchstart !== 'undefined');

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
        installFirefoxApp: document.getElementById('installFirefoxApp'),
        recordedTime: document.getElementById('recordedTime'),
        modifyTimeForm: document.getElementById('modifyTimeForm'),
        modifyTimeText: document.getElementById('modifyTimeText'),
        loupeWrapper: document.getElementById('loupeWrapper'),
        grayOut: document.getElementById('grayOut'),
        list: document.getElementById('list')
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
    var _canInstallPackagedApps
        = !!navigator.mozApps && !!navigator.mozApps.installPackage;

    var _loadStorage = function() {
        if (typeof localStorage['timecard.otsuya.co'] !== 'undefined') {
            _storage = JSON.parse(localStorage['timecard.otsuya.co']);
        } else {
            _storage = {
                adjustTime: undefined,
                delay: undefined
            };
        }
        _storage.schemaVersion = _SCHEMA_VERSION;
    };

    var _saveStorage = function(_storage) {
        localStorage['timecard.otsuya.co'] = JSON.stringify(_storage);
    };

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
        _saveStorage(_storage);
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
            + ('0' + (date.getMonth() + 1)).slice(-2) + '/'
            + ('0' + date.getDate()).slice(-2);
        var timeString
            = ('0' + date.getHours()).slice(-2) + ':'
            + ('0' + date.getMinutes()).slice(-2) + ':'
            + ('0' + date.getSeconds()).slice(-2);
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
                _elem.clock.classList.add('active');
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

        var html
            = '<table class="list-table">'
            + '<thead>'
            + '<tr><th colspan="4">Year/Month<h2>'
            + _getDateString(date).date.split('/').splice(0,2).join('/')
            + '</h2></th></tr>'
            + '<tr><th id="headerDate">Date</th><th id="headerDay">Day</th>'
            + '<th id="headerArrive">Arrive</th><th id="headerLeave">Leave</th></tr>'
            + '</thead>'
            + '<tbody>';

        var dateString = '';
        var arrive = '';
        var leave = '';
        var isArriveModified = '';
        var isLeaveModified = '';

        for (var i = 1; i <= lastDate; i++) {
            date.setDate(i);
            dateString = _getDateString(date).date;
            arrive
                = (_storage[dateString]
                && (_storage[dateString].arriveModified || _storage[dateString].arrive))
                || '&nbsp;';
            leave
                = (_storage[dateString]
                && (_storage[dateString].leaveModified || _storage[dateString].leave))
                || '&nbsp;';
            isArriveModified
                = !!(_storage[dateString] && _storage[dateString].arriveModified);
            isLeaveModified
                = !!(_storage[dateString] && _storage[dateString].leaveModified);
            html += '<tr>'
                + '<th>' + i + '</th>'
                + '<th>' + _DAY_NAME[_locale][date.getDay()] + '</th>'
                + '<td class="time' + (isArriveModified ? ' modified' : '')
                + '" id="arriveTimeOf' + i + '" data-date="' + dateString
                + '" data-arrive-or-leave="arrive">' + arrive + '</td>'
                + '<td class="time' + (isLeaveModified ? ' modified' : '')
                + '" id="leaveTimeOf' + i + '" data-date="' + dateString
                +'" data-arrive-or-leave="leave">' + leave + '</td>'
                + '</tr>';
        }
        html += '</tbody></table>';
        _elem.list.innerHTML = html;
    };

    var modifyStart = function(event) {
        var target = event.originalEvent.target;
        if (!target.classList.contains('time')) {
            return;
        }
        if (target.classList.contains('modified')) {
            _elem.recordedTime.innerHTML = '';
            _elem.modifyTimeText.value = target.innerHTML;
        } else {
            _elem.recordedTime.innerHTML = target.innerHTML;
            _elem.modifyTimeText.value = '';
        }
        _elem.modifyTimeText.setAttribute('data-target', target.id);
        _elem.loupeWrapper.classList.add('visible');
        _elem.grayOut.classList.add('visible');
        if (_elem.modifyTimeText.value !== '') {
            _elem.modifyTimeText.classList.add('modifing');
        }
        _elem.modifyTimeText.focus();
    };

    var _keyDown = function(event) {
        console.log(event.keyCode);
        var ALLOW_KEY = [
            8 /* Delete */,
            13 /* Enter */,
            16 /* Shift */,
            17 /* Ctrl */,
            27 /* Esc */,
            37, 38, 39, 40, /* Cursor Keys */
            46 /* Back Space */,
            48, 49, 50, 51, 52, 53, 54, 55, 56, 57 /* 0~9 */,
            58 /* : */,
            65 /* a */,
            91 /* Command */,
            186 /* : in iOS */
        ];
        var isCtrlKey = event.ctrlKey || event.metaKey;
        if (ALLOW_KEY.indexOf(event.keyCode) === -1) {
            event.preventDefault();
            return;
        }
        if (event.keyCode === 65 && !isCtrlKey) {
            event.preventDefault();
            return;
        }
        if (event.keyCode === 13 || event.keyCode === 27) {
            event.preventDefault();
            _elem.modifyTimeText.blur();
            return;
        }
    };

    var _keyUp = function() {
        if (this.value === '') {
            this.classList.remove('modifing');
        } else {
            this.classList.add('modifing');
        }
    };

    var _modifyEnd = function(event) {
        event.preventDefault();
        console.log('modifyEnd');
        _elem.loupeWrapper.classList.remove('visible');
        _elem.grayOut.classList.remove('visible');
        var timeString = _elem.modifyTimeText.value;
        if (timeString.match(/^([0-2][0-9]):?([0-5][0-9]):?([0-5][0-9])$/)) {
            timeString = RegExp.$1 + ':' + RegExp.$2 + ':' + RegExp.$3;
        }
        var hhmmss = timeString.split(':');
        if (hhmmss.length === 3
            && hhmmss[0] - 0 >= 0 && hhmmss[0] - 0 <= 23
            && hhmmss[1] - 0 >= 0 && hhmmss[1] - 0 <= 59
            && hhmmss[2] - 0 >= 0 && hhmmss[2] - 0 <= 59) {
            timeString = ('00' + hhmmss[0]).slice(-2) + ':'
                + ('00' + hhmmss[1]).slice(-2) + ':'
                + ('00' + hhmmss[2]).slice(-2);
            var target = document.getElementById(_elem.modifyTimeText.getAttribute('data-target'));
            var dataString = target.getAttribute('data-date');
            var arriveOrLeave = target.getAttribute('data-arrive-or-leave');
            target.innerHTML = timeString;
            target.classList.add('modified');
            if (!_storage[dataString]) {
                _storage[dataString] = {};
            }
            _storage[dataString][arriveOrLeave + 'Modified'] = timeString;
            _saveStorage(_storage);
        }
    };

    _elem.modifyTimeText.addEventListener('keydown', _keyDown, false);
    _elem.modifyTimeText.addEventListener('keyup', _keyUp, false);

    _elem.modifyTimeText.addEventListener('blur', function(event) {
        console.log('blur');
        _modifyEnd(event);
    }, false);
    _elem.modifyTimeText.addEventListener('change', function(event) {
        console.log('change');
        event.preventDefault();
        _elem.modifyTimeText.blur();
    }, false);
    _elem.modifyTimeForm.addEventListener('submit', function(event) {
        console.log('submit');
        event.preventDefault();
    }, false);

    /**
     * Initialize.
     */
    var load = function () {
        if (_isLoaded) {
            return;
        }

        _isLoaded = true;
        _loadStorage();
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
                    _elem.installFirefoxApp.addEventListener(_isTouch ? 'ontouchstart' : 'click', function(event) {
                        event.preventDefault();

                        var url = location.href;

                        // If you want to enable Packaged App, uncomment these lines.

                        if (_canInstallPackagedApps && confirm('Do you install as “Packaged App”?')) {
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
        if (!(event.gesture.distance > 50)) {
            return;
        }
        var direction;
        if (event.gesture.angle > -60 && event.gesture.angle < 60) {
            direction = 'backward';
        } else if (event.gesture.angle < -120 || event.gesture.angle > 120) {
            direction = 'forward';
        } else {
            return;
        }
        event.preventDefault();
        alert(event.gesture.angle);
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
                _elem.cardWrapper.classList.remove(direction + '-2');
                _isSliding = false;
            }, false);
            setTimeout(function() {
                _elem.cardWrapper.classList.remove(direction + '-1');
                _elem.cardWrapper.classList.add(direction + '-2');
                if (callback) {
                    callback();
                }
            }, 100);
        }, false);
        _elem.cardWrapper.classList.add(direction + '-1');
    };

    /**
     * Make the card return up.
     *     It is the event handler that is called when the card is slotted to the end of recorder.
     * @private
     */
    var _cardSlotEnd = function() {
        if (this.classList.contains('active-2')) {
            this.classList.remove('active-2');
        }
        if (this.classList.contains('active-1')) {
            this.classList.remove('active-1');
            this.classList.add('active-2')
            _show(_monthAfter);
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
                _elem.card.classList.add('active-1');
            });
            return;
        }
        var result = _record(arriveOrLeave);
        if (!result) {
            return;
        }
        _elem.card.classList.add('active-1');
    };

    // Run first.

    // Set the height of #cardContainer .
    _elem.card.addEventListener(_animationFunction, _cardSlotEnd);

    document.getElementById('grayOut').addEventListener(_isTouch ? 'touchstart' : 'click', function() {
        _elem.modifyTimeText.blur();
    }, false);

    window.addEventListener('unload', function() {
        clearInterval(_interval);
    }, false);

    _elem.arrive.addEventListener(_isTouch ? 'touchstart' : 'click', buttonClick, false);
    _elem.leave.addEventListener(_isTouch ? 'touchstart' : 'click', buttonClick, false);

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
        adjust: adjust,
        version: VERSION,
        modifyStart: modifyStart
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
    var hammer = Hammer(document.getElementById('cardContainer'), {
        prevent_default: false,
        swipe: false,
        transform: false,
        tap: false,
        tap_double: false,
        hold: true,
        hold_timeout: 1000
    })
        .on('dragstart', timecard.dragstart)
        .on('drag', timecard.drag)
        .on('hold', timecard.modifyStart);
})();
