(function(window,undefined){

	var rpath = /http:\/\/[^\/]+\/(question|questions|question-comment|article-rss|article|answer|comment|message|question-comment|user|race|item|skill|npc|quest|place|class|achievement|profile|guild|group|website|tag|achievement)\//i,
			rhost = /^https?:\/\/[\w.]*(r2-db\.com|dev:8004|swtordb)/i,
			r2tip = window.r2tip || (window.r2tip = {});

	function addEvent(element, type, handler) {
			if (element.addEventListener) {
					element.addEventListener(type, handler, false);
			} else {
					// assign each event handler a unique ID
					if (!handler.$$guid) handler.$$guid = addEvent.guid++;
					// create a hash table of event types for the element
					if (!element.events) element.events = {};
					// create a hash table of event handlers for each element/event pair
					var handlers = element.events[type];
					if (!handlers) {
							handlers = element.events[type] = {};
							// store the existing event handler (if there is one)
							if (element["on" + type]) {
									handlers[0] = element["on" + type];
							}
					}
					// store the event handler in the hash table
					handlers[handler.$$guid] = handler;
					// assign a global event handler to do all the work
					element["on" + type] = handleEvent;
			}
	};
	// a counter used to create unique IDs
	addEvent.guid = 1;

	function removeEvent(element, type, handler) {
			if (element.removeEventListener) {
					element.removeEventListener(type, handler, false);
			} else {
					// delete the event handler from the hash table
					if (element.events && element.events[type]) {
							delete element.events[type][handler.$$guid];
					}
			}
	};

	function handleEvent(event) {
			var returnValue = true;
			// grab the event object (IE uses a global event object)
			event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
			// get a reference to the hash table of event handlers
			var handlers = this.events[event.type];
			// execute each event handler
			for (var i in handlers) {
					this.$$handleEvent = handlers[i];
					if (this.$$handleEvent(event) === false) {
							returnValue = false;
					}
			}
			return returnValue;
	};

	function fixEvent(event) {
			// add W3C standard event methods
			if ( event.pageX == null && event.clientX != null ) {
				var doc = document.documentElement, body = document.body;
				event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
				event.pageY = event.clientY + (doc && doc.scrollTop  || body && body.scrollTop  || 0) - (doc && doc.clientTop  || body && body.clientTop  || 0);
			}
			event.preventDefault = fixEvent.preventDefault;
			event.stopPropagation = fixEvent.stopPropagation;
			// Fix target property, if necessary
			if ( !event.target ) {
				event.target = event.srcElement || document; // Fixes #1925 where srcElement might not be defined either
			}

			return event;
	};
	fixEvent.preventDefault = function() {
			this.returnValue = false;
	};
	fixEvent.stopPropagation = function() {
			this.cancelBubble = true;
	};

	var div = document.createElement('div'),
			timeout;

	div.id = 'r2tooltip';
	div.style.position = 'absolute';
	div.style.top = '0px';
	div.style.left = '0px';
	div.style.zIndex = '99999';

	addEvent(document, "mouseover", function(e) {
		var target = e.target, href, tagName;
		while (target) {
			href = target.href || '';
			tagName = target.tagName  || '';
			if ( tagName.toLowerCase() == 'a' && rhost.test( href ) )
				break;
			target = target.parentNode;
		}
		if (target) {
			if(target.rel != "no-tooltip") {
				target.removeAttribute('title');
				var match = rpath.test(href);
				href = href.replace(/^([^?#]+)(\??[^#]*)(#?.*)$/,function(m, $1, $2, $3) {
					if ($2.length) $2 = $2 + '&format=tooltip';
					else $2 = '?format=tooltip';
					return $1+$2+$3;
				});
				if (match) {
					if(timeout) clearTimeout(timeout);
					if(!r2tip.test || r2tip.test(target)) {
						showTooltip(match[1], match[2], href);
					}
				} else {
					hideTooltip();
				}
			}
		} else {
			hideTooltip();
		}
	});

	function hideTooltip()
	{
		if(timeout) clearTimeout(timeout);
		if(div.parentNode) {
			div.parentNode.removeChild(div);
		}
	}

	function getPageWidth()
	{
		var width = 0;
		if ( self.innerWidth ) {
			width = self.innerWidth;
		}
		else if ( document.documentElement && document.documentElement.clientWidth ) {
			width = document.documentElement.clientWidth;
		}
		else if ( document.body ) {
			width = document.body.clientWidth;
		}
		return width;
	}

	function updatePosition()
	{
		var pageWidth = getPageWidth(),
			x = r2tip.currentX,
			y = r2tip.currentY;

		if( x + 20 + div.offsetWidth > pageWidth ) {
			div.style.left = - div.offsetWidth - 10 + x + 'px';
		} else {
			div.style.left = ( 5 + x ) + 'px';
		}
		div.style.top = 5 + y + 'px';
	}

	addEvent(document, "mouseout", hideTooltip);
	addEvent(document, "mousemove", function(e) {
		r2tip.currentX = e.pageX;
		r2tip.currentY = e.pageY;
		updatePosition();
	});

	function showTooltip(type, id, href)
	{
		hideTooltip();
		getData(href, function(data) {
			div.innerHTML = data.tooltip;
			document.getElementsByTagName('body')[0].appendChild(div);
			updatePosition();
		});
	}

	var dataCache = {};

	function getData(href, callback)
	{
		if (dataCache[href]) return callback(dataCache[href]);
		var uid = 'r2db_result'+(getData.$$uuid++);
		var script = document.createElement('script');

		var dataUrl = href.replace(/^([^?#]+)(\??[^#]*)(#?.*)$/,function(m, $1, $2, $3) {
			if ($2.length) $2 = $2 + '&callback='+uid;
			else $2 = '?callback='+uid;
			return $1+$2+$3;
		});

		script.src = dataUrl;

		window[uid] = function(data) {
			dataCache[href] = data;
			callback.apply(this, arguments);
			window[uid] = undefined;
			script.parentNode.removeChild(script);
			// remove script from dom!
		};
		timeout = setTimeout(function() {
			document.getElementsByTagName('body')[0].appendChild(script);
		}, 500);
	}

	getData.$$uuid = 0;


	var link = document.createElement('link');
	link.setAttribute('rel', 'stylesheet');
	link.setAttribute('href', 'http://s3.r2-db.com/powered.min.css');
	document.getElementsByTagName('head')[0].appendChild(link);


})(this);
